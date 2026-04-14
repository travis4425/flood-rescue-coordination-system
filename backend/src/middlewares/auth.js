const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  // Ưu tiên cookie (production), fallback Bearer header (dev/API testing)
  const token = req.cookies?.access_token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);

  if (!token) return res.status(401).json({ error: 'Không có quyền truy cập. Vui lòng đăng nhập.' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ error: 'TOKEN_EXPIRED', message: 'Phiên làm việc hết hạn.' });
    return res.status(401).json({ error: 'Token không hợp lệ.' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Bạn không có quyền thực hiện thao tác này." });
    }
    next();
  };
}

function optionalAuth(req, res, next) {
  const token = req.cookies?.access_token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);

  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {}
  }
  next();
}

module.exports = { authenticate, authorize, optionalAuth };
