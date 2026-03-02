const express = require("express");
const router = express.Router();
const { query } = require("../config/database");
const { authenticate, authorize } = require("../middlewares/auth");

// GET /api/config - Get all system config
router.get(
  "/",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      const result = await query(
        "SELECT * FROM system_config ORDER BY config_key",
      );
      res.json(result.recordset);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/config/:key - Get single config value
router.get("/:key", authenticate, async (req, res, next) => {
  try {
    const result = await query(
      "SELECT * FROM system_config WHERE config_key = @key",
      { key: req.params.key },
    );
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy cấu hình" });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/config/:key - Update config value (Admin only)
router.put(
  "/:key",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const { config_value, description } = req.body;

      const existing = await query(
        "SELECT id FROM system_config WHERE config_key = @key",
        { key: req.params.key },
      );

      if (existing.recordset.length === 0) {
        // Create new config
        const result = await query(
          `
        INSERT INTO system_config (config_key, config_value, description)
        OUTPUT INSERTED.*
        VALUES (@key, @value, @desc)
      `,
          {
            key: req.params.key,
            value: config_value,
            desc: description || null,
          },
        );
        return res.status(201).json(result.recordset[0]);
      }

      // Update existing
      let sql =
        "UPDATE system_config SET config_value = @value, updated_at = GETDATE()";
      const inputs = { key: req.params.key, value: config_value };

      if (description !== undefined) {
        sql += ", description = @desc";
        inputs.desc = description;
      }
      sql += " WHERE config_key = @key";

      await query(sql, inputs);

      // Log audit
      await query(
        `
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
      VALUES (@userId, 'update_config', 'system_config', @configId, @newValues, @ip)
    `,
        {
          userId: req.user.id,
          configId: existing.recordset[0].id,
          newValues: JSON.stringify({
            key: req.params.key,
            value: config_value,
          }),
          ip: req.ip,
        },
      );

      const updated = await query(
        "SELECT * FROM system_config WHERE config_key = @key",
        { key: req.params.key },
      );
      res.json(updated.recordset[0]);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/config/:key - Delete config (Admin only)
router.delete(
  "/:key",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      await query("DELETE FROM system_config WHERE config_key = @key", {
        key: req.params.key,
      });
      res.json({ message: "Đã xóa cấu hình" });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
