const { query } = require('../config/database');

const UserRepository = {
  // Dùng cho login — trả về user CÓ password_hash
  async findByUsername(username) {
    const result = await query(
      `SELECT u.*, p.name as province_name
       FROM users u
       LEFT JOIN provinces p ON u.province_id = p.id
       WHERE u.username = $1`,
      [username]
    );
    return result.rows[0] || null;
  },

  // Dùng cho /me và các chỗ hiển thị user — KHÔNG có password_hash
  async findById(id) {
    const result = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone,
              u.role, u.province_id, u.region_id, u.is_active, u.last_login, u.created_at,
              p.name as province_name
       FROM users u
       LEFT JOIN provinces p ON u.province_id = p.id
       WHERE u.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findAll({ page = 1, limit = 20, role, search, is_active, province_id: filterProvince } = {}) {
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = ['1=1'];

    if (filterProvince) {
      params.push(filterProvince);
      conditions.push(`u.province_id = $${params.length}`);
    }
    if (role) {
      params.push(role);
      conditions.push(`u.role = $${params.length}`);
    }
    if (is_active !== undefined) {
      params.push(is_active ? true : false);
      conditions.push(`u.is_active = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(`(u.full_name LIKE $${idx} OR u.username LIKE $${idx} OR u.email LIKE $${idx})`);
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) as total FROM users u ${where}`,
      params
    );

    const paginatedParams = [...params, limit, offset];
    const result = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.role, u.province_id,
              u.is_active, u.last_login, u.created_at,
              p.name as province_name
       FROM users u
       LEFT JOIN provinces p ON u.province_id = p.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${paginatedParams.length - 1} OFFSET $${paginatedParams.length}`,
      paginatedParams
    );

    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  },

  async create(userData) {
    const { username, email, password_hash, full_name, phone, role, province_id } = userData;
    const result = await query(
      `INSERT INTO users (username, email, password_hash, full_name, phone, role, province_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        username,
        email,
        password_hash,
        full_name,
        phone || null,
        role,
        province_id ? parseInt(province_id) : null
      ]
    );
    return result.rows[0];
  },

  async update(id, data) {
    const allowed = ['full_name', 'phone', 'role', 'province_id', 'is_active', 'email'];
    const params = [id];
    const setClauses = ['updated_at = NOW()'];

    for (const field of allowed) {
      if (data[field] !== undefined) {
        params.push(data[field]);
        setClauses.push(`${field} = $${params.length}`);
      }
    }

    await query(`UPDATE users SET ${setClauses.join(', ')} WHERE id = $1`, params);
  },

  async updatePassword(id, hashedPassword) {
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, id]
    );
  },

  async updateLastLogin(id) {
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [id]);
  },

  async softDelete(id) {
    await query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);
  },

  async isTeamLeader(userId) {
    const result = await query(
      'SELECT id FROM rescue_teams WHERE leader_id = $1 LIMIT 1',
      [userId]
    );
    return result.rows.length > 0;
  }
};

module.exports = UserRepository;
