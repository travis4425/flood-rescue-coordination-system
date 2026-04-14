const { query } = require('../config/database');

const TeamRepository = {
  async findAll({ province_id, status } = {}) {
    const params = [];
    const conditions = ['1=1'];
    if (province_id) {
      params.push(parseInt(province_id));
      conditions.push(`rt.province_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`rt.status = $${params.length}`);
    }
    const where = 'WHERE ' + conditions.join(' AND ');

    const result = await query(
      `SELECT rt.*, u.full_name as leader_name, u.phone as leader_phone,
              p.name as province_name, d.name as district_name,
              (SELECT COUNT(*) FROM rescue_team_members WHERE team_id = rt.id) as member_count,
              (SELECT COUNT(*) FROM missions WHERE team_id = rt.id AND status NOT IN ('completed','aborted','failed')) as active_missions
       FROM rescue_teams rt
       LEFT JOIN users u ON rt.leader_id = u.id
       LEFT JOIN provinces p ON rt.province_id = p.id
       LEFT JOIN districts d ON rt.district_id = d.id
       ${where}
       ORDER BY rt.name`,
      params
    );
    return result.rows;
  },

  async findById(id) {
    const result = await query(
      `SELECT rt.*, u.full_name as leader_name, u.phone as leader_phone, u.email as leader_email,
              p.name as province_name, d.name as district_name
       FROM rescue_teams rt
       LEFT JOIN users u ON rt.leader_id = u.id
       LEFT JOIN provinces p ON rt.province_id = p.id
       LEFT JOIN districts d ON rt.district_id = d.id
       WHERE rt.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findMembers(teamId) {
    const result = await query(
      `SELECT rtm.id, rtm.role_in_team, rtm.joined_at,
              u.id as user_id, u.full_name, u.phone, u.email, u.role as system_role
       FROM rescue_team_members rtm
       JOIN users u ON rtm.user_id = u.id
       WHERE rtm.team_id = $1
       ORDER BY rtm.role_in_team, u.full_name`,
      [teamId]
    );
    return result.rows;
  },

  async findActiveMissions(teamId) {
    const result = await query(
      `SELECT m.id, m.status, rr.tracking_code, rr.address, rr.victim_count
       FROM missions m
       JOIN rescue_requests rr ON m.request_id = rr.id
       WHERE m.team_id = $1 AND m.status NOT IN ('completed', 'aborted')`,
      [teamId]
    );
    return result.rows;
  },

  async create(data) {
    const result = await query(
      `INSERT INTO rescue_teams (name, code, leader_id, province_id, district_id, capacity, specialization, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        data.name,
        data.code || `DT-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        data.leader_id ? parseInt(data.leader_id) : null,
        parseInt(data.province_id),
        data.district_id ? parseInt(data.district_id) : null,
        parseInt(data.capacity) || 5,
        data.specialization || null,
        data.phone || null
      ]
    );
    return result.rows[0].id;
  },

  async update(id, data) {
    const allowed = { name: 'name', leader_id: 'leader_id', status: 'status', capacity: 'capacity', specialization: 'specialization', phone: 'phone', current_latitude: 'current_latitude', current_longitude: 'current_longitude' };
    const params = [id];
    const setClauses = ['updated_at = NOW()'];
    for (const [field] of Object.entries(allowed)) {
      if (data[field] !== undefined) {
        params.push(data[field]);
        setClauses.push(`${field} = $${params.length}`);
      }
    }
    await query(`UPDATE rescue_teams SET ${setClauses.join(', ')} WHERE id = $1`, params);
  },

  async updateStatus(id, status) {
    await query('UPDATE rescue_teams SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
  },

  async updateLocation(id, lat, lng) {
    await query('UPDATE rescue_teams SET current_latitude = $1, current_longitude = $2, updated_at = NOW() WHERE id = $3', [lat, lng, id]);
  },

  async isLeader(teamId, userId) {
    const result = await query('SELECT id FROM rescue_teams WHERE id = $1 AND leader_id = $2', [teamId, userId]);
    return result.rows.length > 0;
  },

  async findMemberEntry(teamId, userId) {
    const result = await query('SELECT id FROM rescue_team_members WHERE team_id = $1 AND user_id = $2', [teamId, userId]);
    return result.rows[0] || null;
  },

  async addMember(teamId, userId, roleInTeam = 'member') {
    const result = await query(
      `INSERT INTO rescue_team_members (team_id, user_id, role_in_team) VALUES ($1, $2, $3) RETURNING *`,
      [teamId, userId, roleInTeam]
    );
    return result.rows[0];
  },

  async removeMember(memberId, teamId) {
    await query('DELETE FROM rescue_team_members WHERE id = $1 AND team_id = $2', [memberId, teamId]);
  }
};

module.exports = TeamRepository;
