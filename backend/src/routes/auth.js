const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { query } = require("../config/database");
const { authenticate, authorize } = require("../middlewares/auth");

// Rate limiter CHỈ cho POST /login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 50,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // KHÔNG đếm đăng nhập thành công
  message: {
    error: "Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.",
  },
});

// POST /api/auth/login
router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Vui lòng nhập tài khoản và mật khẩu." });
    }

    const result = await query(
      `SELECT u.*, p.name as province_name
       FROM users u
       LEFT JOIN provinces p ON u.province_id = p.id
       WHERE u.username = @username AND u.is_active = 1`,
      { username },
    );

    if (result.recordset.length === 0) {
      return res
        .status(401)
        .json({ error: "Tài khoản hoặc mật khẩu không đúng." });
    }

    const user = result.recordset[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res
        .status(401)
        .json({ error: "Tài khoản hoặc mật khẩu không đúng." });
    }

    // Update last login
    await query("UPDATE users SET last_login = GETDATE() WHERE id = @id", {
      id: user.id,
    });

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        province_id: user.province_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" },
    );

    const { password_hash, ...userData } = user;
    // Check if rescue_team user is a team leader
    if (userData.role === "rescue_team") {
      const leaderCheck = await query(
        `SELECT TOP 1 id FROM rescue_teams WHERE leader_id = @id`,
        { id: userData.id },
      );
      userData.is_team_leader = leaderCheck.recordset.length > 0;
    }
    res.json({ token, user: userData });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone,
              u.role, u.province_id, u.is_active, u.last_login,
              p.name as province_name
       FROM users u
       LEFT JOIN provinces p ON u.province_id = p.id
       WHERE u.id = @id`,
      { id: req.user.id },
    );
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy tài khoản." });
    }
    const userData = result.recordset[0];
    // Check if rescue_team user is a team leader
    if (userData.role === "rescue_team") {
      const leaderCheck = await query(
        `SELECT TOP 1 id FROM rescue_teams WHERE leader_id = @id`,
        { id: userData.id },
      );
      userData.is_team_leader = leaderCheck.recordset.length > 0;
    }
    res.json(userData);
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/password
router.put("/password", authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await query(
      "SELECT password_hash FROM users WHERE id = @id",
      { id: req.user.id },
    );

    const valid = await bcrypt.compare(
      currentPassword,
      result.recordset[0].password_hash,
    );
    if (!valid)
      return res.status(400).json({ error: "Mật khẩu hiện tại không đúng." });

    const hash = await bcrypt.hash(newPassword, 10);
    await query(
      "UPDATE users SET password_hash = @hash, updated_at = GETDATE() WHERE id = @id",
      { hash, id: req.user.id },
    );

    res.json({ message: "Đổi mật khẩu thành công." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
