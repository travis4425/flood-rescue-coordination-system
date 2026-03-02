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

    // Sync request status
    const mission = await query(
      "SELECT request_id, team_id FROM missions WHERE id = @id",
      { id: parseInt(req.params.id) },
    );
    if (mission.recordset[0]) {
      const requestStatus =
        status === "en_route" || status === "on_scene"
          ? "in_progress"
          : status === "completed"
            ? "completed"
            : null;
      if (requestStatus) {
        await query(
          `UPDATE rescue_requests SET status = @status, updated_at = GETDATE()
           ${requestStatus === "in_progress" ? ", started_at = COALESCE(started_at, GETDATE())" : ""}
           ${requestStatus === "completed" ? ", completed_at = GETDATE(), response_time_minutes = DATEDIFF(MINUTE, created_at, GETDATE())" : ""}
           WHERE id = @request_id`,
          {
            status: requestStatus,
            request_id: mission.recordset[0].request_id,
          },
        );
      }
      // Update team status on completion
      if (status === "completed" || status === "aborted") {
        const activeMissions = await query(
          `SELECT COUNT(*) as cnt FROM missions 
           WHERE team_id = @team_id AND status NOT IN ('completed', 'aborted')`,
          { team_id: mission.recordset[0].team_id },
        );
        if (activeMissions.recordset[0].cnt === 0) {
          await query(
            "UPDATE rescue_teams SET status = 'available' WHERE id = @id",
            { id: mission.recordset[0].team_id },
          );
        }
      }
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("mission_updated", {
        mission_id: parseInt(req.params.id),
        status,
      });
      if (mission.recordset[0]) {
        io.emit("request_updated", {
          id: mission.recordset[0].request_id,
          status: status === "completed" ? "completed" : "in_progress",
        });
      }
    }

    res.json({ message: "Cập nhật nhiệm vụ thành công." });
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
