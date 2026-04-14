const express = require("express");
const router = express.Router();
const { query } = require("../config/database");
const { authenticate } = require("../middlewares/auth");
const { getPagination, formatResponse } = require("../utils/helpers");

// GET /api/notifications - Get user's notifications
router.get("/", authenticate, async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { is_read } = req.query;

    const params = [req.user.id];
    let where = "WHERE n.user_id = $1";

    if (is_read !== undefined) {
      params.push(is_read === "true");
      where += ` AND n.is_read = $${params.length}`;
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM notifications n ${where}`,
      params,
    );

    params.push(limit, offset);
    const result = await query(
      `
      SELECT n.*,
        CASE WHEN n.metadata IS NOT NULL THEN n.metadata ELSE NULL END as metadata
      FROM notifications n
      ${where}
      ORDER BY n.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
      params,
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
});

// GET /api/notifications/unread-count
router.get("/unread-count", authenticate, async (req, res, next) => {
  try {
    const result = await query(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false",
      [req.user.id],
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read - Mark as read
router.put("/:id/read", authenticate, async (req, res, next) => {
  try {
    await query(
      "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2",
      [parseInt(req.params.id), req.user.id],
    );
    res.json({ message: "Đã đánh dấu đã đọc" });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read-all - Mark all as read
router.put("/read-all", authenticate, async (req, res, next) => {
  try {
    await query(
      "UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false",
      [req.user.id],
    );
    res.json({ message: "Đã đánh dấu tất cả đã đọc" });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/:id
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    await query(
      "DELETE FROM notifications WHERE id = $1 AND user_id = $2",
      [parseInt(req.params.id), req.user.id],
    );
    res.json({ message: "Đã xóa thông báo" });
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications - Create notification (internal use by system/admin)
router.post("/", authenticate, async (req, res, next) => {
  try {
    if (!["admin", "manager"].includes(req.user.role)) {
      return res.status(403).json({ error: "Không có quyền" });
    }
    const { user_id, tracking_code, type, title, message, metadata } = req.body;

    const result = await query(
      `
      INSERT INTO notifications (user_id, tracking_code, type, title, message, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [
        user_id || null,
        tracking_code || null,
        type,
        title,
        message,
        metadata ? JSON.stringify(metadata) : null,
      ],
    );

    // Emit realtime notification
    const io = req.app.get("io");
    if (io && user_id) {
      io.to(`user_${user_id}`).emit("notification", result.rows[0]);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
