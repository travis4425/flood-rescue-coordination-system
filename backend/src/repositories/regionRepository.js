const { query } = require('../config/database');

const RegionRepository = {
  async findAllRegions() {
    const result = await query('SELECT * FROM regions ORDER BY id');
    return result.rows;
  },

  async findProvinces(regionId) {
    const params = [];
    let where = '';
    if (regionId) {
      params.push(parseInt(regionId));
      where = `WHERE p.region_id = $1`;
    }
    const result = await query(
      `SELECT p.*, r.name as region_name FROM provinces p
       JOIN regions r ON p.region_id = r.id ${where} ORDER BY r.id, p.name`,
      params
    );
    return result.rows;
  },

  async findProvinceById(id) {
    const result = await query(
      'SELECT id, name, latitude, longitude FROM provinces WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findIncidentTypes() {
    const result = await query('SELECT * FROM incident_types WHERE is_active = true ORDER BY id');
    return result.rows;
  },

  async findUrgencyLevels() {
    const result = await query('SELECT * FROM urgency_levels ORDER BY priority_score DESC');
    return result.rows;
  },

  async findWeatherAlerts({ province_id, include_expired } = {}) {
    const params = [];
    let where = include_expired === 'true' ? 'WHERE 1=1' : 'WHERE expires_at > NOW()';
    if (province_id) {
      params.push(parseInt(province_id));
      where += ` AND wa.province_id = $${params.length}`;
    }
    const result = await query(
      `SELECT wa.*, p.name as province_name FROM weather_alerts wa
       LEFT JOIN provinces p ON wa.province_id = p.id
       ${where} ORDER BY wa.severity DESC, wa.starts_at DESC`,
      params
    );
    return result.rows;
  },

  async createWeatherAlert(data) {
    const result = await query(
      `INSERT INTO weather_alerts (province_id, alert_type, severity, title, description, starts_at, expires_at, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.province_id ? parseInt(data.province_id) : null,
        data.alert_type || 'flood',
        data.severity,
        data.title,
        data.description || null,
        data.starts_at || new Date().toISOString(),
        data.expires_at || null,
        data.source || null
      ]
    );
    return result.rows[0];
  },

  async findAllProvincesWithCoords(ids) {
    if (ids && ids.length > 0) {
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
      const params = ids.map(id => parseInt(id));
      const result = await query(
        `SELECT id, name, latitude, longitude FROM provinces WHERE id IN (${placeholders}) AND latitude IS NOT NULL`,
        params
      );
      return result.rows;
    }
    const result = await query(
      'SELECT id, name, latitude, longitude FROM provinces WHERE latitude IS NOT NULL ORDER BY id'
    );
    return result.rows;
  },

  async findRecentWeatherAlert(provinceId, alertType, hoursBack = 6) {
    const result = await query(
      `SELECT id FROM weather_alerts
       WHERE province_id = $1 AND alert_type = $2
         AND created_at > NOW() - ($3::int * INTERVAL '1 hour')
       LIMIT 1`,
      [provinceId, alertType, parseInt(hoursBack)]
    );
    return result.rows[0] || null;
  }
};

module.exports = RegionRepository;
