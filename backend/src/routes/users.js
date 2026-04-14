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
      const params = [];
      let where = "WHERE 1=1";

      if (req.user.role === "manager" && req.user.province_id) {
        params.push(req.user.province_id);
        where += ` AND u.province_id = $${params.length}`;
      }
      if (role) {
        params.push(role);
        where += ` AND u.role = $${params.length}`;
      }
      if (is_active !== undefined) {
        params.push(is_active === "true");
        where += ` AND u.is_active = $${params.length}`;
      }
      if (search) {
        params.push(`%${search}%`);
        where += ` AND (u.full_name LIKE $${params.length} OR u.username LIKE $${params.length} OR u.email LIKE $${params.length})`;
      }

      const countResult = await query(
        `SELECT COUNT(*) as total FROM users u ${where}`,
        params,
      );

      const listParams = [...params, limit, offset];
      const result = await query(
        `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.role, u.province_id,
              u.is_active, u.last_login, u.created_at,
              p.name as province_name
       FROM users u
       LEFT JOIN provinces p ON u.province_id = p.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
        listParams,
      );
      res.json(
        formatResponse(
          result.rows,
          parseInt(countResult.rows[0].total),
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
      const { username, email, password, full_name, phone, role, province_id } = req.body;
      if (!username || !email || !password || !full_name || !role) {
        return res.status(400).json({ error: "Thiếu thông tin bắt buộc." });
      }
      const hash = await bcrypt.hash(password, 10);
      const result = await query(
        `INSERT INTO users (username, email, password_hash, full_name, phone, role, province_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          username, email, hash, full_name,
          phone || null, role,
          province_id ? parseInt(province_id) : null,
        ],
      );
      const newUserId = result.rows[0].id;

      // Tự động tạo coordinator_regions nếu role là coordinator và có province_id
      if (role === "coordinator" && province_id) {
        await query(
          `INSERT INTO coordinator_regions (user_id, province_id, max_workload, current_workload)
           VALUES ($1, $2, 20, 0)`,
          [newUserId, parseInt(province_id)],
        );
      }

      // Tự động xếp rescue_team vào đội ít thành viên nhất trong cùng tỉnh
      if (role === "rescue_team" && province_id) {
        const teamResult = await query(
          `SELECT rt.id
           FROM rescue_teams rt
           WHERE rt.province_id = $1 AND rt.status != 'off_duty'
           ORDER BY (SELECT COUNT(*) FROM rescue_team_members WHERE team_id = rt.id) ASC
           LIMIT 1`,
          [parseInt(province_id)],
        );
        if (teamResult.rows.length > 0) {
          const teamId = teamResult.rows[0].id;
          await query(
            `INSERT INTO rescue_team_members (team_id, user_id, role_in_team) VALUES ($1, $2, 'member')`,
            [teamId, newUserId],
          );
        }
      }

      res.status(201).json({ id: newUserId, message: "Tạo tài khoản thành công." });
    } catch (err) {
      if (err.message?.includes("unique") || err.message?.includes("UNIQUE"))
        return res.status(400).json({ error: "Username hoặc email đã tồn tại." });
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
      const params = [parseInt(req.params.id)];
      const setClauses = ["updated_at = NOW()"];

      if (full_name !== undefined) { params.push(full_name); setClauses.push(`full_name = $${params.length}`); }
      if (phone !== undefined)     { params.push(phone);     setClauses.push(`phone = $${params.length}`); }
      if (role !== undefined)      { params.push(role);      setClauses.push(`role = $${params.length}`); }
      if (province_id !== undefined) {
        params.push(province_id ? parseInt(province_id) : null);
        setClauses.push(`province_id = $${params.length}`);
      }
      if (is_active !== undefined) {
        params.push(Boolean(is_active));
        setClauses.push(`is_active = $${params.length}`);
      }

      await query(
        `UPDATE users SET ${setClauses.join(", ")} WHERE id = $1`,
        params,
      );
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
        "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
        [hash, parseInt(req.params.id)],
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
         WHERE u.role = 'coordinator' AND u.is_active = true
         ORDER BY cr.current_workload ASC`,
      );
      res.json(result.rows);
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
      const userId = parseInt(req.params.id);
      const result = await query(
        `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.role,
              u.province_id, u.is_active, u.last_login, u.created_at,
              p.name as province_name
         FROM users u
         LEFT JOIN provinces p ON u.province_id = p.id
         WHERE u.id = $1`,
        [userId],
      );
      if (result.rows.length === 0)
        return res.status(404).json({ error: "Không tìm thấy user" });

      const regions = await query(
        `SELECT cr.*, p.name as province_name, d.name as district_name
         FROM coordinator_regions cr
         LEFT JOIN provinces p ON cr.province_id = p.id
         LEFT JOIN districts d ON cr.district_id = d.id
         WHERE cr.user_id = $1`,
        [userId],
      );

      const teams = await query(
        `SELECT rtm.role_in_team, rt.id as team_id, rt.name as team_name, rt.code as team_code
         FROM rescue_team_members rtm
         JOIN rescue_teams rt ON rtm.team_id = rt.id
         WHERE rtm.user_id = $1`,
        [userId],
      );

      res.json({
        ...result.rows[0],
        coordinator_regions: regions.rows,
        teams: teams.rows,
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
      const userId = parseInt(req.params.id);
      const result = await query(
        `UPDATE users SET is_active = NOT is_active, updated_at = NOW()
         WHERE id = $1
         RETURNING is_active`,
        [userId],
      );
      if (result.rows.length === 0)
        return res.status(404).json({ error: "Không tìm thấy user" });

      const newStatus = result.rows[0].is_active;

      // Audit log
      await query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
         VALUES ($1, $2, 'user', $3, $4, $5)`,
        [
          req.user.id,
          newStatus ? "activate_user" : "deactivate_user",
          userId,
          JSON.stringify({ is_active: newStatus }),
          req.ip,
        ],
      );

      res.json({
        message: newStatus ? "Đã kích hoạt tài khoản" : "Đã vô hiệu hóa tài khoản",
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
         WHERE cr.user_id = $1
         ORDER BY cr.is_primary DESC`,
        [parseInt(req.params.id)],
      );
      res.json(result.rows);
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
      const { province_id, district_id, is_primary = false, max_workload = 20 } = req.body;
      if (!province_id && !district_id) {
        return res.status(400).json({ error: "Cần ít nhất province_id hoặc district_id" });
      }

      // Verify user is coordinator
      const user = await query(
        "SELECT role FROM users WHERE id = $1 AND role = 'coordinator'",
        [parseInt(req.params.id)],
      );
      if (user.rows.length === 0)
        return res.status(400).json({ error: "User không phải coordinator" });

      const result = await query(
        `INSERT INTO coordinator_regions (user_id, province_id, district_id, is_primary, max_workload)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          parseInt(req.params.id),
          province_id ? parseInt(province_id) : null,
          district_id ? parseInt(district_id) : null,
          Boolean(is_primary),
          parseInt(max_workload),
        ],
      );

      res.status(201).json(result.rows[0]);
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
      const params = [parseInt(req.params.regionId), parseInt(req.params.id)];
      const setClauses = [];

      if (province_id !== undefined) {
        params.push(province_id ? parseInt(province_id) : null);
        setClauses.push(`province_id = $${params.length}`);
      }
      if (district_id !== undefined) {
        params.push(district_id ? parseInt(district_id) : null);
        setClauses.push(`district_id = $${params.length}`);
      }
      if (is_primary !== undefined) {
        params.push(Boolean(is_primary));
        setClauses.push(`is_primary = $${params.length}`);
      }
      if (max_workload !== undefined) {
        params.push(parseInt(max_workload));
        setClauses.push(`max_workload = $${params.length}`);
      }

      if (!setClauses.length)
        return res.status(400).json({ error: "Không có dữ liệu cập nhật" });

      await query(
        `UPDATE coordinator_regions SET ${setClauses.join(", ")} WHERE id = $1 AND user_id = $2`,
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
        "DELETE FROM coordinator_regions WHERE id = $1 AND user_id = $2",
        [parseInt(req.params.regionId), parseInt(req.params.id)],
      );
      res.json({ message: "Đã xóa phân vùng coordinator" });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
