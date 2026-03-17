const router = require("express").Router();
const { query } = require("../config/database");
const { authenticate, authorize } = require("../middlewares/auth");

// GET /api/regions
router.get("/", async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM regions ORDER BY id");
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// GET /api/regions/provinces
router.get("/provinces", async (req, res, next) => {
  try {
    const { region_id } = req.query;
    let where = "";
    const params = {};
    if (region_id) {
      where = "WHERE region_id = @region_id";
      params.region_id = parseInt(region_id);
    }
    const result = await query(
      `SELECT p.*, r.name as region_name FROM provinces p
       JOIN regions r ON p.region_id = r.id ${where} ORDER BY r.id, p.name`,
      params,
    );
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// GET /api/regions/districts
router.get("/districts", async (req, res, next) => {
  try {
    const { province_id } = req.query;
    let where = "";
    const params = {};
    if (province_id) {
      where = "WHERE d.province_id = @province_id";
      params.province_id = parseInt(province_id);
    }
    const result = await query(
      `SELECT d.*, p.name as province_name FROM districts d
       JOIN provinces p ON d.province_id = p.id ${where} ORDER BY d.name`,
      params,
    );
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// GET /api/regions/wards
router.get("/wards", async (req, res, next) => {
  try {
    const { district_id } = req.query;
    if (!district_id) return res.status(400).json({ error: "Cần district_id" });
    const result = await query(
      "SELECT * FROM wards WHERE district_id = @district_id ORDER BY name",
      { district_id: parseInt(district_id) },
    );
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// GET /api/regions/incident-types
router.get("/incident-types", async (req, res, next) => {
  try {
    const result = await query(
      "SELECT * FROM incident_types WHERE is_active = 1 ORDER BY id",
    );
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// GET /api/regions/urgency-levels
router.get("/urgency-levels", async (req, res, next) => {
  try {
    const result = await query(
      "SELECT * FROM urgency_levels ORDER BY priority_score DESC",
    );
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// GET /api/regions/weather-alerts
router.get("/weather-alerts", async (req, res, next) => {
  try {
    const { province_id, include_expired } = req.query;
    let where =
      include_expired === "true" ? "WHERE 1=1" : "WHERE expires_at > GETDATE()";
    const params = {};
    if (province_id) {
      where += " AND province_id = @province_id";
      params.province_id = parseInt(province_id);
    }
    const result = await query(
      `SELECT wa.*, p.name as province_name FROM weather_alerts wa
       LEFT JOIN provinces p ON wa.province_id = p.id
       ${where} ORDER BY wa.severity DESC, wa.starts_at DESC`,
      params,
    );
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// POST /api/regions/weather-alerts - Create weather alert (Manager/Admin)
router.post(
  "/weather-alerts",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      const {
        province_id,
        alert_type,
        severity,
        title,
        description,
        starts_at,
        expires_at,
        source,
      } = req.body;
      if (!title || !severity)
        return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });

      const result = await query(
        `
      INSERT INTO weather_alerts (province_id, alert_type, severity, title, description, starts_at, expires_at, source)
      OUTPUT INSERTED.*
      VALUES (@province_id, @alert_type, @severity, @title, @description, @starts_at, @expires_at, @source)
    `,
        {
          province_id: province_id ? parseInt(province_id) : null,
          alert_type: alert_type || "flood",
          severity,
          title,
          description: description || null,
          starts_at: starts_at || new Date().toISOString(),
          expires_at: expires_at || null,
          source: source || null,
        },
      );

      // Emit realtime alert
      const io = req.app.get("io");
      if (io) {
        io.emit("weather_alert", result.recordset[0]);
        if (province_id)
          io.to(`province_${province_id}`).emit(
            "weather_alert",
            result.recordset[0],
          );
      }

      res.status(201).json(result.recordset[0]);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/regions/weather-alerts/:id - Update weather alert
router.put(
  "/weather-alerts/:id",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      const {
        province_id,
        alert_type,
        severity,
        title,
        description,
        starts_at,
        expires_at,
        source,
      } = req.body;
      await query(
        `
      UPDATE weather_alerts SET
        province_id = @province_id, alert_type = @alert_type, severity = @severity,
        title = @title, description = @description, starts_at = @starts_at,
        expires_at = @expires_at, source = @source
      WHERE id = @id
    `,
        {
          id: parseInt(req.params.id),
          province_id: province_id ? parseInt(province_id) : null,
          alert_type,
          severity,
          title,
          description,
          starts_at,
          expires_at,
          source,
        },
      );
      res.json({ message: "Đã cập nhật cảnh báo" });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/regions/weather-alerts/:id
router.delete(
  "/weather-alerts/:id",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      await query("DELETE FROM weather_alerts WHERE id = @id", {
        id: parseInt(req.params.id),
      });
      res.json({ message: "Đã xóa cảnh báo" });
    } catch (err) {
      next(err);
    }
  },
);

// ==================== WEATHER API (OpenWeatherMap) ====================

const weatherService = require("../services/weatherService");

// GET /api/regions/weather-status - Kiểm tra API key đã cấu hình chưa
router.get("/weather-status", (req, res) => {
  res.json({
    configured: weatherService.isConfigured(),
    message: weatherService.isConfigured()
      ? "OpenWeatherMap API đã được cấu hình"
      : "Chưa cấu hình OPENWEATHERMAP_API_KEY trong file .env",
  });
});

// GET /api/regions/weather-current/:provinceId - Thời tiết hiện tại theo tỉnh
router.get("/weather-current/:provinceId", async (req, res, next) => {
  try {
    if (!weatherService.isConfigured()) {
      return res.status(503).json({
        error: "Weather API chưa cấu hình",
        hint: "Thêm OPENWEATHERMAP_API_KEY vào file .env (đăng ký miễn phí tại openweathermap.org)",
      });
    }

    const provinceId = parseInt(req.params.provinceId);
    const result = await query(
      "SELECT id, name, latitude, longitude FROM provinces WHERE id = @id",
      { id: provinceId },
    );

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Không tìm thấy tỉnh/thành" });
    }

    const province = result.recordset[0];
    if (!province.latitude || !province.longitude) {
      return res.status(400).json({ error: "Tỉnh/thành chưa có tọa độ GPS" });
    }

    const weather = await weatherService.getCurrentWeather(
      province.latitude,
      province.longitude,
    );

    res.json({
      province_id: province.id,
      province_name: province.name,
      ...weather,
      icon_url: weatherService.getIconUrl(weather.weather_icon),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/regions/weather-forecast/:provinceId - Dự báo 5 ngày theo tỉnh
router.get("/weather-forecast/:provinceId", async (req, res, next) => {
  try {
    if (!weatherService.isConfigured()) {
      return res.status(503).json({
        error: "Weather API chưa cấu hình",
        hint: "Thêm OPENWEATHERMAP_API_KEY vào file .env",
      });
    }

    const provinceId = parseInt(req.params.provinceId);
    const result = await query(
      "SELECT id, name, latitude, longitude FROM provinces WHERE id = @id",
      { id: provinceId },
    );

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Không tìm thấy tỉnh/thành" });
    }

    const province = result.recordset[0];
    if (!province.latitude || !province.longitude) {
      return res.status(400).json({ error: "Tỉnh/thành chưa có tọa độ GPS" });
    }

    const forecast = await weatherService.getForecast(
      province.latitude,
      province.longitude,
    );

    // Thêm icon URL cho mỗi ngày
    forecast.daily = forecast.daily.map((d) => ({
      ...d,
      icon_url: weatherService.getIconUrl(d.weather_icon),
    }));

    res.json({
      province_id: province.id,
      province_name: province.name,
      ...forecast,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/regions/weather-by-coords?lat=&lon= - Thời tiết theo tọa độ GPS
router.get("/weather-by-coords", async (req, res, next) => {
  try {
    if (!weatherService.isConfigured()) {
      return res.status(503).json({ error: "Weather API chưa cấu hình" });
    }
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: "Thiếu tọa độ lat/lon" });
    }
    const weather = await weatherService.getCurrentWeather(lat, lon);
    res.json({ ...weather, icon_url: weatherService.getIconUrl(weather.weather_icon) });
  } catch (err) {
    next(err);
  }
});

// POST /api/regions/weather-alerts/auto-sync - Tự động lấy dữ liệu thời tiết và tạo cảnh báo
// Chỉ Manager/Admin mới được gọi
router.post(
  "/weather-alerts/auto-sync",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      if (!weatherService.isConfigured()) {
        return res.status(503).json({
          error: "Weather API chưa cấu hình",
          hint: "Thêm OPENWEATHERMAP_API_KEY vào file .env",
        });
      }

      // Lấy danh sách province_ids cần kiểm tra (hoặc tất cả nếu không chỉ định)
      const { province_ids } = req.body; // optional: [1, 2, 3]

      let provincesResult;
      if (province_ids && province_ids.length > 0) {
        const idList = province_ids.map((id) => parseInt(id)).join(",");
        provincesResult = await query(
          `SELECT id, name, latitude, longitude FROM provinces WHERE id IN (${idList}) AND latitude IS NOT NULL`,
        );
      } else {
        // Lấy tất cả tỉnh (chỉ 1 vùng Miền Nam nên không cần lọc theo region)
        provincesResult = await query(
          `SELECT id, name, latitude, longitude FROM provinces
         WHERE latitude IS NOT NULL
         ORDER BY id`,
        );
      }

      const provinces = provincesResult.recordset;
      if (provinces.length === 0) {
        return res.json({
          message: "Không có tỉnh nào để kiểm tra",
          alerts_created: 0,
        });
      }

      const io = req.app.get("io");
      const alertsCreated = [];
      const errors = [];

      for (const province of provinces) {
        try {
          // Delay giữa các request để không bị rate limit
          if (provinces.indexOf(province) > 0) {
            await new Promise((r) => setTimeout(r, 300));
          }

          const [current, forecast] = await Promise.all([
            weatherService.getCurrentWeather(
              province.latitude,
              province.longitude,
            ),
            weatherService.getForecast(province.latitude, province.longitude),
          ]);

          const risks = weatherService.analyzeFloodRisk(
            current,
            forecast.daily,
          );

          for (const risk of risks) {
            // Kiểm tra trùng lặp: không tạo alert cùng type + province trong 6 giờ gần đây
            const existing = await query(
              `
            SELECT TOP 1 id FROM weather_alerts 
            WHERE province_id = @pid AND alert_type = @type 
              AND created_at > DATEADD(HOUR, -6, GETDATE())
          `,
              { pid: province.id, type: risk.type },
            );

            if (existing.recordset.length > 0) continue; // Đã có alert tương tự

            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 12); // Hết hạn sau 12 giờ

            const insertResult = await query(
              `
            INSERT INTO weather_alerts (province_id, alert_type, severity, title, description, starts_at, expires_at, source)
            OUTPUT INSERTED.*
            VALUES (@pid, @type, @severity, @title, @desc, GETDATE(), @expires, N'OpenWeatherMap API (auto)')
          `,
              {
                pid: province.id,
                type: risk.type,
                severity: risk.severity,
                title: risk.title,
                desc: risk.description,
                expires: expiresAt.toISOString(),
              },
            );

            const newAlert = insertResult.recordset[0];
            alertsCreated.push(newAlert);

            // Emit realtime
            if (io) {
              io.emit("weather_alert", {
                ...newAlert,
                province_name: province.name,
              });
              io.to(`province_${province.id}`).emit("weather_alert", {
                ...newAlert,
                province_name: province.name,
              });
            }
          }
        } catch (err) {
          errors.push({
            province_id: province.id,
            province_name: province.name,
            error: err.message,
          });
        }
      }

      res.json({
        message: `Đã kiểm tra ${provinces.length} tỉnh/thành`,
        provinces_checked: provinces.length,
        alerts_created: alertsCreated.length,
        alerts: alertsCreated,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (err) {
      next(err);
    }
  },
);

// --- INCIDENT TYPES CRUD (Admin) ---

// POST /api/regions/incident-types
router.post(
  "/incident-types",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const { name, code, icon, color, description } = req.body;
      const result = await query(
        `
      INSERT INTO incident_types (name, code, icon, color, description)
      OUTPUT INSERTED.*
      VALUES (@name, @code, @icon, @color, @desc)
    `,
        {
          name,
          code,
          icon: icon || null,
          color: color || null,
          desc: description || null,
        },
      );
      res.status(201).json(result.recordset[0]);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/regions/incident-types/:id
router.put(
  "/incident-types/:id",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const { name, code, icon, color, description, is_active } = req.body;
      await query(
        `
      UPDATE incident_types SET name = @name, code = @code, icon = @icon,
        color = @color, description = @desc, is_active = @isActive
      WHERE id = @id
    `,
        {
          id: parseInt(req.params.id),
          name,
          code,
          icon,
          color,
          desc: description,
          isActive: is_active !== false ? 1 : 0,
        },
      );
      res.json({ message: "Đã cập nhật loại sự cố" });
    } catch (err) {
      next(err);
    }
  },
);

// --- URGENCY LEVELS CRUD (Admin) ---

// POST /api/regions/urgency-levels
router.post(
  "/urgency-levels",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const {
        name,
        code,
        priority_score,
        color,
        max_response_minutes,
        description,
      } = req.body;
      const result = await query(
        `
      INSERT INTO urgency_levels (name, code, priority_score, color, max_response_minutes, description)
      OUTPUT INSERTED.*
      VALUES (@name, @code, @score, @color, @maxMin, @desc)
    `,
        {
          name,
          code,
          score: parseInt(priority_score),
          color,
          maxMin: max_response_minutes ? parseInt(max_response_minutes) : null,
          desc: description || null,
        },
      );
      res.status(201).json(result.recordset[0]);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/regions/urgency-levels/:id
router.put(
  "/urgency-levels/:id",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const {
        name,
        code,
        priority_score,
        color,
        max_response_minutes,
        description,
      } = req.body;
      await query(
        `
      UPDATE urgency_levels SET name = @name, code = @code, priority_score = @score,
        color = @color, max_response_minutes = @maxMin, description = @desc
      WHERE id = @id
    `,
        {
          id: parseInt(req.params.id),
          name,
          code,
          score: parseInt(priority_score),
          color,
          maxMin: max_response_minutes ? parseInt(max_response_minutes) : null,
          desc: description,
        },
      );
      res.json({ message: "Đã cập nhật mức độ khẩn cấp" });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
