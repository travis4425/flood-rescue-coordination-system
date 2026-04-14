const { query } = require('../config/database');
const crypto = require('crypto');

const ResourceRepository = {
  // ── HELPERS ──────────────────────────────────────────────────────────────────
  genVoucherCode() {
    return 'VT-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  },

  // ── VEHICLES ─────────────────────────────────────────────────────────────────
  async findVehicles({ province_id, status, type } = {}) {
    const params = [];
    const conditions = ['1=1'];
    if (province_id) { params.push(parseInt(province_id)); conditions.push(`v.province_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`v.status = $${params.length}`); }
    if (type) { params.push(type); conditions.push(`v.type = $${params.length}`); }
    const where = 'WHERE ' + conditions.join(' AND ');

    const result = await query(
      `SELECT v.id, v.name, v.plate_number, v.type, v.capacity,
              v.province_id, v.team_id, v.warehouse_id, v.created_at, v.updated_at,
              p.name as province_name,
              w.name as warehouse_name,
              dispatch_team.team_name,
              CASE
                WHEN dispatch_team.vehicle_id IS NOT NULL THEN 'in_use'
                WHEN v.status = 'lost' THEN 'lost'
                ELSE 'available'
              END as status
       FROM vehicles v
       LEFT JOIN provinces p ON v.province_id = p.id
       LEFT JOIN warehouses w ON v.warehouse_id = w.id
       LEFT JOIN (
         SELECT vd.vehicle_id, rt2.name as team_name
         FROM vehicle_dispatches vd
         JOIN rescue_teams rt2 ON vd.team_id = rt2.id
         WHERE vd.status IN ('dispatched', 'confirmed')
           AND vd.id = (SELECT id FROM vehicle_dispatches vd2
                        WHERE vd2.vehicle_id = vd.vehicle_id
                          AND vd2.status IN ('dispatched','confirmed')
                        ORDER BY vd2.created_at DESC
                        LIMIT 1)
       ) dispatch_team ON dispatch_team.vehicle_id = v.id
       ${where} ORDER BY v.name`,
      params
    );
    return result.rows;
  },

  async findVehicleById(id) {
    const result = await query('SELECT id, status, province_id FROM vehicles WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async createVehicle(data) {
    const result = await query(
      `INSERT INTO vehicles (name, plate_number, type, capacity, province_id, team_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        data.name,
        data.plate_number,
        data.type,
        parseInt(data.capacity) || 0,
        parseInt(data.province_id),
        data.team_id ? parseInt(data.team_id) : null,
      ]
    );
    return result.rows[0].id;
  },

  async updateVehicle(id, data) {
    const params = [parseInt(id)];
    const setClauses = ['updated_at = NOW()'];
    if (data.name) { params.push(data.name); setClauses.push(`name = $${params.length}`); }
    if (data.status) { params.push(data.status); setClauses.push(`status = $${params.length}`); }
    if (data.team_id !== undefined) { params.push(data.team_id ? parseInt(data.team_id) : null); setClauses.push(`team_id = $${params.length}`); }
    if (data.plate_number) { params.push(data.plate_number); setClauses.push(`plate_number = $${params.length}`); }
    if (data.type) { params.push(data.type); setClauses.push(`type = $${params.length}`); }
    if (data.capacity !== undefined) { params.push(parseInt(data.capacity)); setClauses.push(`capacity = $${params.length}`); }
    await query(`UPDATE vehicles SET ${setClauses.join(', ')} WHERE id = $1`, params);
  },

  async setVehicleStatus(id, status) {
    await query('UPDATE vehicles SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
  },

  async createVehiclesBulk(vehicleType, quantity, provinceId, warehouseId, requestId) {
    const VN_LABELS = { boat: 'Xuồng/Tàu', truck: 'Xe tải', car: 'Xe con', helicopter: 'Trực thăng', ambulance: 'Xe cứu thương' };
    const DEFAULT_CAPACITY = { boat: 8, truck: 20, car: 4, helicopter: 6, ambulance: 4, other: 5 };
    const typeName = VN_LABELS[vehicleType] || vehicleType;
    const capacity = DEFAULT_CAPACITY[vehicleType] || 4;
    for (let i = 0; i < quantity; i++) {
      const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      await query(
        `INSERT INTO vehicles (name, type, plate_number, capacity, province_id, warehouse_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'available')`,
        [typeName, vehicleType, `YC${requestId}-${suffix}`, capacity, provinceId, warehouseId || null]
      );
    }
  },

  // ── DISTRIBUTIONS ─────────────────────────────────────────────────────────────
  async findDistributions({ warehouse_id, team_id, status, coordinatorId, rescueTeamUserId } = {}) {
    const params = [];
    let where = "WHERE rd.distribution_type = 'issue'";
    if (warehouse_id) { params.push(parseInt(warehouse_id)); where += ` AND rd.warehouse_id = $${params.length}`; }
    if (team_id) { params.push(parseInt(team_id)); where += ` AND rd.team_id = $${params.length}`; }
    if (status) { params.push(status); where += ` AND rd.status = $${params.length}`; }
    if (coordinatorId) {
      params.push(coordinatorId);
      where += ` AND w.province_id IN (SELECT province_id FROM coordinator_regions WHERE user_id = $${params.length} AND province_id IS NOT NULL)`;
    } else if (rescueTeamUserId) {
      params.push(rescueTeamUserId);
      where += ` AND rd.team_id = (SELECT id FROM rescue_teams WHERE leader_id = $${params.length})`;
    }
    const result = await query(
      `SELECT rd.*, ri.name as item_name, ri.unit as item_unit, ri.category,
              w.name as warehouse_name, u.full_name as distributed_by_name,
              rt.name as team_name,
              rcb.full_name as return_confirmed_by_name,
              db.voucher_code as batch_voucher
       FROM relief_distributions rd
       JOIN relief_items ri    ON rd.item_id = ri.id
       JOIN warehouses w       ON rd.warehouse_id = w.id
       JOIN users u            ON rd.distributed_by = u.id
       LEFT JOIN rescue_teams rt        ON rd.team_id = rt.id
       LEFT JOIN users rcb              ON rd.return_confirmed_by = rcb.id
       LEFT JOIN distribution_batches db ON rd.batch_id = db.id
       ${where}
       ORDER BY rd.created_at DESC`,
      params
    );
    return result.rows;
  },

  async findDistributionById(id) {
    const result = await query(
      `SELECT rd.*, w.province_id
       FROM relief_distributions rd
       JOIN warehouses w ON rd.warehouse_id = w.id
       WHERE rd.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findDistributionWithTeam(id) {
    const result = await query(
      `SELECT rd.id, rd.status, rd.team_id, rd.warehouse_confirmed, rt.leader_id
       FROM relief_distributions rd
       JOIN rescue_teams rt ON rd.team_id = rt.id
       WHERE rd.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findDistributionForReturn(id) {
    const result = await query(
      `SELECT rd.id, rd.status, rd.quantity, rd.team_id, rt.leader_id
       FROM relief_distributions rd
       JOIN rescue_teams rt ON rd.team_id = rt.id
       WHERE rd.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findDistributionForCancel(id) {
    const result = await query(
      `SELECT id, status, warehouse_confirmed, item_id, quantity, warehouse_id
       FROM relief_distributions WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findDistributionsByBatch(batchId) {
    const result = await query(
      `SELECT id, status, warehouse_confirmed, item_id, quantity, warehouse_id
       FROM relief_distributions WHERE batch_id = $1`,
      [batchId]
    );
    return result.rows;
  },

  async isCoordinatorInWarehouseProvince(coordinatorId, warehouseId) {
    const result = await query(
      `SELECT 1 FROM coordinator_regions cr
       JOIN warehouses w ON w.province_id = cr.province_id
       WHERE cr.user_id = $1 AND w.id = $2`,
      [coordinatorId, warehouseId]
    );
    return result.rows.length > 0;
  },

  async isCoordinatorInTeamProvince(coordinatorId, teamId) {
    const result = await query(
      `SELECT 1 FROM rescue_teams rt
       JOIN coordinator_regions cr ON rt.province_id = cr.province_id
       WHERE rt.id = $1 AND cr.user_id = $2`,
      [teamId, coordinatorId]
    );
    return result.rows.length > 0;
  },

  async checkInventory(warehouseId, itemId) {
    const result = await query(
      'SELECT id, quantity FROM relief_inventory WHERE warehouse_id = $1 AND item_id = $2',
      [warehouseId, itemId]
    );
    return result.rows[0] || null;
  },

  async deductInventory(inventoryId, qty) {
    await query(
      'UPDATE relief_inventory SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2',
      [qty, inventoryId]
    );
  },

  async deductInventoryByWarehouseItem(warehouseId, itemId, qty) {
    await query(
      'UPDATE relief_inventory SET quantity = quantity - $1, updated_at = NOW() WHERE warehouse_id = $2 AND item_id = $3',
      [qty, warehouseId, itemId]
    );
  },

  async addInventoryById(inventoryId, qty) {
    await query(
      'UPDATE relief_inventory SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2',
      [qty, inventoryId]
    );
  },

  async addInventoryByWarehouseItem(warehouseId, itemId, qty) {
    const inv = await this.checkInventory(warehouseId, itemId);
    if (inv) {
      await query(
        'UPDATE relief_inventory SET quantity = quantity + $1, last_restocked = NOW(), updated_at = NOW() WHERE id = $2',
        [qty, inv.id]
      );
    } else {
      await query(
        'INSERT INTO relief_inventory (warehouse_id, item_id, quantity, updated_at) VALUES ($1, $2, $3, NOW())',
        [warehouseId, itemId, qty]
      );
    }
  },

  async createDistribution(data) {
    const result = await query(
      `INSERT INTO relief_distributions
         (distribution_type, team_id, warehouse_id, item_id, quantity, distributed_by, notes, status, voucher_code, batch_id)
       VALUES ('issue', $1, $2, $3, $4, $5, $6, 'issued', $7, $8)
       RETURNING id`,
      [
        data.team_id,
        data.warehouse_id,
        data.item_id,
        data.quantity,
        data.user_id,
        data.notes || null,
        data.voucher,
        data.batch_id || null,
      ]
    );
    return result.rows[0].id;
  },

  async createDistributionBatch(data) {
    const result = await query(
      `INSERT INTO distribution_batches (voucher_code, team_id, warehouse_id, distributed_by, notes, task_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        data.voucher,
        data.team_id,
        data.warehouse_id,
        data.user_id,
        data.notes || null,
        data.task_id || null,
      ]
    );
    return result.rows[0].id;
  },

  async cancelDistribution(id) {
    await query("UPDATE relief_distributions SET status = 'cancelled' WHERE id = $1", [id]);
  },

  async cancelDistributionsByBatch(batchId) {
    await query("UPDATE relief_distributions SET status = 'cancelled' WHERE batch_id = $1", [batchId]);
  },

  async confirmDistribution(id) {
    await query(
      `UPDATE relief_distributions SET status = 'confirmed', confirmed_at = NOW() WHERE id = $1`,
      [id]
    );
  },

  async warehouseConfirmDistribution(id, userId) {
    await query(
      `UPDATE relief_distributions
       SET warehouse_confirmed = true, warehouse_confirmed_at = NOW(), warehouse_confirmed_by = $1
       WHERE id = $2`,
      [userId, id]
    );
  },

  async requestReturnDistribution(id, qty, note) {
    await query(
      `UPDATE relief_distributions
       SET status = 'return_requested', return_quantity = $1, return_note = $2, return_requested_at = NOW()
       WHERE id = $3`,
      [qty, note || null, id]
    );
  },

  async confirmReturnDistribution(id, status, qty, userId) {
    await query(
      `UPDATE relief_distributions
       SET status = $1, received_return_qty = $2,
           return_confirmed_at = NOW(), return_confirmed_by = $3, returned_at = NOW()
       WHERE id = $4`,
      [status, qty, userId, id]
    );
  },

  async getDistributionBatchTaskId(distId) {
    const result = await query(
      `SELECT db.task_id FROM distribution_batches db
       JOIN relief_distributions rd ON rd.batch_id = db.id
       WHERE rd.id = $1`,
      [distId]
    );
    return result.rows[0]?.task_id || null;
  },

  async countPendingDistributionsByTask(taskId) {
    const result = await query(
      `SELECT COUNT(*) as cnt FROM relief_distributions rd
       JOIN distribution_batches db ON rd.batch_id = db.id
       WHERE db.task_id = $1 AND rd.status = 'issued' AND rd.distribution_type = 'issue'`,
      [taskId]
    );
    return parseInt(result.rows[0].cnt);
  },

  async countPendingDistributionsByTeam(teamId) {
    const result = await query(
      `SELECT COUNT(*) as cnt FROM relief_distributions
       WHERE team_id = $1 AND status = 'issued' AND distribution_type = 'issue'`,
      [teamId]
    );
    return parseInt(result.rows[0].cnt);
  },

  async countPendingVehiclesByTask(taskId) {
    const result = await query(
      `SELECT COUNT(*) as cnt FROM vehicle_dispatches WHERE task_id = $1 AND status = 'dispatched'`,
      [taskId]
    );
    return parseInt(result.rows[0].cnt);
  },

  async countActiveMissionsForTeam(teamId) {
    const result = await query(
      `SELECT COUNT(*) as cnt FROM missions
       WHERE team_id = $1 AND status NOT IN ('completed','aborted','failed')`,
      [teamId]
    );
    return parseInt(result.rows[0].cnt);
  },

  async setTeamReadyForRequests(teamId) {
    const result = await query(
      `UPDATE rescue_requests
       SET tracking_status = 'team_ready', updated_at = NOW()
       WHERE assigned_team_id = $1 AND status = 'assigned' AND tracking_status = 'assigned'
       RETURNING id`,
      [teamId]
    );
    return result.rows;
  },

  // ── VEHICLE REQUESTS ──────────────────────────────────────────────────────────
  async findVehicleRequests({ status, coordinatorId } = {}) {
    const params = [];
    const conditions = ['1=1'];
    if (status) { params.push(status); conditions.push(`vr.status = $${params.length}`); }
    if (coordinatorId) { params.push(coordinatorId); conditions.push(`vr.requested_by = $${params.length}`); }
    const where = 'WHERE ' + conditions.join(' AND ');

    const result = await query(
      `SELECT vr.*,
              u.full_name as requested_by_name,
              rt.name as destination_team_name, rt.code as destination_team_code,
              p.name as province_name,
              approver.full_name as approved_by_name,
              w.name as target_warehouse_name
       FROM vehicle_requests vr
       LEFT JOIN users u ON vr.requested_by = u.id
       LEFT JOIN rescue_teams rt ON vr.destination_team_id = rt.id
       LEFT JOIN provinces p ON vr.province_id = p.id
       LEFT JOIN users approver ON vr.approved_by = approver.id
       LEFT JOIN warehouses w ON w.id = (SELECT id FROM warehouses WHERE coordinator_id = vr.requested_by ORDER BY id LIMIT 1)
       ${where}
       ORDER BY vr.created_at DESC`,
      params
    );
    return result.rows;
  },

  async findVehicleRequestById(id) {
    const result = await query('SELECT * FROM vehicle_requests WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async getCoordinatorProvinceFromWarehouse(userId) {
    const result = await query('SELECT province_id FROM warehouses WHERE coordinator_id = $1', [userId]);
    return result.rows[0]?.province_id || null;
  },

  async getTeamProvinceId(teamId) {
    const result = await query('SELECT province_id FROM rescue_teams WHERE id = $1', [parseInt(teamId)]);
    return result.rows[0]?.province_id || null;
  },

  async createVehicleRequest(data) {
    const result = await query(
      `INSERT INTO vehicle_requests
         (vehicle_type, quantity, destination_team_id, source_type, source_region,
          expected_date, return_date, notes, province_id, requested_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
       RETURNING *`,
      [
        data.vehicle_type,
        parseInt(data.quantity),
        data.destination_team_id ? parseInt(data.destination_team_id) : null,
        data.source_type,
        data.source_region || null,
        data.expected_date || null,
        data.return_date || null,
        data.notes || null,
        data.province_id ? parseInt(data.province_id) : null,
        data.user_id,
      ]
    );
    return result.rows[0];
  },

  async updateVehicleRequestStatus(id, status, userId, notes) {
    await query(
      `UPDATE vehicle_requests
       SET status = $1, notes = COALESCE($2, notes),
           approved_by = $3, updated_at = NOW()
       WHERE id = $4`,
      [status, notes || null, userId, id]
    );
  },

  async getVehicleRequestForApproval(id) {
    const result = await query(
      `SELECT vr.vehicle_type, vr.quantity, vr.province_id, vr.requested_by
       FROM vehicle_requests vr WHERE vr.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async getCoordinatorWarehouse(userId) {
    const result = await query(
      'SELECT id, province_id FROM warehouses WHERE coordinator_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  },

  async confirmVehicleRequest(id, action, userId) {
    const newStatus = action === 'received' ? 'fulfilled' : 'returned';
    const timeField = action === 'received' ? 'fulfilled_at' : 'returned_confirmed_at';
    const byField = action === 'received' ? 'fulfilled_by' : 'returned_by';
    await query(
      `UPDATE vehicle_requests
       SET status = $1, ${timeField} = NOW(), ${byField} = $2, updated_at = NOW()
       WHERE id = $3`,
      [newStatus, userId, id]
    );
    return newStatus;
  },

  // ── VEHICLE DISPATCHES ────────────────────────────────────────────────────────
  async findVehicleDispatches({ team_id, status, coordinatorId, rescueTeamUserId } = {}) {
    const params = [];
    const conditions = ['1=1'];
    if (team_id) { params.push(parseInt(team_id)); conditions.push(`vd.team_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`vd.status = $${params.length}`); }
    if (coordinatorId) {
      params.push(coordinatorId);
      conditions.push(`v.province_id IN (SELECT province_id FROM coordinator_regions WHERE user_id = $${params.length} AND province_id IS NOT NULL)`);
    } else if (rescueTeamUserId) {
      params.push(rescueTeamUserId);
      conditions.push(`vd.team_id = (SELECT id FROM rescue_teams WHERE leader_id = $${params.length})`);
    }
    const where = 'WHERE ' + conditions.join(' AND ');

    const result = await query(
      `SELECT vd.*,
              v.name as vehicle_name, v.plate_number, v.type as vehicle_type,
              rt.name as team_name,
              u.full_name as dispatched_by_name,
              rcb.full_name as return_confirmed_by_name,
              wcb.full_name as warehouse_confirmed_by_name
       FROM vehicle_dispatches vd
       JOIN vehicles v          ON vd.vehicle_id = v.id
       JOIN rescue_teams rt     ON vd.team_id = rt.id
       JOIN users u             ON vd.dispatched_by = u.id
       LEFT JOIN users rcb      ON vd.return_confirmed_by = rcb.id
       LEFT JOIN users wcb      ON vd.warehouse_confirmed_by = wcb.id
       ${where}
       ORDER BY vd.created_at DESC`,
      params
    );
    return result.rows;
  },

  async findVehicleDispatchById(id) {
    const result = await query(
      `SELECT vd.id, vd.status, vd.warehouse_confirmed, vd.team_id, vd.vehicle_id, vd.task_id,
              rt.leader_id, v.province_id
       FROM vehicle_dispatches vd
       JOIN rescue_teams rt ON vd.team_id = rt.id
       JOIN vehicles v ON vd.vehicle_id = v.id
       WHERE vd.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async isCoordinatorInProvince(coordinatorId, provinceId) {
    const result = await query(
      `SELECT 1 FROM coordinator_regions WHERE user_id = $1 AND province_id = $2`,
      [coordinatorId, provinceId]
    );
    return result.rows.length > 0;
  },

  async checkTaskBelongsToTeam(taskId, teamId) {
    const r1 = await query(
      `SELECT id FROM task_groups WHERE id = $1 AND team_id = $2`,
      [taskId, teamId]
    );
    if (r1.rows.length > 0) return true;
    const r2 = await query(
      `SELECT 1 FROM task_group_teams WHERE task_group_id = $1 AND team_id = $2`,
      [taskId, teamId]
    );
    return r2.rows.length > 0;
  },

  async countPendingBatchSuppliesForTask(taskId) {
    const result = await query(
      `SELECT COUNT(*) as cnt FROM distribution_batches WHERE task_id = $1 AND status = 'issued'`,
      [taskId]
    );
    return parseInt(result.rows[0].cnt);
  },

  async createVehicleDispatch(data) {
    const result = await query(
      `INSERT INTO vehicle_dispatches (vehicle_id, team_id, dispatched_by, mission_note, status, task_id)
       VALUES ($1, $2, $3, $4, 'dispatched', $5)
       RETURNING id`,
      [data.vehicle_id, data.team_id, data.user_id, data.mission_note || null, data.task_id || null]
    );
    return result.rows[0].id;
  },

  async reassignVehicleDispatch(id, taskId, missionNote) {
    await query(
      `UPDATE vehicle_dispatches
       SET task_id = $1, mission_note = COALESCE($2, mission_note), updated_at = NOW()
       WHERE id = $3`,
      [taskId, missionNote || null, id]
    );
  },

  async cancelVehicleDispatch(id) {
    await query(
      `UPDATE vehicle_dispatches SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [id]
    );
  },

  async warehouseConfirmVehicleDispatch(id, userId) {
    await query(
      `UPDATE vehicle_dispatches SET warehouse_confirmed = true, warehouse_confirmed_at = NOW(),
       warehouse_confirmed_by = $1, updated_at = NOW() WHERE id = $2`,
      [userId, id]
    );
  },

  async confirmVehicleDispatch(id) {
    await query(
      `UPDATE vehicle_dispatches SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );
  },

  async getVehicleDispatchTaskId(id) {
    const result = await query(`SELECT task_id FROM vehicle_dispatches WHERE id = $1`, [id]);
    return result.rows[0]?.task_id || null;
  },

  async returnVehicleDispatch(id) {
    await query(
      `UPDATE vehicle_dispatches SET status = 'returned', returned_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );
  },

  async confirmReturnVehicleDispatch(id, userId) {
    await query(
      `UPDATE vehicle_dispatches
       SET status = 'cancelled', return_confirmed_at = NOW(), return_confirmed_by = $1, updated_at = NOW()
       WHERE id = $2`,
      [userId, id]
    );
  },

  async reportVehicleIncident(id, incidentType, incidentNote, userId) {
    await query(
      `UPDATE vehicle_dispatches
       SET incident_type = $1, incident_note = $2,
           incident_reported_at = NOW(), incident_reported_by = $3,
           status = 'incident_pending', updated_at = NOW()
       WHERE id = $4`,
      [incidentType, incidentNote || null, userId, id]
    );
  },

  async confirmVehicleIncident(id, confirmedType, confirmedNote) {
    await query(
      `UPDATE vehicle_dispatches
       SET status = 'cancelled', incident_note = COALESCE($1, incident_note),
           incident_type = $2, updated_at = NOW()
       WHERE id = $3`,
      [confirmedNote || null, confirmedType, id]
    );
  },

  // ── SUPPLY TRANSFERS ──────────────────────────────────────────────────────────
  async findSupplyTransfers({ status, coordinatorId } = {}) {
    const params = [];
    const conditions = ['1=1'];
    if (status) { params.push(status); conditions.push(`st.status = $${params.length}`); }
    if (coordinatorId) {
      params.push(coordinatorId);
      conditions.push(`wt.province_id IN (SELECT province_id FROM coordinator_regions WHERE user_id = $${params.length} AND province_id IS NOT NULL)`);
    }
    const where = 'WHERE ' + conditions.join(' AND ');

    const result = await query(
      `SELECT st.*,
              ri.name as item_name, ri.unit as item_unit,
              wf.name as from_warehouse_name, pf.name as from_province_name,
              wt.name as to_warehouse_name,   pt.name as to_province_name,
              u.full_name as transferred_by_name,
              cb.full_name as confirmed_by_name
       FROM supply_transfers st
       JOIN relief_items ri ON st.item_id = ri.id
       JOIN warehouses wf   ON st.from_warehouse_id = wf.id
       JOIN warehouses wt   ON st.to_warehouse_id = wt.id
       JOIN provinces pf    ON wf.province_id = pf.id
       JOIN provinces pt    ON wt.province_id = pt.id
       JOIN users u         ON st.transferred_by = u.id
       LEFT JOIN users cb   ON st.confirmed_by = cb.id
       ${where}
       ORDER BY st.created_at DESC`,
      params
    );
    return result.rows;
  },

  async findSupplyTransferById(id) {
    const result = await query(
      `SELECT st.*, wt.province_id as to_province_id
       FROM supply_transfers st JOIN warehouses wt ON st.to_warehouse_id = wt.id
       WHERE st.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async createSupplyTransfer(data) {
    const result = await query(
      `INSERT INTO supply_transfers (from_warehouse_id, to_warehouse_id, item_id, quantity, transferred_by, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'in_transit')
       RETURNING id`,
      [data.from_warehouse_id, data.to_warehouse_id, data.item_id, data.quantity, data.user_id, data.notes || null]
    );
    return result.rows[0].id;
  },

  async confirmSupplyTransfer(id, qty, userId) {
    await query(
      `UPDATE supply_transfers
       SET status = 'completed', confirmed_quantity = $1, confirmed_by = $2, confirmed_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [qty, userId, id]
    );
  },

  async cancelSupplyTransfer(id) {
    await query(
      "UPDATE supply_transfers SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
      [id]
    );
  },

  // ── VEHICLE TRANSFERS ─────────────────────────────────────────────────────────
  async findVehicleTransfers({ status, coordinatorId } = {}) {
    const params = [];
    const conditions = ['1=1'];
    if (status) { params.push(status); conditions.push(`vt.status = $${params.length}`); }
    if (coordinatorId) {
      params.push(coordinatorId);
      conditions.push(`vt.to_province_id IN (SELECT province_id FROM coordinator_regions WHERE user_id = $${params.length} AND province_id IS NOT NULL)`);
    }
    const where = 'WHERE ' + conditions.join(' AND ');

    const result = await query(
      `SELECT vt.*,
              v.name as vehicle_name, v.plate_number, v.type as vehicle_type,
              fp.name as from_province_name, tp.name as to_province_name,
              u.full_name as transferred_by_name,
              cb.full_name as confirmed_by_name
       FROM vehicle_transfers vt
       JOIN vehicles v    ON vt.vehicle_id = v.id
       JOIN provinces fp  ON vt.from_province_id = fp.id
       JOIN provinces tp  ON vt.to_province_id = tp.id
       JOIN users u       ON vt.transferred_by = u.id
       LEFT JOIN users cb ON vt.confirmed_by = cb.id
       ${where}
       ORDER BY vt.created_at DESC`,
      params
    );
    return result.rows;
  },

  async findVehicleTransferById(id) {
    const result = await query(
      'SELECT id, status, vehicle_id, from_province_id, to_province_id FROM vehicle_transfers WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async createVehicleTransfer(data) {
    const result = await query(
      `INSERT INTO vehicle_transfers (vehicle_id, from_province_id, to_province_id, transferred_by, notes, status)
       VALUES ($1, $2, $3, $4, $5, 'in_transit')
       RETURNING id`,
      [data.vehicle_id, data.from_province_id, data.to_province_id, data.user_id, data.notes || null]
    );
    return result.rows[0].id;
  },

  async confirmVehicleTransfer(id, toProvinceId, vehicleId, userId) {
    await query(
      'UPDATE vehicles SET status = \'available\', province_id = $1, updated_at = NOW() WHERE id = $2',
      [toProvinceId, vehicleId]
    );
    await query(
      `UPDATE vehicle_transfers SET status = 'completed', confirmed_by = $1, confirmed_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [userId, id]
    );
  },

  async cancelVehicleTransfer(id, fromProvinceId, vehicleId) {
    await query(
      'UPDATE vehicles SET status = \'available\', province_id = $1, updated_at = NOW() WHERE id = $2',
      [fromProvinceId, vehicleId]
    );
    await query(
      "UPDATE vehicle_transfers SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
      [id]
    );
  },

  // ── SUPPLY REQUESTS ───────────────────────────────────────────────────────────
  async findSupplyRequests({ userId, role } = {}) {
    const params = [];
    let where = '';
    if (role === 'coordinator') {
      params.push(userId);
      where = `WHERE sr.requester_id = $${params.length}`;
    } else if (role === 'warehouse_manager') {
      params.push(userId);
      where = `WHERE sr.warehouse_id IN (SELECT id FROM warehouses WHERE manager_id = $${params.length})`;
    }
    const result = await query(
      `SELECT sr.*, u.full_name as requester_name,
              w.name as warehouse_name, ri.name as item_name, ri.unit,
              rv.full_name as reviewer_name
       FROM supply_requests sr
       JOIN users u ON sr.requester_id = u.id
       JOIN warehouses w ON sr.warehouse_id = w.id
       JOIN relief_items ri ON sr.item_id = ri.id
       LEFT JOIN users rv ON sr.reviewed_by = rv.id
       ${where}
       ORDER BY sr.created_at DESC`,
      params
    );
    return result.rows;
  },

  async createSupplyRequest(data) {
    const result = await query(
      `INSERT INTO supply_requests (requester_id, warehouse_id, item_id, requested_quantity, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [data.user_id, parseInt(data.warehouse_id), parseInt(data.item_id), parseFloat(data.requested_quantity), data.reason || null]
    );
    return result.rows[0].id;
  },

  async findSupplyRequestPending(id) {
    const result = await query(
      `SELECT * FROM supply_requests WHERE id = $1 AND status = 'pending'`,
      [id]
    );
    return result.rows[0] || null;
  },

  async approveSupplyRequest(id, userId, note) {
    await query(
      `UPDATE supply_requests SET status = 'manager_approved', reviewed_by = $1,
       review_note = $2, reviewed_at = NOW()
       WHERE id = $3`,
      [userId, note || null, id]
    );
  },

  async rejectSupplyRequest(id, userId, note) {
    await query(
      `UPDATE supply_requests SET status = 'rejected', reviewed_by = $1,
       review_note = $2, reviewed_at = NOW()
       WHERE id = $3 AND status = 'pending'`,
      [userId, note, id]
    );
  },

  async findSupplyRequestManagerApproved(id) {
    const result = await query(
      `SELECT * FROM supply_requests WHERE id = $1 AND status = 'manager_approved'`,
      [id]
    );
    return result.rows[0] || null;
  },

  async warehouseConfirmSupplyRequest(id) {
    await query(
      `UPDATE supply_requests SET status = 'approved', reviewed_at = NOW() WHERE id = $1`,
      [id]
    );
  },

  async addOrCreateInventory(warehouseId, itemId, qty) {
    const inv = await query(
      `SELECT id FROM relief_inventory WHERE warehouse_id = $1 AND item_id = $2`,
      [warehouseId, itemId]
    );
    if (inv.rows.length > 0) {
      await query(
        `UPDATE relief_inventory SET quantity = quantity + $1, last_restocked = NOW(), updated_at = NOW()
         WHERE warehouse_id = $2 AND item_id = $3`,
        [qty, warehouseId, itemId]
      );
    } else {
      await query(
        `INSERT INTO relief_inventory (warehouse_id, item_id, quantity, min_threshold) VALUES ($1, $2, $3, 0)`,
        [warehouseId, itemId, qty]
      );
    }
  },

  // ── HISTORY ───────────────────────────────────────────────────────────────────
  async findHistory({ date_from, date_to, team_id, type, warehouse_id } = {}) {
    const params = {};
    const distParams = [];
    const vdParams = [];
    let distWhere = 'WHERE 1=1';
    let vdWhere = 'WHERE 1=1';

    if (date_from) {
      distParams.push(date_from); distWhere += ` AND rd.created_at >= $${distParams.length}`;
      vdParams.push(date_from);   vdWhere   += ` AND vd.dispatched_at >= $${vdParams.length}`;
    }
    if (date_to) {
      distParams.push(date_to); distWhere += ` AND rd.created_at <= $${distParams.length}`;
      vdParams.push(date_to);   vdWhere   += ` AND vd.dispatched_at <= $${vdParams.length}`;
    }
    if (team_id) {
      distParams.push(parseInt(team_id)); distWhere += ` AND rd.team_id = $${distParams.length}`;
      vdParams.push(parseInt(team_id));   vdWhere   += ` AND vd.team_id = $${vdParams.length}`;
    }
    if (warehouse_id) {
      distParams.push(parseInt(warehouse_id));
      distWhere += ` AND rd.warehouse_id = $${distParams.length}`;
    }

    let distTypeFilter = '';
    if (type === 'issue') distTypeFilter = " AND rd.distribution_type = 'issue'";
    else if (type === 'return') distTypeFilter = " AND rd.distribution_type = 'return'";

    const distResult = await query(
      `SELECT 'supply' as record_type, rd.distribution_type as direction,
         rd.voucher_code,
         CASE WHEN rd.status = 'partially_returned' AND rd.received_return_qty IS NOT NULL
              THEN rd.received_return_qty ELSE rd.quantity END as quantity,
         rd.status, rd.created_at as event_time,
         ri.name as item_name, ri.unit,
         rt.name as team_name, w.name as warehouse_name, u.full_name as handled_by
       FROM relief_distributions rd
       JOIN relief_items ri ON rd.item_id = ri.id
       LEFT JOIN rescue_teams rt ON rd.team_id = rt.id
       LEFT JOIN warehouses w ON rd.warehouse_id = w.id
       LEFT JOIN users u ON rd.distributed_by = u.id
       ${distWhere}${distTypeFilter}`,
      distParams
    );

    let vdRows = [];
    if (!type || type === 'issue') {
      const vdResult = await query(
        `SELECT 'vehicle' as record_type, 'issue' as direction,
           CONCAT('XE-', LPAD(vd.id::text, 4, '0')) as voucher_code,
           1 as quantity,
           CASE WHEN vd.status = 'cancelled' AND vd.return_confirmed_at IS NOT NULL THEN 'returned' ELSE vd.status END as status,
           vd.created_at as event_time,
           v.name as item_name, v.plate_number as unit,
           rt.name as team_name, NULL as warehouse_name, u.full_name as handled_by
         FROM vehicle_dispatches vd
         JOIN vehicles v ON vd.vehicle_id = v.id
         LEFT JOIN rescue_teams rt ON vd.team_id = rt.id
         LEFT JOIN users u ON vd.dispatched_by = u.id
         ${vdWhere}`,
        vdParams
      );
      vdRows = vdResult.rows;
    }

    let importRows = [];
    if (!type || type === 'import') {
      const importParams = [];
      let importWhere = "WHERE sr.status = 'approved'";
      if (warehouse_id) { importParams.push(parseInt(warehouse_id)); importWhere += ` AND sr.warehouse_id = $${importParams.length}`; }
      if (date_from) { importParams.push(date_from); importWhere += ` AND sr.created_at >= $${importParams.length}`; }
      if (date_to) { importParams.push(date_to); importWhere += ` AND sr.created_at <= $${importParams.length}`; }
      const importResult = await query(
        `SELECT 'import' as record_type, 'import' as direction,
           CONCAT('SR-', LPAD(sr.id::text, 4, '0')) as voucher_code,
           sr.requested_quantity as quantity, sr.status,
           sr.created_at as event_time,
           ri.name as item_name, ri.unit,
           NULL as team_name, w.name as warehouse_name, u.full_name as handled_by
         FROM supply_requests sr
         JOIN relief_items ri ON sr.item_id = ri.id
         LEFT JOIN warehouses w ON sr.warehouse_id = w.id
         LEFT JOIN users u ON sr.reviewed_by = u.id
         ${importWhere}`,
        importParams
      );
      importRows = importResult.rows;
    }

    return [...distResult.rows, ...vdRows, ...importRows]
      .sort((a, b) => new Date(b.event_time) - new Date(a.event_time));
  },
};

module.exports = ResourceRepository;
