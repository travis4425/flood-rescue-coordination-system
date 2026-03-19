const router = require("express").Router();
const { query } = require("../config/database");
const { authenticate, authorize } = require("../middlewares/auth");

// Stalled threshold: 2 hours in minutes
const STALLED_MINUTES = 120;

// ─── GET /api/tasks ──────────────────────────────────────────────────────────
// Coordinator: sees their own tasks
// Manager: sees all tasks in their province
// Leader (rescue_team + is_team_leader): sees tasks assigned to their team
router.get("/", authenticate, async (req, res, next) => {
  try {
    const { status, team_id } = req.query;
    let where = "WHERE 1=1";
    const params = {};

    if (req.user.role === "coordinator") {
      where += " AND tg.coordinator_id = @coord_id";
      params.coord_id = req.user.id;
    } else if (req.user.role === "manager" && req.user.province_id) {
      where += " AND tg.province_id = @province_id";
      params.province_id = req.user.province_id;
    } else if (req.user.role === "rescue_team") {
      // Leader: show tasks where their team is in task_group_teams
      where += ` AND tg.id IN (
        SELECT task_group_id FROM task_group_teams
        WHERE team_id IN (SELECT id FROM rescue_teams WHERE leader_id = @user_id)
      )`;
      params.user_id = req.user.id;
    }

    if (status) {
      where += " AND tg.status = @status";
      params.status = status;
    }
    if (team_id) {
      where += " AND tg.team_id = @team_id";
      params.team_id = parseInt(team_id);
    }

    const result = await query(
      `SELECT tg.*,
              u.full_name as coordinator_name,
              rt.name as team_name, rt.code as team_code,
              p.name as province_name,
              (SELECT COUNT(*) FROM missions m WHERE m.task_group_id = tg.id) as total_sub,
              (SELECT COUNT(*) FROM missions m WHERE m.task_group_id = tg.id AND m.status = 'completed') as completed_sub,
              (SELECT COUNT(*) FROM missions m WHERE m.task_group_id = tg.id AND m.status = 'failed') as failed_sub,
              (SELECT COUNT(*) FROM task_incident_reports ir WHERE ir.task_group_id = tg.id AND ir.status = 'pending') as pending_reports,
              (SELECT COUNT(*) - 1 FROM task_group_teams tgt WHERE tgt.task_group_id = tg.id) as extra_team_count
       FROM task_groups tg
       JOIN users u ON tg.coordinator_id = u.id
       LEFT JOIN rescue_teams rt ON tg.team_id = rt.id
       LEFT JOIN provinces p ON tg.province_id = p.id
       ${where}
       ORDER BY ISNULL(tg.scheduled_date, CAST(tg.created_at AS DATE)), tg.created_at DESC`,
      params,
    );

    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/tasks/suggest-requests ─────────────────────────────────────────
// Suggest nearby pending/verified requests for grouping into a task
// Returns requests sorted by proximity to a given lat/lng center
router.get(
  "/suggest-requests",
  authenticate,
  authorize("coordinator", "manager"),
  async (req, res, next) => {
    try {
      const {
        latitude,
        longitude,
        province_id,
        radius_km = 10,
        limit = 10,
      } = req.query;

      let where = "WHERE rr.status = 'verified'";
      const params = {
        limit: parseInt(limit),
      };

      if (province_id) {
        where += " AND rr.province_id = @province_id";
        params.province_id = parseInt(province_id);
      } else if (req.user.province_id) {
        where += " AND rr.province_id = @province_id";
        params.province_id = req.user.province_id;
      }

      // Exclude requests already in an active task
      where += ` AND rr.id NOT IN (
        SELECT m.request_id FROM missions m
        WHERE m.task_group_id IS NOT NULL
          AND m.status NOT IN ('completed','aborted','failed')
      )`;

      let orderBy = "ORDER BY rr.priority_score DESC, rr.created_at ASC";

      // If coordinates given, sort by distance (Haversine approximation)
      if (latitude && longitude) {
        params.lat = parseFloat(latitude);
        params.lng = parseFloat(longitude);
        orderBy = `ORDER BY (
          6371 * ACOS(
            COS(RADIANS(@lat)) * COS(RADIANS(rr.latitude)) *
            COS(RADIANS(rr.longitude) - RADIANS(@lng)) +
            SIN(RADIANS(@lat)) * SIN(RADIANS(rr.latitude))
          )
        ) ASC`;
      }

      const result = await query(
        `SELECT TOP (@limit) rr.id, rr.tracking_code, rr.address, rr.latitude, rr.longitude,
                rr.citizen_name, rr.victim_count, rr.status, rr.priority_score,
                rr.flood_severity, rr.description, rr.support_type,
                it.name as incident_type, ul.name as urgency_level, ul.color as urgency_color,
                p.name as province_name
         FROM rescue_requests rr
         LEFT JOIN incident_types it ON rr.incident_type_id = it.id
         LEFT JOIN urgency_levels ul ON rr.urgency_level_id = ul.id
         LEFT JOIN provinces p ON rr.province_id = p.id
         ${where}
         ${orderBy}`,
        params,
      );

      res.json(result.recordset);
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /api/tasks ──────────────────────────────────────────────────────────
// Coordinator creates a task: group N requests + assign to 1 team
router.post(
  "/",
  authenticate,
  authorize("coordinator", "manager"),
  async (req, res, next) => {
    try {
      const { name, team_id, team_ids, request_ids, requests, notes } =
        req.body;

      // Support cả single team (cũ) lẫn multi-team (mới)
      const allTeamIds = (
        team_ids?.length ? team_ids : team_id ? [team_id] : []
      ).map(Number);
      // requests = [{id, team_id}], hoặc fallback từ request_ids (tất cả gán cho team đầu tiên)
      const requestList = requests?.length
        ? requests.map((r) => ({
            id: parseInt(r.id),
            team_id: parseInt(r.team_id || allTeamIds[0]),
          }))
        : (request_ids || []).map((id) => ({
            id: parseInt(id),
            team_id: allTeamIds[0],
          }));

      if (!name || allTeamIds.length === 0 || requestList.length === 0) {
        return res.status(400).json({
          error:
            "Cần có: tên task, ít nhất 1 đội, và ít nhất 1 yêu cầu cứu hộ.",
        });
      }

      // Get province from primary team
      const teamRes = await query(
        "SELECT province_id FROM rescue_teams WHERE id = @id",
        { id: allTeamIds[0] },
      );
      if (teamRes.recordset.length === 0) {
        return res.status(404).json({ error: "Không tìm thấy đội." });
      }
      const province_id = teamRes.recordset[0].province_id;

      // Create task group (primary team = first team)
      const taskRes = await query(
        `INSERT INTO task_groups (name, coordinator_id, team_id, province_id, notes)
         OUTPUT INSERTED.id
         VALUES (@name, @coord_id, @team_id, @province_id, @notes)`,
        {
          name,
          coord_id: req.user.id,
          team_id: allTeamIds[0],
          province_id,
          notes: notes || null,
        },
      );
      const taskGroupId = taskRes.recordset[0].id;

      // Create a mission for each request, gán đúng đội
      for (const item of requestList) {
        await query(
          `UPDATE rescue_requests SET status = 'assigned', assigned_team_id = @team_id,
           coordinator_id = @coord_id, assigned_at = GETDATE(), updated_at = GETDATE()
           WHERE id = @req_id AND status IN ('pending','verified')`,
          { team_id: item.team_id, coord_id: req.user.id, req_id: item.id },
        );
        await query(
          `INSERT INTO missions (request_id, team_id, status, task_group_id)
           VALUES (@req_id, @team_id, 'assigned', @task_group_id)`,
          {
            req_id: item.id,
            team_id: item.team_id,
            task_group_id: taskGroupId,
          },
        );
      }

      // Set all assigned teams to on_mission + track in task_group_teams
      const primaryId = (req.body.team_id ? parseInt(req.body.team_id) : null) || allTeamIds[0];
      for (const tid of allTeamIds) {
        await query(
          "UPDATE rescue_teams SET status = 'on_mission', updated_at = GETDATE() WHERE id = @id",
          { id: tid },
        );
        await query(
          `IF NOT EXISTS (SELECT 1 FROM task_group_teams WHERE task_group_id = @tgid AND team_id = @tid)
           INSERT INTO task_group_teams (task_group_id, team_id, is_primary) VALUES (@tgid, @tid, @prim)`,
          { tgid: taskGroupId, tid, prim: tid === primaryId ? 1 : 0 },
        );
      }

      const io = req.app.get("io");
      if (io) {
        io.emit("task_created", {
          task_group_id: taskGroupId,
          team_ids: allTeamIds,
        });
      }

      res
        .status(201)
        .json({ id: taskGroupId, message: "Tạo task thành công." });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /api/tasks/:id ───────────────────────────────────────────────────────
// Get full task detail: missions + incident reports
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const taskId = parseInt(req.params.id);

    const taskRes = await query(
      `SELECT tg.*,
              u.full_name as coordinator_name,
              rt.name as team_name, rt.code as team_code, rt.phone as team_phone,
              rt.leader_id,
              p.name as province_name
       FROM task_groups tg
       JOIN users u ON tg.coordinator_id = u.id
       LEFT JOIN rescue_teams rt ON tg.team_id = rt.id
       LEFT JOIN provinces p ON tg.province_id = p.id
       WHERE tg.id = @id`,
      { id: taskId },
    );

    if (taskRes.recordset.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy task." });
    }

    const task = taskRes.recordset[0];

    // Get sub-missions
    const missionsRes = await query(
      `SELECT m.*,
              rr.tracking_code, rr.address, rr.latitude, rr.longitude,
              rr.citizen_name, rr.citizen_phone, rr.victim_count, ISNULL(rr.rescued_count, 0) as rescued_count, rr.description,
              rr.priority_score, rr.flood_severity, rr.support_type,
              it.name as incident_type, ul.name as urgency_level, ul.color as urgency_color,
              u.full_name as assigned_to_name
       FROM missions m
       JOIN rescue_requests rr ON m.request_id = rr.id
       LEFT JOIN incident_types it ON rr.incident_type_id = it.id
       LEFT JOIN urgency_levels ul ON rr.urgency_level_id = ul.id
       LEFT JOIN users u ON m.assigned_to_user_id = u.id
       WHERE m.task_group_id = @task_id
       ORDER BY rr.priority_score DESC`,
      { task_id: taskId },
    );

    // Get incident reports
    const reportsRes = await query(
      `SELECT ir.*,
              u.full_name as reported_by_name,
              rr.tracking_code, rr.address
       FROM task_incident_reports ir
       JOIN users u ON ir.reporter_id = u.id
       JOIN missions m ON ir.mission_id = m.id
       JOIN rescue_requests rr ON m.request_id = rr.id
       WHERE ir.task_group_id = @task_id
       ORDER BY ir.created_at DESC`,
      { task_id: taskId },
    );

    // Detect stalled sub-missions
    const now = new Date();
    const missions = missionsRes.recordset.map((m) => {
      let stalled = false;
      if (
        !["completed", "failed", "aborted"].includes(m.status) &&
        m.completed_at === null
      ) {
        // Check if other missions in this task completed > STALLED_MINUTES ago
        const otherCompleted = missionsRes.recordset.filter(
          (other) =>
            other.id !== m.id &&
            other.status === "completed" &&
            other.completed_at,
        );
        if (otherCompleted.length > 0) {
          const earliestCompletion = Math.min(
            ...otherCompleted.map((o) => new Date(o.completed_at).getTime()),
          );
          const minutesSince = (now.getTime() - earliestCompletion) / 60000;
          if (minutesSince >= STALLED_MINUTES) {
            stalled = true;
          }
        }
      }
      return { ...m, stalled };
    });

    // Get all teams participating in this task (from task_group_teams)
    const allTeamsRes = await query(
      `SELECT rt.id, rt.name, rt.code, rt.leader_id,
              u.full_name as leader_name, tgt.is_primary
       FROM task_group_teams tgt
       JOIN rescue_teams rt ON tgt.team_id = rt.id
       LEFT JOIN users u ON rt.leader_id = u.id
       WHERE tgt.task_group_id = @task_id
       ORDER BY tgt.is_primary DESC, rt.name`,
      { task_id: taskId },
    );

    res.json({
      ...task,
      missions,
      incident_reports: reportsRes.recordset,
      all_teams: allTeamsRes.recordset,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/tasks/:id/all-members ──────────────────────────────────────────
// Primary leader: get all members from ALL teams in this task
router.get("/:id/all-members", authenticate, async (req, res, next) => {
  try {
    const taskId = parseInt(req.params.id);
    const result = await query(
      `SELECT u2.user_id, u2.full_name, u2.phone, u2.team_id, u2.team_name,
              MAX(u2.is_leader) as is_leader
       FROM (
         -- Leaders (always included even if not in rescue_team_members)
         SELECT rt.leader_id as user_id, u.full_name, u.phone,
                rt.id as team_id, rt.name as team_name, 1 as is_leader
         FROM rescue_teams rt
         JOIN users u ON rt.leader_id = u.id
         WHERE rt.id IN (SELECT team_id FROM task_group_teams WHERE task_group_id = @task_id)
         UNION ALL
         -- Regular members
         SELECT u.id, u.full_name, u.phone, rt.id, rt.name,
                CASE WHEN rt.leader_id = u.id THEN 1 ELSE 0 END
         FROM rescue_team_members tm
         JOIN users u ON tm.user_id = u.id
         JOIN rescue_teams rt ON tm.team_id = rt.id
         WHERE rt.id IN (SELECT team_id FROM task_group_teams WHERE task_group_id = @task_id)
       ) u2
       GROUP BY u2.user_id, u2.full_name, u2.phone, u2.team_id, u2.team_name
       ORDER BY u2.team_name, MAX(u2.is_leader) DESC, u2.full_name`,
      { task_id: taskId },
    );
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/tasks/:id/assign-member ────────────────────────────────────────
// Leader assigns a sub-mission to one or multiple team members
router.put("/:id/assign-member", authenticate, async (req, res, next) => {
  try {
    const { mission_id, user_id, user_ids } = req.body;
    if (!mission_id || (!user_id && (!user_ids || user_ids.length === 0))) {
      return res
        .status(400)
        .json({ error: "Cần mission_id và user_id (hoặc user_ids)." });
    }

    const missionId = parseInt(mission_id);
    const taskId = parseInt(req.params.id);

    // Verify mission belongs to this task
    const check = await query(
      "SELECT id FROM missions WHERE id = @mission_id AND task_group_id = @task_id",
      { mission_id: missionId, task_id: taskId },
    );
    if (check.recordset.length === 0) {
      return res
        .status(404)
        .json({ error: "Sub-mission không thuộc task này." });
    }

    const ids = user_ids ? user_ids.map(Number) : [parseInt(user_id)];
    const primaryUserId = ids[0];

    // Update primary assignee on missions table
    await query(
      "UPDATE missions SET assigned_to_user_id = @user_id, updated_at = GETDATE() WHERE id = @id",
      { user_id: primaryUserId, id: missionId },
    );

    // Sync mission_assignments junction table
    await query("DELETE FROM mission_assignments WHERE mission_id = @mid", {
      mid: missionId,
    });
    for (const uid of ids) {
      await query(
        `IF NOT EXISTS (SELECT 1 FROM mission_assignments WHERE mission_id=@mid AND user_id=@uid)
         INSERT INTO mission_assignments (mission_id, user_id) VALUES (@mid, @uid)`,
        { mid: missionId, uid },
      );
    }

    // Cập nhật request sang in_progress khi leader giao việc cho thành viên
    const missionInfo = await query(
      "SELECT request_id FROM missions WHERE id = @id",
      { id: missionId },
    );
    if (missionInfo.recordset.length > 0) {
      const { request_id } = missionInfo.recordset[0];
      await query(
        `UPDATE rescue_requests SET status = 'in_progress', updated_at = GETDATE()
         WHERE id = @id AND status IN ('assigned', 'verified')`,
        { id: request_id },
      );
      const io = req.app.get("io");
      if (io) {
        io.emit("mission_assigned", { mission_id: missionId, user_ids: ids });
        io.emit("request_updated", { id: request_id, status: "in_progress" });
      }
    } else {
      const io = req.app.get("io");
      if (io)
        io.emit("mission_assigned", { mission_id: missionId, user_ids: ids });
    }

    res.json({ message: "Đã giao nhiệm vụ cho thành viên." });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/tasks/:id/reports ─────────────────────────────────────────────
// Member or Leader submits an incident report for a stalled/unrescuable sub-mission
router.post("/:id/reports", authenticate, async (req, res, next) => {
  try {
    const { mission_id, report_type, urgency, support_type, description } =
      req.body;
    const taskId = parseInt(req.params.id);

    if (!mission_id || !report_type || !description) {
      return res
        .status(400)
        .json({ error: "Cần mission_id, report_type và description." });
    }

    // Verify mission belongs to task
    const check = await query(
      "SELECT id FROM missions WHERE id = @mission_id AND task_group_id = @task_id",
      { mission_id: parseInt(mission_id), task_id: taskId },
    );
    if (check.recordset.length === 0) {
      return res
        .status(404)
        .json({ error: "Sub-mission không thuộc task này." });
    }

    // If unrescuable, mark mission as failed
    if (report_type === "unrescuable") {
      await query(
        "UPDATE missions SET status = 'failed', updated_at = GETDATE() WHERE id = @id",
        { id: parseInt(mission_id) },
      );
      // Also log in mission_logs
      await query(
        `INSERT INTO mission_logs (mission_id, user_id, action, description)
         VALUES (@mid, @uid, 'failed', @desc)`,
        {
          mid: parseInt(mission_id),
          uid: req.user.id,
          desc: `Báo cáo không thể cứu hộ: ${description}`,
        },
      );
    }

    const reportRes = await query(
      `INSERT INTO task_incident_reports
         (task_group_id, mission_id, reporter_id, report_type, urgency, support_type, description)
       OUTPUT INSERTED.id
       VALUES (@task_id, @mission_id, @user_id, @type, @urgency, @support_type, @desc)`,
      {
        task_id: taskId,
        mission_id: parseInt(mission_id),
        user_id: req.user.id,
        type: report_type,
        urgency: urgency || "medium",
        support_type: support_type || null,
        desc: description,
      },
    );

    // Notify coordinator via socket
    const io = req.app.get("io");
    if (io) {
      io.emit("task_incident_report", {
        task_group_id: taskId,
        report_id: reportRes.recordset[0].id,
        urgency: urgency || "medium",
        report_type,
      });
    }

    res.status(201).json({
      id: reportRes.recordset[0].id,
      message: "Đã gửi báo cáo sự cố.",
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/tasks/:id/reports/:reportId/resolve ────────────────────────────
// Coordinator acknowledges or resolves an incident report
router.put(
  "/:id/reports/:reportId/resolve",
  authenticate,
  authorize("coordinator", "manager"),
  async (req, res, next) => {
    try {
      const { status, resolution_note } = req.body; // acknowledged | resolved
      await query(
        `UPDATE task_incident_reports
         SET status = @status, resolved_by = @user_id, resolved_at = GETDATE(),
             resolution_note = @note
         WHERE id = @id AND task_group_id = @task_id`,
        {
          status: status || "acknowledged",
          user_id: req.user.id,
          note: resolution_note || null,
          id: parseInt(req.params.reportId),
          task_id: parseInt(req.params.id),
        },
      );
      res.json({ message: "Đã cập nhật trạng thái báo cáo." });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /api/tasks/:id/dispatch-support ────────────────────────────────────
// Coordinator dispatches additional team to help with a task
router.post(
  "/:id/dispatch-support",
  authenticate,
  authorize("coordinator", "manager"),
  async (req, res, next) => {
    try {
      const { team_id, request_ids, notes } = req.body;
      const taskId = parseInt(req.params.id);

      if (!team_id || !request_ids || request_ids.length === 0) {
        return res
          .status(400)
          .json({ error: "Cần team_id và danh sách request_ids." });
      }

      // Verify task exists
      const taskCheck = await query(
        "SELECT id FROM task_groups WHERE id = @id",
        { id: taskId },
      );
      if (taskCheck.recordset.length === 0) {
        return res.status(404).json({ error: "Không tìm thấy task." });
      }

      // Add new sub-missions (same task_group) for the support team
      for (const requestId of request_ids) {
        await query(
          `INSERT INTO missions (request_id, team_id, status, task_group_id, notes)
           VALUES (@req_id, @team_id, 'assigned', @task_id, @notes)`,
          {
            req_id: parseInt(requestId),
            team_id: parseInt(team_id),
            task_id: taskId,
            notes: notes ? `[Hỗ trợ bổ sung] ${notes}` : "[Hỗ trợ bổ sung]",
          },
        );
      }

      // Set support team to on_mission + track in task_group_teams
      await query(
        "UPDATE rescue_teams SET status = 'on_mission', updated_at = GETDATE() WHERE id = @id",
        { id: parseInt(team_id) },
      );
      await query(
        `IF NOT EXISTS (SELECT 1 FROM task_group_teams WHERE task_group_id = @tgid AND team_id = @tid)
         INSERT INTO task_group_teams (task_group_id, team_id, is_primary) VALUES (@tgid, @tid, 0)`,
        { tgid: taskId, tid: parseInt(team_id) },
      );

      // Log support dispatch in task_incident_reports or as a note
      const io = req.app.get("io");
      if (io) {
        io.emit("task_support_dispatched", {
          task_group_id: taskId,
          team_id: parseInt(team_id),
        });
      }

      res.status(201).json({ message: "Đã điều thêm đội hỗ trợ vào task." });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PUT /api/tasks/:id/confirm-complete ─────────────────────────────────────
// Coordinator confirms task closure → updates request statuses + emits event
router.put(
  "/:id/confirm-complete",
  authenticate,
  authorize("coordinator", "manager"),
  async (req, res, next) => {
    try {
      const taskId = parseInt(req.params.id);

      // Verify all sub-missions are in terminal state
      const check = await query(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN status IN ('completed','failed','aborted') THEN 1 ELSE 0 END) as done
         FROM missions WHERE task_group_id = @task_id`,
        { task_id: taskId },
      );
      const { total, done } = check.recordset[0];
      if (total === 0 || done < total) {
        return res
          .status(400)
          .json({ error: "Còn nhiệm vụ chưa hoàn thành, chưa thể đóng task." });
      }

      // Determine final status
      const failedCheck = await query(
        `SELECT COUNT(*) as failed FROM missions WHERE task_group_id = @task_id AND status = 'failed'`,
        { task_id: taskId },
      );
      const finalStatus =
        failedCheck.recordset[0].failed > 0 ? "partial" : "completed";

      await query(
        "UPDATE task_groups SET status = @status, updated_at = GETDATE() WHERE id = @id",
        { status: finalStatus, id: taskId },
      );

      // Close rescue_requests for completed missions
      await query(
        `UPDATE rr SET rr.status = 'completed', rr.completed_at = GETDATE(), rr.updated_at = GETDATE()
         FROM rescue_requests rr
         JOIN missions m ON rr.id = m.request_id
         WHERE m.task_group_id = @task_id AND m.status = 'completed' AND rr.status != 'completed'`,
        { task_id: taskId },
      );

      // Free all teams involved in this task back to available
      await query(
        `UPDATE rescue_teams SET status = 'available', updated_at = GETDATE()
         WHERE id IN (
           SELECT DISTINCT team_id FROM task_groups WHERE id = @task_id
           UNION
           SELECT DISTINCT m.team_id FROM missions m WHERE m.task_group_id = @task_id AND m.team_id IS NOT NULL
         )`,
        { task_id: taskId },
      );

      const io = req.app.get("io");
      if (io)
        io.emit("task_updated", { task_group_id: taskId, status: finalStatus });

      res.json({ message: "Đã xác nhận đóng task.", status: finalStatus });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PUT /api/tasks/:id/cancel ───────────────────────────────────────────────
// Coordinator cancels a task → sets task to cancelled, frees requests back to verified
router.put(
  "/:id/cancel",
  authenticate,
  authorize("coordinator", "manager"),
  async (req, res, next) => {
    try {
      const taskId = parseInt(req.params.id);
      const { reason } = req.body;

      if (!reason || !reason.trim())
        return res.status(400).json({ error: "Vui lòng nhập lý do hủy task." });

      const taskCheck = await query(
        `SELECT tg.id, tg.status, tg.name, tg.team_id, rt.leader_id
         FROM task_groups tg
         LEFT JOIN rescue_teams rt ON rt.id = tg.team_id
         WHERE tg.id = @id`,
        { id: taskId },
      );
      if (taskCheck.recordset.length === 0)
        return res.status(404).json({ error: "Task không tồn tại." });
      if (taskCheck.recordset[0].status === "cancelled")
        return res.status(400).json({ error: "Task đã bị hủy rồi." });

      const { name: taskName, leader_id } = taskCheck.recordset[0];

      // Cancel task
      await query(
        "UPDATE task_groups SET status = 'cancelled', notes = ISNULL(notes,'') + @suffix, updated_at = GETDATE() WHERE id = @id",
        { id: taskId, suffix: `\n[Hủy: ${reason.trim()}]` },
      );

      // Abort active missions
      await query(
        `UPDATE missions SET status = 'aborted', updated_at = GETDATE()
         WHERE task_group_id = @task_id AND status NOT IN ('completed','failed','aborted')`,
        { task_id: taskId },
      );

      // Free rescue requests back to verified
      await query(
        `UPDATE rr SET rr.status = 'verified', rr.updated_at = GETDATE()
         FROM rescue_requests rr
         JOIN missions m ON rr.id = m.request_id
         WHERE m.task_group_id = @task_id AND rr.status = 'assigned'`,
        { task_id: taskId },
      );

      // Set all teams involved in this task back to available
      // (primary team + any support teams that were dispatched)
      await query(
        `UPDATE rescue_teams SET status = 'available', updated_at = GETDATE()
         WHERE id IN (
           SELECT DISTINCT team_id FROM task_groups WHERE id = @task_id
           UNION
           SELECT DISTINCT m.team_id FROM missions m WHERE m.task_group_id = @task_id AND m.team_id IS NOT NULL
         )`,
        { task_id: taskId },
      );

      // Gửi notification cho team leader
      if (leader_id) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message)
           VALUES (@uid, 'task_cancelled', N'Task bị hủy', @msg)`,
          {
            uid: leader_id,
            msg: `Task "${taskName}" đã bị hủy. Lý do: ${reason.trim()}`,
          },
        );
      }

      const io = req.app.get("io");
      if (io) {
        io.emit("task_updated", { task_group_id: taskId, status: "cancelled" });
        if (leader_id) io.to(`user_${leader_id}`).emit("notification");
      }

      res.json({ message: "Đã hủy task." });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PUT /api/tasks/:id/status ────────────────────────────────────────────────
// Auto-check and update task status (called after mission status updates)
// Also can be called manually by coordinator to force-complete/partial
router.put(
  "/:id/status",
  authenticate,
  authorize("coordinator", "manager"),
  async (req, res, next) => {
    try {
      const { status } = req.body;
      const taskId = parseInt(req.params.id);

      if (!["in_progress", "completed", "partial"].includes(status)) {
        return res.status(400).json({ error: "Trạng thái không hợp lệ." });
      }

      await query(
        "UPDATE task_groups SET status = @status, updated_at = GETDATE() WHERE id = @id",
        { status, id: taskId },
      );

      res.json({ message: `Đã cập nhật trạng thái task: ${status}` });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PUT /api/tasks/:id/reports/:reportId/unresolve ──────────────────────────
// Coordinator hoàn tác báo cáo đã xử lý → trả về pending
router.put(
  "/:id/reports/:reportId/unresolve",
  authenticate,
  authorize("coordinator", "manager"),
  async (req, res, next) => {
    try {
      await query(
        `UPDATE task_incident_reports
         SET status = 'pending', resolved_by = NULL, resolved_at = NULL, resolution_note = NULL, updated_at = GETDATE()
         WHERE id = @rId AND task_group_id = @tId`,
        { rId: parseInt(req.params.reportId), tId: parseInt(req.params.id) },
      );
      res.json({ message: "Đã hoàn tác báo cáo." });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PUT /api/tasks/:id/estimated-completion ─────────────────────────────────
// Leader điền dự kiến hoàn thành
router.put(
  "/:id/estimated-completion",
  authenticate,
  authorize("rescue_team"),
  async (req, res, next) => {
    try {
      const { estimated_completion } = req.body;
      await query(
        "UPDATE task_groups SET estimated_completion = @ec, updated_at = GETDATE() WHERE id = @id",
        { ec: estimated_completion || null, id: parseInt(req.params.id) },
      );
      res.json({ message: "Đã cập nhật dự kiến hoàn thành." });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PUT /api/tasks/:id/scheduled-date ───────────────────────────────────────
// Coordinator lên lịch ngày thực hiện task
router.put(
  "/:id/scheduled-date",
  authenticate,
  authorize("coordinator", "manager"),
  async (req, res, next) => {
    try {
      const { scheduled_date } = req.body;
      await query(
        "UPDATE task_groups SET scheduled_date = @sd, updated_at = GETDATE() WHERE id = @id",
        { sd: scheduled_date || null, id: parseInt(req.params.id) },
      );
      const io = req.app.get("io");
      if (io)
        io.emit("task_updated", { task_group_id: parseInt(req.params.id) });
      res.json({ message: "Đã cập nhật ngày lên lịch." });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
