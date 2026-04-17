const RegionRepository = require('../repositories/regionRepository');
const weatherService = require('./weatherService');
const cache = require('../utils/cache');

const RegionService = {
  async getRegions() {
    const cached = cache.get('regions:all');
    if (cached) return cached;
    const data = await RegionRepository.findAllRegions();
    cache.set('regions:all', data, 3600);
    return data;
  },

  async getProvinces(regionId) {
    const cacheKey = `regions:provinces:${regionId || 'all'}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    const data = await RegionRepository.findProvinces(regionId);
    cache.set(cacheKey, data, 3600);
    return data;
  },

  async getIncidentTypes() {
    const cached = cache.get('regions:incident_types');
    if (cached) return cached;
    const data = await RegionRepository.findIncidentTypes();
    cache.set('regions:incident_types', data, 3600);
    return data;
  },

  async getUrgencyLevels() {
    const cached = cache.get('regions:urgency_levels');
    if (cached) return cached;
    const data = await RegionRepository.findUrgencyLevels();
    cache.set('regions:urgency_levels', data, 3600);
    return data;
  },

  async getWeatherAlerts(filters) {
    return RegionRepository.findWeatherAlerts(filters);
  },

  async createWeatherAlert(data, io) {
    const alert = await RegionRepository.createWeatherAlert(data);
    if (io) {
      io.emit('weather_alert', alert);
      if (data.province_id) {
        io.to(`province_${data.province_id}`).emit('weather_alert', alert);
      }
    }
    return alert;
  },

  async getProvinceById(id) {
    const province = await RegionRepository.findProvinceById(id);
    if (!province) throw Object.assign(new Error('PROVINCE_NOT_FOUND'), { status: 404 });
    return province;
  },

  async getCurrentWeather(provinceId) {
    if (!weatherService.isConfigured()) throw Object.assign(new Error('WEATHER_NOT_CONFIGURED'), { status: 503 });
    const province = await this.getProvinceById(provinceId);
    if (!province.latitude || !province.longitude) {
      throw Object.assign(new Error('NO_PROVINCE_COORDS'), { status: 400 });
    }
    const weather = await weatherService.getCurrentWeather(province.latitude, province.longitude);
    return {
      province_id: province.id,
      province_name: province.name,
      ...weather,
      icon_url: weatherService.getIconUrl(weather.weather_icon)
    };
  },

  async getForecast(provinceId) {
    if (!weatherService.isConfigured()) throw Object.assign(new Error('WEATHER_NOT_CONFIGURED'), { status: 503 });
    const province = await this.getProvinceById(provinceId);
    if (!province.latitude || !province.longitude) {
      throw Object.assign(new Error('NO_PROVINCE_COORDS'), { status: 400 });
    }
    const forecast = await weatherService.getForecast(province.latitude, province.longitude);
    forecast.daily = forecast.daily.map(d => ({
      ...d,
      icon_url: weatherService.getIconUrl(d.weather_icon)
    }));
    return { province_id: province.id, province_name: province.name, ...forecast };
  },

  async getWeatherByCoords(lat, lon) {
    if (!weatherService.isConfigured()) throw Object.assign(new Error('WEATHER_NOT_CONFIGURED'), { status: 503 });
    const weather = await weatherService.getCurrentWeather(lat, lon);
    return { ...weather, icon_url: weatherService.getIconUrl(weather.weather_icon) };
  },

  async autoSyncWeatherAlerts(provinceIds, io) {
    if (!weatherService.isConfigured()) throw Object.assign(new Error('WEATHER_NOT_CONFIGURED'), { status: 503 });
    const provinces = await RegionRepository.findAllProvincesWithCoords(provinceIds);
    if (!provinces.length) return { message: 'Không có tỉnh nào để kiểm tra', alerts_created: 0 };

    const alertsCreated = [];
    const errors = [];

    for (const province of provinces) {
      try {
        if (provinces.indexOf(province) > 0) {
          await new Promise(r => setTimeout(r, 300)); // Tránh rate limit API
        }

        const [current, forecast] = await Promise.all([
          weatherService.getCurrentWeather(province.latitude, province.longitude),
          weatherService.getForecast(province.latitude, province.longitude)
        ]);

        const risks = weatherService.analyzeFloodRisk(current, forecast.daily);

        for (const risk of risks) {
          const existing = await RegionRepository.findRecentWeatherAlert(province.id, risk.type, 6);
          if (existing) continue;

          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 12);

          const newAlert = await RegionRepository.createWeatherAlert({
            province_id: province.id,
            alert_type: risk.type,
            severity: risk.severity,
            title: risk.title,
            description: risk.description,
            starts_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            source: 'OpenWeatherMap API (auto)'
          });

          alertsCreated.push(newAlert);
          if (io) {
            const payload = { ...newAlert, province_name: province.name };
            io.emit('weather_alert', payload);
            io.to(`province_${province.id}`).emit('weather_alert', payload);
          }
        }
      } catch (err) {
        errors.push({ province_id: province.id, province_name: province.name, error: err.message });
      }
    }

    return {
      message: `Đã kiểm tra ${provinces.length} tỉnh/thành`,
      provinces_checked: provinces.length,
      alerts_created: alertsCreated.length,
      alerts: alertsCreated,
      errors: errors.length > 0 ? errors : undefined
    };
  },

  // Lấy cảnh báo thời tiết live cho 1 tỉnh — kết hợp OpenWeatherMap + DB
  async getLiveWeatherAlerts(provinceId) {
    const province = await this.getProvinceById(provinceId);
    // Luôn lấy alerts từ DB trước (fallback)
    const dbAlerts = await RegionRepository.findWeatherAlerts({ province_id: provinceId });

    if (!weatherService.isConfigured()) return dbAlerts;

    try {
      const [current, forecast] = await Promise.all([
        weatherService.getCurrentWeather(province.latitude, province.longitude),
        weatherService.getForecast(province.latitude, province.longitude)
      ]);
      const risks = weatherService.analyzeFloodRisk(current, forecast.daily);

      const liveAlerts = risks.map(risk => ({
        id: `live-${risk.type}-${provinceId}`,
        province_id: province.id,
        province_name: province.name,
        alert_type: risk.type,
        severity: risk.severity,
        title: `${province.name} — ${risk.title}`,
        description: risk.description,
        source: 'OpenWeatherMap (live)',
        is_live: true,
        starts_at: new Date().toISOString(),
      }));

      // Bỏ DB alerts trùng loại với live alerts
      const liveTypes = new Set(liveAlerts.map(a => a.alert_type));
      const filteredDb = dbAlerts.filter(a => !liveTypes.has(a.alert_type));

      return [...liveAlerts, ...filteredDb];
    } catch (err) {
      logger.warn(`Live weather check failed for province ${provinceId}: ${err.message}`);
      return dbAlerts;
    }
  }
};

module.exports = RegionService;
