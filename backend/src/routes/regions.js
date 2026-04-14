const router = require('express').Router();
const RegionController = require('../controllers/regionController');
const { authenticate, authorize } = require('../middlewares/auth');

router.get('/', RegionController.getRegions);
router.get('/provinces', RegionController.getProvinces);
router.get('/incident-types', RegionController.getIncidentTypes);
router.get('/urgency-levels', RegionController.getUrgencyLevels);
router.get('/weather-alerts', RegionController.getWeatherAlerts);
router.post('/weather-alerts', authenticate, authorize('admin', 'manager'), RegionController.createWeatherAlert);
router.get('/weather-status', RegionController.getWeatherStatus);
router.get('/weather-current/:provinceId', RegionController.getCurrentWeather);
router.get('/weather-forecast/:provinceId', RegionController.getForecast);
router.get('/weather-by-coords', RegionController.getWeatherByCoords);
router.post('/weather-alerts/auto-sync', authenticate, authorize('admin', 'manager'), RegionController.autoSyncWeatherAlerts);

module.exports = router;
