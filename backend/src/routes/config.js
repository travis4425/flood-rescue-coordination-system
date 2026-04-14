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
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  },
);

// ==================== INCIDENT TYPES ====================

router.get("/incident-types", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM incident_types ORDER BY id");
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.post("/incident-types", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { name, code, icon, color, description, rescue_category, is_active } = req.body;
    if (!name || !code) return res.status(400).json({ error: "Thiếu tên hoặc mã" });
    const result = await query(
      `INSERT INTO incident_types (name, code, icon, color, description, rescue_category, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name, code,
        icon || null,
        color || null,
        description || null,
        rescue_category || "cuu_nan",
        is_active !== undefined ? Boolean(is_active) : true,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

router.put("/incident-types/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { name, code, icon, color, description, rescue_category, is_active } = req.body;
    if (!name || !code) return res.status(400).json({ error: "Thiếu tên hoặc mã" });
    const result = await query(
      `UPDATE incident_types
       SET name=$1, code=$2, icon=$3, color=$4, description=$5,
           rescue_category=$6, is_active=$7
       WHERE id=$8
       RETURNING *`,
      [
        name, code,
        icon || null,
        color || null,
        description || null,
        rescue_category || "cuu_nan",
        Boolean(is_active),
        parseInt(req.params.id),
      ]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Không tìm thấy" });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

router.delete("/incident-types/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    await query("DELETE FROM incident_types WHERE id=$1", [parseInt(req.params.id)]);
    res.json({ message: "Đã xóa" });
  } catch (err) { next(err); }
});

// ==================== URGENCY LEVELS ====================

router.get("/urgency-levels", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM urgency_levels ORDER BY priority_score DESC");
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.post("/urgency-levels", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { name, code, priority_score, color, max_response_minutes, description } = req.body;
    if (!name || !code || priority_score === undefined) return res.status(400).json({ error: "Thiếu tên, mã hoặc điểm ưu tiên" });
    const result = await query(
      `INSERT INTO urgency_levels (name, code, priority_score, color, max_response_minutes, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name, code,
        parseInt(priority_score),
        color || null,
        max_response_minutes ? parseInt(max_response_minutes) : null,
        description || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

router.put("/urgency-levels/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { name, code, priority_score, color, max_response_minutes, description } = req.body;
    if (!name || !code || priority_score === undefined) return res.status(400).json({ error: "Thiếu tên, mã hoặc điểm ưu tiên" });
    const result = await query(
      `UPDATE urgency_levels
       SET name=$1, code=$2, priority_score=$3, color=$4,
           max_response_minutes=$5, description=$6
       WHERE id=$7
       RETURNING *`,
      [
        name, code,
        parseInt(priority_score),
        color || null,
        max_response_minutes ? parseInt(max_response_minutes) : null,
        description || null,
        parseInt(req.params.id),
      ]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Không tìm thấy" });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

router.delete("/urgency-levels/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    await query("DELETE FROM urgency_levels WHERE id=$1", [parseInt(req.params.id)]);
    res.json({ message: "Đã xóa" });
  } catch (err) { next(err); }
});

// ==================== RELIEF ITEMS ====================

router.get("/relief-items", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM relief_items ORDER BY category, name");
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.post("/relief-items", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { name, category, unit, description, rescue_category } = req.body;
    if (!name) return res.status(400).json({ error: "Thiếu tên vật tư" });
    const result = await query(
      `INSERT INTO relief_items (name, category, unit, description, rescue_category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        name,
        category || null,
        unit || null,
        description || null,
        rescue_category || "all",
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

router.put("/relief-items/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { name, category, unit, description, rescue_category } = req.body;
    if (!name) return res.status(400).json({ error: "Thiếu tên vật tư" });
    const result = await query(
      `UPDATE relief_items
       SET name=$1, category=$2, unit=$3, description=$4, rescue_category=$5
       WHERE id=$6
       RETURNING *`,
      [
        name,
        category || null,
        unit || null,
        description || null,
        rescue_category || "all",
        parseInt(req.params.id),
      ]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Không tìm thấy" });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

router.delete("/relief-items/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    await query("DELETE FROM relief_items WHERE id=$1", [parseInt(req.params.id)]);
    res.json({ message: "Đã xóa" });
  } catch (err) { next(err); }
});

// GET /api/config/:key - Get single config value
router.get("/:key", authenticate, async (req, res, next) => {
  try {
    const result = await query(
      "SELECT * FROM system_config WHERE config_key = $1",
      [req.params.key],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy cấu hình" });
    }
    res.json(result.rows[0]);
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
        "SELECT id FROM system_config WHERE config_key = $1",
        [req.params.key],
      );

      if (existing.rows.length === 0) {
        // Create new config
        const result = await query(
          `INSERT INTO system_config (config_key, config_value, description)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [req.params.key, config_value, description || null],
        );
        return res.status(201).json(result.rows[0]);
      }

      // Update existing
      const updateParams = [config_value, req.params.key];
      let sql = "UPDATE system_config SET config_value = $1, updated_at = NOW()";

      if (description !== undefined) {
        updateParams.splice(1, 0, description); // insert before key
        sql += `, description = $2 WHERE config_key = $3`;
      } else {
        sql += " WHERE config_key = $2";
      }

      await query(sql, updateParams);

      // Log audit
      await query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
         VALUES ($1, 'update_config', 'system_config', $2, $3, $4)`,
        [
          req.user.id,
          existing.rows[0].id,
          JSON.stringify({ key: req.params.key, value: config_value }),
          req.ip,
        ],
      );

      const updated = await query(
        "SELECT * FROM system_config WHERE config_key = $1",
        [req.params.key],
      );
      res.json(updated.rows[0]);
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
      await query("DELETE FROM system_config WHERE config_key = $1", [
        req.params.key,
      ]);
      res.json({ message: "Đã xóa cấu hình" });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
