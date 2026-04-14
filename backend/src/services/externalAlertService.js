const { query } = require('../config/database');
const logger = require('../config/logger');

// Bounding box Việt Nam + vùng biển chủ quyền
const VN_BBOX = {
  minLat: 5.5,  maxLat: 24.0,
  minLng: 102.0, maxLng: 117.5
};

const ExternalAlertService = {

  // ── USGS Earthquake API ──────────────────────────────────────
  async fetchEarthquakes() {
    try {
      const url = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query');
      url.searchParams.set('format', 'geojson');
      url.searchParams.set('minlatitude',  VN_BBOX.minLat);
      url.searchParams.set('maxlatitude',  VN_BBOX.maxLat);
      url.searchParams.set('minlongitude', VN_BBOX.minLng);
      url.searchParams.set('maxlongitude', VN_BBOX.maxLng);
      url.searchParams.set('minmagnitude', '3.0');
      url.searchParams.set('orderby', 'time');
      url.searchParams.set('limit', '20');

      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`USGS HTTP ${res.status}`);

      const data = await res.json();
      let newCount = 0;

      for (const feature of (data.features || [])) {
        const props = feature.properties;
        const [lng, lat] = feature.geometry.coordinates;
        const externalId = feature.id;

        // Deduplicate
        const exists = await query(
          `SELECT id FROM external_alert_logs WHERE source = 'USGS' AND raw_data->>'id' = $1`,
          [externalId]
        );
        if (exists.rows.length > 0) continue;

        const rawData = {
          id: externalId, magnitude: props.mag,
          place: props.place, lat, lng, time: props.time,
          depth: feature.geometry.coordinates[2]
        };

        await query(
          `INSERT INTO external_alert_logs (source, alert_type, raw_data)
           VALUES ('USGS', 'earthquake', $1)`,
          [JSON.stringify(rawData)]
        );
        newCount++;

        // Magnitude ≥ 5.0 → warn
        if (props.mag >= 5.0) {
          logger.warn(`[USGS] Significant earthquake: M${props.mag} near ${props.place} (${lat}, ${lng})`);
        }
      }

      if (newCount > 0) logger.info(`[USGS] Ingested ${newCount} new earthquake records`);
    } catch (e) {
      logger.error(`[USGS] Fetch error: ${e.message || e}`);
    }
  },

  // ── NASA FIRMS Wildfire ──────────────────────────────────────
  async fetchWildfires() {
    const apiKey = process.env.NASA_FIRMS_API_KEY;
    if (!apiKey) {
      logger.debug('[NASA FIRMS] No API key configured, skipping wildfire check');
      return;
    }
    try {
      // Vietnam country code: VNM, 1 day lookback
      const url = `https://firms.modaps.eosdis.nasa.gov/api/country/csv/${apiKey}/VIIRS_SNPP_NRT/VNM/1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`NASA FIRMS HTTP ${res.status}`);

      const csv = await res.text();
      const lines = csv.trim().split('\n').slice(1); // skip header

      let newCount = 0;
      for (const line of lines) {
        if (!line.trim()) continue;
        const cols = line.split(',');
        const lat = parseFloat(cols[0]), lng = parseFloat(cols[1]);
        const confidence = cols[8] || 'n';
        const acqDate = cols[5], acqTime = cols[6];
        const fireId = `${lat}_${lng}_${acqDate}_${acqTime}`;

        const exists = await query(
          `SELECT id FROM external_alert_logs WHERE source = 'NASA_FIRMS' AND raw_data->>'fire_id' = $1`,
          [fireId]
        );
        if (exists.rows.length > 0) continue;

        await query(
          `INSERT INTO external_alert_logs (source, alert_type, raw_data)
           VALUES ('NASA_FIRMS', 'wildfire', $1)`,
          [JSON.stringify({ fire_id: fireId, lat, lng, confidence, acq_date: acqDate, acq_time: acqTime })]
        );
        newCount++;
      }

      if (newCount > 0) logger.info(`[NASA FIRMS] Ingested ${newCount} new fire hotspot records`);
    } catch (e) {
      logger.error('[NASA FIRMS] Fetch error:', e.message);
    }
  },

  // ── Mark alert as processed & link to disaster_event ────────
  async markProcessed(alertId, disasterEventId) {
    await query(
      `UPDATE external_alert_logs
       SET processed = true, disaster_event_id = $2
       WHERE id = $1`,
      [alertId, disasterEventId]
    );
  },

  // ── Get unprocessed alerts ───────────────────────────────────
  async getUnprocessed(source) {
    const params = [];
    let where = 'WHERE processed = false';
    if (source) { params.push(source); where += ` AND source = $${params.length}`; }

    const result = await query(
      `SELECT * FROM external_alert_logs ${where} ORDER BY received_at DESC LIMIT 50`,
      params
    );
    return result.rows;
  },

  // ── Scheduler ────────────────────────────────────────────────
  startScheduler() {
    logger.info('[ExternalAlert] Scheduler started (earthquake: 5min, wildfire: 6h)');

    // Earthquake: every 5 minutes
    setInterval(() => this.fetchEarthquakes(), 5 * 60 * 1000);
    // Wildfire: every 6 hours
    setInterval(() => this.fetchWildfires(), 6 * 60 * 60 * 1000);

    // Delay initial run 10s to let DB finish connecting & migrations settle
    setTimeout(() => this.fetchEarthquakes(), 10 * 1000);
  }
};

module.exports = ExternalAlertService;
