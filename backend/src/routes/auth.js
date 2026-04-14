const router = require('express').Router();
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const { loginSchema, changePasswordSchema } = require('../validators/authValidator');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 50,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.' }
});

router.post('/login', loginLimiter, validateBody(loginSchema), AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/me', authenticate, AuthController.getMe);
router.put('/password', authenticate, validateBody(changePasswordSchema), AuthController.changePassword);

module.exports = router;
