const { query } = require('../config/database');

const DisasterEventRepository = {

  async findAll({ status, type_code, province_id, page = 1, limit = 20 } = {}) {
    const params = [];
    const conditions = ['1=1'];

    if (status) {
      params.push(status);
      conditions.push(`de.status = $${params.length}`);
    }
    if (type_code) {
      params.push(type_code);
      conditions.push(`dt.code = $${params.length}`);
    }
    if (province_id) {
      params.push(parseInt(province_id));
      conditions.push(`$${params.length} = ANY(de.affected_provinces)`);
    }

    const where = 'WHERE ' + conditions.join(' AND ');
    const offset = (page - 1) * limit;

    const countResult = await query(
      `SELECT COUNT(*) as total FROM disaster_events de
       JOIN disaster_types dt ON de.disaster_type_id = dt.id ${where}`,
      params
    );

    const listParams = [...params, limit, offset];
    const result = await query(
      `SELECT de.*,
              dt.code as type_code, dt.name_vi as type_name_vi,
              dt.name_en as type_name_en, dt.icon as type_icon, dt.color as type_color,
              u.full_name as created_by_name,
              COUNT(DISTINCT rr.id) as request_count,
              COUNT(DISTINCT rr.id) FILTER (WHERE rr.status IN ('pending','verified','assigned','in_progress')) as active_requests
       FROM disaster_events de
       JOIN disaster_types dt ON de.disaster_type_id = dt.id
       LEFT JOIN users u ON de.created_by = u.id
       LEFT JOIN rescue_requests rr ON rr.disaster_event_id = de.id
       ${where}
       GROUP BY de.id, dt.code, dt.name_vi, dt.name_en, dt.icon, dt.color, u.full_name
       ORDER BY CASE de.status
         WHEN 'active'   THEN 1
         WHEN 'warning'  THEN 2
         WHEN 'recovery' THEN 3
         WHEN 'monitoring' THEN 4
         ELSE 5
       END, de.severity DESC, de.started_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );

    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  },

  async findActive() {
    const result = await query(
      `SELECT de.*,
              dt.code as type_code, dt.name_vi as type_name_vi,
              dt.name_en as type_name_en, dt.icon as type_icon, dt.color as type_color,
              COUNT(DISTINCT rr.id) as request_count
       FROM disaster_events de
       JOIN disaster_types dt ON de.disaster_type_id = dt.id
       LEFT JOIN rescue_requests rr ON rr.disaster_event_id = de.id
       WHERE de.status IN ('warning','active','recovery')
       GROUP BY de.id, dt.code, dt.name_vi, dt.name_en, dt.icon, dt.color
       ORDER BY de.severity DESC, de.started_at DESC`
    );
    return result.rows;
  },

  async findById(id) {
    const result = await query(
      `SELECT de.*,
              dt.code as type_code, dt.name_vi as type_name_vi,
              dt.name_en as type_name_en, dt.icon as type_icon, dt.color as type_color,
              u.full_name as created_by_name,
              dwp.code as phase_code, dwp.name_vi as phase_name_vi, dwp.name_en as phase_name_en,
              COUNT(DISTINCT rr.id) as request_count,
              COUNT(DISTINCT rr.id) FILTER (WHERE rr.status = 'completed') as completed_requests,
              COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'in_progress') as active_missions
       FROM disaster_events de
       JOIN disaster_types dt ON de.disaster_type_id = dt.id
       LEFT JOIN users u ON de.created_by = u.id
       LEFT JOIN disaster_workflow_phases dwp ON de.current_phase_id = dwp.id
       LEFT JOIN rescue_requests rr ON rr.disaster_event_id = de.id
       LEFT JOIN missions m ON m.request_id = rr.id
       WHERE de.id = $1
       GROUP BY de.id, dt.code, dt.name_vi, dt.name_en, dt.icon, dt.color,
                u.full_name, dwp.code, dwp.name_vi, dwp.name_en`,
      [id]
    );
    return result.rows[0] || null;
  },

  async create(data) {
    const result = await query(
      `INSERT INTO disaster_events
         (disaster_type_id, name, name_en, description, severity, status,
          affected_provinces, center_latitude, center_longitude,
          affected_radius_km, external_ref, started_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        data.disaster_type_id, data.name, data.name_en || null,
        data.description || null, data.severity,
        data.status || 'monitoring',
        data.affected_provinces || [],
        data.center_latitude || null, data.center_longitude || null,
        data.affected_radius_km || null, data.external_ref || null,
        data.started_at || new Date(), data.created_by
      ]
    );
    return result.rows[0];
  },

  async updateStatus(id, status, userId) {
    const result = await query(
      `UPDATE disaster_events
       SET status = $1, updated_at = NOW(),
           ended_at = CASE WHEN $1 = 'closed' THEN NOW() ELSE ended_at END
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    if (result.rows.length > 0) {
      await query(
        `INSERT INTO disaster_event_logs (disaster_event_id, user_id, action, description)
         VALUES ($1, $2, 'status_change', $3)`,
        [id, userId, `Chuyển trạng thái: ${status}`]
      );
    }
    return result.rows[0] || null;
  },

  async update(id, data, userId) {
    const params = [id];
    const setClauses = ['updated_at = NOW()'];

    const allowed = ['name','name_en','description','severity','affected_provinces',
                     'center_latitude','center_longitude','affected_radius_km',
                     'external_ref','started_at','current_phase_id'];
    for (const field of allowed) {
      if (data[field] !== undefined) {
        params.push(data[field]);
        setClauses.push(`${field} = $${params.length}`);
      }
    }

    const result = await query(
      `UPDATE disaster_events SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    if (result.rows.length > 0 && userId) {
      await query(
        `INSERT INTO disaster_event_logs (disaster_event_id, user_id, action, description)
         VALUES ($1, $2, 'update', 'Cập nhật thông tin sự kiện')`,
        [id, userId]
      );
    }
    return result.rows[0] || null;
  },

  async getTimeline(id) {
    const result = await query(
      `SELECT del.*, u.full_name as user_name, u.role as user_role
       FROM disaster_event_logs del
       LEFT JOIN users u ON del.user_id = u.id
       WHERE del.disaster_event_id = $1
       ORDER BY del.created_at DESC
       LIMIT 100`,
      [id]
    );
    return result.rows;
  },

  async getPhases(disaster_type_id) {
    const result = await query(
      `SELECT * FROM disaster_workflow_phases
       WHERE disaster_type_id = $1
       ORDER BY phase_order`,
      [disaster_type_id]
    );
    return result.rows;
  },

  async getStats() {
    const result = await query(
      `SELECT
         SUM(CASE WHEN de.status = 'active'   THEN 1 ELSE 0 END) as active_count,
         SUM(CASE WHEN de.status = 'warning'  THEN 1 ELSE 0 END) as warning_count,
         SUM(CASE WHEN de.status = 'recovery' THEN 1 ELSE 0 END) as recovery_count,
         dt.code, dt.name_vi, dt.name_en, dt.icon, dt.color,
         COUNT(de.id) as total_by_type
       FROM disaster_types dt
       LEFT JOIN disaster_events de ON de.disaster_type_id = dt.id
         AND de.created_at > NOW() - INTERVAL '30 days'
       GROUP BY dt.id, dt.code, dt.name_vi, dt.name_en, dt.icon, dt.color
       ORDER BY total_by_type DESC`
    );
    return result.rows;
  },

  // Tìm event đang active gần nhất theo tọa độ + disaster_type
  async findNearestActive(lat, lng, disasterTypeId) {
    const result = await query(
      `SELECT de.*,
              SQRT(POWER(de.center_latitude - $1, 2) + POWER(de.center_longitude - $2, 2)) * 111 AS distance_km
       FROM disaster_events de
       WHERE de.status IN ('warning','active')
         AND de.disaster_type_id = $3
         AND de.center_latitude IS NOT NULL
       ORDER BY distance_km ASC
       LIMIT 1`,
      [lat, lng, disasterTypeId]
    );
    return result.rows[0] || null;
  }
};

module.exports = DisasterEventRepository;
