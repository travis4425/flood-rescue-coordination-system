const router = require('express').Router();
const MissionController = require('../controllers/missionController');
const { authenticate, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.get('/', authenticate, MissionController.getAll);
router.get('/:id', authenticate, MissionController.getById);
router.get('/:id/logs', authenticate, MissionController.getLogs);
router.put('/:id/status', authenticate, authorize('rescue_team', 'coordinator'), MissionController.updateStatus);
router.put('/:id/result', authenticate, upload.array('images', 5), MissionController.submitResult);

module.exports = router;
