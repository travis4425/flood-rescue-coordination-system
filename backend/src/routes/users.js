const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { query } = require("../config/database");
const { authenticate, authorize } = require("../middlewares/auth");
const { getPagination, formatResponse } = require("../utils/helpers");

// GET /api/users
router.get(
  "/",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { role, search, is_active } = req.query;
      let where = "WHERE 1=1";
      const params = {};

      if (req.user.role === "manager" && req.user.province_id) {
        where += " AND u.province_id = @province_id";
        params.province_id = req.user.province_id;
      }
      if (role) {
        where += " AND u.role = @role";
        params.role = role;
      }
      if (is_active !== undefined) {
        where += " AND u.is_active = @is_active";
        params.is_active = is_active === "true" ? 1 : 0;
      }
      if (search) {
        where +=
          " AND (u.full_name LIKE @search OR u.username LIKE @search OR u.email LIKE @search)";
        params.search = `%${search}%`;
      }

      const countResult = await query(
        `SELECT COUNT(*) as total FROM users u ${where}`,
        params,
      );
      const result = await query(
        `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.role, u.province_id,
              u.is_active, u.last_login, u.created_at,
              p.name as province_name
       FROM users u
       LEFT JOIN provinces p ON u.province_id = p.id
       ${where}
       ORDER BY u.created_at DESC
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
  },
);

// POST /api/users
router.post(
  "/",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      const {
        username,
        email,
        password,
        full_name,
        phone,
        role,
        province_id,
      } = req.body;
      if (!username || !email || !password || !full_name || !role) {
        return res.status(400).json({ error: "Thiếu thông tin bắt buộc." });
      }
      const hash = await bcrypt.hash(password, 10);
      const result = await query(
        `INSERT INTO users (username, email, password_hash, full_name, phone, role, province_id)
       OUTPUT INSERTED.id VALUES (@username, @email, @hash, @full_name, @phone, @role, @province_id)`,
        {
          username,
          email,
          hash,
          full_name,
          phone,
          role,
          province_id: province_id ? parseInt(province_id) : null,
        },
      );
      const newUserId = result.recordset[0].id;

      // Tự động tạo coordinator_regions nếu role là coordinator và có province_id
      if (role === "coordinator" && province_id) {
        await query(
          `INSERT INTO coordinator_regions (user_id, province_id, max_workload, current_workload)
           VALUES (@user_id, @province_id, 20, 0)`,
          { user_id: newUserId, province_id: parseInt(province_id) },
        );
      }

      // Tự động xếp rescue_team vào đội ít thành viên nhất trong cùng tỉnh
      if (role === "rescue_team" && province_id) {
        const teamResult = await query(
          `SELECT TOP 1 rt.id
           FROM rescue_teams rt
           WHERE rt.province_id = @province_id AND rt.status != 'off_duty'
           ORDER BY (SELECT COUNT(*) FROM rescue_team_members WHERE team_id = rt.id) ASC`,
          { province_id: parseInt(province_id) },
        );
        if (teamResult.recordset.length > 0) {
          const teamId = teamResult.recordset[0].id;
          await query(
            `INSERT INTO rescue_team_members (team_id, user_id, role_in_team) VALUES (@teamId, @userId, 'member')`,
            { teamId, userId: newUserId },
          );
        }
      }

      res
        .status(201)
        .json({ id: newUserId, message: "Tạo tài khoản thành công." });
    } catch (err) {
      if (err.message?.includes("UNIQUE"))
        return res
          .status(400)
          .json({ error: "Username hoặc email đã tồn tại." });
      next(err);
    }
  },
);

// PUT /api/users/:id
router.put(
  "/:id",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      const { full_name, phone, role, province_id, is_active } = req.body;
      let setClause = "updated_at = GETDATE()";
      const params = { id: parseInt(req.params.id) };
      if (full_name) {
        setClause += ", full_name = @full_name";
        params.full_name = full_name;
      }
      if (phone) {
        setClause += ", phone = @phone";
        params.phone = phone;
      }
      if (role) {
        setClause += ", role = @role";
        params.role = role;
      }
      if (province_id !== undefined) {
        setClause += ", province_id = @province_id";
        params.province_id = province_id ? parseInt(province_id) : null;
      }
      if (is_active !== undefined) {
        setClause += ", is_active = @is_active";
        params.is_active = is_active ? 1 : 0;
      }

      await query(`UPDATE users SET ${setClause} WHERE id = @id`, params);
      res.json({ message: "Cập nhật tài khoản thành công." });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/users/:id/reset-password
router.put(
  "/:id/reset-password",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const hash = await bcrypt.hash("123456", 10);
      await query(
        "UPDATE users SET password_hash = @hash, updated_at = GETDATE() WHERE id = @id",
        { hash, id: parseInt(req.params.id) },
      );
      res.json({ message: "Đã đặt lại mật khẩu thành: 123456" });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/users/coordinators
router.get(
  "/coordinators",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT u.id, u.full_name, u.phone, u.province_id, p.name as province_name,
              cr.id as assignment_id, cr.max_workload, cr.current_workload,
              cr.district_id, d.name as district_name, cr.is_primary
       FROM users u
       JOIN coordinator_regions cr ON u.id = cr.user_id
       LEFT JOIN provinces p ON cr.province_id = p.id
       LEFT JOIN districts d ON cr.district_id = d.id
       WHERE u.role = 'coordinator' AND u.is_active = 1
       ORDER BY cr.current_workload ASC`,
      );
      res.json(result.recordset);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/users/:id - Get single user detail (Admin/Manager)
router.get(
  "/:id",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.role,
              u.province_id, u.is_active, u.last_login, u.created_at,
              p.name as province_name
       FROM users u
       LEFT JOIN provinces p ON u.province_id = p.id
       WHERE u.id = @id`,
        { id: parseInt(req.params.id) },
      );
      if (result.recordset.length === 0)
        return res.status(404).json({ error: "Không tìm thấy user" });

      // Get coordinator regions if applicable
      const regions = await query(
        `SELECT cr.*, p.name as province_name, d.name as district_name
       FROM coordinator_regions cr
       LEFT JOIN provinces p ON cr.province_id = p.id
       LEFT JOIN districts d ON cr.district_id = d.id
       WHERE cr.user_id = @userId`,
        { userId: parseInt(req.params.id) },
      );

      // Get team memberships
      const teams = await query(
        `SELECT rtm.role_in_team, rt.id as team_id, rt.name as team_name, rt.code as team_code
       FROM rescue_team_members rtm
       JOIN rescue_teams rt ON rtm.team_id = rt.id
       WHERE rtm.user_id = @userId`,
        { userId: parseInt(req.params.id) },
      );

      res.json({
        ...result.recordset[0],
        coordinator_regions: regions.recordset,
        teams: teams.recordset,
      });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/users/:id/toggle-active - Quick toggle active/inactive (Admin)
router.put(
  "/:id/toggle-active",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      const result = await query(
        `UPDATE users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = GETDATE()
       OUTPUT INSERTED.is_active
       WHERE id = @id`,
        { id: parseInt(req.params.id) },
      );
      if (result.recordset.length === 0)
        return res.status(404).json({ error: "Không tìm thấy user" });

      const newStatus = result.recordset[0].is_active;

      // Audit log
      await query(
        `
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
      VALUES (@userId, @action, 'user', @entityId, @newVal, @ip)
    `,
        {
          userId: req.user.id,
          action: newStatus ? "activate_user" : "deactivate_user",
          entityId: parseInt(req.params.id),
          newVal: JSON.stringify({ is_active: newStatus }),
          ip: req.ip,
        },
      );

      res.json({
        message: newStatus
          ? "Đã kích hoạt tài khoản"
          : "Đã vô hiệu hóa tài khoản",
        is_active: newStatus,
      });
    } catch (err) {
      next(err);
    }
  },
);

// --- COORDINATOR REGION ASSIGNMENTS (Admin/Manager) ---

// GET /api/users/:id/coordinator-regions
router.get(
  "/:id/coordinator-regions",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT cr.*, p.name as province_name, d.name as district_name
       FROM coordinator_regions cr
       LEFT JOIN provinces p ON cr.province_id = p.id
       LEFT JOIN districts d ON cr.district_id = d.id
       WHERE cr.user_id = @userId
       ORDER BY cr.is_primary DESC`,
        { userId: parseInt(req.params.id) },
      );
      res.json(result.recordset);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/users/:id/coordinator-regions - Assign coordinator to region
router.post(
  "/:id/coordinator-regions",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      const {
        province_id,
        district_id,
        is_primary = false,
        max_workload = 20,
      } = req.body;
      if (!province_id && !district_id) {
        return res
          .status(400)
          .json({ error: "Cần ít nhất province_id hoặc district_id" });
      }

      // Verify user is coordinator
      const user = await query(
        "SELECT role FROM users WHERE id = @id AND role = 'coordinator'",
        { id: parseInt(req.params.id) },
      );
      if (user.recordset.length === 0)
        return res.status(400).json({ error: "User không phải coordinator" });

      const result = await query(
        `
      INSERT INTO coordinator_regions (user_id, province_id, district_id, is_primary, max_workload)
      OUTPUT INSERTED.*
      VALUES (@userId, @provinceId, @districtId, @isPrimary, @maxWorkload)
    `,
        {
          userId: parseInt(req.params.id),
          provinceId: province_id ? parseInt(province_id) : null,
          districtId: district_id ? parseInt(district_id) : null,
          isPrimary: is_primary ? 1 : 0,
          maxWorkload: parseInt(max_workload),
        },
      );

      res.status(201).json(result.recordset[0]);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/users/:id/coordinator-regions/:regionId - Update assignment
router.put(
  "/:id/coordinator-regions/:regionId",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      const { province_id, district_id, is_primary, max_workload } = req.body;
      let setClause = "";
      const params = {
        id: parseInt(req.params.regionId),
        userId: parseInt(req.params.id),
      };

      if (province_id !== undefined) {
        setClause += "province_id = @provinceId, ";
        params.provinceId = province_id ? parseInt(province_id) : null;
      }
      if (district_id !== undefined) {
        setClause += "district_id = @districtId, ";
        params.districtId = district_id ? parseInt(district_id) : null;
      }
      if (is_primary !== undefined) {
        setClause += "is_primary = @isPrimary, ";
        params.isPrimary = is_primary ? 1 : 0;
      }
      if (max_workload !== undefined) {
        setClause += "max_workload = @maxWorkload, ";
        params.maxWorkload = parseInt(max_workload);
      }

      if (!setClause)
        return res.status(400).json({ error: "Không có dữ liệu cập nhật" });
      setClause = setClause.slice(0, -2); // remove trailing comma

      await query(
        `UPDATE coordinator_regions SET ${setClause} WHERE id = @id AND user_id = @userId`,
        params,
      );
      res.json({ message: "Đã cập nhật phân vùng coordinator" });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/users/:id/coordinator-regions/:regionId - Remove assignment
router.delete(
  "/:id/coordinator-regions/:regionId",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      await query(
        "DELETE FROM coordinator_regions WHERE id = @id AND user_id = @userId",
        { id: parseInt(req.params.regionId), userId: parseInt(req.params.id) },
      );
      res.json({ message: "Đã xóa phân vùng coordinator" });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
