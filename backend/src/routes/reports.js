const router = require('express').Router();
const ReportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middlewares/auth');

const canExport = authorize('coordinator', 'manager', 'admin', 'warehouse_manager');

router.get('/requests',  authenticate, canExport, ReportController.requests);
router.get('/missions',  authenticate, canExport, ReportController.missions);
router.get('/resources', authenticate, canExport, ReportController.resources);

module.exports = router;
