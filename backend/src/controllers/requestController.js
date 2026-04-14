const RequestService = require('../services/requestService');

const RequestController = {
  async create(req, res, next) {
    try {
      const result = await RequestService.create(req.body, req.files, req.app.get('io'));
      res.status(201).json(result);
    } catch (err) {
      if (err.message === 'NO_GPS') return res.status(400).json({ error: 'Vui lòng cung cấp vị trí GPS.' });
      if (err.message === 'INVALID_PHONE') return res.status(400).json({ error: 'Số điện thoại không hợp lệ.' });
      next(err);
    }
  },

  async getAll(req, res, next) {
    try {
      const data = await RequestService.getAll(req.query, req.user);
      res.json(data);
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const data = await RequestService.getById(parseInt(req.params.id));
      res.json(data);
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
      next(err);
    }
  },

  async getMapData(req, res, next) {
    try {
      const data = await RequestService.getMapData(req.query);
      res.json(data);
    } catch (err) { next(err); }
  },

  async getStats(req, res, next) {
    try {
      const data = await RequestService.getStats(req.user);
      res.json(data);
    } catch (err) { next(err); }
  },

  async trackByCode(req, res, next) {
    try {
      const data = await RequestService.trackByCode(req.params.trackingCode);
      res.json(data);
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy yêu cầu với mã theo dõi này.' });
      next(err);
    }
  },

  async getTrackNotifications(req, res, next) {
    try {
      const data = await RequestService.getTrackNotifications(req.params.trackingCode);
      res.json(data);
    } catch (err) { next(err); }
  },

  async citizenConfirm(req, res, next) {
    try {
      await RequestService.citizenConfirm(req.params.trackingCode, req.app.get('io'));
      res.json({ message: 'Cảm ơn bạn đã xác nhận! Chúc bạn bình an.' });
    } catch (err) {
      if (err.message === 'CONFIRM_FAILED') return res.status(400).json({ error: 'Không thể xác nhận. Yêu cầu chưa hoàn thành hoặc đã xác nhận.' });
      next(err);
    }
  },

  async rescuedByOther(req, res, next) {
    try {
      const result = await RequestService.rescuedByOther(req.params.trackingCode, req.app.get('io'));
      res.json(result);
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy yêu cầu.' });
      if (err.message === 'REQUEST_ENDED') return res.status(400).json({ error: 'Yêu cầu này đã kết thúc.' });
      next(err);
    }
  },

  async citizenUpdate(req, res, next) {
    try {
      await RequestService.citizenUpdate(req.params.trackingCode, req.body);
      const io = req.app.get('io');
      if (io) {
        const RequestRepository = require('../repositories/requestRepository');
        const req2 = await RequestRepository.findByTrackingCode(req.params.trackingCode);
        if (req2) {
          const full = await RequestService.getById(req2.id);
          io.emit('request_updated', full);
        }
      }
      res.json({ message: 'Đã cập nhật yêu cầu cứu hộ.' });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy yêu cầu.' });
      if (err.message === 'NOT_PENDING') return res.status(400).json({ error: 'Chỉ có thể chỉnh sửa yêu cầu đang chờ xử lý.' });
      if (err.message === 'INVALID_PHONE') return res.status(400).json({ error: 'Số điện thoại không hợp lệ.' });
      next(err);
    }
  },

  async verify(req, res, next) {
    try {
      const result = await RequestService.verify(parseInt(req.params.id), req.body, req.user.id, req.app.get('io'));
      res.json({ message: 'Đã xác minh yêu cầu.', data: result });
    } catch (err) { next(err); }
  },

  async reject(req, res, next) {
    try {
      await RequestService.reject(parseInt(req.params.id), req.body.reason, req.user.id, req.app.get('io'));
      res.json({ message: 'Đã từ chối yêu cầu.' });
    } catch (err) {
      if (err.message === 'REASON_REQUIRED') return res.status(400).json({ error: 'Vui lòng nhập lý do từ chối.' });
      next(err);
    }
  },

  async assign(req, res, next) {
    try {
      const result = await RequestService.assign(parseInt(req.params.id), req.body.team_id, req.body.vehicle_id, req.app.get('io'));
      res.json({ message: 'Đã phân công đội cứu hộ.', data: result });
    } catch (err) {
      if (err.message === 'NO_TEAM') return res.status(400).json({ error: 'Vui lòng chọn đội cứu hộ.' });
      next(err);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const result = await RequestService.updateStatus(parseInt(req.params.id), req.body, req.app.get('io'));
      res.json({ message: 'Cập nhật trạng thái thành công.', data: result });
    } catch (err) {
      if (err.message === 'INVALID_STATUS') return res.status(400).json({ error: 'Trạng thái không hợp lệ.' });
      next(err);
    }
  },

  async cancel(req, res, next) {
    try {
      await RequestService.cancel(parseInt(req.params.id), req.app.get('io'));
      res.json({ message: 'Đã hủy yêu cầu cứu hộ.' });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy yêu cầu.' });
      if (err.message === 'CANNOT_CANCEL') return res.status(400).json({ error: `Không thể hủy yêu cầu đang ở trạng thái "${err.currentStatus}".` });
      next(err);
    }
  },

  async close(req, res, next) {
    try {
      const result = await RequestService.close(parseInt(req.params.id), req.app.get('io'));
      res.json({ message: 'Đã đóng đơn thành công.', data: result });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy yêu cầu.' });
      if (err.message === 'TEAM_NOT_CONFIRMED') return res.status(400).json({ error: 'Đội cứu hộ chưa xác nhận hoàn thành. Chưa thể đóng đơn.' });
      if (err.message === 'ALREADY_CLOSED') return res.status(400).json({ error: 'Đơn này đã được đóng.' });
      next(err);
    }
  },

  async suggestTeam(req, res, next) {
    try {
      const data = await RequestService.suggestTeam(parseInt(req.params.id));
      res.json(data);
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy yêu cầu.' });
      next(err);
    }
  },

  async reassignCoordinator(req, res, next) {
    try {
      const fullName = await RequestService.reassignCoordinator(
        parseInt(req.params.id), req.body.coordinator_id, req.user, req.ip
      );
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${req.body.coordinator_id}`).emit('request_assigned', { request_id: parseInt(req.params.id) });
        io.emit('request_updated', { id: parseInt(req.params.id), action: 'coordinator_reassigned' });
      }
      res.json({ message: `Đã chuyển yêu cầu cho ${fullName}` });
    } catch (err) {
      if (err.message === 'NO_COORDINATOR') return res.status(400).json({ error: 'Thiếu coordinator_id' });
      if (err.message === 'COORDINATOR_NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy điều phối viên' });
      next(err);
    }
  },

  async lookupByPhone(req, res, next) {
    try {
      const data = await RequestService.lookupByPhone(req.query.phone);
      res.json(data);
    } catch (err) {
      if (err.message === 'INVALID_PHONE') return res.status(400).json({ error: 'Vui lòng nhập số điện thoại hợp lệ.' });
      next(err);
    }
  }
};

module.exports = RequestController;
