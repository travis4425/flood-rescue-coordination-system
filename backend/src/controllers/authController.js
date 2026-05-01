const AuthService = require('../services/authService');
const UserRepository = require('../repositories/userRepository');

const AuthController = {
  async login(req, res, next) {
    try {
      const result = await AuthService.login(req.body.username, req.body.password, res);
      if (result.status === 'MFA_REQUIRED') {
        return res.json({ mfaRequired: true });
      }
      if (result.status === 'MFA_SETUP_REQUIRED') {
        return res.json({ mfaSetupRequired: true });
      }
      res.json({ user: result.user, message: 'Đăng nhập thành công' });
    } catch (err) {
      if (err.message === 'INVALID_CREDENTIALS')
        return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
      next(err);
    }
  },

  async mfaSetup(req, res, next) {
    try {
      const result = await AuthService.mfaSetup(req);
      res.json(result);
    } catch (err) {
      if (err.message === 'MFA_PENDING_MISSING' || err.message === 'MFA_PENDING_INVALID')
        return res.status(401).json({ error: 'Phiên xác thực không hợp lệ hoặc đã hết hạn.' });
      next(err);
    }
  },

  async mfaConfirmSetup(req, res, next) {
    try {
      const result = await AuthService.mfaConfirmSetup(req, req.body.token, res);
      res.json({ user: result.user, message: 'Thiết lập MFA thành công. Đăng nhập thành công.' });
    } catch (err) {
      if (err.message === 'MFA_TOKEN_INVALID')
        return res.status(400).json({ error: 'Mã xác thực không đúng. Vui lòng thử lại.' });
      if (err.message === 'MFA_PENDING_MISSING' || err.message === 'MFA_PENDING_INVALID')
        return res.status(401).json({ error: 'Phiên xác thực không hợp lệ hoặc đã hết hạn.' });
      next(err);
    }
  },

  async mfaVerify(req, res, next) {
    try {
      const result = await AuthService.mfaVerify(req, req.body.token, res);
      res.json({ user: result.user, message: 'Đăng nhập thành công' });
    } catch (err) {
      if (err.message === 'MFA_TOKEN_INVALID')
        return res.status(400).json({ error: 'Mã xác thực không đúng. Vui lòng thử lại.' });
      if (err.message === 'MFA_PENDING_MISSING' || err.message === 'MFA_PENDING_INVALID')
        return res.status(401).json({ error: 'Phiên xác thực không hợp lệ hoặc đã hết hạn.' });
      next(err);
    }
  },

  async mfaReset(req, res, next) {
    try {
      await AuthService.mfaReset(parseInt(req.params.id));
      res.json({ message: 'Đặt lại MFA thành công.' });
    } catch (err) {
      if (err.message === 'NOT_FOUND')
        return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
      next(err);
    }
  },

  async refresh(req, res, next) {
    try {
      const result = await AuthService.refresh(req.cookies?.refresh_token, res);
      res.json(result);
    } catch (err) {
      if (['NO_REFRESH_TOKEN', 'INVALID_REFRESH_TOKEN'].includes(err.message))
        return res.status(401).json({ error: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' });
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      await AuthService.logout(req.cookies?.refresh_token, res);
      res.json({ message: 'Đăng xuất thành công' });
    } catch (err) {
      next(err);
    }
  },

  async getMe(req, res, next) {
    try {
      const user = await UserRepository.findById(req.user.id);
      if (!user) return res.status(404).json({ error: 'Người dùng không tồn tại.' });

      if (user.role === 'rescue_team') {
        user.is_team_leader = await UserRepository.isTeamLeader(user.id);
      }
      // Trả về trạng thái MFA để frontend hiển thị badge
      const mfaData = await UserRepository.getMfaData(user.id);
      user.mfa_enabled = mfaData?.mfa_enabled ?? false;

      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req, res, next) {
    try {
      await AuthService.changePassword(
        req.user.id,
        req.body.current_password,
        req.body.new_password
      );
      res.json({ message: 'Đổi mật khẩu thành công.' });
    } catch (err) {
      if (err.message === 'WRONG_CURRENT_PASSWORD')
        return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng.' });
      if (err.message === 'USER_NOT_FOUND')
        return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
      next(err);
    }
  }
};

module.exports = AuthController;
