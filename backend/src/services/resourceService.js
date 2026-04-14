const ResourceRepository = require('../repositories/resourceRepository');

const ResourceService = {
  // ── VEHICLES ─────────────────────────────────────────────────────────────────
  async getVehicles(filters) {
    return ResourceRepository.findVehicles(filters);
  },

  async createVehicle(data) {
    const id = await ResourceRepository.createVehicle(data);
    return { id, message: 'Thêm phương tiện thành công.' };
  },

  async updateVehicle(id, data) {
    await ResourceRepository.updateVehicle(id, data);
  },

  async markVehicleRepaired(id) {
    const veh = await ResourceRepository.findVehicleById(id);
    if (!veh) throw new Error('NOT_FOUND');
    if (veh.status !== 'maintenance') throw new Error('NOT_IN_MAINTENANCE');
    await ResourceRepository.setVehicleStatus(id, 'available');
  },

  // ── DISTRIBUTIONS ─────────────────────────────────────────────────────────────
  async getDistributions(query, user) {
    const opts = { ...query };
    if (user.role === 'coordinator') opts.coordinatorId = user.id;
    else if (user.role === 'rescue_team') opts.rescueTeamUserId = user.id;
    return ResourceRepository.findDistributions(opts);
  },

  async createDistribution(data, userId, role) {
    const { team_id, warehouse_id, item_id, quantity, notes } = data;
    if (!team_id || !warehouse_id || !item_id || !quantity)
      throw new Error('MISSING_FIELDS');

    if (role === 'coordinator') {
      const warehouseOk = await ResourceRepository.isCoordinatorInWarehouseProvince(userId, parseInt(warehouse_id));
      if (!warehouseOk) throw new Error('WAREHOUSE_SCOPE');
      const teamOk = await ResourceRepository.isCoordinatorInTeamProvince(userId, parseInt(team_id));
      if (!teamOk) throw new Error('TEAM_SCOPE');
    }

    const inv = await ResourceRepository.checkInventory(parseInt(warehouse_id), parseInt(item_id));
    if (!inv) throw new Error('NO_ITEM');
    if (inv.quantity < parseFloat(quantity))
      throw Object.assign(new Error('INSUFFICIENT'), { available: inv.quantity });

    await ResourceRepository.deductInventory(inv.id, parseFloat(quantity));
    const voucher = ResourceRepository.genVoucherCode();
    const id = await ResourceRepository.createDistribution({
      team_id: parseInt(team_id), warehouse_id: parseInt(warehouse_id),
      item_id: parseInt(item_id), quantity: parseFloat(quantity),
      user_id: userId, notes, voucher,
    });
    return { id, voucher_code: voucher };
  },

  async createDistributionBatch(data, userId, role) {
    const { team_id, warehouse_id, notes, items, task_id } = data;
    if (!team_id || !warehouse_id || !Array.isArray(items) || items.length === 0)
      throw new Error('MISSING_FIELDS');

    if (role === 'coordinator') {
      const warehouseOk = await ResourceRepository.isCoordinatorInWarehouseProvince(userId, parseInt(warehouse_id));
      if (!warehouseOk) throw new Error('WAREHOUSE_SCOPE');
      const teamOk = await ResourceRepository.isCoordinatorInTeamProvince(userId, parseInt(team_id));
      if (!teamOk) throw new Error('TEAM_SCOPE');
    }

    for (const item of items) {
      const inv = await ResourceRepository.checkInventory(parseInt(warehouse_id), parseInt(item.item_id));
      if (!inv) throw Object.assign(new Error('NO_ITEM'), { item_id: item.item_id });
      if (inv.quantity < parseFloat(item.quantity))
        throw Object.assign(new Error('INSUFFICIENT'), { item_id: item.item_id, available: inv.quantity });
    }

    const voucher = ResourceRepository.genVoucherCode();
    const batchId = await ResourceRepository.createDistributionBatch({
      voucher, team_id: parseInt(team_id), warehouse_id: parseInt(warehouse_id),
      user_id: userId, notes, task_id: task_id ? parseInt(task_id) : null,
    });

    const distributionIds = [];
    for (const item of items) {
      const qty = parseFloat(item.quantity);
      await ResourceRepository.deductInventoryByWarehouseItem(parseInt(warehouse_id), parseInt(item.item_id), qty);
      const id = await ResourceRepository.createDistribution({
        team_id: parseInt(team_id), warehouse_id: parseInt(warehouse_id),
        item_id: parseInt(item.item_id), quantity: qty,
        user_id: userId, notes, voucher, batch_id: batchId,
      });
      distributionIds.push(id);
    }
    return { batch_id: batchId, voucher_code: voucher, distribution_ids: distributionIds };
  },

  async cancelDistribution(id) {
    const row = await ResourceRepository.findDistributionForCancel(id);
    if (!row) throw new Error('NOT_FOUND');
    if (row.status !== 'issued') throw new Error('ALREADY_CONFIRMED');
    if (row.warehouse_confirmed) throw new Error('WAREHOUSE_CONFIRMED');
    await ResourceRepository.cancelDistribution(id);
    await ResourceRepository.addInventoryByWarehouseItem(row.warehouse_id, row.item_id, row.quantity);
  },

  async cancelDistributionBatch(batchId) {
    const items = await ResourceRepository.findDistributionsByBatch(batchId);
    if (!items.length) throw new Error('NOT_FOUND');
    const anyConfirmed = items.some(r => r.status !== 'issued' || r.warehouse_confirmed);
    if (anyConfirmed) throw new Error('ALREADY_CONFIRMED');
    await ResourceRepository.cancelDistributionsByBatch(batchId);
    for (const row of items) {
      await ResourceRepository.addInventoryByWarehouseItem(row.warehouse_id, row.item_id, row.quantity);
    }
  },

  async confirmDistribution(id, userId) {
    const row = await ResourceRepository.findDistributionWithTeam(id);
    if (!row) throw new Error('NOT_FOUND');
    if (row.leader_id !== userId) throw new Error('NOT_LEADER');
    if (row.status !== 'issued') throw new Error('INVALID_STATUS');
    if (!row.warehouse_confirmed) throw new Error('WAREHOUSE_NOT_CONFIRMED');

    await ResourceRepository.confirmDistribution(id);

    const taskId = await ResourceRepository.getDistributionBatchTaskId(id);
    let pendingDist;
    if (taskId) {
      pendingDist = await ResourceRepository.countPendingDistributionsByTask(taskId);
    } else {
      pendingDist = await ResourceRepository.countPendingDistributionsByTeam(row.team_id);
    }

    let readyRequests = [];
    if (pendingDist === 0) {
      let pendingVehicles = 0;
      if (taskId) pendingVehicles = await ResourceRepository.countPendingVehiclesByTask(taskId);
      if (pendingVehicles === 0) {
        readyRequests = await ResourceRepository.setTeamReadyForRequests(row.team_id);
      }
    }
    return { team_id: row.team_id, readyRequests };
  },

  async warehouseConfirmDistribution(id, userId) {
    const dist = await ResourceRepository.findDistributionForCancel(id);
    if (!dist) throw new Error('NOT_FOUND');
    if (dist.status !== 'issued') throw new Error('INVALID_STATUS');
    if (dist.warehouse_confirmed) throw new Error('ALREADY_CONFIRMED');
    await ResourceRepository.warehouseConfirmDistribution(id, userId);
  },

  async requestReturnDistribution(id, returnQuantity, returnNote, userId) {
    if (!returnQuantity || parseFloat(returnQuantity) <= 0) throw new Error('INVALID_QTY');
    const row = await ResourceRepository.findDistributionForReturn(id);
    if (!row) throw new Error('NOT_FOUND');
    if (row.leader_id !== userId) throw new Error('NOT_LEADER');
    if (row.status !== 'confirmed') throw new Error('NOT_CONFIRMED');
    if (parseFloat(returnQuantity) > row.quantity) throw new Error('EXCEEDS_RECEIVED');
    const active = await ResourceRepository.countActiveMissionsForTeam(row.team_id);
    if (active > 0) throw new Error('ACTIVE_MISSIONS');
    await ResourceRepository.requestReturnDistribution(id, parseFloat(returnQuantity), returnNote);
    return { team_id: row.team_id };
  },

  async confirmReturnDistribution(id, receivedQuantity, userId) {
    if (!receivedQuantity || parseFloat(receivedQuantity) <= 0) throw new Error('INVALID_QTY');
    const row = await ResourceRepository.findDistributionById(id);
    if (!row) throw new Error('NOT_FOUND');
    if (row.status !== 'return_requested') throw new Error('NO_RETURN_REQUEST');
    if (parseFloat(receivedQuantity) > row.return_quantity) throw new Error('EXCEEDS_RETURN_QTY');

    const actualQty = parseFloat(receivedQuantity);
    const newStatus = actualQty < row.quantity ? 'partially_returned' : 'returned';

    const inv = await ResourceRepository.checkInventory(row.warehouse_id, row.item_id);
    if (inv) {
      await ResourceRepository.addInventoryById(inv.id, actualQty);
    } else {
      await ResourceRepository.addInventoryByWarehouseItem(row.warehouse_id, row.item_id, actualQty);
    }
    await ResourceRepository.confirmReturnDistribution(id, newStatus, actualQty, userId);
    return { status: newStatus, actualQty };
  },

  // ── VEHICLE REQUESTS ──────────────────────────────────────────────────────────
  async getVehicleRequests(query, user) {
    const opts = {};
    if (query.status) opts.status = query.status;
    if (user.role === 'coordinator') opts.coordinatorId = user.id;
    return ResourceRepository.findVehicleRequests(opts);
  },

  async createVehicleRequest(data, userId) {
    const { vehicle_type, quantity, source_type } = data;
    if (!vehicle_type || !quantity || !source_type) throw new Error('MISSING_FIELDS');

    let province_id = data.province_id || null;
    if (!province_id) {
      province_id = await ResourceRepository.getCoordinatorProvinceFromWarehouse(userId);
    }
    if (!province_id) throw new Error('NO_WAREHOUSE');

    if (data.destination_team_id) {
      const teamProvince = await ResourceRepository.getTeamProvinceId(data.destination_team_id);
      if (teamProvince) province_id = teamProvince;
    }

    return ResourceRepository.createVehicleRequest({ ...data, province_id, user_id: userId });
  },

  async updateVehicleRequestStatus(id, status, userId, role, notes) {
    const validStatuses = ['manager_approved', 'approved', 'rejected', 'fulfilled', 'cancelled'];
    if (!validStatuses.includes(status)) throw new Error('INVALID_STATUS');
    if (role === 'manager' && !['manager_approved', 'rejected'].includes(status)) throw new Error('MANAGER_SCOPE');
    if (role === 'warehouse_manager' && status !== 'approved') throw new Error('WH_SCOPE');

    await ResourceRepository.updateVehicleRequestStatus(parseInt(id), status, userId, notes);

    if (status === 'approved' && role === 'warehouse_manager') {
      const vr = await ResourceRepository.getVehicleRequestForApproval(parseInt(id));
      if (vr) {
        const warehouse = await ResourceRepository.getCoordinatorWarehouse(vr.requested_by);
        const provinceId = warehouse?.province_id || vr.province_id || null;
        await ResourceRepository.createVehiclesBulk(vr.vehicle_type, vr.quantity, provinceId, warehouse?.id, id);
        return { message: 'Đã duyệt. Xe đã được thêm vào kho.' };
      }
    }
    return { message: `Đã cập nhật trạng thái: ${status}` };
  },

  async confirmVehicleRequest(id, action, userId, isTeamLeader, role) {
    if (!['received', 'returned'].includes(action)) throw new Error('INVALID_ACTION');
    if (role === 'rescue_team' && !isTeamLeader) throw new Error('NOT_LEADER');

    const vr = await ResourceRepository.findVehicleRequestById(parseInt(id));
    if (!vr) throw new Error('NOT_FOUND');

    if (action === 'received' && vr.status !== 'approved') throw new Error('INVALID_STATUS');
    if (action === 'returned' && vr.status !== 'fulfilled') throw new Error('INVALID_STATUS');

    const newStatus = await ResourceRepository.confirmVehicleRequest(parseInt(id), action, userId);
    return { newStatus };
  },

  // ── VEHICLE DISPATCHES ────────────────────────────────────────────────────────
  async getVehicleDispatches(query, user) {
    const opts = { ...query };
    if (user.role === 'coordinator') opts.coordinatorId = user.id;
    else if (user.role === 'rescue_team') opts.rescueTeamUserId = user.id;
    return ResourceRepository.findVehicleDispatches(opts);
  },

  async createVehicleDispatch(data, userId, role) {
    const { vehicle_id, team_id, mission_note, task_id } = data;
    if (!vehicle_id || !team_id) throw new Error('MISSING_FIELDS');

    const veh = await ResourceRepository.findVehicleById(parseInt(vehicle_id));
    if (!veh) throw new Error('VEHICLE_NOT_FOUND');
    if (veh.status !== 'available') throw new Error('VEHICLE_NOT_AVAILABLE');

    if (role === 'coordinator') {
      const ok = await ResourceRepository.isCoordinatorInProvince(userId, veh.province_id);
      if (!ok) throw new Error('PROVINCE_SCOPE');
    }

    await ResourceRepository.setVehicleStatus(parseInt(vehicle_id), 'in_use');
    const id = await ResourceRepository.createVehicleDispatch({
      vehicle_id: parseInt(vehicle_id), team_id: parseInt(team_id),
      user_id: userId, mission_note, task_id: task_id ? parseInt(task_id) : null,
    });
    return { id, team_id: parseInt(team_id) };
  },

  async reassignVehicleDispatch(id, taskId, missionNote) {
    if (!taskId) throw new Error('MISSING_TASK_ID');
    const vd = await ResourceRepository.findVehicleDispatchById(parseInt(id));
    if (!vd) throw new Error('NOT_FOUND');
    if (!['confirmed', 'dispatched'].includes(vd.status)) throw new Error('INVALID_STATUS');

    const taskOk = await ResourceRepository.checkTaskBelongsToTeam(parseInt(taskId), vd.team_id);
    if (!taskOk) throw new Error('TASK_NOT_BELONG');

    await ResourceRepository.reassignVehicleDispatch(parseInt(id), parseInt(taskId), missionNote);

    const pending = await ResourceRepository.countPendingBatchSuppliesForTask(parseInt(taskId));
    let readyRequests = [];
    if (pending === 0) {
      readyRequests = await ResourceRepository.setTeamReadyForRequests(vd.team_id);
    }
    return { team_id: vd.team_id, readyRequests };
  },

  async cancelVehicleDispatch(id) {
    const vd = await ResourceRepository.findVehicleDispatchById(parseInt(id));
    if (!vd) throw new Error('NOT_FOUND');
    if (vd.status !== 'dispatched') throw new Error('ALREADY_CONFIRMED');
    if (vd.warehouse_confirmed) throw new Error('WAREHOUSE_CONFIRMED');
    await ResourceRepository.cancelVehicleDispatch(parseInt(id));
    await ResourceRepository.setVehicleStatus(vd.vehicle_id, 'available');
  },

  async warehouseConfirmVehicleDispatch(id, userId) {
    const vd = await ResourceRepository.findVehicleDispatchById(parseInt(id));
    if (!vd) throw new Error('NOT_FOUND');
    if (vd.status !== 'dispatched') throw new Error('INVALID_STATUS');
    if (vd.warehouse_confirmed) throw new Error('ALREADY_CONFIRMED');
    await ResourceRepository.warehouseConfirmVehicleDispatch(parseInt(id), userId);
  },

  async confirmVehicleDispatch(id, userId) {
    const vd = await ResourceRepository.findVehicleDispatchById(parseInt(id));
    if (!vd) throw new Error('NOT_FOUND');
    if (vd.leader_id !== userId) throw new Error('NOT_LEADER');
    if (!vd.warehouse_confirmed) throw new Error('WAREHOUSE_NOT_CONFIRMED');
    if (vd.status !== 'dispatched') throw new Error('INVALID_STATUS');

    await ResourceRepository.confirmVehicleDispatch(parseInt(id));

    const taskId = await ResourceRepository.getVehicleDispatchTaskId(parseInt(id));
    let readyRequests = [];
    if (taskId) {
      const pendingDist = await ResourceRepository.countPendingDistributionsByTask(taskId);
      const pendingVeh = await ResourceRepository.countPendingVehiclesByTask(taskId);
      if (pendingDist === 0 && pendingVeh === 0) {
        readyRequests = await ResourceRepository.setTeamReadyForRequests(vd.team_id);
      }
    }
    return { team_id: vd.team_id, readyRequests };
  },

  async returnVehicleDispatch(id, userId) {
    const vd = await ResourceRepository.findVehicleDispatchById(parseInt(id));
    if (!vd) throw new Error('NOT_FOUND');
    if (vd.leader_id !== userId) throw new Error('NOT_LEADER');
    if (vd.status !== 'confirmed') throw new Error('NOT_CONFIRMED');
    await ResourceRepository.returnVehicleDispatch(parseInt(id));
    return { vehicle_id: vd.vehicle_id };
  },

  async confirmReturnVehicleDispatch(id, userId, role) {
    const vd = await ResourceRepository.findVehicleDispatchById(parseInt(id));
    if (!vd) throw new Error('NOT_FOUND');
    if (vd.status !== 'returned') throw new Error('NOT_RETURNED');
    if (role === 'coordinator') {
      const ok = await ResourceRepository.isCoordinatorInProvince(userId, vd.province_id);
      if (!ok) throw new Error('PROVINCE_SCOPE');
    }
    await ResourceRepository.confirmReturnVehicleDispatch(parseInt(id), userId);
    await ResourceRepository.setVehicleStatus(vd.vehicle_id, 'available');
    return { vehicle_id: vd.vehicle_id };
  },

  async reportVehicleIncident(id, incidentType, incidentNote, userId) {
    if (!['damaged', 'lost'].includes(incidentType)) throw new Error('INVALID_INCIDENT_TYPE');
    const vd = await ResourceRepository.findVehicleDispatchById(parseInt(id));
    if (!vd) throw new Error('NOT_FOUND');
    if (vd.leader_id !== userId) throw new Error('NOT_LEADER');
    if (vd.status !== 'confirmed') throw new Error('NOT_CONFIRMED');
    await ResourceRepository.reportVehicleIncident(parseInt(id), incidentType, incidentNote, userId);
  },

  async confirmVehicleIncident(id, confirmedType, confirmedNote) {
    if (!['damaged', 'lost', 'ok'].includes(confirmedType)) throw new Error('INVALID_TYPE');
    const vd = await ResourceRepository.findVehicleDispatchById(parseInt(id));
    if (!vd) throw new Error('NOT_FOUND');
    if (vd.status !== 'incident_pending') throw new Error('NO_INCIDENT');
    const vehicleStatus = confirmedType === 'lost' ? 'lost' : confirmedType === 'damaged' ? 'maintenance' : 'available';
    await ResourceRepository.confirmVehicleIncident(parseInt(id), confirmedType, confirmedNote);
    await ResourceRepository.setVehicleStatus(vd.vehicle_id, vehicleStatus);
    return { confirmedType };
  },

  // ── SUPPLY TRANSFERS ──────────────────────────────────────────────────────────
  async getSupplyTransfers(query, user) {
    const opts = { status: query.status };
    if (user.role === 'coordinator') opts.coordinatorId = user.id;
    return ResourceRepository.findSupplyTransfers(opts);
  },

  async createSupplyTransfer(data, userId) {
    const { from_warehouse_id, to_warehouse_id, item_id, quantity, notes } = data;
    if (!from_warehouse_id || !to_warehouse_id || !item_id || !quantity) throw new Error('MISSING_FIELDS');
    if (parseInt(from_warehouse_id) === parseInt(to_warehouse_id)) throw new Error('SAME_WAREHOUSE');

    const inv = await ResourceRepository.checkInventory(parseInt(from_warehouse_id), parseInt(item_id));
    if (!inv) throw new Error('NO_ITEM');
    if (inv.quantity < parseFloat(quantity)) throw Object.assign(new Error('INSUFFICIENT'), { available: inv.quantity });

    await ResourceRepository.deductInventory(inv.id, parseFloat(quantity));
    const id = await ResourceRepository.createSupplyTransfer({
      from_warehouse_id: parseInt(from_warehouse_id), to_warehouse_id: parseInt(to_warehouse_id),
      item_id: parseInt(item_id), quantity: parseFloat(quantity),
      user_id: userId, notes,
    });
    return { id };
  },

  async confirmSupplyTransfer(id, confirmedQuantity, userId, role) {
    if (!confirmedQuantity || parseFloat(confirmedQuantity) <= 0) throw new Error('INVALID_QTY');
    const st = await ResourceRepository.findSupplyTransferById(parseInt(id));
    if (!st) throw new Error('NOT_FOUND');
    if (st.status !== 'in_transit') throw new Error('NOT_IN_TRANSIT');
    if (parseFloat(confirmedQuantity) > st.quantity) throw new Error('EXCEEDS_QTY');

    if (role === 'coordinator') {
      const ok = await ResourceRepository.isCoordinatorInProvince(userId, st.to_province_id);
      if (!ok) throw new Error('PROVINCE_SCOPE');
    }

    const actualQty = parseFloat(confirmedQuantity);
    const diff = st.quantity - actualQty;

    await ResourceRepository.addInventoryByWarehouseItem(st.to_warehouse_id, st.item_id, actualQty);
    if (diff > 0) {
      await ResourceRepository.addInventoryByWarehouseItem(st.from_warehouse_id, st.item_id, diff);
    }
    await ResourceRepository.confirmSupplyTransfer(parseInt(id), actualQty, userId);
    return { actualQty };
  },

  async cancelSupplyTransfer(id) {
    const st = await ResourceRepository.findSupplyTransferById(parseInt(id));
    if (!st) throw new Error('NOT_FOUND');
    if (st.status !== 'in_transit') throw new Error('NOT_IN_TRANSIT');
    await ResourceRepository.addInventoryByWarehouseItem(st.from_warehouse_id, st.item_id, st.quantity);
    await ResourceRepository.cancelSupplyTransfer(parseInt(id));
  },

  // ── VEHICLE TRANSFERS ─────────────────────────────────────────────────────────
  async getVehicleTransfers(query, user) {
    const opts = { status: query.status };
    if (user.role === 'coordinator') opts.coordinatorId = user.id;
    return ResourceRepository.findVehicleTransfers(opts);
  },

  async createVehicleTransfer(data, userId) {
    const { vehicle_id, to_province_id, notes } = data;
    if (!vehicle_id || !to_province_id) throw new Error('MISSING_FIELDS');

    const veh = await ResourceRepository.findVehicleById(parseInt(vehicle_id));
    if (!veh) throw new Error('NOT_FOUND');
    if (veh.status !== 'available') throw new Error('NOT_AVAILABLE');
    if (veh.province_id === parseInt(to_province_id)) throw new Error('SAME_PROVINCE');

    await ResourceRepository.setVehicleStatus(parseInt(vehicle_id), 'in_transit');
    const id = await ResourceRepository.createVehicleTransfer({
      vehicle_id: parseInt(vehicle_id),
      from_province_id: veh.province_id,
      to_province_id: parseInt(to_province_id),
      user_id: userId, notes,
    });
    return { id, to_province_id: parseInt(to_province_id) };
  },

  async confirmVehicleTransfer(id, userId, role) {
    const vt = await ResourceRepository.findVehicleTransferById(parseInt(id));
    if (!vt) throw new Error('NOT_FOUND');
    if (vt.status !== 'in_transit') throw new Error('NOT_IN_TRANSIT');
    if (role === 'coordinator') {
      const ok = await ResourceRepository.isCoordinatorInProvince(userId, vt.to_province_id);
      if (!ok) throw new Error('PROVINCE_SCOPE');
    }
    await ResourceRepository.confirmVehicleTransfer(parseInt(id), vt.to_province_id, vt.vehicle_id, userId);
  },

  async cancelVehicleTransfer(id) {
    const vt = await ResourceRepository.findVehicleTransferById(parseInt(id));
    if (!vt) throw new Error('NOT_FOUND');
    if (vt.status !== 'in_transit') throw new Error('NOT_IN_TRANSIT');
    await ResourceRepository.cancelVehicleTransfer(parseInt(id), vt.from_province_id, vt.vehicle_id);
  },

  // ── SUPPLY REQUESTS ───────────────────────────────────────────────────────────
  async getSupplyRequests(user) {
    return ResourceRepository.findSupplyRequests({ userId: user.id, role: user.role });
  },

  async createSupplyRequest(data, userId) {
    const { warehouse_id, item_id, requested_quantity } = data;
    if (!warehouse_id || !item_id || !requested_quantity) throw new Error('MISSING_FIELDS');
    const id = await ResourceRepository.createSupplyRequest({ ...data, user_id: userId });
    return { id };
  },

  async approveSupplyRequest(id, userId, reviewNote) {
    const sr = await ResourceRepository.findSupplyRequestPending(parseInt(id));
    if (!sr) throw new Error('NOT_FOUND');
    await ResourceRepository.approveSupplyRequest(parseInt(id), userId, reviewNote);
  },

  async rejectSupplyRequest(id, userId, reviewNote) {
    if (!reviewNote?.trim()) throw new Error('NOTE_REQUIRED');
    await ResourceRepository.rejectSupplyRequest(parseInt(id), userId, reviewNote);
  },

  async warehouseConfirmSupplyRequest(id) {
    const sr = await ResourceRepository.findSupplyRequestManagerApproved(parseInt(id));
    if (!sr) throw new Error('NOT_FOUND');
    await ResourceRepository.warehouseConfirmSupplyRequest(parseInt(id));
    await ResourceRepository.addOrCreateInventory(sr.warehouse_id, sr.item_id, sr.requested_quantity);
    return { quantity: sr.requested_quantity };
  },

  // ── HISTORY ───────────────────────────────────────────────────────────────────
  async getHistory(filters) {
    return ResourceRepository.findHistory(filters);
  },
};

module.exports = ResourceService;
