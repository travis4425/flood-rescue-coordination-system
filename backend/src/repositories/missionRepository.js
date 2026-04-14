const { query } = require('../config/database');

const MissionRepository = {
  async findAll({ user, status, team_id, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const filterParams = [];
    const conditions = ['1=1'];

    if (user.role === 'coordinator') {
      filterParams.push(user.id);
      const idx = filterParams.length;
      conditions.push(`(
        rr.coordinator_id = $${idx}
        OR rr.province_id = (SELECT province_id FROM users WHERE id = $${idx})
        OR rr.province_id IN (SELECT province_id FROM coordinator_regions WHERE user_id = $${idx})
        OR rr.province_id IN (SELECT province_id FROM warehouses WHERE coordinator_id = $${idx})
      )`);
    } else if (user.role === 'rescue_team') {
      const leaderCheck = await query('SELECT id FROM rescue_teams WHERE leader_id = $1', [user.id]);
      if (leaderCheck.rows.length > 0) {
        filterParams.push(user.id);
        conditions.push(`m.team_id IN (SELECT id FROM rescue_teams WHERE leader_id = $${filterParams.length})`);
      } else {
        filterParams.push(user.id);
        const idx = filterParams.length;
        conditions.push(`(
          m.assigned_to_user_id = $${idx}
          OR (m.task_group_id IS NULL AND m.team_id IN (
            SELECT team_id FROM rescue_team_members WHERE user_id = $${idx}
          ))
        )`);
      }
    }
    if (status) {
      filterParams.push(status);
      conditions.push(`m.status = $${filterParams.length}`);
    }
    if (team_id) {
      filterParams.push(parseInt(team_id));
      conditions.push(`m.team_id = $${filterParams.length}`);
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) as total FROM missions m ${where}`,
      filterParams
    );

    const paginatedParams = [...filterParams, limit, offset];
    const result = await query(
      `SELECT m.*,
              rr.tracking_code, rr.latitude, rr.longitude, rr.address, rr.description,
              rr.citizen_name, rr.citizen_phone, rr.victim_count, rr.support_type,
              rr.priority_score, rr.flood_severity, rr.status as request_status,
              COALESCE(rr.tracking_status, 'submitted') as tracking_status,
              COALESCE(rr.citizen_rescued_by_other_count, 0) as citizen_rescued_by_other_count,
              rr.reject_reason,
              it.name as incident_type, it.icon as incident_icon, it.color as incident_color, it.rescue_category,
              ul.name as urgency_level, ul.color as urgency_color,
              rt.name as team_name, rt.code as team_code,
              v.name as vehicle_name, v.plate_number,
              au.id as assigned_to_user_id, au.full_name as assigned_to_name,
              (SELECT STRING_AGG(CAST(ma.user_id AS TEXT), ',')
               FROM mission_assignments ma WHERE ma.mission_id = m.id) as assigned_member_ids,
              (SELECT STRING_AGG(u2.full_name, ', ')
               FROM mission_assignments ma
               JOIN users u2 ON ma.user_id = u2.id
               WHERE ma.mission_id = m.id) as assigned_members_names,
              CASE WHEN m.task_group_id IS NOT NULL AND (
                EXISTS(SELECT 1 FROM distribution_batches db WHERE db.task_id = m.task_group_id)
                OR EXISTS(SELECT 1 FROM vehicle_dispatches vd WHERE vd.task_id = m.task_group_id)
              ) THEN 1 ELSE 0 END as has_distributions
       FROM missions m
       JOIN rescue_requests rr ON m.request_id = rr.id
       LEFT JOIN incident_types it ON rr.incident_type_id = it.id
       LEFT JOIN urgency_levels ul ON rr.urgency_level_id = ul.id
       JOIN rescue_teams rt ON m.team_id = rt.id
       LEFT JOIN vehicles v ON m.vehicle_id = v.id
       LEFT JOIN users au ON m.assigned_to_user_id = au.id
       ${where}
       ORDER BY rr.priority_score DESC, m.created_at DESC
       LIMIT $${paginatedParams.length - 1} OFFSET $${paginatedParams.length}`,
      paginatedParams
    );

    return { data: result.rows, total: parseInt(countResult.rows[0].total), page, limit };
  },

  async findById(id) {
    const result = await query(
      `SELECT m.*,
        rr.tracking_code, rr.latitude, rr.longitude, rr.address, rr.description,
        rr.citizen_name, rr.citizen_phone, rr.victim_count, rr.support_type,
        rr.priority_score, rr.flood_severity, rr.rescued_count, rr.result_notes,
        it.name as incident_type, ul.name as urgency_level,
        rt.name as team_name, rt.code as team_code, rt.phone as team_phone,
        v.name as vehicle_name, v.plate_number
       FROM missions m
       JOIN rescue_requests rr ON m.request_id = rr.id
       LEFT JOIN incident_types it ON rr.incident_type_id = it.id
       LEFT JOIN urgency_levels ul ON rr.urgency_level_id = ul.id
       JOIN rescue_teams rt ON m.team_id = rt.id
       LEFT JOIN vehicles v ON m.vehicle_id = v.id
       WHERE m.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findImages(requestId) {
    const result = await query('SELECT * FROM rescue_request_images WHERE request_id = $1', [requestId]);
    return result.rows;
  },

  async findLogs(missionId) {
    const result = await query(
      `SELECT ml.*, u.full_name as user_name
       FROM mission_logs ml
       LEFT JOIN users u ON ml.user_id = u.id
       WHERE ml.mission_id = $1
       ORDER BY ml.created_at DESC`,
      [missionId]
    );
    return result.rows;
  },

  async isTeamMember(missionId, userId) {
    const result = await query(
      `SELECT m.id FROM missions m
       JOIN rescue_teams rt ON m.team_id = rt.id
       WHERE m.id = $1 AND (
         rt.leader_id = $2
         OR EXISTS (SELECT 1 FROM rescue_team_members WHERE team_id = m.team_id AND user_id = $2)
       )`,
      [missionId, userId]
    );
    return result.rows.length > 0;
  },

  async isTeamMemberByTeamId(teamId, userId) {
    const result = await query(
      `SELECT 1 FROM rescue_teams WHERE id = $1 AND leader_id = $2
       UNION
       SELECT 1 FROM rescue_team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );
    return result.rows.length > 0;
  },

  async getRescueCategory(missionId) {
    const result = await query(
      `SELECT it.rescue_category, rr.tracking_status
       FROM missions m
       JOIN rescue_requests rr ON m.request_id = rr.id
       LEFT JOIN incident_types it ON rr.incident_type_id = it.id
       WHERE m.id = $1`,
      [missionId]
    );
    return result.rows[0] || null;
  },

  async updateStatus(id, { status, notes, latitude, longitude, rescued_count }) {
    const params = [id, status];
    let setClause = 'status = $2, updated_at = NOW()';
    if (status === 'accepted' || status === 'en_route') setClause += ', started_at = COALESCE(started_at, NOW())';
    if (status === 'completed') setClause += ', completed_at = NOW()';
    if (notes) {
      params.push(notes);
      setClause += `, notes = $${params.length}`;
    }
    await query(`UPDATE missions SET ${setClause} WHERE id = $1`, params);
  },

  async logAction(missionId, userId, action, description, latitude, longitude) {
    await query(
      `INSERT INTO mission_logs (mission_id, user_id, action, description, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        missionId,
        userId,
        action,
        description || `Trạng thái chuyển sang: ${action}`,
        latitude ? parseFloat(latitude) : null,
        longitude ? parseFloat(longitude) : null
      ]
    );
  },

  async getMissionContext(id) {
    const result = await query(
      `SELECT m.request_id, m.team_id, m.task_group_id, rr.tracking_code
       FROM missions m JOIN rescue_requests rr ON m.request_id = rr.id
       WHERE m.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async getTeamInfo(missionId) {
    const result = await query(
      `SELECT rt.name as team_name, rt.code as team_code, u.full_name as leader_name, u.phone as leader_phone
       FROM missions m
       JOIN rescue_teams rt ON m.team_id = rt.id
       LEFT JOIN users u ON rt.leader_id = u.id
       WHERE m.id = $1`,
      [missionId]
    );
    return result.rows[0] || null;
  },

  async updateRequestStatus(requestId, status, trackingStatus, extraFields = {}) {
    const params = [requestId, status, trackingStatus];
    let setClause = `status = $2, tracking_status = $3, updated_at = NOW()`;
    if (extraFields.rescue_team_confirmed) { setClause += ', rescue_team_confirmed = true, completed_at = NOW()'; }
    if (extraFields.incident_report_note !== undefined) {
      params.push(extraFields.incident_report_note);
      setClause += `, incident_report_note = $${params.length}`;
      params.push(extraFields.incident_team_info);
      setClause += `, incident_team_info = $${params.length}`;
    }
    if (extraFields.rescued_count !== undefined) {
      params.push(extraFields.rescued_count);
      setClause += `, rescued_count = $${params.length}`;
    }
    if (extraFields.started_at) setClause += ', started_at = COALESCE(started_at, NOW())';
    await query(`UPDATE rescue_requests SET ${setClause} WHERE id = $1`, params);
  },

  async countActiveTeamMissions(teamId) {
    const result = await query(
      `SELECT COUNT(*) as cnt FROM missions WHERE team_id = $1 AND status NOT IN ('completed', 'aborted', 'failed')`,
      [teamId]
    );
    return parseInt(result.rows[0].cnt);
  },

  async freeTeam(teamId) {
    await query("UPDATE rescue_teams SET status = 'available', updated_at = NOW() WHERE id = $1", [teamId]);
  },

  async getTaskGroupMissions(taskGroupId) {
    const result = await query('SELECT status FROM missions WHERE task_group_id = $1', [taskGroupId]);
    return result.rows;
  },

  async updateTaskGroupStatus(taskGroupId, status) {
    await query('UPDATE task_groups SET status = $1, updated_at = NOW() WHERE id = $2', [status, taskGroupId]);
  },

  async createNotification(trackingCode, type, title, message) {
    await query(
      `INSERT INTO notifications (tracking_code, type, title, message) VALUES ($1, $2, $3, $4)`,
      [trackingCode, type, title, message]
    );
  },

  async updateResultNotes(requestId, resultNotes, rescuedCount) {
    await query(
      `UPDATE rescue_requests SET result_notes = $1, rescued_count = $2, updated_at = NOW() WHERE id = $3`,
      [resultNotes || null, rescuedCount ? parseInt(rescuedCount) : 0, requestId]
    );
  },

  async addResultImage(requestId, imageUrl) {
    await query(
      `INSERT INTO rescue_request_images (request_id, image_url, image_type) VALUES ($1, $2, 'result')`,
      [requestId, imageUrl]
    );
  }
};

module.exports = MissionRepository;
