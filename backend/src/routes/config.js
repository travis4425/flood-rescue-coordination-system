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

// ==================== INCIDENT TYPES ====================

router.get("/incident-types", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM incident_types ORDER BY id");
    res.json(result.recordset);
  } catch (err) { next(err); }
});

router.post("/incident-types", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { name, code, icon, color, description, rescue_category, is_active } = req.body;
    if (!name || !code) return res.status(400).json({ error: "Thiếu tên hoặc mã" });
    const result = await query(
      `INSERT INTO incident_types (name, code, icon, color, description, rescue_category, is_active)
       OUTPUT INSERTED.*
       VALUES (@name, @code, @icon, @color, @desc, @rescue_category, @is_active)`,
      {
        name, code,
        icon: icon || null,
        color: color || null,
        desc: description || null,
        rescue_category: rescue_category || "cuu_nan",
        is_active: is_active !== undefined ? (is_active ? 1 : 0) : 1,
      }
    );
    res.status(201).json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.put("/incident-types/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { name, code, icon, color, description, rescue_category, is_active } = req.body;
    if (!name || !code) return res.status(400).json({ error: "Thiếu tên hoặc mã" });
    const result = await query(
      `UPDATE incident_types
       SET name=@name, code=@code, icon=@icon, color=@color, description=@desc,
           rescue_category=@rescue_category, is_active=@is_active
       OUTPUT INSERTED.*
       WHERE id=@id`,
      {
        id: parseInt(req.params.id),
        name, code,
        icon: icon || null,
        color: color || null,
        desc: description || null,
        rescue_category: rescue_category || "cuu_nan",
        is_active: is_active ? 1 : 0,
      }
    );
    if (!result.recordset.length) return res.status(404).json({ error: "Không tìm thấy" });
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.delete("/incident-types/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    await query("DELETE FROM incident_types WHERE id=@id", { id: parseInt(req.params.id) });
    res.json({ message: "Đã xóa" });
  } catch (err) { next(err); }
});

// ==================== URGENCY LEVELS ====================

router.get("/urgency-levels", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM urgency_levels ORDER BY priority_score DESC");
    res.json(result.recordset);
  } catch (err) { next(err); }
});

router.post("/urgency-levels", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { name, code, priority_score, color, max_response_minutes, description } = req.body;
    if (!name || !code || priority_score === undefined) return res.status(400).json({ error: "Thiếu tên, mã hoặc điểm ưu tiên" });
    const result = await query(
      `INSERT INTO urgency_levels (name, code, priority_score, color, max_response_minutes, description)
       OUTPUT INSERTED.*
       VALUES (@name, @code, @priority_score, @color, @max_response_minutes, @desc)`,
      {
        name, code,
        priority_score: parseInt(priority_score),
        color: color || null,
        max_response_minutes: max_response_minutes ? parseInt(max_response_minutes) : null,
        desc: description || null,
      }
    );
    res.status(201).json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.put("/urgency-levels/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { name, code, priority_score, color, max_response_minutes, description } = req.body;
    if (!name || !code || priority_score === undefined) return res.status(400).json({ error: "Thiếu tên, mã hoặc điểm ưu tiên" });
    const result = await query(
      `UPDATE urgency_levels
       SET name=@name, code=@code, priority_score=@priority_score, color=@color,
           max_response_minutes=@max_response_minutes, description=@desc
       OUTPUT INSERTED.*
       WHERE id=@id`,
      {
        id: parseInt(req.params.id),
        name, code,
        priority_score: parseInt(priority_score),
        color: color || null,
        max_response_minutes: max_response_minutes ? parseInt(max_response_minutes) : null,
        desc: description || null,
      }
    );
    if (!result.recordset.length) return res.status(404).json({ error: "Không tìm thấy" });
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.delete("/urgency-levels/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    await query("DELETE FROM urgency_levels WHERE id=@id", { id: parseInt(req.params.id) });
    res.json({ message: "Đã xóa" });
  } catch (err) { next(err); }
});

// ==================== RELIEF ITEMS ====================

router.get("/relief-items", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM relief_items ORDER BY category, name");
    res.json(result.recordset);
  } catch (err) { next(err); }
});

router.post("/relief-items", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { name, category, unit, description, rescue_category } = req.body;
    if (!name) return res.status(400).json({ error: "Thiếu tên vật tư" });
    const result = await query(
      `INSERT INTO relief_items (name, category, unit, description, rescue_category)
       OUTPUT INSERTED.*
       VALUES (@name, @category, @unit, @desc, @rescue_category)`,
      {
        name,
        category: category || null,
        unit: unit || null,
        desc: description || null,
        rescue_category: rescue_category || "all",
      }
    );
    res.status(201).json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.put("/relief-items/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { name, category, unit, description, rescue_category } = req.body;
    if (!name) return res.status(400).json({ error: "Thiếu tên vật tư" });
    const result = await query(
      `UPDATE relief_items
       SET name=@name, category=@category, unit=@unit, description=@desc, rescue_category=@rescue_category
       OUTPUT INSERTED.*
       WHERE id=@id`,
      {
        id: parseInt(req.params.id),
        name,
        category: category || null,
        unit: unit || null,
        desc: description || null,
        rescue_category: rescue_category || "all",
      }
    );
    if (!result.recordset.length) return res.status(404).json({ error: "Không tìm thấy" });
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.delete("/relief-items/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    await query("DELETE FROM relief_items WHERE id=@id", { id: parseInt(req.params.id) });
    res.json({ message: "Đã xóa" });
  } catch (err) { next(err); }
});

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
