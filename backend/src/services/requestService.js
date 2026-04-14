const https = require('https');
const RequestRepository = require('../repositories/requestRepository');
const DisasterEventRepository = require('../repositories/disasterEventRepository');
const { generateTrackingCode, getPagination, formatResponse, calculateDistance, calculatePriority } = require('../utils/helpers');
const upload = require('../middlewares/upload');

// Reverse geocode dùng Nominatim (chỉ để tra cứu tên địa chỉ, không hiển thị bản đồ)
function reverseGeocode(lat, lng) {
  return new Promise((resolve) => {
    const path = `/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi&zoom=10`;
    const req = https.get(
      { hostname: 'nominatim.openstreetmap.org', path, headers: { 'User-Agent': 'FloodRescueApp/1.0' } },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
      }
    );
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
  });
}

const RequestService = {
  async create(body, files, io) {
    const { citizen_name, citizen_phone, citizen_address, latitude, longitude, address,
      incident_type_id, urgency_level_id, description, victim_count, support_type, flood_severity,
      disaster_type_id, disaster_event_id } = body;

    if (!latitude || !longitude) throw Object.assign(new Error('NO_GPS'), { status: 400 });
    if (citizen_phone && !/^(0[35789])[0-9]{8}$/.test(citizen_phone.trim())) {
      throw Object.assign(new Error('INVALID_PHONE'), { status: 400 });
    }

    const trackingCode = generateTrackingCode();
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Xác định district/province theo tọa độ
    let { district_id, province_id } = (await RequestRepository.findNearestDistrict(lat, lng)) || {};
    if (!province_id) {
      const prov = await RequestRepository.findNearestProvince(lat, lng);
      province_id = prov?.province_id || null;
    }

    const coordinator_id = (district_id || province_id)
      ? await RequestRepository.findCoordinatorForRegion(district_id, province_id)
      : null;

    // Tự động liên kết với disaster_event đang active gần nhất nếu không truyền explicit
    let linkedEventId = disaster_event_id ? parseInt(disaster_event_id) : null;
    const resolvedDisasterTypeId = disaster_type_id ? parseInt(disaster_type_id) : null;

    if (!linkedEventId && resolvedDisasterTypeId && lat && lng) {
      const nearestEvent = await DisasterEventRepository.findNearestActive(lat, lng, resolvedDisasterTypeId);
      if (nearestEvent && nearestEvent.distance_km <= (nearestEvent.affected_radius_km || 100)) {
        linkedEventId = nearestEvent.id;
      }
    }

    const inserted = await RequestRepository.create({
      tracking_code: trackingCode,
      citizen_name: citizen_name || null,
      citizen_phone: citizen_phone || null,
      citizen_address: citizen_address || address || null,
      latitude: lat, longitude: lng,
      address: address || null,
      district_id, province_id,
      geo_province_name: body.geo_province_name || null,
      geo_district_name: body.geo_district_name || null,
      incident_type_id: incident_type_id ? parseInt(incident_type_id) : null,
      urgency_level_id: urgency_level_id ? parseInt(urgency_level_id) : null,
      description: description || null,
      victim_count: parseInt(victim_count) || 1,
      support_type: support_type || null,
      flood_severity: parseInt(flood_severity) || 1,
      coordinator_id,
      disaster_type_id: resolvedDisasterTypeId,
      disaster_event_id: linkedEventId
    });

    const requestId = inserted.id;

    // Tính priority score
    const urgencyScore = urgency_level_id
      ? await RequestRepository.getUrgencyScore(parseInt(urgency_level_id))
      : 1;
    const priorityScore = calculatePriority(urgencyScore, parseInt(victim_count) || 1, parseInt(flood_severity) || 1, false);
    await RequestRepository.updatePriorityScore(requestId, priorityScore);

    // Lưu ảnh đính kèm
    if (files && files.length > 0) {
      for (const file of files) {
        await RequestRepository.addImage(requestId, upload.getFileUrl(file));
      }
    }

    // Cập nhật workload coordinator
    if (coordinator_id) {
      await RequestRepository.incrementCoordinatorWorkload(coordinator_id, district_id, province_id);
    }

    // Emit socket event
    if (io) {
      const fullRequest = await RequestRepository.findById(requestId);
      io.emit('new_request', fullRequest);
      if (coordinator_id) io.to(`user_${coordinator_id}`).emit('assigned_request', fullRequest);
    }

    return { message: 'Yêu cầu cứu hộ đã được gửi thành công!', tracking_code: trackingCode, request_id: requestId };
  },

  async getAll(reqQuery, user) {
    const { page, limit } = getPagination(reqQuery);
    const result = await RequestRepository.findAll({ user, page, limit, ...reqQuery });
    return formatResponse(result.data, result.total, result.page, result.limit);
  },

  async getById(id) {
    const request = await RequestRepository.findById(id);
    if (!request) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
    const [images, missions] = await Promise.all([
      RequestRepository.findAllImages(id),
      RequestRepository.findMissions(id)
    ]);
    return { ...request, images, missions };
  },

  async getMapData(query) {
    return RequestRepository.findForMap(query);
  },

  async getStats(user) {
    return RequestRepository.getStatsOverview(user.id, user.role);
  },

  async trackByCode(code) {
    const request = await RequestRepository.findByTrackingCode(code);
    if (!request) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
    const images = await RequestRepository.findImages(request.id);
    return { ...request, images };
  },

  async getTrackNotifications(code) {
    return RequestRepository.findNotifications(code);
  },

  async citizenConfirm(code, io) {
    const affected = await RequestRepository.citizenConfirm(code);
    if (!affected) throw Object.assign(new Error('CONFIRM_FAILED'), { status: 400 });
    if (io) io.emit('request_updated', { tracking_code: code, citizen_confirmed: true });
  },

  async rescuedByOther(code, io) {
    const current = await RequestRepository.getRescuedByOtherState(code);
    if (!current) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
    if (['completed', 'cancelled', 'rejected'].includes(current.status)) {
      throw Object.assign(new Error('REQUEST_ENDED'), { status: 400 });
    }

    const newCount = (current.citizen_rescued_by_other_count || 0) + 1;

    if (newCount >= 2) {
      await RequestRepository.updateRescuedByOtherCount(current.id, newCount, true);
      await RequestRepository.abortLinkedMissions(current.id);

      // Cập nhật task_group nếu có
      const missionGroups = await RequestRepository.getMissionTaskGroups(current.id);
      for (const { task_group_id } of missionGroups) {
        const allMissions = await RequestRepository.getTaskGroupMissions(task_group_id);
        if (allMissions.every(m => ['completed', 'aborted', 'failed'].includes(m.status))) {
          const anyFailed = allMissions.some(m => m.status === 'failed');
          const taskStatus = anyFailed ? 'partial' : 'completed';
          await RequestRepository.updateTaskGroupStatus(task_group_id, taskStatus);
          if (io) io.emit('task_updated', { task_group_id, status: taskStatus });
        }
      }

      if (io) {
        io.emit('request_updated', { id: current.id, status: 'cancelled' });
        io.emit('mission_updated', { request_id: current.id, status: 'aborted' });
      }
      return { confirmed: true, message: 'Cảm ơn bạn đã xác nhận. Yêu cầu đã được đóng. Chúc bạn bình an!' };
    }

    await RequestRepository.updateRescuedByOtherCount(current.id, newCount);
    return { confirmed: false, current_count: newCount, message: 'Vui lòng xác nhận lần nữa để đóng yêu cầu.' };
  },

  async citizenUpdate(code, data) {
    const check = await RequestRepository.findByTrackingCode(code);
    if (!check) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
    if (check.status !== 'pending') throw Object.assign(new Error('NOT_PENDING'), { status: 400 });
    if (data.citizen_phone && !/^(0[35789])[0-9]{8}$/.test(data.citizen_phone.trim())) {
      throw Object.assign(new Error('INVALID_PHONE'), { status: 400 });
    }
    await RequestRepository.citizenUpdate(check.id, data);
  },

  async verify(id, { urgency_level_id, flood_severity, notes }, coordinatorId, io) {
    await RequestRepository.verify(id, { urgency_level_id, flood_severity, coordinator_id: coordinatorId });

    // Tính lại priority score
    const reqData = await RequestRepository.getVerifyData(id);
    if (reqData) {
      const hasAlert = await RequestRepository.hasWeatherAlert(reqData.province_id);
      const newPriority = calculatePriority(reqData.urgency_score, reqData.victim_count, reqData.flood_severity, hasAlert);
      await RequestRepository.updatePriorityScore(id, newPriority);
    }

    const fullRequest = await RequestRepository.findById(id);
    if (fullRequest?.tracking_code) {
      await RequestRepository.createNotification(fullRequest.tracking_code, 'request_verified',
        'Yeu cau da duoc xac minh',
        'Yeu cau cuu ho cua ban da duoc coordinator xac minh va dang cho phan cong doi cuu ho.'
      );
    }
    if (io) io.emit('request_updated', fullRequest);
    return fullRequest;
  },

  async reject(id, reason, coordinatorId, io) {
    if (!reason) throw Object.assign(new Error('REASON_REQUIRED'), { status: 400 });
    await RequestRepository.reject(id, reason, coordinatorId);

    const reqData = await RequestRepository.findByTrackingCode(
      (await RequestRepository.findById(id))?.tracking_code
    );
    if (reqData?.tracking_code) {
      await RequestRepository.createNotification(reqData.tracking_code, 'request_rejected',
        'Yêu cầu bị từ chối', `Lý do: ${reason}`
      );
    }
    if (io) {
      const fullRequest = await RequestRepository.findById(id);
      io.emit('request_updated', fullRequest);
      if (reqData?.tracking_code) {
        io.to(`request_${reqData.tracking_code}`).emit('request_rejected', { reason });
      }
    }
  },

  async assign(id, teamId, vehicleId, io) {
    if (!teamId) throw Object.assign(new Error('NO_TEAM'), { status: 400 });
    await RequestRepository.assign(id, teamId, vehicleId);

    const fullRequest = await RequestRepository.findById(id);
    if (io) {
      io.emit('request_updated', fullRequest);
      const leaderId = await RequestRepository.getTeamLeaderId(parseInt(teamId));
      if (leaderId) io.to(`user_${leaderId}`).emit('new_mission', fullRequest);
    }
    if (fullRequest?.tracking_code) {
      const teamName = fullRequest.team_name || 'Đội cứu hộ';
      await RequestRepository.createNotification(fullRequest.tracking_code, 'request_assigned',
        'Da phan cong doi cuu ho',
        `Doi cuu ho "${teamName}" da duoc phan cong den ho tro ban. Ho se lien he voi ban som.`
      );
    }
    return fullRequest;
  },

  async updateStatus(id, { status, result_notes, rescued_count }, io) {
    const VALID = ['in_progress', 'completed', 'cancelled'];
    if (!VALID.includes(status)) throw Object.assign(new Error('INVALID_STATUS'), { status: 400 });

    await RequestRepository.updateStatus(id, { status, result_notes, rescued_count });

    if (status === 'completed') {
      await RequestRepository.completeMissions(id);
      const assigned = await RequestRepository.getAssignedData(id);
      if (assigned?.assigned_team_id) {
        const activeCnt = await RequestRepository.countActiveTeamMissions(assigned.assigned_team_id);
        if (activeCnt === 0) await RequestRepository.freeTeam(assigned.assigned_team_id);
      }
      if (assigned?.coordinator_id) await RequestRepository.decrementCoordinatorWorkload(assigned.coordinator_id);
    }

    const fullRequest = await RequestRepository.findById(id);
    if (io) io.emit('request_updated', fullRequest);
    return fullRequest;
  },

  async cancel(id, io) {
    const current = await RequestRepository.getStateForCancel(id);
    if (!current) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
    if (['completed', 'cancelled', 'rejected'].includes(current.status)) {
      throw Object.assign(new Error('CANNOT_CANCEL'), { status: 400, currentStatus: current.status });
    }

    await RequestRepository.cancel(id);

    if (current.assigned_team_id) {
      const activeCnt = await RequestRepository.countActiveTeamMissions(current.assigned_team_id);
      if (activeCnt <= 1) await RequestRepository.freeTeam(current.assigned_team_id);
      await RequestRepository.abortLinkedMissions(id);
    }
    if (current.coordinator_id) await RequestRepository.decrementCoordinatorWorkload(current.coordinator_id);
    if (io) io.emit('request_updated', { id, status: 'cancelled' });
  },

  async close(id, io) {
    const current = await RequestRepository.getCloseData(id);
    if (!current) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
    if (!current.rescue_team_confirmed) throw Object.assign(new Error('TEAM_NOT_CONFIRMED'), { status: 400 });
    if (current.status === 'completed') throw Object.assign(new Error('ALREADY_CLOSED'), { status: 400 });

    await RequestRepository.close(id);
    if (current.coordinator_id) await RequestRepository.decrementCoordinatorWorkload(current.coordinator_id);
    await RequestRepository.createNotification(current.tracking_code, 'request_closed',
      'Don cuu ho da hoan tat',
      'Don cuu ho cua ban da duoc xac nhan hoan tat. Cam on ban da su dung dich vu. Chuc ban binh an!'
    );
    const fullRequest = await RequestRepository.findById(id);
    if (io) io.emit('request_updated', fullRequest);
    return fullRequest;
  },

  async suggestTeam(id) {
    const req = await RequestRepository.findById(id);
    if (!req) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
    const teams = await RequestRepository.findAvailableTeams(req.province_id, req.latitude, req.longitude);
    return teams.map(t => ({
      ...t,
      distance_km: calculateDistance(req.latitude, req.longitude, t.current_latitude, t.current_longitude).toFixed(2)
    }));
  },

  async reassignCoordinator(requestId, coordinatorId, actorUser, ip) {
    if (!coordinatorId) throw Object.assign(new Error('NO_COORDINATOR'), { status: 400 });
    const coord = await require('../config/database').query(
      "SELECT id, full_name FROM users WHERE id = $1 AND role = 'coordinator' AND is_active = true",
      [parseInt(coordinatorId)]
    );
    if (!coord.rows[0]) throw Object.assign(new Error('COORDINATOR_NOT_FOUND'), { status: 404 });

    const current = await RequestRepository.findById(requestId);
    const oldCoordId = current?.coordinator_id;

    await RequestRepository.reassignCoordinator(requestId, parseInt(coordinatorId), oldCoordId, actorUser.id, ip);
    return coord.rows[0].full_name;
  },

  async lookupByPhone(phone) {
    if (!phone || phone.trim().length < 8) throw Object.assign(new Error('INVALID_PHONE'), { status: 400 });
    return RequestRepository.lookupByPhone(phone.trim());
  }
};

module.exports = RequestService;
