const { query } = require('../config/database');

// Helper query dùng chung
const FULL_REQUEST_SELECT = `
  SELECT rr.*,
         it.name as incident_type, it.icon as incident_icon, it.color as incident_color,
         ul.name as urgency_level, ul.color as urgency_color,
         rt.name as team_name, rt.phone as team_phone,
         COALESCE(p.name, rr.geo_province_name) as province_name,
         COALESCE(d.name, rr.geo_district_name) as district_name,
         u.full_name as coordinator_name
  FROM rescue_requests rr
  LEFT JOIN incident_types it ON rr.incident_type_id = it.id
  LEFT JOIN urgency_levels ul ON rr.urgency_level_id = ul.id
  LEFT JOIN rescue_teams rt ON rr.assigned_team_id = rt.id
  LEFT JOIN provinces p ON rr.province_id = p.id
  LEFT JOIN districts d ON rr.district_id = d.id
  LEFT JOIN users u ON rr.coordinator_id = u.id`;

const RequestRepository = {
  async findById(id) {
    const result = await query(`${FULL_REQUEST_SELECT} WHERE rr.id = $1`, [id]);
    return result.rows[0] || null;
  },

  async findAll({ user, status, province_id, urgency_level_id, search, district_id, rescue_category, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = ['1=1'];

    if (user.role === 'coordinator') {
      params.push(user.id);
      const idx = params.length;
      conditions.push(`(
        rr.coordinator_id = $${idx}
        OR rr.province_id = (SELECT province_id FROM users WHERE id = $${idx})
        OR rr.province_id IN (SELECT province_id FROM coordinator_regions WHERE user_id = $${idx})
        OR rr.province_id IN (SELECT province_id FROM warehouses WHERE coordinator_id = $${idx})
      )`);
    } else if (user.role === 'rescue_team') {
      params.push(user.id);
      const idx = params.length;
      conditions.push(`rr.assigned_team_id IN
        (SELECT team_id FROM rescue_team_members WHERE user_id = $${idx}
         UNION SELECT id FROM rescue_teams WHERE leader_id = $${idx})`);
    }

    if (status) { params.push(status); conditions.push(`rr.status = $${params.length}`); }
    if (province_id) { params.push(parseInt(province_id)); conditions.push(`rr.province_id = $${params.length}`); }
    if (district_id) { params.push(parseInt(district_id)); conditions.push(`rr.district_id = $${params.length}`); }
    if (urgency_level_id) { params.push(parseInt(urgency_level_id)); conditions.push(`rr.urgency_level_id = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(`(rr.tracking_code LIKE $${idx} OR rr.citizen_name LIKE $${idx} OR rr.citizen_phone LIKE $${idx} OR rr.description LIKE $${idx})`);
    }
    if (rescue_category) { params.push(rescue_category); conditions.push(`it.rescue_category = $${params.length}`); }

    const where = 'WHERE ' + conditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) as total FROM rescue_requests rr LEFT JOIN incident_types it ON rr.incident_type_id = it.id ${where}`,
      params
    );

    const paginatedParams = [...params, limit, offset];
    const result = await query(
      `SELECT rr.*,
              it.name as incident_type, it.rescue_category, it.icon as incident_icon, it.color as incident_color,
              ul.name as urgency_level, ul.color as urgency_color,
              rt.name as team_name,
              p.name as province_name, d.name as district_name,
              u.full_name as coordinator_name,
              (SELECT COUNT(*) FROM rescue_request_images WHERE request_id = rr.id) as image_count
       FROM rescue_requests rr
       LEFT JOIN incident_types it ON rr.incident_type_id = it.id
       LEFT JOIN urgency_levels ul ON rr.urgency_level_id = ul.id
       LEFT JOIN rescue_teams rt ON rr.assigned_team_id = rt.id
       LEFT JOIN provinces p ON rr.province_id = p.id
       LEFT JOIN districts d ON rr.district_id = d.id
       LEFT JOIN users u ON rr.coordinator_id = u.id
       ${where}
       ORDER BY rr.priority_score DESC, rr.created_at DESC
       LIMIT $${paginatedParams.length - 1} OFFSET $${paginatedParams.length}`,
      paginatedParams
    );
    return { data: result.rows, total: parseInt(countResult.rows[0].total), page, limit };
  },

  async findForMap({ province_id, status } = {}) {
    const params = [];
    let where = "WHERE rr.status NOT IN ('cancelled', 'rejected')";
    if (province_id) { params.push(parseInt(province_id)); where += ` AND rr.province_id = $${params.length}`; }
    if (status) { params.push(status); where += ` AND rr.status = $${params.length}`; }
    const result = await query(
      `SELECT rr.id, rr.tracking_code, rr.latitude, rr.longitude,
              rr.status, COALESCE(rr.tracking_status, 'submitted') as tracking_status,
              rr.victim_count, rr.priority_score, rr.flood_severity,
              rr.citizen_address, rr.description, rr.created_at,
              rr.citizen_name, rr.citizen_phone,
              it.name as incident_type, it.rescue_category, it.icon as incident_icon, it.color as incident_color,
              ul.name as urgency_level, ul.color as urgency_color,
              COALESCE(p.name, rr.geo_province_name) as province_name,
              COALESCE(d.name, rr.geo_district_name) as district_name
       FROM rescue_requests rr
       LEFT JOIN incident_types it ON rr.incident_type_id = it.id
       LEFT JOIN urgency_levels ul ON rr.urgency_level_id = ul.id
       LEFT JOIN provinces p ON rr.province_id = p.id
       LEFT JOIN districts d ON rr.district_id = d.id
       ${where}
       ORDER BY rr.created_at DESC, rr.priority_score DESC`,
      params
    );
    return result.rows;
  },

  async findByTrackingCode(code) {
    const result = await query(
      `SELECT rr.id, rr.tracking_code, rr.status, rr.description,
              rr.latitude, rr.longitude, rr.address, rr.victim_count,
              rr.support_type, rr.priority_score, rr.flood_severity,
              rr.citizen_confirmed, rr.citizen_confirmed_at,
              rr.rescue_team_confirmed,
              rr.created_at, rr.verified_at, rr.assigned_at, rr.started_at, rr.completed_at,
              rr.result_notes, rr.rescued_count, rr.reject_reason,
              COALESCE(rr.tracking_status, 'submitted') as tracking_status,
              rr.incident_report_note, rr.incident_team_info,
              it.name as incident_type, it.rescue_category, it.icon as incident_icon, it.color as incident_color,
              ul.name as urgency_level, ul.color as urgency_color,
              rt.name as team_name, rt.phone as team_phone,
              COALESCE(p.name, rr.geo_province_name) as province_name,
              COALESCE(d.name, rr.geo_district_name) as district_name
       FROM rescue_requests rr
       LEFT JOIN incident_types it ON rr.incident_type_id = it.id
       LEFT JOIN urgency_levels ul ON rr.urgency_level_id = ul.id
       LEFT JOIN rescue_teams rt ON rr.assigned_team_id = rt.id
       LEFT JOIN provinces p ON rr.province_id = p.id
       LEFT JOIN districts d ON rr.district_id = d.id
       WHERE rr.tracking_code = $1`,
      [code]
    );
    return result.rows[0] || null;
  },

  async findImages(requestId) {
    const result = await query('SELECT image_url, image_type FROM rescue_request_images WHERE request_id = $1', [requestId]);
    return result.rows;
  },

  async findAllImages(requestId) {
    const result = await query('SELECT * FROM rescue_request_images WHERE request_id = $1 ORDER BY uploaded_at', [requestId]);
    return result.rows;
  },

  async findMissions(requestId) {
    const result = await query(
      `SELECT m.*, rt.name as team_name, rt.code as team_code
       FROM missions m
       JOIN rescue_teams rt ON m.team_id = rt.id
       WHERE m.request_id = $1
       ORDER BY m.created_at DESC`,
      [requestId]
    );
    return result.rows;
  },

  async findNotifications(trackingCode) {
    const result = await query(
      `SELECT n.id, n.type, n.title, n.message, n.is_read, n.created_at
       FROM notifications n
       WHERE n.tracking_code = $1
       ORDER BY n.created_at DESC`,
      [trackingCode]
    );
    return result.rows;
  },

  async findNearestDistrict(lat, lng) {
    const result = await query(
      `SELECT d.id as district_id, d.province_id
       FROM districts d
       WHERE d.latitude IS NOT NULL AND d.longitude IS NOT NULL
       ORDER BY ABS(d.latitude - $1) + ABS(d.longitude - $2)
       LIMIT 1`,
      [lat, lng]
    );
    return result.rows[0] || null;
  },

  async findNearestProvince(lat, lng) {
    const result = await query(
      `SELECT id as province_id FROM provinces
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY ABS(latitude - $1) + ABS(longitude - $2)
       LIMIT 1`,
      [lat, lng]
    );
    return result.rows[0] || null;
  },

  async findCoordinatorForRegion(districtId, provinceId) {
    const result = await query(
      `SELECT cr.user_id
       FROM coordinator_regions cr
       JOIN users u ON cr.user_id = u.id AND u.is_active = true
       WHERE (cr.district_id = $1 OR cr.province_id = $2)
       ORDER BY cr.current_workload ASC
       LIMIT 1`,
      [districtId, provinceId]
    );
    return result.rows[0]?.user_id || null;
  },

  async getUrgencyScore(urgencyLevelId) {
    const result = await query('SELECT priority_score FROM urgency_levels WHERE id = $1', [urgencyLevelId]);
    return result.rows[0]?.priority_score || 1;
  },

  async hasWeatherAlert(provinceId) {
    const result = await query(
      'SELECT COUNT(*) as cnt FROM weather_alerts WHERE province_id = $1 AND expires_at > NOW()',
      [provinceId]
    );
    return parseInt(result.rows[0].cnt) > 0;
  },

  async create(data) {
    const result = await query(
      `INSERT INTO rescue_requests
        (tracking_code, citizen_name, citizen_phone, citizen_address,
         latitude, longitude, address, district_id, province_id,
         geo_province_name, geo_district_name,
         incident_type_id, urgency_level_id, description,
         victim_count, support_type, flood_severity, coordinator_id,
         disaster_type_id, disaster_event_id, status)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'pending')
       RETURNING id, tracking_code`,
      [
        data.tracking_code, data.citizen_name, data.citizen_phone, data.citizen_address,
        data.latitude, data.longitude, data.address, data.district_id, data.province_id,
        data.geo_province_name, data.geo_district_name,
        data.incident_type_id, data.urgency_level_id, data.description,
        data.victim_count, data.support_type, data.flood_severity, data.coordinator_id,
        data.disaster_type_id || null, data.disaster_event_id || null
      ]
    );
    return result.rows[0];
  },

  async updatePriorityScore(id, score) {
    await query('UPDATE rescue_requests SET priority_score = $1 WHERE id = $2', [score, id]);
  },

  async addImage(requestId, imageUrl) {
    await query(
      `INSERT INTO rescue_request_images (request_id, image_url, image_type) VALUES ($1, $2, 'request')`,
      [requestId, imageUrl]
    );
  },

  async incrementCoordinatorWorkload(coordinatorId, districtId, provinceId) {
    await query(
      `UPDATE coordinator_regions SET current_workload = current_workload + 1
       WHERE user_id = $1 AND (district_id = $2 OR province_id = $3)`,
      [coordinatorId, districtId, provinceId]
    );
  },

  async decrementCoordinatorWorkload(coordinatorId) {
    await query(
      `UPDATE coordinator_regions SET current_workload = CASE WHEN current_workload > 0 THEN current_workload - 1 ELSE 0 END
       WHERE user_id = $1`,
      [coordinatorId]
    );
  },

  async verify(id, { urgency_level_id, flood_severity, coordinator_id }) {
    await query(
      `UPDATE rescue_requests
       SET status = 'verified', tracking_status = 'received',
           urgency_level_id = COALESCE($1, urgency_level_id),
           flood_severity = COALESCE($2, flood_severity),
           coordinator_id = $3,
           verified_at = NOW(), updated_at = NOW()
       WHERE id = $4`,
      [
        urgency_level_id ? parseInt(urgency_level_id) : null,
        flood_severity ? parseInt(flood_severity) : null,
        coordinator_id,
        id
      ]
    );
  },

  async getVerifyData(id) {
    const result = await query(
      `SELECT rr.victim_count, rr.flood_severity, rr.province_id,
              COALESCE(ul.priority_score, 1) as urgency_score
       FROM rescue_requests rr
       LEFT JOIN urgency_levels ul ON rr.urgency_level_id = ul.id
       WHERE rr.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async reject(id, reason, coordinatorId) {
    await query(
      `UPDATE rescue_requests
       SET status = 'rejected', reject_reason = $1,
           coordinator_id = $2, updated_at = NOW()
       WHERE id = $3 AND status IN ('pending', 'verified')`,
      [reason, coordinatorId, id]
    );
  },

  async assign(id, teamId, vehicleId) {
    await query(
      `UPDATE rescue_requests
       SET status = 'assigned', assigned_team_id = $1,
           assigned_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [parseInt(teamId), id]
    );
    await query(
      'UPDATE rescue_teams SET status = \'on_mission\', updated_at = NOW() WHERE id = $1',
      [parseInt(teamId)]
    );
    await query(
      `INSERT INTO missions (request_id, team_id, vehicle_id, status)
       VALUES ($1, $2, $3, 'assigned')`,
      [id, parseInt(teamId), vehicleId ? parseInt(vehicleId) : null]
    );
  },

  async getTeamLeaderId(teamId) {
    const result = await query('SELECT leader_id FROM rescue_teams WHERE id = $1', [teamId]);
    return result.rows[0]?.leader_id || null;
  },

  async updateStatus(id, { status, result_notes, rescued_count }) {
    const params = [id, status];
    let setClause = 'status = $2, updated_at = NOW()';
    if (status === 'in_progress') setClause += ', started_at = NOW()';
    if (status === 'completed') {
      setClause += ', completed_at = NOW(), response_time_minutes = EXTRACT(EPOCH FROM (NOW() - created_at)) / 60';
      if (result_notes) { params.push(result_notes); setClause += `, result_notes = $${params.length}`; }
      if (rescued_count) { params.push(parseInt(rescued_count)); setClause += `, rescued_count = $${params.length}`; }
    }
    await query(`UPDATE rescue_requests SET ${setClause} WHERE id = $1`, params);
  },

  async completeMissions(requestId) {
    await query(
      `UPDATE missions SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE request_id = $1 AND status NOT IN ('completed', 'aborted')`,
      [requestId]
    );
  },

  async getAssignedData(id) {
    const result = await query(
      'SELECT assigned_team_id, coordinator_id, province_id FROM rescue_requests WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async countActiveTeamMissions(teamId) {
    const result = await query(
      `SELECT COUNT(*) as cnt FROM missions WHERE team_id = $1 AND status NOT IN ('completed', 'aborted')`,
      [teamId]
    );
    return parseInt(result.rows[0].cnt);
  },

  async freeTeam(teamId) {
    await query("UPDATE rescue_teams SET status = 'available', updated_at = NOW() WHERE id = $1", [teamId]);
  },

  async cancel(id) {
    await query("UPDATE rescue_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1", [id]);
  },

  async getStateForCancel(id) {
    const result = await query(
      'SELECT status, coordinator_id, assigned_team_id FROM rescue_requests WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async abortLinkedMissions(requestId) {
    await query(
      `UPDATE missions SET status = 'aborted', updated_at = NOW()
       WHERE request_id = $1 AND status NOT IN ('completed','aborted')`,
      [requestId]
    );
  },

  async close(id) {
    await query(
      `UPDATE rescue_requests SET
         status = 'completed', completed_at = NOW(),
         response_time_minutes = EXTRACT(EPOCH FROM (NOW() - created_at)) / 60,
         updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  },

  async getCloseData(id) {
    const result = await query(
      'SELECT status, rescue_team_confirmed, coordinator_id, province_id, tracking_code FROM rescue_requests WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async citizenConfirm(code) {
    const result = await query(
      `UPDATE rescue_requests
       SET citizen_confirmed = true, citizen_confirmed_at = NOW(), updated_at = NOW()
       WHERE tracking_code = $1 AND status IN ('in_progress', 'completed')
         AND (citizen_confirmed = false OR citizen_confirmed IS NULL)`,
      [code]
    );
    return result.rowCount;
  },

  async getRescuedByOtherState(code) {
    const result = await query(
      'SELECT id, status, citizen_rescued_by_other_count FROM rescue_requests WHERE tracking_code = $1',
      [code]
    );
    return result.rows[0] || null;
  },

  async updateRescuedByOtherCount(id, count, cancel = false) {
    if (cancel) {
      await query(
        `UPDATE rescue_requests
         SET citizen_rescued_by_other_count = $1,
             status = 'cancelled',
             reject_reason = 'Người dân báo đã được cứu bởi người khác',
             updated_at = NOW()
         WHERE id = $2`,
        [count, id]
      );
    } else {
      await query(
        'UPDATE rescue_requests SET citizen_rescued_by_other_count = $1, updated_at = NOW() WHERE id = $2',
        [count, id]
      );
    }
  },

  async getMissionTaskGroups(requestId) {
    const result = await query(
      'SELECT task_group_id FROM missions WHERE request_id = $1 AND task_group_id IS NOT NULL',
      [requestId]
    );
    return result.rows;
  },

  async getTaskGroupMissions(taskGroupId) {
    const result = await query('SELECT status FROM missions WHERE task_group_id = $1', [taskGroupId]);
    return result.rows;
  },

  async updateTaskGroupStatus(taskGroupId, status) {
    await query('UPDATE task_groups SET status = $1, updated_at = NOW() WHERE id = $2', [status, taskGroupId]);
  },

  async citizenUpdate(id, data) {
    await query(
      `UPDATE rescue_requests SET
        citizen_name = $1, citizen_phone = $2,
        address = $3, incident_type_id = $4,
        urgency_level_id = $5, description = $6,
        victim_count = $7, flood_severity = $8,
        updated_at = NOW()
       WHERE id = $9`,
      [
        data.citizen_name || null,
        data.citizen_phone || null,
        data.address || null,
        data.incident_type_id ? parseInt(data.incident_type_id) : null,
        data.urgency_level_id ? parseInt(data.urgency_level_id) : null,
        data.description || null,
        parseInt(data.victim_count) || 1,
        parseInt(data.flood_severity) || 1,
        id
      ]
    );
  },

  async getStatsOverview(userId, role) {
    const params = [];
    let regionFilter = '';
    if (role === 'coordinator') {
      params.push(userId);
      const idx = params.length;
      regionFilter = `AND (
        province_id = (SELECT province_id FROM users WHERE id = $${idx})
        OR province_id IN (SELECT province_id FROM coordinator_regions WHERE user_id = $${idx})
        OR province_id IN (SELECT province_id FROM warehouses WHERE coordinator_id = $${idx})
      )`;
    }
    const stats = await query(
      `SELECT COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(COALESCE(victim_count, 0)) as total_victims,
        SUM(COALESCE(rescued_count, 0)) as total_rescued,
        AVG(CASE WHEN response_time_minutes > 0 THEN response_time_minutes ELSE NULL END) as avg_response_time
       FROM rescue_requests WHERE 1=1 ${regionFilter}`,
      params
    );
    const todayStats = await query(
      `SELECT COUNT(*) as today_total,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as today_completed
       FROM rescue_requests
       WHERE created_at::DATE = CURRENT_DATE ${regionFilter}`,
      params
    );
    const teamStats = await query(
      `SELECT COUNT(*) as total_teams,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'on_mission' THEN 1 ELSE 0 END) as on_mission
       FROM rescue_teams`
    );
    return { requests: stats.rows[0], today: todayStats.rows[0], teams: teamStats.rows[0] };
  },

  async findAvailableTeams(provinceId, lat, lng) {
    const result = await query(
      `SELECT id, name, code, current_latitude, current_longitude, capacity, specialization, phone, status
       FROM rescue_teams
       WHERE status = 'available' AND province_id = $1
       ORDER BY ABS(current_latitude - $2) + ABS(current_longitude - $3)`,
      [provinceId, lat, lng]
    );
    return result.rows;
  },

  async createNotification(trackingCode, type, title, message) {
    await query(
      `INSERT INTO notifications (tracking_code, type, title, message) VALUES ($1, $2, $3, $4)`,
      [trackingCode, type, title, message]
    );
  },

  async lookupByPhone(phone) {
    const result = await query(
      `SELECT tracking_code, status, created_at, description, citizen_name
       FROM rescue_requests WHERE citizen_phone = $1 ORDER BY created_at DESC
       LIMIT 5`,
      [phone]
    );
    return result.rows;
  },

  async reassignCoordinator(requestId, coordinatorId, oldCoordId, actorId, ip) {
    await query(
      'UPDATE rescue_requests SET coordinator_id = $1, updated_at = NOW() WHERE id = $2',
      [coordinatorId, requestId]
    );
    if (oldCoordId) {
      await query(
        'UPDATE coordinator_regions SET current_workload = CASE WHEN current_workload > 0 THEN current_workload - 1 ELSE 0 END WHERE user_id = $1',
        [oldCoordId]
      );
    }
    await query(
      'UPDATE coordinator_regions SET current_workload = current_workload + 1 WHERE user_id = $1',
      [coordinatorId]
    );
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
       VALUES ($1, 'reassign_coordinator', 'rescue_request', $2, $3, $4, $5)`,
      [
        actorId,
        requestId,
        JSON.stringify({ coordinator_id: oldCoordId }),
        JSON.stringify({ coordinator_id: coordinatorId }),
        ip
      ]
    );
  }
};

module.exports = RequestRepository;
