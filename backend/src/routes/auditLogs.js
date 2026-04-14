const express = require("express");
const router = express.Router();
const { query } = require("../config/database");
const { authenticate, authorize } = require("../middlewares/auth");
const { getPagination, formatResponse } = require("../utils/helpers");

// GET /api/audit-logs - Get audit logs (Admin only)
router.get(
  "/",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const { user_id, action, entity_type, date_from, date_to } = req.query;

      const params = [];
      let where = "WHERE 1=1";

      if (user_id) {
        params.push(parseInt(user_id));
        where += ` AND al.user_id = $${params.length}`;
      }
      if (action) {
        params.push(`%${action}%`);
        where += ` AND al.action LIKE $${params.length}`;
      }
      if (entity_type) {
        params.push(entity_type);
        where += ` AND al.entity_type = $${params.length}`;
      }
      if (date_from) {
        params.push(date_from);
        where += ` AND al.created_at >= $${params.length}`;
      }
      if (date_to) {
        params.push(date_to);
        where += ` AND al.created_at <= $${params.length}`;
      }

      const countResult = await query(
        `SELECT COUNT(*) as total FROM audit_logs al ${where}`,
        params,
      );

      const listParams = [...params, limit, offset];
      const result = await query(
        `
      SELECT al.*, u.full_name, u.username, u.role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${where}
      ORDER BY al.created_at DESC
      LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
    `,
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

// GET /api/audit-logs/actions - Get distinct action types
router.get(
  "/actions",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      const result = await query(
        "SELECT DISTINCT action FROM audit_logs ORDER BY action",
      );
      res.json(result.rows.map((r) => r.action));
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
