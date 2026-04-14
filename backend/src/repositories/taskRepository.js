const { query } = require('../config/database');

const STALLED_MINUTES = 120;

const TaskRepository = {
  async findAll({ status, team_id, coordinatorId, managerProvinceId, rescueTeamUserId } = {}) {
    const params = [];
    const conditions = ['1=1'];
    if (coordinatorId) {
      params.push(coordinatorId);
      conditions.push(`tg.coordinator_id = $${params.length}`);
    } else if (managerProvinceId) {
      params.push(managerProvinceId);
      conditions.push(`tg.province_id = $${params.length}`);
    } else if (rescueTeamUserId) {
      params.push(rescueTeamUserId);
      conditions.push(`tg.id IN (SELECT task_group_id FROM task_group_teams WHERE team_id IN (SELECT id FROM rescue_teams WHERE leader_id = $${params.length}))`);
    }
    if (status) {
      params.push(status);
      conditions.push(`tg.status = $${params.length}`);
    }
    if (team_id) {
      params.push(parseInt(team_id));
      conditions.push(`tg.team_id = $${params.length}`);
    }
    const where = 'WHERE ' + conditions.join(' AND ');

    const result = await query(
      `SELECT tg.*,
              u.full_name as coordinator_name,
              rt.name as team_name, rt.code as team_code,
              p.name as province_name,
              COALESCE(ms.total_sub, 0) as total_sub,
              COALESCE(ms.completed_sub, 0) as completed_sub,
              COALESCE(ms.failed_sub, 0) as failed_sub,
              COALESCE(ir.pending_reports, 0) as pending_reports,
              COALESCE(tgt.extra_team_count, 0) as extra_team_count,
              COALESCE(cats.cuu_nan_count, 0) as cuu_nan_count,
              COALESCE(cats.cuu_tro_count, 0) as cuu_tro_count,
              COALESCE(cats.cuu_ho_count, 0) as cuu_ho_count
       FROM task_groups tg
       JOIN users u ON tg.coordinator_id = u.id
       LEFT JOIN rescue_teams rt ON tg.team_id = rt.id
       LEFT JOIN provinces p ON tg.province_id = p.id
       LEFT JOIN (
         SELECT task_group_id,
                COUNT(*) as total_sub,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sub,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_sub
         FROM missions GROUP BY task_group_id
       ) ms ON ms.task_group_id = tg.id
       LEFT JOIN (
         SELECT task_group_id, COUNT(*) as pending_reports
         FROM task_incident_reports WHERE status = 'pending'
         GROUP BY task_group_id
       ) ir ON ir.task_group_id = tg.id
       LEFT JOIN (
         SELECT task_group_id, COUNT(*) - 1 as extra_team_count
         FROM task_group_teams GROUP BY task_group_id
       ) tgt ON tgt.task_group_id = tg.id
       LEFT JOIN (
         SELECT m.task_group_id,
                SUM(CASE WHEN it.rescue_category = 'cuu_nan' THEN 1 ELSE 0 END) as cuu_nan_count,
                SUM(CASE WHEN it.rescue_category = 'cuu_tro' THEN 1 ELSE 0 END) as cuu_tro_count,
                SUM(CASE WHEN it.rescue_category = 'cuu_ho'  THEN 1 ELSE 0 END) as cuu_ho_count
         FROM missions m
         JOIN rescue_requests rr ON m.request_id = rr.id
         LEFT JOIN incident_types it ON rr.incident_type_id = it.id
         GROUP BY m.task_group_id
       ) cats ON cats.task_group_id = tg.id
       ${where}
       ORDER BY COALESCE(tg.scheduled_date, tg.created_at::DATE), tg.created_at DESC`,
      params
    );
    return result.rows;
  },

  async findById(id) {
    const result = await query(
      `SELECT tg.*,
              u.full_name as coordinator_name,
              rt.name as team_name, rt.code as team_code, rt.phone as team_phone,
              rt.leader_id,
              p.name as province_name
       FROM task_groups tg
       JOIN users u ON tg.coordinator_id = u.id
       LEFT JOIN rescue_teams rt ON tg.team_id = rt.id
       LEFT JOIN provinces p ON tg.province_id = p.id
       WHERE tg.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findMissions(taskId) {
    const result = await query(
      `SELECT m.*,
              rr.tracking_code, rr.address, rr.latitude, rr.longitude,
              rr.citizen_name, rr.citizen_phone, rr.victim_count, COALESCE(rr.rescued_count, 0) as rescued_count, rr.description,
              rr.priority_score, rr.flood_severity, rr.support_type,
              COALESCE(rr.citizen_rescued_by_other_count, 0) as citizen_rescued_by_other_count,
              rr.reject_reason,
              it.name as incident_type, it.rescue_category,
              ul.name as urgency_level, ul.color as urgency_color,
              u.full_name as assigned_to_name
       FROM missions m
       JOIN rescue_requests rr ON m.request_id = rr.id
       LEFT JOIN incident_types it ON rr.incident_type_id = it.id
       LEFT JOIN urgency_levels ul ON rr.urgency_level_id = ul.id
       LEFT JOIN users u ON m.assigned_to_user_id = u.id
       WHERE m.task_group_id = $1
       ORDER BY rr.priority_score DESC`,
      [taskId]
    );
    return result.rows;
  },

  async findIncidentReports(taskId) {
    const result = await query(
      `SELECT ir.*,
              u.full_name as reported_by_name,
              rr.id as request_id, rr.tracking_code, rr.address
       FROM task_incident_reports ir
       JOIN users u ON ir.reporter_id = u.id
       JOIN missions m ON ir.mission_id = m.id
       JOIN rescue_requests rr ON m.request_id = rr.id
       WHERE ir.task_group_id = $1
       ORDER BY ir.created_at DESC`,
      [taskId]
    );
    return result.rows;
  },

  async findAllTeams(taskId) {
    const result = await query(
      `SELECT rt.id, rt.name, rt.code, rt.leader_id,
              u.full_name as leader_name, tgt.is_primary
       FROM task_group_teams tgt
       JOIN rescue_teams rt ON tgt.team_id = rt.id
       LEFT JOIN users u ON rt.leader_id = u.id
       WHERE tgt.task_group_id = $1
       ORDER BY tgt.is_primary DESC, rt.name`,
      [taskId]
    );
    return result.rows;
  },

  async findDistributions(taskId) {
    const result = await query(
      `SELECT rd.*, ri.name as item_name, ri.unit,
              u.full_name as distributed_by_name,
              w.name as warehouse_name
       FROM relief_distributions rd
       JOIN relief_items ri ON rd.item_id = ri.id
       LEFT JOIN users u ON rd.distributed_by = u.id
       LEFT JOIN warehouses w ON rd.warehouse_id = w.id
       JOIN distribution_batches db ON rd.batch_id = db.id
       WHERE db.task_id = $1 AND rd.distribution_type = 'issue'
       ORDER BY rd.created_at DESC`,
      [taskId]
    );
    return result.rows;
  },

  async findVehicleDispatches(taskId) {
    const result = await query(
      `SELECT vd.*, v.name as vehicle_name, v.plate_number, v.type as vehicle_type,
              u.full_name as dispatched_by_name
       FROM vehicle_dispatches vd
       JOIN vehicles v ON vd.vehicle_id = v.id
       LEFT JOIN users u ON vd.dispatched_by = u.id
       WHERE vd.task_id = $1
       ORDER BY vd.dispatched_at DESC`,
      [taskId]
    );
    return result.rows;
  },

  async findAllMembers(taskId) {
    const result = await query(
      `SELECT u2.user_id, u2.full_name, u2.phone, u2.team_id, u2.team_name,
              MAX(u2.is_leader) as is_leader
       FROM (
         SELECT rt.leader_id as user_id, u.full_name, u.phone,
                rt.id as team_id, rt.name as team_name, 1 as is_leader
         FROM rescue_teams rt
         JOIN users u ON rt.leader_id = u.id
         WHERE rt.id IN (SELECT team_id FROM task_group_teams WHERE task_group_id = $1)
         UNION ALL
         SELECT u.id, u.full_name, u.phone, rt.id, rt.name,
                CASE WHEN rt.leader_id = u.id THEN 1 ELSE 0 END
         FROM rescue_team_members tm
         JOIN users u ON tm.user_id = u.id
         JOIN rescue_teams rt ON tm.team_id = rt.id
         WHERE rt.id IN (SELECT team_id FROM task_group_teams WHERE task_group_id = $1)
       ) u2
       GROUP BY u2.user_id, u2.full_name, u2.phone, u2.team_id, u2.team_name
       ORDER BY u2.team_name, MAX(u2.is_leader) DESC, u2.full_name`,
      [taskId]
    );
    return result.rows;
  },

  async suggestRequests({ latitude, longitude, province_id, limit = 10 } = {}) {
    const params = [];
    const conditions = ["rr.status = 'verified'"];

    if (province_id) {
      params.push(parseInt(province_id));
      conditions.push(`rr.province_id = $${params.length}`);
    }
    conditions.push(`rr.id NOT IN (
      SELECT m.request_id FROM missions m
      WHERE m.task_group_id IS NOT NULL
        AND m.status NOT IN ('completed','aborted','failed')
    )`);

    const where = 'WHERE ' + conditions.join(' AND ');

    let orderBy = 'ORDER BY rr.priority_score DESC, rr.created_at ASC';
    if (latitude && longitude) {
      params.push(parseFloat(latitude));
      const latIdx = params.length;
      params.push(parseFloat(longitude));
      const lngIdx = params.length;
      orderBy = `ORDER BY (6371 * ACOS(COS(RADIANS($${latIdx})) * COS(RADIANS(rr.latitude)) * COS(RADIANS(rr.longitude) - RADIANS($${lngIdx})) + SIN(RADIANS($${latIdx})) * SIN(RADIANS(rr.latitude)))) ASC`;
    }

    params.push(parseInt(limit));
    const limitIdx = params.length;

    const result = await query(
      `SELECT rr.id, rr.tracking_code, rr.address, rr.latitude, rr.longitude,
              rr.citizen_name, rr.victim_count, rr.status, rr.priority_score,
              rr.flood_severity, rr.description, rr.support_type,
              it.name as incident_type, it.rescue_category,
              ul.name as urgency_level, ul.color as urgency_color,
              p.name as province_name
       FROM rescue_requests rr
       LEFT JOIN incident_types it ON rr.incident_type_id = it.id
       LEFT JOIN urgency_levels ul ON rr.urgency_level_id = ul.id
       LEFT JOIN provinces p ON rr.province_id = p.id
       ${where}
       ${orderBy}
       LIMIT $${limitIdx}`,
      params
    );
    return result.rows;
  },

  async getTeamProvince(teamId) {
    const result = await query('SELECT province_id FROM rescue_teams WHERE id = $1', [teamId]);
    return result.rows[0]?.province_id || null;
  },

  async createTaskGroup(data) {
    const result = await query(
      `INSERT INTO task_groups (name, coordinator_id, team_id, province_id, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [data.name, data.coordinator_id, data.team_id, data.province_id, data.notes || null]
    );
    return result.rows[0].id;
  },

  async assignRequestToTeam(requestId, teamId, coordinatorId) {
    await query(
      `UPDATE rescue_requests
       SET status = 'assigned', tracking_status = 'assigned',
           assigned_team_id = $1, coordinator_id = $2,
           assigned_at = NOW(), updated_at = NOW()
       WHERE id = $3 AND status IN ('pending','verified')`,
      [teamId, coordinatorId, requestId]
    );
  },

  async createMission(requestId, teamId, taskGroupId) {
    await query(
      `INSERT INTO missions (request_id, team_id, status, task_group_id)
       VALUES ($1, $2, 'assigned', $3)`,
      [requestId, teamId, taskGroupId]
    );
  },

  async setTeamOnMission(teamId) {
    await query(
      "UPDATE rescue_teams SET status = 'on_mission', updated_at = NOW() WHERE id = $1",
      [teamId]
    );
  },

  async addTeamToTaskGroup(taskGroupId, teamId, isPrimary) {
    await query(
      `INSERT INTO task_group_teams (task_group_id, team_id, is_primary) VALUES ($1, $2, $3)
       ON CONFLICT (task_group_id, team_id) DO NOTHING`,
      [taskGroupId, teamId, isPrimary ? true : false]
    );
  },

  async checkMissionInTask(missionId, taskId) {
    const result = await query(
      'SELECT id FROM missions WHERE id = $1 AND task_group_id = $2',
      [missionId, taskId]
    );
    return result.rows.length > 0;
  },

  async updateMissionAssignee(missionId, userId) {
    await query(
      'UPDATE missions SET assigned_to_user_id = $1, updated_at = NOW() WHERE id = $2',
      [userId, missionId]
    );
  },

  async clearMissionAssignments(missionId) {
    await query('DELETE FROM mission_assignments WHERE mission_id = $1', [missionId]);
  },

  async addMissionAssignment(missionId, userId) {
    await query(
      `INSERT INTO mission_assignments (mission_id, user_id) VALUES ($1, $2)
       ON CONFLICT (mission_id, user_id) DO NOTHING`,
      [missionId, userId]
    );
  },

  async getMissionRequestId(missionId) {
    const result = await query('SELECT request_id FROM missions WHERE id = $1', [missionId]);
    return result.rows[0]?.request_id || null;
  },

  async setRequestInProgress(requestId) {
    await query(
      `UPDATE rescue_requests SET status = 'in_progress', updated_at = NOW()
       WHERE id = $1 AND status IN ('assigned', 'verified')`,
      [requestId]
    );
  },

  async createIncidentReport(data) {
    const result = await query(
      `INSERT INTO task_incident_reports
         (task_group_id, mission_id, reporter_id, report_type, urgency, support_type, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        data.task_id, data.mission_id, data.user_id,
        data.report_type, data.urgency || 'medium',
        data.support_type || null, data.description,
      ]
    );
    return result.rows[0].id;
  },

  async failMission(missionId) {
    await query('UPDATE missions SET status = \'failed\', updated_at = NOW() WHERE id = $1', [missionId]);
  },

  async logMissionFailed(missionId, userId, description) {
    await query(
      `INSERT INTO mission_logs (mission_id, user_id, action, description) VALUES ($1, $2, 'failed', $3)`,
      [missionId, userId, description]
    );
  },

  async getRequestByMission(missionId) {
    const result = await query(
      `SELECT rr.id FROM missions m JOIN rescue_requests rr ON m.request_id = rr.id WHERE m.id = $1`,
      [missionId]
    );
    return result.rows[0]?.id || null;
  },

  async setRequestTrackingStatus(requestId, status) {
    await query(
      `UPDATE rescue_requests SET tracking_status = $1, updated_at = NOW() WHERE id = $2`,
      [status, requestId]
    );
  },

  async resolveIncidentReport(reportId, taskId, status, userId, note) {
    await query(
      `UPDATE task_incident_reports
       SET status = $1, resolved_by = $2, resolved_at = NOW(), resolution_note = $3
       WHERE id = $4 AND task_group_id = $5`,
      [status || 'acknowledged', userId, note || null, reportId, taskId]
    );
  },

  async getRequestByReport(reportId) {
    const result = await query(
      `SELECT rr.id FROM task_incident_reports ir
       JOIN missions m ON ir.mission_id = m.id
       JOIN rescue_requests rr ON m.request_id = rr.id
       WHERE ir.id = $1`,
      [reportId]
    );
    return result.rows[0]?.id || null;
  },

  async unresolveIncidentReport(reportId, taskId) {
    await query(
      `UPDATE task_incident_reports
       SET status = 'pending', resolved_by = NULL, resolved_at = NULL, resolution_note = NULL, updated_at = NOW()
       WHERE id = $1 AND task_group_id = $2`,
      [reportId, taskId]
    );
  },

  async checkTaskExists(taskId) {
    const result = await query('SELECT id FROM task_groups WHERE id = $1', [taskId]);
    return result.rows.length > 0;
  },

  async addSupportMission(requestId, teamId, taskId, notes) {
    await query(
      `INSERT INTO missions (request_id, team_id, status, task_group_id, notes)
       VALUES ($1, $2, 'assigned', $3, $4)`,
      [parseInt(requestId), parseInt(teamId), taskId, notes ? `[Hỗ trợ bổ sung] ${notes}` : '[Hỗ trợ bổ sung]']
    );
  },

  async checkMissionCompletion(taskId) {
    const result = await query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN status IN ('completed','failed','aborted') THEN 1 ELSE 0 END) as done
       FROM missions WHERE task_group_id = $1`,
      [taskId]
    );
    return result.rows[0];
  },

  async countFailedMissions(taskId) {
    const result = await query(
      `SELECT COUNT(*) as failed FROM missions WHERE task_group_id = $1 AND status = 'failed'`,
      [taskId]
    );
    return parseInt(result.rows[0].failed);
  },

  async updateTaskGroupStatus(taskId, status) {
    await query(
      'UPDATE task_groups SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, taskId]
    );
  },

  async completeRequestsForTask(taskId) {
    await query(
      `UPDATE rescue_requests rr
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       FROM missions m
       WHERE rr.id = m.request_id
         AND m.task_group_id = $1
         AND m.status = 'completed'
         AND rr.status != 'completed'`,
      [taskId]
    );
  },

  async freeTaskTeams(taskId) {
    await query(
      `UPDATE rescue_teams SET status = 'available', updated_at = NOW()
       WHERE id IN (
         SELECT DISTINCT team_id FROM task_groups WHERE id = $1
         UNION
         SELECT DISTINCT m.team_id FROM missions m WHERE m.task_group_id = $1 AND m.team_id IS NOT NULL
       )`,
      [taskId]
    );
  },

  async getTaskForCancel(taskId) {
    const result = await query(
      `SELECT tg.id, tg.status, tg.name, tg.team_id, rt.leader_id
       FROM task_groups tg
       LEFT JOIN rescue_teams rt ON rt.id = tg.team_id
       WHERE tg.id = $1`,
      [taskId]
    );
    return result.rows[0] || null;
  },

  async cancelTaskGroup(taskId, reason) {
    await query(
      "UPDATE task_groups SET status = 'cancelled', notes = COALESCE(notes,'') || $1, updated_at = NOW() WHERE id = $2",
      [`\n[Hủy: ${reason}]`, taskId]
    );
  },

  async abortActiveMissions(taskId) {
    await query(
      `UPDATE missions SET status = 'aborted', updated_at = NOW()
       WHERE task_group_id = $1 AND status NOT IN ('completed','failed','aborted')`,
      [taskId]
    );
  },

  async freeAssignedRequests(taskId) {
    const result = await query(
      `UPDATE rescue_requests rr
       SET status = 'verified', tracking_status = 'received', updated_at = NOW()
       FROM missions m
       WHERE rr.id = m.request_id
         AND m.task_group_id = $1
         AND rr.status = 'assigned'
       RETURNING rr.id`,
      [taskId]
    );
    return result.rows;
  },

  async createNotification(userId, type, title, message) {
    await query(
      `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4)`,
      [userId, type, title, message]
    );
  },

  async setScheduledDate(taskId, scheduledDate) {
    await query(
      'UPDATE task_groups SET scheduled_date = $1, updated_at = NOW() WHERE id = $2',
      [scheduledDate || null, taskId]
    );
  },

  async setEstimatedCompletion(taskId, estimatedCompletion) {
    await query(
      'UPDATE task_groups SET estimated_completion = $1, updated_at = NOW() WHERE id = $2',
      [estimatedCompletion || null, taskId]
    );
  },

  getStalledMinutes() {
    return STALLED_MINUTES;
  },
};

module.exports = TaskRepository;
