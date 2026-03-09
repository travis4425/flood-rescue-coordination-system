const router = require("express").Router();
const { query } = require("../config/database");
const { authenticate, authorize } = require("../middlewares/auth");

// GET /api/teams
router.get("/", authenticate, async (req, res, next) => {
  try {
    const { province_id, status } = req.query;
    let where = "WHERE 1=1";
    const params = {};
    if (province_id) {
      where += " AND rt.province_id = @province_id";
      params.province_id = parseInt(province_id);
    }
    if (status) {
      where += " AND rt.status = @status";
      params.status = status;
    }

    const result = await query(
      `SELECT rt.*, u.full_name as leader_name, u.phone as leader_phone,
              p.name as province_name, d.name as district_name,
              (SELECT COUNT(*) FROM rescue_team_members WHERE team_id = rt.id) as member_count,
              (SELECT COUNT(*) FROM missions WHERE team_id = rt.id AND status NOT IN ('completed','aborted')) as active_missions
       FROM rescue_teams rt
       LEFT JOIN users u ON rt.leader_id = u.id
       LEFT JOIN provinces p ON rt.province_id = p.id
       LEFT JOIN districts d ON rt.district_id = d.id
       ${where}
       ORDER BY rt.name`,
      params,
    );
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// POST /api/teams
router.post(
  "/",
  authenticate,
  authorize("admin", "manager", "coordinator"),
  async (req, res, next) => {
    try {
      const {
        name,
        code,
        leader_id,
        province_id,
        district_id,
        capacity,
        specialization,
        phone,
      } = req.body;

      // Coordinator can only create teams in their own province
      if (req.user.role === "coordinator" && req.user.province_id) {
        if (parseInt(province_id) !== req.user.province_id) {
          return res.status(403).json({ error: "Bạn chỉ có thể tạo đội trong tỉnh của mình." });
        }
      }

      const result = await query(
        `INSERT INTO rescue_teams (name, code, leader_id, province_id, district_id, capacity, specialization, phone)
       OUTPUT INSERTED.id
       VALUES (@name, @code, @leader_id, @province_id, @district_id, @capacity, @specialization, @phone)`,
        {
          name,
          code: code || `DT-${Math.random().toString(36).substring(2,6).toUpperCase()}`,
          leader_id: leader_id ? parseInt(leader_id) : null,
          province_id: parseInt(province_id),
          district_id: district_id ? parseInt(district_id) : null,
          capacity: parseInt(capacity) || 5,
          specialization,
          phone,
        },
      );
      res
        .status(201)
        .json({
          id: result.recordset[0].id,
          message: "Tạo đội cứu hộ thành công.",
        });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/teams/:id
router.put(
  "/:id",
  authenticate,
  authorize("admin", "manager", "coordinator"),
  async (req, res, next) => {
    try {
      const {
        name,
        leader_id,
        status,
        capacity,
        specialization,
        phone,
        current_latitude,
        current_longitude,
      } = req.body;
      let setClause = "updated_at = GETDATE()";
      const params = { id: parseInt(req.params.id) };

      if (name) {
        setClause += ", name = @name";
        params.name = name;
      }
      if (leader_id) {
        setClause += ", leader_id = @leader_id";
        params.leader_id = parseInt(leader_id);
      }
      if (status) {
        setClause += ", status = @status";
        params.status = status;
      }
      if (capacity) {
        setClause += ", capacity = @capacity";
        params.capacity = parseInt(capacity);
      }
      if (specialization) {
        setClause += ", specialization = @specialization";
        params.specialization = specialization;
      }
      if (phone) {
        setClause += ", phone = @phone";
        params.phone = phone;
      }
      if (current_latitude) {
        setClause += ", current_latitude = @lat";
        params.lat = parseFloat(current_latitude);
      }
      if (current_longitude) {
        setClause += ", current_longitude = @lng";
        params.lng = parseFloat(current_longitude);
      }

      await query(
        `UPDATE rescue_teams SET ${setClause} WHERE id = @id`,
        params,
      );
      res.json({ message: "Cập nhật đội cứu hộ thành công." });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/teams/:id/status - Update team status only (quick toggle)
router.put(
  "/:id/status",
  authenticate,
  authorize("admin", "manager", "coordinator"),
  async (req, res, next) => {
    try {
      const { status } = req.body;
      const validStatuses = ["available", "on_mission", "standby", "off_duty"];
      if (!status || !validStatuses.includes(status)) {
        return res
          .status(400)
          .json({
            error: `Trạng thái không hợp lệ. Chấp nhận: ${validStatuses.join(", ")}`,
          });
      }
      await query(
        "UPDATE rescue_teams SET status = @status, updated_at = GETDATE() WHERE id = @id",
        { id: parseInt(req.params.id), status },
      );
      const io = req.app.get("io");
      if (io)
        io.emit("team_status_updated", {
          team_id: parseInt(req.params.id),
          status,
        });
      res.json({ message: `Đã cập nhật trạng thái đội: ${status}` });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/teams/:id/location - update team GPS
router.put("/:id/location", authenticate, async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    await query(
      "UPDATE rescue_teams SET current_latitude = @lat, current_longitude = @lng, updated_at = GETDATE() WHERE id = @id",
      {
        id: parseInt(req.params.id),
        lat: parseFloat(latitude),
        lng: parseFloat(longitude),
      },
    );
    const io = req.app.get("io");
    if (io)
      io.emit("team_location_updated", {
        team_id: parseInt(req.params.id),
        latitude,
        longitude,
      });
    res.json({ message: "OK" });
  } catch (err) {
    next(err);
  }
});

// GET /api/teams/:id - Get single team detail
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT rt.*, u.full_name as leader_name, u.phone as leader_phone, u.email as leader_email,
              p.name as province_name, d.name as district_name
       FROM rescue_teams rt
       LEFT JOIN users u ON rt.leader_id = u.id
       LEFT JOIN provinces p ON rt.province_id = p.id
       LEFT JOIN districts d ON rt.district_id = d.id
       WHERE rt.id = @id`,
      { id: parseInt(req.params.id) },
    );
    if (result.recordset.length === 0)
      return res.status(404).json({ error: "Không tìm thấy đội" });

    // Get members
    const members = await query(
      `SELECT rtm.*, u.full_name, u.phone, u.email, u.avatar_url, u.role
       FROM rescue_team_members rtm
       JOIN users u ON rtm.user_id = u.id
       WHERE rtm.team_id = @teamId
       ORDER BY rtm.role_in_team, u.full_name`,
      { teamId: parseInt(req.params.id) },
    );

    // Get active missions
    const missions = await query(
      `SELECT m.id, m.status, rr.tracking_code, rr.address, rr.victim_count
       FROM missions m
       JOIN rescue_requests rr ON m.request_id = rr.id
       WHERE m.team_id = @teamId AND m.status NOT IN ('completed', 'aborted')`,
      { teamId: parseInt(req.params.id) },
    );

    res.json({
      ...result.recordset[0],
      members: members.recordset,
      active_missions: missions.recordset,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/teams/:id/members - List team members
router.get("/:id/members", authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT rtm.id, rtm.role_in_team, rtm.joined_at,
              u.id as user_id, u.full_name, u.phone, u.email, u.avatar_url, u.role as system_role
       FROM rescue_team_members rtm
       JOIN users u ON rtm.user_id = u.id
       WHERE rtm.team_id = @teamId
       ORDER BY rtm.role_in_team, u.full_name`,
      { teamId: parseInt(req.params.id) },
    );
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// POST /api/teams/:id/members - Add member to team (Manager/Admin)
router.post(
  "/:id/members",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      const { user_id, role_in_team = "member" } = req.body;
      if (!user_id) return res.status(400).json({ error: "Thiếu user_id" });

      // Check if already in team
      const existing = await query(
        "SELECT id FROM rescue_team_members WHERE team_id = @teamId AND user_id = @userId",
        { teamId: parseInt(req.params.id), userId: parseInt(user_id) },
      );
      if (existing.recordset.length > 0) {
        return res.status(409).json({ error: "Thành viên đã có trong đội" });
      }

      const result = await query(
        `
      INSERT INTO rescue_team_members (team_id, user_id, role_in_team)
      OUTPUT INSERTED.*
      VALUES (@teamId, @userId, @role)
    `,
        {
          teamId: parseInt(req.params.id),
          userId: parseInt(user_id),
          role: role_in_team,
        },
      );

      res.status(201).json(result.recordset[0]);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/teams/:id/members/:memberId - Remove member from team
router.delete(
  "/:id/members/:memberId",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      await query(
        "DELETE FROM rescue_team_members WHERE id = @id AND team_id = @teamId",
        { id: parseInt(req.params.memberId), teamId: parseInt(req.params.id) },
      );
      res.json({ message: "Đã xóa thành viên khỏi đội" });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
