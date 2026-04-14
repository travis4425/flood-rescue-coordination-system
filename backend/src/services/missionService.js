const MissionRepository = require('../repositories/missionRepository');
const { getPagination, formatResponse } = require('../utils/helpers');

const VALID_STATUSES = ['accepted', 'en_route', 'on_scene', 'completed', 'aborted', 'failed'];

const NOTIFICATION_MAP = {
  accepted: { type: 'mission_accepted', title: 'Doi cuu ho da nhan nhiem vu', msg: 'Doi cuu ho da xac nhan va dang chuan bi xuat phat den vi tri cua ban.' },
  en_route: { type: 'mission_en_route', title: 'Doi cuu ho dang tren duong', msg: 'Doi cuu ho dang di chuyen den vi tri cua ban, vui long cho.' },
  on_scene: { type: 'mission_on_scene', title: 'Doi cuu ho da den hien truong', msg: 'Doi cuu ho da co mat tai hien truong, dang tien hanh cuu ho.' },
  completed: { type: 'mission_completed', title: 'Cuu ho hoan thanh', msg: 'Doi cuu ho da hoan thanh va dong don cuu ho cua ban. Cam on ban da lien he, chuc ban binh an!' },
  aborted: { type: 'mission_aborted', title: 'Nhiem vu bi huy', msg: 'Nhiem vu cuu ho da bi huy. Chung toi se co gang ho tro ban som nhat.' }
};

const MissionService = {
  async getAll(reqQuery, user) {
    const { page, limit } = getPagination(reqQuery);
    const result = await MissionRepository.findAll({
      user,
      status: reqQuery.status,
      team_id: reqQuery.team_id,
      page,
      limit
    });
    return formatResponse(result.data, result.total, result.page, result.limit);
  },

  async getById(id) {
    const mission = await MissionRepository.findById(id);
    if (!mission) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
    const images = await MissionRepository.findImages(mission.request_id);
    return { ...mission, images };
  },

  async getLogs(id) {
    return MissionRepository.findLogs(id);
  },

  async updateStatus(id, { status, notes, latitude, longitude, rescued_count }, user, io) {
    if (!VALID_STATUSES.includes(status)) {
      throw Object.assign(new Error('INVALID_STATUS'), { status: 400 });
    }

    // rescue_team chỉ được cập nhật mission thuộc đội mình
    if (user.role === 'rescue_team') {
      const ok = await MissionRepository.isTeamMember(id, user.id);
      if (!ok) throw Object.assign(new Error('NOT_AUTHORIZED'), { status: 403 });
    }

    // Chặn accept nếu coordinator chưa phân phát vật tư
    if (status === 'accepted') {
      const ctx = await MissionRepository.getRescueCategory(id);
      if (ctx && ['cuu_tro', 'cuu_ho'].includes(ctx.rescue_category) && ctx.tracking_status !== 'team_ready') {
        throw Object.assign(new Error('RESOURCES_NOT_DISPATCHED'), { status: 400 });
      }
    }

    await MissionRepository.updateStatus(id, { status, notes, latitude, longitude, rescued_count });
    await MissionRepository.logAction(id, user.id, status, notes, latitude, longitude);

    const ctx = await MissionRepository.getMissionContext(id);
    if (!ctx) {
      if (io) io.emit('mission_updated', { mission_id: id, status });
      return;
    }

    const { request_id, team_id, task_group_id, tracking_code } = ctx;

    // Cập nhật trạng thái request theo từng bước
    if (status === 'accepted') {
      await MissionRepository.updateRequestStatus(request_id, 'assigned', 'en_route');
    } else if (status === 'en_route' || status === 'on_scene') {
      await MissionRepository.updateRequestStatus(request_id, 'in_progress', 'en_route', { started_at: true });
    } else if (status === 'completed') {
      const rc = rescued_count !== undefined ? (parseInt(rescued_count) || 0) : undefined;
      await MissionRepository.updateRequestStatus(request_id, 'completed', 'completed', {
        rescue_team_confirmed: true,
        ...(rc !== undefined ? { rescued_count: rc } : {})
      });
    } else if (status === 'failed') {
      const teamInfo = await MissionRepository.getTeamInfo(id);
      await MissionRepository.updateRequestStatus(request_id, 'in_progress', 'incident_reported', {
        incident_report_note: notes || null,
        incident_team_info: teamInfo ? JSON.stringify({
          team_name: teamInfo.team_name,
          team_code: teamInfo.team_code,
          leader_name: teamInfo.leader_name,
          leader_phone: teamInfo.leader_phone
        }) : null
      });
    }

    // Giải phóng đội khi nhiệm vụ kết thúc
    if (['completed', 'aborted', 'failed'].includes(status)) {
      const activeCnt = await MissionRepository.countActiveTeamMissions(team_id);
      if (activeCnt === 0) await MissionRepository.freeTeam(team_id);

      // Cập nhật task_group status nếu tất cả sub-missions xong
      if (task_group_id) {
        const allMissions = await MissionRepository.getTaskGroupMissions(task_group_id);
        const allDone = allMissions.every(m => ['completed', 'aborted', 'failed'].includes(m.status));
        if (allDone) {
          const anyFailed = allMissions.some(m => m.status === 'failed');
          const taskStatus = anyFailed ? 'partial' : 'completed';
          await MissionRepository.updateTaskGroupStatus(task_group_id, taskStatus);
          if (io) io.emit('task_updated', { task_group_id, status: taskStatus });
        }
      }
    }

    // Gửi notification cho citizen
    if (NOTIFICATION_MAP[status]) {
      const n = NOTIFICATION_MAP[status];
      await MissionRepository.createNotification(tracking_code, n.type, n.title, n.msg);
    }

    // Emit socket events
    if (io) {
      io.emit('mission_updated', { mission_id: id, status });

      const requestStatus = ['en_route', 'on_scene'].includes(status) ? 'in_progress'
        : status === 'completed' ? 'completed'
        : ['aborted', 'failed'].includes(status) ? 'cancelled'
        : undefined;

      const trackingStatusUpdate = status === 'accepted' ? 'en_route'
        : ['en_route', 'on_scene'].includes(status) ? 'en_route'
        : status === 'completed' ? 'completed'
        : status === 'failed' ? 'incident_reported'
        : undefined;

      io.emit('request_updated', {
        id: request_id,
        ...(requestStatus && { status: requestStatus }),
        ...(trackingStatusUpdate && { tracking_status: trackingStatusUpdate }),
        rescue_team_confirmed: status === 'completed' ? true : undefined
      });
    }
  },

  async submitResult(id, { result_notes, rescued_count }, files, user, io) {
    const mission = await MissionRepository.findById(id);
    if (!mission) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });

    if (user.role === 'rescue_team') {
      const ok = await MissionRepository.isTeamMemberByTeamId(mission.team_id || mission.id, user.id);
      if (!ok) throw Object.assign(new Error('NOT_AUTHORIZED'), { status: 403 });
    }

    await MissionRepository.updateResultNotes(mission.request_id, result_notes, rescued_count);

    if (files && files.length > 0) {
      const upload = require('../middlewares/upload');
      for (const file of files) {
        await MissionRepository.addResultImage(mission.request_id, upload.getFileUrl(file));
      }
    }

    await MissionRepository.logAction(
      id, user.id, 'submit_result',
      `Báo cáo kết quả: ${rescued_count || 0} người được cứu. ${result_notes || ''}`,
      null, null
    );

    if (io) io.emit('mission_updated', { mission_id: id, action: 'result_submitted' });
  }
};

module.exports = MissionService;
