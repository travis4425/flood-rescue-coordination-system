const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const RequestController = require('../controllers/requestController');
const { authenticate, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Rate limit cho citizen gửi yêu cầu cứu hộ
const citizenLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: parseInt(process.env.CITIZEN_RATE_LIMIT_MAX) || 10,
  message: { error: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.' }
});

// Public routes
router.post('/', citizenLimiter, upload.array('images', 5), RequestController.create);
router.get('/map', RequestController.getMapData);
router.get('/lookup', RequestController.lookupByPhone);
router.get('/track/:trackingCode', RequestController.trackByCode);
router.get('/track/:trackingCode/notifications', RequestController.getTrackNotifications);
router.put('/track/:trackingCode/confirm', RequestController.citizenConfirm);
router.put('/track/:trackingCode/rescued-by-other', RequestController.rescuedByOther);
router.put('/track/:trackingCode/update', RequestController.citizenUpdate);

// Authenticated routes
router.get('/stats/overview', authenticate, RequestController.getStats);
router.get('/', authenticate, RequestController.getAll);
router.get('/:id', authenticate, RequestController.getById);
router.put('/:id/verify', authenticate, authorize('coordinator', 'admin', 'manager'), RequestController.verify);
router.put('/:id/reject', authenticate, authorize('coordinator', 'admin', 'manager'), RequestController.reject);
router.put('/:id/assign', authenticate, authorize('coordinator'), RequestController.assign);
router.put('/:id/status', authenticate, authorize('rescue_team', 'coordinator'), RequestController.updateStatus);
router.put('/:id/cancel', authenticate, RequestController.cancel);
router.put('/:id/close', authenticate, authorize('coordinator', 'admin', 'manager'), RequestController.close);
router.get('/:id/suggest-team', authenticate, authorize('coordinator', 'admin', 'manager'), RequestController.suggestTeam);
router.put('/:id/reassign-coordinator', authenticate, authorize('admin', 'manager'), RequestController.reassignCoordinator);

module.exports = router;
