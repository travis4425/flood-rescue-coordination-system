const TeamService = require('../services/teamService');

const TeamController = {
  async getAll(req, res, next) {
    try {
      const data = await TeamService.getAll(req.query);
      res.json(data);
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const data = await TeamService.getById(parseInt(req.params.id));
      res.json(data);
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy đội' });
      next(err);
    }
  },

  async getMembers(req, res, next) {
    try {
      const data = await TeamService.getMembers(parseInt(req.params.id));
      res.json(data);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const result = await TeamService.create(req.body, req.user);
      res.status(201).json(result);
    } catch (err) {
      if (err.message === 'PROVINCE_NOT_ALLOWED')
        return res.status(403).json({ error: 'Bạn chỉ có thể tạo đội trong tỉnh của mình.' });
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      await TeamService.update(parseInt(req.params.id), req.body);
      res.json({ message: 'Cập nhật đội cứu hộ thành công.' });
    } catch (err) { next(err); }
  },

  async updateStatus(req, res, next) {
    try {
      const teamId = parseInt(req.params.id);
      await TeamService.updateStatus(teamId, req.body.status);
      const io = req.app.get('io');
      if (io) io.emit('team_status_updated', { team_id: teamId, status: req.body.status });
      res.json({ message: `Đã cập nhật trạng thái đội: ${req.body.status}` });
    } catch (err) {
      if (err.message === 'INVALID_STATUS')
        return res.status(400).json({ error: `Trạng thái không hợp lệ. Chấp nhận: available, on_mission, standby, off_duty` });
      next(err);
    }
  },

  async updateLocation(req, res, next) {
    try {
      const teamId = parseInt(req.params.id);
      const { lat, lng } = await TeamService.updateLocation(teamId, req.body.latitude, req.body.longitude, req.user);
      const io = req.app.get('io');
      if (io) io.emit('team_location_updated', { team_id: teamId, latitude: lat, longitude: lng });
      res.json({ message: 'OK' });
    } catch (err) {
      if (err.message === 'INVALID_COORDS') return res.status(400).json({ error: 'Tọa độ GPS không hợp lệ.' });
      if (err.message === 'NOT_LEADER') return res.status(403).json({ error: 'Bạn không phải trưởng đội này.' });
      next(err);
    }
  },

  async addMember(req, res, next) {
    try {
      if (!req.body.user_id) return res.status(400).json({ error: 'Thiếu user_id' });
      const member = await TeamService.addMember(parseInt(req.params.id), req.body.user_id, req.body.role_in_team || 'member');
      res.status(201).json(member);
    } catch (err) {
      if (err.message === 'ALREADY_MEMBER') return res.status(409).json({ error: 'Thành viên đã có trong đội' });
      next(err);
    }
  },

  async removeMember(req, res, next) {
    try {
      await TeamService.removeMember(parseInt(req.params.id), req.params.memberId);
      res.json({ message: 'Đã xóa thành viên khỏi đội' });
    } catch (err) { next(err); }
  }
};

module.exports = TeamController;
