const router = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth');
const TaskController = require('../controllers/taskController');

router.get('/', authenticate, TaskController.getAll);
router.get('/suggest-requests', authenticate, authorize('coordinator', 'manager'), TaskController.suggestRequests);
router.post('/', authenticate, authorize('coordinator', 'manager'), TaskController.create);

router.get('/:id', authenticate, TaskController.getById);
router.get('/:id/all-members', authenticate, TaskController.getAllMembers);
router.put('/:id/assign-member', authenticate, authorize('rescue_team', 'coordinator'), TaskController.assignMember);
router.put('/:id/status', authenticate, authorize('coordinator', 'manager'), TaskController.updateStatus);
router.put('/:id/confirm-complete', authenticate, authorize('coordinator', 'manager'), TaskController.confirmComplete);
router.put('/:id/cancel', authenticate, authorize('coordinator', 'manager'), TaskController.cancel);
router.put('/:id/scheduled-date', authenticate, authorize('coordinator', 'manager'), TaskController.setScheduledDate);
router.put('/:id/estimated-completion', authenticate, authorize('rescue_team'), TaskController.setEstimatedCompletion);
router.post('/:id/dispatch-support', authenticate, authorize('coordinator', 'manager'), TaskController.dispatchSupport);

router.post('/:id/reports', authenticate, authorize('rescue_team', 'coordinator'), TaskController.createIncidentReport);
router.put('/:id/reports/:reportId/resolve', authenticate, authorize('coordinator', 'manager'), TaskController.resolveIncidentReport);
router.put('/:id/reports/:reportId/unresolve', authenticate, authorize('coordinator', 'manager'), TaskController.unresolveIncidentReport);

module.exports = router;
