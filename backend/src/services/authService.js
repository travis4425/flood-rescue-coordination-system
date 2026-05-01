const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const UserRepository = require('../repositories/userRepository');
const RefreshTokenRepository = require('../repositories/refreshTokenRepository');
const logger = require('../config/logger');

const MFA_ROLES = ['admin', 'manager'];

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  // Cross-site deployment (Vercel frontend + Railway backend): dùng 'none' trong production
  // để cookies được gửi trong cross-site requests (yêu cầu secure: true)
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
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

    // Kiểm tra MFA bắt buộc cho admin và manager
    if (MFA_ROLES.includes(user.role)) {
      const mfaData = await UserRepository.getMfaData(user.id);
      const pendingToken = jwt.sign(
        { id: user.id, mfaPending: true },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      res.cookie('mfa_pending', pendingToken, {
        ...COOKIE_OPTIONS,
        maxAge: 5 * 60 * 1000
      });

      if (!mfaData?.mfa_enabled) {
        logger.info(`User ${user.username} (${user.role}) requires MFA setup`);
        return { status: 'MFA_SETUP_REQUIRED' };
      }
      logger.info(`User ${user.username} (${user.role}) requires MFA verification`);
      return { status: 'MFA_REQUIRED' };
    }

    return this._completeLogin(user, res);
  },

  async _completeLogin(user, res) {
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
    return { status: 'OK', user: sanitized };
  },

  // Lấy mfa_pending cookie, trả về user id nếu hợp lệ
  _verifyMfaPendingCookie(req) {
    const token = req.cookies?.mfa_pending;
    if (!token) throw Object.assign(new Error('MFA_PENDING_MISSING'), { status: 401 });
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded.mfaPending) throw new Error();
      return decoded.id;
    } catch {
      throw Object.assign(new Error('MFA_PENDING_INVALID'), { status: 401 });
    }
  },

  async mfaSetup(req) {
    const userId = this._verifyMfaPendingCookie(req);
    const user = await UserRepository.findByUsername(
      (await UserRepository.findById(userId))?.username
    );
    if (!user) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });

    const secret = speakeasy.generateSecret({
      name: `VDRCS (${user.username})`,
      issuer: 'VDRCS'
    });

    await UserRepository.setMfaSecret(userId, secret.base32);

    return { otpauthUrl: secret.otpauth_url };
  },

  async mfaConfirmSetup(req, token, res) {
    const userId = this._verifyMfaPendingCookie(req);
    const mfaData = await UserRepository.getMfaData(userId);
    if (!mfaData?.mfa_secret) {
      throw Object.assign(new Error('MFA_SECRET_MISSING'), { status: 400 });
    }

    const valid = speakeasy.totp.verify({
      secret: mfaData.mfa_secret,
      encoding: 'base32',
      token,
      window: 1
    });

    if (!valid) throw Object.assign(new Error('MFA_TOKEN_INVALID'), { status: 400 });

    await UserRepository.enableMfa(userId);
    res.clearCookie('mfa_pending');

    const user = await UserRepository.findById(userId);
    return this._completeLogin(user, res);
  },

  async mfaVerify(req, token, res) {
    const userId = this._verifyMfaPendingCookie(req);
    const mfaData = await UserRepository.getMfaData(userId);
    if (!mfaData?.mfa_secret || !mfaData?.mfa_enabled) {
      throw Object.assign(new Error('MFA_NOT_CONFIGURED'), { status: 400 });
    }

    const valid = speakeasy.totp.verify({
      secret: mfaData.mfa_secret,
      encoding: 'base32',
      token,
      window: 1
    });

    if (!valid) throw Object.assign(new Error('MFA_TOKEN_INVALID'), { status: 400 });

    res.clearCookie('mfa_pending');
    const user = await UserRepository.findById(userId);
    return this._completeLogin(user, res);
  },

  async mfaReset(targetUserId) {
    const user = await UserRepository.findById(targetUserId);
    if (!user) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
    await UserRepository.resetMfa(targetUserId);
    logger.info(`MFA reset for user ${user.username} (id: ${targetUserId})`);
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
