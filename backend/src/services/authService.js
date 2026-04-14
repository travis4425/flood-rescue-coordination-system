const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UserRepository = require('../repositories/userRepository');
const RefreshTokenRepository = require('../repositories/refreshTokenRepository');
const logger = require('../config/logger');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict'
};

const AuthService = {
  async login(username, password, res) {
    const user = await UserRepository.findByUsername(username);

    // Timing-safe: dù user không tồn tại vẫn chạy bcrypt để tránh timing attack
    const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.here';
    const passwordToCheck = user?.password_hash || dummyHash;
    const valid = await bcrypt.compare(password, passwordToCheck);

    if (!user || !valid || !user.is_active) {
      logger.warn(`Failed login attempt for username: ${username}`);
      throw Object.assign(new Error('INVALID_CREDENTIALS'), { status: 401 });
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      province_id: user.province_id,
      region_id: user.region_id
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    });

    const refreshToken = crypto.randomUUID();
    await RefreshTokenRepository.create(refreshToken, user.id);
    await UserRepository.updateLastLogin(user.id);

    // Set cookies (httpOnly — không accessible bởi JS)
    res.cookie('access_token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000 // 15 phút
    });
    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
      path: '/api/auth' // Chỉ gửi khi gọi /api/auth/*
    });

    // Kiểm tra team leader cho rescue_team
    const sanitized = this._sanitizeUser(user);
    if (sanitized.role === 'rescue_team') {
      sanitized.is_team_leader = await UserRepository.isTeamLeader(user.id);
    }

    logger.info(`User ${user.username} (${user.role}) logged in`);
    return sanitized;
  },

  async refresh(refreshToken, res) {
    if (!refreshToken) throw Object.assign(new Error('NO_REFRESH_TOKEN'), { status: 401 });

    const tokenData = await RefreshTokenRepository.findValid(refreshToken);
    if (!tokenData) throw Object.assign(new Error('INVALID_REFRESH_TOKEN'), { status: 401 });

    const payload = {
      id: tokenData.user_id,
      username: tokenData.username,
      role: tokenData.role,
      province_id: tokenData.province_id,
      region_id: tokenData.region_id
    };

    const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    });

    res.cookie('access_token', newAccessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000
    });

    return { message: 'Token refreshed' };
  },

  async logout(refreshToken, res) {
    if (refreshToken) {
      await RefreshTokenRepository.revoke(refreshToken);
    }
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/api/auth' });
  },

  async changePassword(userId, currentPassword, newPassword) {
    const { query } = require('../config/database');
    const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (!result.rows[0]) throw Object.assign(new Error('USER_NOT_FOUND'), { status: 404 });

    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) throw Object.assign(new Error('WRONG_CURRENT_PASSWORD'), { status: 400 });

    const hash = await bcrypt.hash(newPassword, 10);
    await UserRepository.updatePassword(userId, hash);
  },

  _sanitizeUser(user) {
    const { password_hash, ...safe } = user;
    return safe;
  }
};

module.exports = AuthService;
