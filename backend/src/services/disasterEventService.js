const DisasterEventRepository = require('../repositories/disasterEventRepository');
const { query } = require('../config/database');
const { formatResponse } = require('../utils/helpers');

const VALID_STATUSES = ['monitoring','warning','active','recovery','closed'];

const DisasterEventService = {

  async getAll(reqQuery) {
    const { page = 1, limit = 20, status, type_code, province_id } = reqQuery;
    const result = await DisasterEventRepository.findAll({
      status, type_code, province_id,
      page: parseInt(page), limit: parseInt(limit)
    });
    return formatResponse(result.data, result.total, result.page, result.limit);
  },

  async getActive() {
    return DisasterEventRepository.findActive();
  },

  async getById(id) {
    const event = await DisasterEventRepository.findById(id);
    if (!event) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });

    const phases = await DisasterEventRepository.getPhases(event.disaster_type_id);
    return { ...event, phases };
  },

  async create(data, userId) {
    if (!data.name || !data.disaster_type_id || !data.severity) {
      throw Object.assign(new Error('MISSING_REQUIRED_FIELDS'), { status: 400 });
    }
    if (data.severity < 1 || data.severity > 5) {
      throw Object.assign(new Error('INVALID_SEVERITY'), { status: 400 });
    }

    // Verify disaster_type exists
    const typeCheck = await query('SELECT id FROM disaster_types WHERE id = $1', [data.disaster_type_id]);
    if (!typeCheck.rows.length) {
      throw Object.assign(new Error('INVALID_DISASTER_TYPE'), { status: 400 });
    }

    const event = await DisasterEventRepository.create({ ...data, created_by: userId });

    // Log creation
    await query(
      `INSERT INTO disaster_event_logs (disaster_event_id, user_id, action, description)
       VALUES ($1, $2, 'created', 'Sự kiện thiên tai được khởi tạo')`,
      [event.id, userId]
    );

    return event;
  },

  async updateStatus(id, status, userId) {
    if (!VALID_STATUSES.includes(status)) {
      throw Object.assign(new Error('INVALID_STATUS'), { status: 400 });
    }

    const existing = await DisasterEventRepository.findById(id);
    if (!existing) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
    if (existing.status === 'closed') {
      throw Object.assign(new Error('EVENT_ALREADY_CLOSED'), { status: 400 });
    }

    return DisasterEventRepository.updateStatus(id, status, userId);
  },

  async update(id, data, userId) {
    const existing = await DisasterEventRepository.findById(id);
    if (!existing) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });

    if (data.severity !== undefined && (data.severity < 1 || data.severity > 5)) {
      throw Object.assign(new Error('INVALID_SEVERITY'), { status: 400 });
    }

    return DisasterEventRepository.update(id, data, userId);
  },

  async getTimeline(id) {
    const exists = await query('SELECT id FROM disaster_events WHERE id = $1', [id]);
    if (!exists.rows.length) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
    return DisasterEventRepository.getTimeline(id);
  },

  async getStats() {
    return DisasterEventRepository.getStats();
  },

  async getTypes() {
    const result = await query(
      'SELECT * FROM disaster_types WHERE is_active = true ORDER BY id'
    );
    return result.rows;
  }
};

module.exports = DisasterEventService;
