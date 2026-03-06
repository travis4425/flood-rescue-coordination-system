const router = require("express").Router();
const { query } = require("../config/database");
const { authenticate, authorize } = require("../middlewares/auth");
const { getPagination, formatResponse } = require("../utils/helpers");
const upload = require("../middlewares/upload");
const { getFileUrl } = upload;

// GET /api/missions - list missions
router.get("/", authenticate, async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { status, team_id } = req.query;
    let where = "WHERE 1=1";
    const params = {};

    if (req.user.role === "rescue_team") {
      where += ` AND m.team_id IN 
        (SELECT team_id FROM rescue_team_members WHERE user_id = @user_id
         UNION SELECT id FROM rescue_teams WHERE leader_id = @user_id)`;
      params.user_id = req.user.id;
    }
    if (status) {
      where += " AND m.status = @status";
      params.status = status;
    }
    if (team_id) {
      where += " AND m.team_id = @team_id";
      params.team_id = parseInt(team_id);
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM missions m ${where}`,
      params,
    );

    const result = await query(
      `SELECT m.*, 
              rr.tracking_code, rr.latitude, rr.longitude, rr.address, rr.description,
              rr.citizen_name, rr.citizen_phone, rr.victim_count, rr.support_type,
              rr.priority_score, rr.flood_severity,
              it.name as incident_type, it.icon as incident_icon, it.color as incident_color,
              ul.name as urgency_level, ul.color as urgency_color,
              rt.name as team_name, rt.code as team_code,
              v.name as vehicle_name, v.plate_number
       FROM missions m
       JOIN rescue_requests rr ON m.request_id = rr.id
       LEFT JOIN incident_types it ON rr.incident_type_id = it.id
       LEFT JOIN urgency_levels ul ON rr.urgency_level_id = ul.id
       JOIN rescue_teams rt ON m.team_id = rt.id
       LEFT JOIN vehicles v ON m.vehicle_id = v.id
       ${where}
       ORDER BY rr.priority_score DESC, m.created_at DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { ...params, offset, limit },
    );

    res.json(
      formatResponse(
        result.recordset,
        countResult.recordset[0].total,
        page,
        limit,
      ),
    );
  } catch (err) {
    next(err);
  }
});

// PUT /api/missions/:id/status - update mission status
router.put("/:id/status", authenticate, async (req, res, next) => {
  try {
    const { status, notes, latitude, longitude } = req.body;
    const validStatuses = [
      "accepted",
      "en_route",
      "on_scene",
      "completed",
      "aborted",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Trạng thái không hợp lệ." });
    }

    let setClause = "status = @status, updated_at = GETDATE()";
    const params = { id: parseInt(req.params.id), status };

    if (status === "accepted" || status === "en_route") {
      setClause += ", started_at = COALESCE(started_at, GETDATE())";
    }
    if (status === "completed") {
      setClause += ", completed_at = GETDATE()";
    }
    if (notes) {
      setClause += ", notes = @notes";
      params.notes = notes;
    }

    await query(`UPDATE missions SET ${setClause} WHERE id = @id`, params);

    // Log mission action
    await query(
      `INSERT INTO mission_logs (mission_id, user_id, action, description, latitude, longitude)
       VALUES (@mission_id, @user_id, @action, @description, @lat, @lng)`,
      {
        mission_id: parseInt(req.params.id),
        user_id: req.user.id,
        action: status,
        description: notes || `Trạng thái chuyển sang: ${status}`,
        lat: latitude ? parseFloat(latitude) : null,
        lng: longitude ? parseFloat(longitude) : null,
      },
    );

    // Fetch mission data for syncing and notifications
    const mission = await query(
      `SELECT m.request_id, m.team_id, rr.tracking_code
       FROM missions m JOIN rescue_requests rr ON m.request_id = rr.id
       WHERE m.id = @id`,
      { id: parseInt(req.params.id) },
    );

    if (mission.recordset[0]) {
      const { request_id, team_id, tracking_code } = mission.recordset[0];

      // Sync request to in_progress when team is moving/on scene
      if (status === "en_route" || status === "on_scene") {
        await query(
          `UPDATE rescue_requests SET status = 'in_progress', updated_at = GETDATE(),
           started_at = COALESCE(started_at, GETDATE()) WHERE id = @request_id`,
          { request_id },
        );
      }

      // When completed: set rescue_team_confirmed flag — coordinator must close manually
      if (status === "completed") {
        await query(
          `UPDATE rescue_requests SET rescue_team_confirmed = 1, updated_at = GETDATE()
           WHERE id = @request_id`,
          { request_id },
        );
      }

      // Free team when mission ends
      if (status === "completed" || status === "aborted") {
        const activeMissions = await query(
          `SELECT COUNT(*) as cnt FROM missions
           WHERE team_id = @team_id AND status NOT IN ('completed', 'aborted')`,
          { team_id },
        );
        if (activeMissions.recordset[0].cnt === 0) {
          await query(
            "UPDATE rescue_teams SET status = 'available' WHERE id = @id",
            { id: team_id },
          );
        }
      }

      // Citizen notification for each step
      const notifMap = {
        accepted: { type: "mission_accepted", title: "Doi cuu ho da nhan nhiem vu", msg: "Doi cuu ho da xac nhan va dang chuan bi xuat phat den vi tri cua ban." },
        en_route: { type: "mission_en_route", title: "Doi cuu ho dang tren duong", msg: "Doi cuu ho dang di chuyen den vi tri cua ban, vui long cho." },
        on_scene: { type: "mission_on_scene", title: "Doi cuu ho da den hien truong", msg: "Doi cuu ho da co mat tai hien truong, dang tien hanh cuu ho." },
        completed: { type: "mission_completed", title: "Cuu ho hoan thanh", msg: "Doi cuu ho da hoan thanh nhiem vu. Dang cho coordinator xac nhan dong don." },
        aborted: { type: "mission_aborted", title: "Nhiem vu bi huy", msg: "Nhiem vu cuu ho da bi huy. Chung toi se co gang ho tro ban som nhat." },
      };
      if (notifMap[status]) {
        await query(
          `INSERT INTO notifications (tracking_code, type, title, message)
           VALUES (@code, @type, @title, @msg)`,
          {
            code: tracking_code,
            type: notifMap[status].type,
            title: notifMap[status].title,
            msg: notifMap[status].msg,
          },
        );
      }

      const io = req.app.get("io");
      if (io) {
        io.emit("mission_updated", { mission_id: parseInt(req.params.id), status });
        io.emit("request_updated", {
          id: request_id,
          status: (status === "en_route" || status === "on_scene") ? "in_progress" : undefined,
          rescue_team_confirmed: status === "completed" ? true : undefined,
        });
      }
    }

    res.json({ message: "Cap nhat nhiem vu thanh cong." });
  } catch (err) {
    next(err);
  }
});

// GET /api/missions/:id/logs
router.get("/:id/logs", authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT ml.*, u.full_name as user_name
       FROM mission_logs ml
       LEFT JOIN users u ON ml.user_id = u.id
       WHERE ml.mission_id = @id
       ORDER BY ml.created_at DESC`,
      { id: parseInt(req.params.id) },
    );
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// GET /api/missions/:id - Get single mission detail
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `
      SELECT m.*, 
        rr.tracking_code, rr.latitude, rr.longitude, rr.address, rr.description,
        rr.citizen_name, rr.citizen_phone, rr.victim_count, rr.support_type,
        rr.priority_score, rr.flood_severity, rr.rescued_count, rr.result_notes,
        it.name as incident_type, ul.name as urgency_level,
        rt.name as team_name, rt.code as team_code, rt.phone as team_phone,
        v.name as vehicle_name, v.plate_number
      FROM missions m
      JOIN rescue_requests rr ON m.request_id = rr.id
      LEFT JOIN incident_types it ON rr.incident_type_id = it.id
      LEFT JOIN urgency_levels ul ON rr.urgency_level_id = ul.id
      JOIN rescue_teams rt ON m.team_id = rt.id
      LEFT JOIN vehicles v ON m.vehicle_id = v.id
      WHERE m.id = @id
    `,
      { id: parseInt(req.params.id) },
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
    }

    // Get images
    const images = await query(
      "SELECT * FROM rescue_request_images WHERE request_id = @requestId",
      { requestId: result.recordset[0].request_id },
    );

    res.json({ ...result.recordset[0], images: images.recordset });
  } catch (err) {
    next(err);
  }
});

// PUT /api/missions/:id/result - Upload rescue result report (Rescue Team)
router.put(
  "/:id/result",
  authenticate,
  upload.array("images", 5),
  async (req, res, next) => {
    try {
      const { result_notes, rescued_count } = req.body;
      const missionId = parseInt(req.params.id);

      // Verify user belongs to the team
      const mission = await query(
        "SELECT request_id, team_id FROM missions WHERE id = @id",
        { id: missionId },
      );
      if (mission.recordset.length === 0) {
        return res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
      }

      const { request_id, team_id } = mission.recordset[0];

      // Update request with result
      await query(
        `
      UPDATE rescue_requests SET 
        result_notes = @notes, 
        rescued_count = @count,
        updated_at = GETDATE()
      WHERE id = @requestId
    `,
        {
          notes: result_notes || null,
          count: rescued_count ? parseInt(rescued_count) : 0,
          requestId: request_id,
        },
      );

      // Save uploaded result images
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await query(
            `
          INSERT INTO rescue_request_images (request_id, image_url, image_type)
          VALUES (@requestId, @url, 'result')
        `,
            { requestId: request_id, url: getFileUrl(file) },
          );
        }
      }

      // Log
      await query(
        `
      INSERT INTO mission_logs (mission_id, user_id, action, description)
      VALUES (@missionId, @userId, 'submit_result', @desc)
    `,
        {
          missionId,
          userId: req.user.id,
          desc: `Báo cáo kết quả: ${rescued_count || 0} người được cứu. ${result_notes || ""}`,
        },
      );

      const io = req.app.get("io");
      if (io) {
        io.emit("mission_updated", {
          mission_id: missionId,
          action: "result_submitted",
        });
      }

      res.json({ message: "Đã gửi báo cáo kết quả cứu hộ" });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
