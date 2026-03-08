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
      // Leader only: find tasks for their team
      where += ` AND tg.team_id IN (SELECT id FROM rescue_teams WHERE leader_id = @user_id)`;
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
              (SELECT COUNT(*) FROM task_incident_reports ir WHERE ir.task_group_id = tg.id AND ir.status = 'pending') as pending_reports
       FROM task_groups tg
       JOIN users u ON tg.coordinator_id = u.id
       JOIN rescue_teams rt ON tg.team_id = rt.id
       LEFT JOIN provinces p ON tg.province_id = p.id
       ${where}
       ORDER BY tg.created_at DESC`,
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

      let where = "WHERE rr.status IN ('pending','verified')";
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
      const { name, team_id, request_ids, notes } = req.body;

      if (!name || !team_id || !request_ids || request_ids.length === 0) {
        return res.status(400).json({
          error: "Cần có: tên task, đội, và ít nhất 1 yêu cầu cứu hộ.",
        });
      }

      // Get team province
      const teamRes = await query(
        "SELECT province_id FROM rescue_teams WHERE id = @id",
        { id: parseInt(team_id) },
      );
      if (teamRes.recordset.length === 0) {
        return res.status(404).json({ error: "Không tìm thấy đội." });
      }
      const province_id = teamRes.recordset[0].province_id;

      // Create task group
      const taskRes = await query(
        `INSERT INTO task_groups (name, coordinator_id, team_id, province_id, notes)
         OUTPUT INSERTED.id
         VALUES (@name, @coord_id, @team_id, @province_id, @notes)`,
        {
          name,
          coord_id: req.user.id,
          team_id: parseInt(team_id),
          province_id,
          notes: notes || null,
        },
      );
      const taskGroupId = taskRes.recordset[0].id;

      // Create a mission for each request_id
      for (const requestId of request_ids) {
        // Mark request as assigned
        await query(
          `UPDATE rescue_requests SET status = 'assigned', assigned_team_id = @team_id,
           coordinator_id = @coord_id, assigned_at = GETDATE(), updated_at = GETDATE()
           WHERE id = @req_id AND status IN ('pending','verified')`,
          {
            team_id: parseInt(team_id),
            coord_id: req.user.id,
            req_id: parseInt(requestId),
          },
        );

        // Create mission linked to task_group
        await query(
          `INSERT INTO missions (request_id, team_id, status, task_group_id)
           VALUES (@req_id, @team_id, 'assigned', @task_group_id)`,
          {
            req_id: parseInt(requestId),
            team_id: parseInt(team_id),
            task_group_id: taskGroupId,
          },
        );
      }

      // Set team to on_mission
      await query(
        "UPDATE rescue_teams SET status = 'on_mission', updated_at = GETDATE() WHERE id = @id",
        { id: parseInt(team_id) },
      );

      const io = req.app.get("io");
      if (io) {
        io.emit("task_created", {
          task_group_id: taskGroupId,
          team_id: parseInt(team_id),
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
       JOIN rescue_teams rt ON tg.team_id = rt.id
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
              rr.citizen_name, rr.citizen_phone, rr.victim_count, rr.description,
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
       JOIN users u ON ir.reported_by = u.id
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

    res.json({
      ...task,
      missions,
      incident_reports: reportsRes.recordset,
    });
  } catch (err) {
    next(err);
  }
});
