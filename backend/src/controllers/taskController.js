const TaskService = require('../services/taskService');

const TaskController = {
  async getAll(req, res, next) {
    try {
      const data = await TaskService.getAll(req.query, req.user);
      res.json(data);
    } catch (err) { next(err); }
  },

  async suggestRequests(req, res, next) {
    try {
      const data = await TaskService.suggestRequests(req.query, req.user);
      res.json(data);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const result = await TaskService.create(req.body, req.user.id);
      const io = req.app.get('io');
      if (io) {
        io.emit('task_created', { task_group_id: result.taskGroupId, team_ids: result.allTeamIds });
        for (const item of result.requestList) {
          io.emit('request_updated', { id: item.id, status: 'assigned', tracking_status: 'assigned' });
        }
      }
      res.status(201).json({ id: result.taskGroupId, message: 'Tạo task thành công.' });
    } catch (err) {
      if (err.message === 'MISSING_FIELDS') return res.status(400).json({ error: 'Cần có: tên task, ít nhất 1 đội, và ít nhất 1 yêu cầu cứu hộ.' });
      if (err.message === 'TEAM_NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy đội.' });
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await TaskService.getById(req.params.id);
      res.json(data);
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy task.' });
      next(err);
    }
  },

  async getAllMembers(req, res, next) {
    try {
      const data = await TaskService.getAllMembers(req.params.id);
      res.json(data);
    } catch (err) { next(err); }
  },

  async assignMember(req, res, next) {
    try {
      const result = await TaskService.assignMember(req.params.id, req.body, req.user.id);
      const io = req.app.get('io');
      if (io) {
        io.emit('mission_assigned', { mission_id: result.missionId, user_ids: result.ids });
        if (result.requestId) io.emit('request_updated', { id: result.requestId, status: 'in_progress' });
      }
      res.json({ message: 'Đã giao nhiệm vụ cho thành viên.' });
    } catch (err) {
      if (err.message === 'MISSING_FIELDS') return res.status(400).json({ error: 'Cần mission_id và user_id (hoặc user_ids).' });
      if (err.message === 'MISSION_NOT_IN_TASK') return res.status(404).json({ error: 'Sub-mission không thuộc task này.' });
      next(err);
    }
  },

  async createIncidentReport(req, res, next) {
    try {
      const result = await TaskService.createIncidentReport(req.params.id, req.body, req.user.id);
      const io = req.app.get('io');
      if (io) {
        io.emit('task_incident_report', {
          task_group_id: parseInt(req.params.id),
          report_id: result.reportId,
          urgency: req.body.urgency || 'medium',
          report_type: req.body.report_type,
        });
        if (result.affectedRequestId) {
          io.emit('request_updated', { id: result.affectedRequestId, tracking_status: 'incident_reported' });
        }
      }
      res.status(201).json({ id: result.reportId, message: 'Đã gửi báo cáo sự cố.' });
    } catch (err) {
      if (err.message === 'MISSING_FIELDS') return res.status(400).json({ error: 'Cần mission_id, report_type và description.' });
      if (err.message === 'MISSION_NOT_IN_TASK') return res.status(404).json({ error: 'Sub-mission không thuộc task này.' });
      next(err);
    }
  },

  async resolveIncidentReport(req, res, next) {
    try {
      const result = await TaskService.resolveIncidentReport(req.params.id, req.params.reportId, req.body, req.user.id);
      const io = req.app.get('io');
      if (io && result.affectedRequestId) {
        io.emit('request_updated', { id: result.affectedRequestId, tracking_status: 'incident_reported', coordinator_resolved: true });
      }
      res.json({ message: 'Đã cập nhật trạng thái báo cáo.' });
    } catch (err) { next(err); }
  },

  async unresolveIncidentReport(req, res, next) {
    try {
      await TaskService.unresolveIncidentReport(req.params.id, req.params.reportId);
      res.json({ message: 'Đã hoàn tác báo cáo.' });
    } catch (err) { next(err); }
  },

  async dispatchSupport(req, res, next) {
    try {
      const result = await TaskService.dispatchSupport(req.params.id, req.body);
      const io = req.app.get('io');
      if (io) io.emit('task_support_dispatched', { task_group_id: parseInt(req.params.id), team_id: result.team_id });
      res.status(201).json({ message: 'Đã điều thêm đội hỗ trợ vào task.' });
    } catch (err) {
      if (err.message === 'MISSING_FIELDS') return res.status(400).json({ error: 'Cần team_id và danh sách request_ids.' });
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy task.' });
      next(err);
    }
  },

  async confirmComplete(req, res, next) {
    try {
      const result = await TaskService.confirmComplete(req.params.id);
      const io = req.app.get('io');
      if (io) io.emit('task_updated', { task_group_id: parseInt(req.params.id), status: result.finalStatus });
      res.json({ message: 'Đã xác nhận đóng task.', status: result.finalStatus });
    } catch (err) {
      if (err.message === 'MISSIONS_INCOMPLETE') return res.status(400).json({ error: 'Còn nhiệm vụ chưa hoàn thành, chưa thể đóng task.' });
      next(err);
    }
  },

  async cancel(req, res, next) {
    try {
      const result = await TaskService.cancel(req.params.id, req.body.reason);
      const io = req.app.get('io');
      if (io) {
        io.emit('task_updated', { task_group_id: parseInt(req.params.id), status: 'cancelled' });
        if (result.task.leader_id) io.to(`user_${result.task.leader_id}`).emit('notification');
        for (const r of result.freedRequests) {
          io.emit('request_updated', { id: r.id, status: 'verified', tracking_status: 'received' });
        }
      }
      res.json({ message: 'Đã hủy task.' });
    } catch (err) {
      if (err.message === 'REASON_REQUIRED') return res.status(400).json({ error: 'Vui lòng nhập lý do hủy task.' });
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Task không tồn tại.' });
      if (err.message === 'ALREADY_CANCELLED') return res.status(400).json({ error: 'Task đã bị hủy rồi.' });
      next(err);
    }
  },

  async updateStatus(req, res, next) {
    try {
      await TaskService.updateStatus(req.params.id, req.body.status);
      res.json({ message: `Đã cập nhật trạng thái task: ${req.body.status}` });
    } catch (err) {
      if (err.message === 'INVALID_STATUS') return res.status(400).json({ error: 'Trạng thái không hợp lệ.' });
      next(err);
    }
  },

  async setScheduledDate(req, res, next) {
    try {
      await TaskService.setScheduledDate(req.params.id, req.body.scheduled_date);
      const io = req.app.get('io');
      if (io) io.emit('task_updated', { task_group_id: parseInt(req.params.id) });
      res.json({ message: 'Đã cập nhật ngày lên lịch.' });
    } catch (err) { next(err); }
  },

  async setEstimatedCompletion(req, res, next) {
    try {
      await TaskService.setEstimatedCompletion(req.params.id, req.body.estimated_completion);
      res.json({ message: 'Đã cập nhật dự kiến hoàn thành.' });
    } catch (err) { next(err); }
  },
};

module.exports = TaskController;
