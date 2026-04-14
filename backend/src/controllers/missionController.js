const MissionService = require('../services/missionService');

const MissionController = {
  async getAll(req, res, next) {
    try {
      const data = await MissionService.getAll(req.query, req.user);
      res.json(data);
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const data = await MissionService.getById(parseInt(req.params.id));
      res.json(data);
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ' });
      next(err);
    }
  },

  async getLogs(req, res, next) {
    try {
      const data = await MissionService.getLogs(parseInt(req.params.id));
      res.json(data);
    } catch (err) { next(err); }
  },

  async updateStatus(req, res, next) {
    try {
      await MissionService.updateStatus(
        parseInt(req.params.id),
        req.body,
        req.user,
        req.app.get('io')
      );
      res.json({ message: 'Cập nhật nhiệm vụ thành công.' });
    } catch (err) {
      if (err.message === 'INVALID_STATUS') return res.status(400).json({ error: 'Trạng thái không hợp lệ.' });
      if (err.message === 'NOT_AUTHORIZED') return res.status(403).json({ error: 'Bạn không có quyền cập nhật nhiệm vụ này.' });
      if (err.message === 'RESOURCES_NOT_DISPATCHED')
        return res.status(400).json({ error: 'Nhiệm vụ này cần coordinator phân phát vật tư/phương tiện trước. Vui lòng chờ xác nhận.' });
      next(err);
    }
  },

  async submitResult(req, res, next) {
    try {
      await MissionService.submitResult(
        parseInt(req.params.id),
        req.body,
        req.files,
        req.user,
        req.app.get('io')
      );
      res.json({ message: 'Đã gửi báo cáo kết quả cứu hộ' });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ' });
      if (err.message === 'NOT_AUTHORIZED') return res.status(403).json({ error: 'Bạn không thuộc đội thực hiện nhiệm vụ này.' });
      next(err);
    }
  }
};

module.exports = MissionController;
