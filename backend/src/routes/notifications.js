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

    let where = "WHERE n.user_id = @userId";
    const inputs = { userId: req.user.id };

    if (is_read !== undefined) {
      where += " AND n.is_read = @isRead";
      inputs.isRead = is_read === "true" ? 1 : 0;
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM notifications n ${where}`,
      inputs,
    );

    const result = await query(
      `
      SELECT n.*, 
        CASE WHEN n.metadata IS NOT NULL THEN n.metadata ELSE NULL END as metadata
      FROM notifications n
      ${where}
      ORDER BY n.created_at DESC
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
});

// GET /api/notifications/unread-count
router.get("/unread-count", authenticate, async (req, res, next) => {
  try {
    const result = await query(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = @userId AND is_read = 0",
      { userId: req.user.id },
    );
    res.json({ count: result.recordset[0].count });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read - Mark as read
router.put("/:id/read", authenticate, async (req, res, next) => {
  try {
    await query(
      "UPDATE notifications SET is_read = 1 WHERE id = @id AND user_id = @userId",
      { id: parseInt(req.params.id), userId: req.user.id },
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
      "UPDATE notifications SET is_read = 1 WHERE user_id = @userId AND is_read = 0",
      { userId: req.user.id },
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
      "DELETE FROM notifications WHERE id = @id AND user_id = @userId",
      { id: parseInt(req.params.id), userId: req.user.id },
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
      OUTPUT INSERTED.*
      VALUES (@user_id, @tracking_code, @type, @title, @message, @metadata)
    `,
      {
        user_id: user_id || null,
        tracking_code: tracking_code || null,
        type,
        title,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    );

    // Emit realtime notification
    const io = req.app.get("io");
    if (io && user_id) {
      io.to(`user_${user_id}`).emit("notification", result.recordset[0]);
    }

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
