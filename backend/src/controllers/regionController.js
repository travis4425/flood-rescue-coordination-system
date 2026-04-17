const RegionService = require('../services/regionService');
const weatherService = require('../services/weatherService');

const RegionController = {
  async getRegions(req, res, next) {
    try {
      const data = await RegionService.getRegions();
      res.json(data);
    } catch (err) { next(err); }
  },

  async getProvinces(req, res, next) {
    try {
      const data = await RegionService.getProvinces(req.query.region_id);
      res.json(data);
    } catch (err) { next(err); }
  },

  async getIncidentTypes(req, res, next) {
    try {
      const data = await RegionService.getIncidentTypes();
      res.json(data);
    } catch (err) { next(err); }
  },

  async getUrgencyLevels(req, res, next) {
    try {
      const data = await RegionService.getUrgencyLevels();
      res.json(data);
    } catch (err) { next(err); }
  },

  async getWeatherAlerts(req, res, next) {
    try {
      const data = await RegionService.getWeatherAlerts(req.query);
      res.json(data);
    } catch (err) { next(err); }
  },

  async createWeatherAlert(req, res, next) {
    try {
      if (!req.body.title || !req.body.severity)
        return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
      const alert = await RegionService.createWeatherAlert(req.body, req.app.get('io'));
      res.status(201).json(alert);
    } catch (err) { next(err); }
  },

  getWeatherStatus(req, res) {
    res.json({
      configured: weatherService.isConfigured(),
      message: weatherService.isConfigured()
        ? 'OpenWeatherMap API đã được cấu hình'
        : 'Chưa cấu hình OPENWEATHERMAP_API_KEY trong file .env'
    });
  },

  async getCurrentWeather(req, res, next) {
    try {
      const data = await RegionService.getCurrentWeather(parseInt(req.params.provinceId));
      res.json(data);
    } catch (err) {
      if (err.message === 'WEATHER_NOT_CONFIGURED')
        return res.status(503).json({ error: 'Weather API chưa cấu hình', hint: 'Thêm OPENWEATHERMAP_API_KEY vào file .env' });
      if (err.message === 'PROVINCE_NOT_FOUND')
        return res.status(404).json({ error: 'Không tìm thấy tỉnh/thành' });
      if (err.message === 'NO_PROVINCE_COORDS')
        return res.status(400).json({ error: 'Tỉnh/thành chưa có tọa độ GPS' });
      next(err);
    }
  },

  async getForecast(req, res, next) {
    try {
      const data = await RegionService.getForecast(parseInt(req.params.provinceId));
      res.json(data);
    } catch (err) {
      if (err.message === 'WEATHER_NOT_CONFIGURED')
        return res.status(503).json({ error: 'Weather API chưa cấu hình', hint: 'Thêm OPENWEATHERMAP_API_KEY vào file .env' });
      if (err.message === 'PROVINCE_NOT_FOUND')
        return res.status(404).json({ error: 'Không tìm thấy tỉnh/thành' });
      if (err.message === 'NO_PROVINCE_COORDS')
        return res.status(400).json({ error: 'Tỉnh/thành chưa có tọa độ GPS' });
      next(err);
    }
  },

  async getWeatherByCoords(req, res, next) {
    try {
      const lat = parseFloat(req.query.lat);
      const lon = parseFloat(req.query.lon);
      if (isNaN(lat) || isNaN(lon))
        return res.status(400).json({ error: 'Thiếu tọa độ lat/lon' });
      const data = await RegionService.getWeatherByCoords(lat, lon);
      res.json(data);
    } catch (err) {
      if (err.message === 'WEATHER_NOT_CONFIGURED')
        return res.status(503).json({ error: 'Weather API chưa cấu hình' });
      next(err);
    }
  },

  async autoSyncWeatherAlerts(req, res, next) {
    try {
      const result = await RegionService.autoSyncWeatherAlerts(req.body.province_ids, req.app.get('io'));
      res.json(result);
    } catch (err) {
      if (err.message === 'WEATHER_NOT_CONFIGURED')
        return res.status(503).json({ error: 'Weather API chưa cấu hình', hint: 'Thêm OPENWEATHERMAP_API_KEY vào file .env' });
      next(err);
    }
  },

  async getLiveWeatherAlerts(req, res, next) {
    try {
      const data = await RegionService.getLiveWeatherAlerts(parseInt(req.params.provinceId));
      res.json(data);
    } catch (err) {
      if (err.message === 'PROVINCE_NOT_FOUND')
        return res.status(404).json({ error: 'Không tìm thấy tỉnh/thành.' });
      next(err);
    }
  }
};

module.exports = RegionController;
