const TaskRepository = require('../repositories/taskRepository');

const TaskService = {
  async getAll(query, user) {
    const opts = { status: query.status, team_id: query.team_id };
    if (user.role === 'coordinator') opts.coordinatorId = user.id;
    else if (user.role === 'manager' && user.province_id) opts.managerProvinceId = user.province_id;
    else if (user.role === 'rescue_team') opts.rescueTeamUserId = user.id;
    return TaskRepository.findAll(opts);
  },

  async getById(id) {
    const task = await TaskRepository.findById(parseInt(id));
    if (!task) throw new Error('NOT_FOUND');

    const [missions, incidentReports, allTeams, distributions, vehicleDispatches] = await Promise.all([
      TaskRepository.findMissions(parseInt(id)),
      TaskRepository.findIncidentReports(parseInt(id)),
      TaskRepository.findAllTeams(parseInt(id)),
      TaskRepository.findDistributions(parseInt(id)),
      TaskRepository.findVehicleDispatches(parseInt(id)),
    ]);

    // Detect stalled sub-missions
    const now = new Date();
    const stalledMinutes = TaskRepository.getStalledMinutes();
    const enrichedMissions = missions.map(m => {
      let stalled = false;
      if (!['completed', 'failed', 'aborted'].includes(m.status) && m.completed_at === null) {
        const otherCompleted = missions.filter(o => o.id !== m.id && o.status === 'completed' && o.completed_at);
        if (otherCompleted.length > 0) {
          const earliest = Math.min(...otherCompleted.map(o => new Date(o.completed_at).getTime()));
          if ((now.getTime() - earliest) / 60000 >= stalledMinutes) stalled = true;
        }
      }
      return { ...m, stalled };
    });

    return {
      ...task,
      missions: enrichedMissions,
      incident_reports: incidentReports,
      all_teams: allTeams,
      distributions,
      vehicle_dispatches: vehicleDispatches,
    };
  },

  async getAllMembers(id) {
    return TaskRepository.findAllMembers(parseInt(id));
  },

  async suggestRequests(query, user) {
    const opts = { ...query };
    if (!opts.province_id && user.province_id) opts.province_id = user.province_id;
    return TaskRepository.suggestRequests(opts);
  },

  async create(data, coordinatorId) {
    const { name, team_id, team_ids, request_ids, requests, notes } = data;

    const allTeamIds = (team_ids?.length ? team_ids : team_id ? [team_id] : []).map(Number);
    const requestList = requests?.length
      ? requests.map(r => ({ id: parseInt(r.id), team_id: parseInt(r.team_id || allTeamIds[0]) }))
      : (request_ids || []).map(id => ({ id: parseInt(id), team_id: allTeamIds[0] }));

    if (!name || allTeamIds.length === 0 || requestList.length === 0)
      throw new Error('MISSING_FIELDS');

    const province_id = await TaskRepository.getTeamProvince(allTeamIds[0]);
    if (province_id === null) throw new Error('TEAM_NOT_FOUND');

    const taskGroupId = await TaskRepository.createTaskGroup({
      name, coordinator_id: coordinatorId, team_id: allTeamIds[0], province_id, notes,
    });

    for (const item of requestList) {
      await TaskRepository.assignRequestToTeam(item.id, item.team_id, coordinatorId);
      await TaskRepository.createMission(item.id, item.team_id, taskGroupId);
    }

    const primaryId = (data.team_id ? parseInt(data.team_id) : null) || allTeamIds[0];
    for (const tid of allTeamIds) {
      await TaskRepository.setTeamOnMission(tid);
      await TaskRepository.addTeamToTaskGroup(taskGroupId, tid, tid === primaryId);
    }

    return { taskGroupId, allTeamIds, requestList };
  },

  async assignMember(taskId, data, userId) {
    const { mission_id, user_id, user_ids } = data;
    if (!mission_id || (!user_id && (!user_ids || user_ids.length === 0)))
      throw new Error('MISSING_FIELDS');

    const missionId = parseInt(mission_id);
    const ok = await TaskRepository.checkMissionInTask(missionId, parseInt(taskId));
    if (!ok) throw new Error('MISSION_NOT_IN_TASK');

    const ids = user_ids ? user_ids.map(Number) : [parseInt(user_id)];
    await TaskRepository.updateMissionAssignee(missionId, ids[0]);
    await TaskRepository.clearMissionAssignments(missionId);
    for (const uid of ids) {
      await TaskRepository.addMissionAssignment(missionId, uid);
    }

    const requestId = await TaskRepository.getMissionRequestId(missionId);
    if (requestId) {
      await TaskRepository.setRequestInProgress(requestId);
    }
    return { missionId, ids, requestId };
  },

  async createIncidentReport(taskId, data, userId) {
    const { mission_id, report_type, urgency, support_type, description } = data;
    if (!mission_id || !report_type || !description) throw new Error('MISSING_FIELDS');

    const ok = await TaskRepository.checkMissionInTask(parseInt(mission_id), parseInt(taskId));
    if (!ok) throw new Error('MISSION_NOT_IN_TASK');

    let affectedRequestId = null;
    if (report_type === 'unrescuable') {
      await TaskRepository.failMission(parseInt(mission_id));
      await TaskRepository.logMissionFailed(
        parseInt(mission_id), userId, `Báo cáo không thể cứu hộ: ${description}`
      );
      affectedRequestId = await TaskRepository.getRequestByMission(parseInt(mission_id));
      if (affectedRequestId) {
        await TaskRepository.setRequestTrackingStatus(affectedRequestId, 'incident_reported');
      }
    }

    const reportId = await TaskRepository.createIncidentReport({
      task_id: parseInt(taskId), mission_id: parseInt(mission_id),
      user_id: userId, report_type, urgency, support_type, description,
    });

    return { reportId, affectedRequestId };
  },

  async resolveIncidentReport(taskId, reportId, data, userId) {
    const { status, resolution_note } = data;
    await TaskRepository.resolveIncidentReport(
      parseInt(reportId), parseInt(taskId), status, userId, resolution_note
    );
    let affectedRequestId = null;
    if (status === 'resolved') {
      affectedRequestId = await TaskRepository.getRequestByReport(parseInt(reportId));
    }
    return { affectedRequestId };
  },

  async unresolveIncidentReport(taskId, reportId) {
    await TaskRepository.unresolveIncidentReport(parseInt(reportId), parseInt(taskId));
  },

  async dispatchSupport(taskId, data) {
    const { team_id, request_ids, notes } = data;
    if (!team_id || !request_ids || request_ids.length === 0) throw new Error('MISSING_FIELDS');

    const exists = await TaskRepository.checkTaskExists(parseInt(taskId));
    if (!exists) throw new Error('NOT_FOUND');

    for (const requestId of request_ids) {
      await TaskRepository.addSupportMission(requestId, team_id, parseInt(taskId), notes);
    }
    await TaskRepository.setTeamOnMission(parseInt(team_id));
    await TaskRepository.addTeamToTaskGroup(parseInt(taskId), parseInt(team_id), false);

    return { team_id: parseInt(team_id) };
  },

  async confirmComplete(taskId) {
    const { total, done } = await TaskRepository.checkMissionCompletion(parseInt(taskId));
    if (total === 0 || done < total) throw new Error('MISSIONS_INCOMPLETE');

    const failed = await TaskRepository.countFailedMissions(parseInt(taskId));
    const finalStatus = failed > 0 ? 'partial' : 'completed';

    await TaskRepository.updateTaskGroupStatus(parseInt(taskId), finalStatus);
    await TaskRepository.completeRequestsForTask(parseInt(taskId));
    await TaskRepository.freeTaskTeams(parseInt(taskId));

    return { finalStatus };
  },

  async cancel(taskId, reason) {
    if (!reason?.trim()) throw new Error('REASON_REQUIRED');

    const task = await TaskRepository.getTaskForCancel(parseInt(taskId));
    if (!task) throw new Error('NOT_FOUND');
    if (task.status === 'cancelled') throw new Error('ALREADY_CANCELLED');

    await TaskRepository.cancelTaskGroup(parseInt(taskId), reason.trim());
    await TaskRepository.abortActiveMissions(parseInt(taskId));
    const freedRequests = await TaskRepository.freeAssignedRequests(parseInt(taskId));
    await TaskRepository.freeTaskTeams(parseInt(taskId));

    if (task.leader_id) {
      await TaskRepository.createNotification(
        task.leader_id, 'task_cancelled', 'Task bị hủy',
        `Task "${task.name}" đã bị hủy. Lý do: ${reason.trim()}`
      );
    }

    return { task, freedRequests };
  },

  async updateStatus(taskId, status) {
    if (!['in_progress', 'completed', 'partial'].includes(status)) throw new Error('INVALID_STATUS');
    await TaskRepository.updateTaskGroupStatus(parseInt(taskId), status);
  },

  async setScheduledDate(taskId, scheduledDate) {
    await TaskRepository.setScheduledDate(parseInt(taskId), scheduledDate);
  },

  async setEstimatedCompletion(taskId, estimatedCompletion) {
    await TaskRepository.setEstimatedCompletion(parseInt(taskId), estimatedCompletion);
  },
};

module.exports = TaskService;
