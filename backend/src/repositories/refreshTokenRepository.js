const { query } = require('../config/database');

const RefreshTokenRepository = {
  async create(token, userId) {
    await query(
      `INSERT INTO refresh_tokens (token, user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [token, userId]
    );
  },

  async findValid(token) {
    const result = await query(
      `SELECT rt.*, u.id as user_id, u.username, u.role, u.province_id, u.region_id
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token = $1
         AND rt.expires_at > NOW()
         AND rt.revoked_at IS NULL
         AND u.is_active = true`,
      [token]
    );
    return result.rows[0] || null;
  },

  async revoke(token) {
    await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1',
      [token]
    );
  },

  async revokeAllForUser(userId) {
    await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    );
  }
};

module.exports = RefreshTokenRepository;
