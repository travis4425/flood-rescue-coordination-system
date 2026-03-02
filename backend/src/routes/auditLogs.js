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

      let where = "WHERE 1=1";
      const inputs = {};

      if (user_id) {
        where += " AND al.user_id = @userId";
        inputs.userId = parseInt(user_id);
      }
      if (action) {
        where += " AND al.action LIKE @action";
        inputs.action = `%${action}%`;
      }
      if (entity_type) {
        where += " AND al.entity_type = @entityType";
        inputs.entityType = entity_type;
      }
      if (date_from) {
        where += " AND al.created_at >= @dateFrom";
        inputs.dateFrom = date_from;
      }
      if (date_to) {
        where += " AND al.created_at <= @dateTo";
        inputs.dateTo = date_to;
      }

      const countResult = await query(
        `SELECT COUNT(*) as total FROM audit_logs al ${where}`,
        inputs,
      );

      const result = await query(
        `
      SELECT al.*, u.full_name, u.username, u.role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${where}
      ORDER BY al.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `,
        { ...inputs, offset, limit },
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
      res.json(result.recordset.map((r) => r.action));
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
