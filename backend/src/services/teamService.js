const TeamRepository = require('../repositories/teamRepository');

const VALID_STATUSES = ['available', 'on_mission', 'standby', 'off_duty'];

const TeamService = {
  async getAll(filters) {
    return TeamRepository.findAll(filters);
  },

  async getById(id) {
    const team = await TeamRepository.findById(id);
    if (!team) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
    const [members, activeMissions] = await Promise.all([
      TeamRepository.findMembers(id),
      TeamRepository.findActiveMissions(id)
    ]);
    return { ...team, members, active_missions: activeMissions };
  },

  async getMembers(teamId) {
    return TeamRepository.findMembers(teamId);
  },

  async create(data, actorUser) {
    // Coordinator chỉ được tạo đội trong tỉnh của mình
    if (actorUser.role === 'coordinator' && actorUser.province_id) {
      if (parseInt(data.province_id) !== actorUser.province_id) {
        throw Object.assign(new Error('PROVINCE_NOT_ALLOWED'), { status: 403 });
      }
    }
    const id = await TeamRepository.create(data);
    return { id, message: 'Tạo đội cứu hộ thành công.' };
  },

  async update(id, data) {
    await TeamRepository.update(id, data);
  },

  async updateStatus(id, status) {
    if (!VALID_STATUSES.includes(status)) {
      throw Object.assign(new Error('INVALID_STATUS'), { status: 400 });
    }
    await TeamRepository.updateStatus(id, status);
  },

  async updateLocation(id, latitude, longitude, actorUser) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw Object.assign(new Error('INVALID_COORDS'), { status: 400 });
    }
    // rescue_team chỉ được cập nhật vị trí đội mình (phải là leader)
    if (actorUser.role === 'rescue_team') {
      const isLeader = await TeamRepository.isLeader(id, actorUser.id);
      if (!isLeader) throw Object.assign(new Error('NOT_LEADER'), { status: 403 });
    }
    await TeamRepository.updateLocation(id, lat, lng);
    return { lat, lng };
  },

  async addMember(teamId, userId, roleInTeam) {
    const existing = await TeamRepository.findMemberEntry(teamId, parseInt(userId));
    if (existing) throw Object.assign(new Error('ALREADY_MEMBER'), { status: 409 });
    return TeamRepository.addMember(teamId, parseInt(userId), roleInTeam);
  },

  async removeMember(teamId, memberId) {
    await TeamRepository.removeMember(parseInt(memberId), teamId);
  }
};

module.exports = TeamService;
