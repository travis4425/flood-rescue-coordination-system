const router = require('express').Router();
const ctrl   = require('../controllers/disasterEventController');
const { authenticate, authorize } = require('../middlewares/auth');

// Public
router.get('/types',  ctrl.getTypes);
router.get('/active', ctrl.listActive);

// Authenticated
router.get('/stats', authenticate, ctrl.getStats);
router.get('/',      authenticate, ctrl.list);
router.get('/:id',   authenticate, ctrl.getById);
router.get('/:id/timeline', authenticate, ctrl.getTimeline);

// Coordinator+ only
router.post('/', authenticate, authorize('admin','manager','coordinator'), ctrl.create);
router.put('/:id',  authenticate, authorize('admin','manager','coordinator'), ctrl.update);
router.patch('/:id/status', authenticate, authorize('admin','manager','coordinator'), ctrl.updateStatus);

module.exports = router;
