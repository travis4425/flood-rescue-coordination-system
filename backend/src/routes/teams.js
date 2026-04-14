const router = require('express').Router();
const TeamController = require('../controllers/teamController');
const { authenticate, authorize } = require('../middlewares/auth');

router.get('/', authenticate, TeamController.getAll);
router.post('/', authenticate, authorize('admin', 'manager', 'coordinator'), TeamController.create);
router.get('/:id', authenticate, TeamController.getById);
router.put('/:id', authenticate, authorize('admin', 'manager', 'coordinator'), TeamController.update);
router.put('/:id/status', authenticate, authorize('admin', 'manager', 'coordinator'), TeamController.updateStatus);
router.put('/:id/location', authenticate, authorize('rescue_team', 'admin', 'manager', 'coordinator'), TeamController.updateLocation);
router.get('/:id/members', authenticate, TeamController.getMembers);
router.post('/:id/members', authenticate, authorize('admin', 'manager'), TeamController.addMember);
router.delete('/:id/members/:memberId', authenticate, authorize('admin', 'manager'), TeamController.removeMember);

module.exports = router;
