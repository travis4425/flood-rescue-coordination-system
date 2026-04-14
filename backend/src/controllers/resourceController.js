const ResourceService = require('../services/resourceService');

const ResourceController = {
  // ── VEHICLES ─────────────────────────────────────────────────────────────────
  async getVehicles(req, res, next) {
    try {
      const data = await ResourceService.getVehicles(req.query);
      res.json(data);
    } catch (err) { next(err); }
  },

  async createVehicle(req, res, next) {
    try {
      const result = await ResourceService.createVehicle(req.body);
      res.status(201).json(result);
    } catch (err) { next(err); }
  },

  async updateVehicle(req, res, next) {
    try {
      await ResourceService.updateVehicle(parseInt(req.params.id), req.body);
      res.json({ message: 'Cập nhật phương tiện thành công.' });
    } catch (err) { next(err); }
  },

  async markVehicleRepaired(req, res, next) {
    try {
      await ResourceService.markVehicleRepaired(parseInt(req.params.id));
      const io = req.app.get('io');
      if (io) io.emit('vehicle_repaired', { id: parseInt(req.params.id) });
      res.json({ message: 'Xe đã sửa xong, trả về trạng thái sẵn sàng.' });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy xe.' });
      if (err.message === 'NOT_IN_MAINTENANCE') return res.status(400).json({ error: 'Xe không ở trạng thái bảo trì.' });
      next(err);
    }
  },

  // ── DISTRIBUTIONS ─────────────────────────────────────────────────────────────
  async getDistributions(req, res, next) {
    try {
      const data = await ResourceService.getDistributions(req.query, req.user);
      res.json(data);
    } catch (err) { next(err); }
  },

  async createDistribution(req, res, next) {
    try {
      const result = await ResourceService.createDistribution(req.body, req.user.id, req.user.role);
      const io = req.app.get('io');
      if (io) io.emit('distribution_new', { id: result.id, team_id: parseInt(req.body.team_id) });
      res.status(201).json({ ...result, message: 'Cấp phát thành công. Tồn kho đã trừ.' });
    } catch (err) {
      if (err.message === 'MISSING_FIELDS') return res.status(400).json({ error: 'Thiếu thông tin: team_id, warehouse_id, item_id, quantity.' });
      if (err.message === 'WAREHOUSE_SCOPE') return res.status(403).json({ error: 'Bạn chỉ được xuất từ kho trong tỉnh của mình.' });
      if (err.message === 'TEAM_SCOPE') return res.status(403).json({ error: 'Bạn chỉ được cấp phát cho đội trong tỉnh của mình.' });
      if (err.message === 'NO_ITEM') return res.status(400).json({ error: 'Kho không có vật phẩm này.' });
      if (err.message === 'INSUFFICIENT') return res.status(400).json({ error: `Tồn kho không đủ. Hiện có: ${err.available}` });
      next(err);
    }
  },

  async createDistributionBatch(req, res, next) {
    try {
      const result = await ResourceService.createDistributionBatch(req.body, req.user.id, req.user.role);
      const io = req.app.get('io');
      if (io) io.emit('distribution_new', { batch_id: result.batch_id, team_id: parseInt(req.body.team_id) });
      res.status(201).json({ ...result, message: `Cấp phát ${req.body.items.length} loại vật tư thành công.` });
    } catch (err) {
      if (err.message === 'MISSING_FIELDS') return res.status(400).json({ error: 'Thiếu thông tin: team_id, warehouse_id, items.' });
      if (err.message === 'WAREHOUSE_SCOPE') return res.status(403).json({ error: 'Bạn chỉ được xuất từ kho trong tỉnh của mình.' });
      if (err.message === 'TEAM_SCOPE') return res.status(403).json({ error: 'Bạn chỉ được cấp phát cho đội trong tỉnh của mình.' });
      if (err.message === 'NO_ITEM') return res.status(400).json({ error: `Kho không có vật phẩm ID ${err.item_id}.` });
      if (err.message === 'INSUFFICIENT') return res.status(400).json({ error: `Tồn kho không đủ cho vật phẩm ID ${err.item_id}. Hiện có: ${err.available}.` });
      next(err);
    }
  },

  async cancelDistribution(req, res, next) {
    try {
      await ResourceService.cancelDistribution(parseInt(req.params.id));
      res.json({ message: 'Đã hoàn tác cấp phát. Tồn kho đã được cộng lại.' });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy bản ghi.' });
      if (err.message === 'ALREADY_CONFIRMED') return res.status(400).json({ error: 'Chỉ hoàn tác khi chưa đội xác nhận nhận.' });
      if (err.message === 'WAREHOUSE_CONFIRMED') return res.status(400).json({ error: 'Kho đã xác nhận bàn giao, không thể hoàn tác.' });
      next(err);
    }
  },

  async cancelDistributionBatch(req, res, next) {
    try {
      await ResourceService.cancelDistributionBatch(parseInt(req.params.batchId));
      res.json({ message: 'Đã hoàn tác phiếu cấp phát. Tồn kho đã được cộng lại.' });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy phiếu.' });
      if (err.message === 'ALREADY_CONFIRMED') return res.status(400).json({ error: 'Phiếu đã được xác nhận bàn giao, không thể hoàn tác.' });
      next(err);
    }
  },

  async confirmDistribution(req, res, next) {
    try {
      const result = await ResourceService.confirmDistribution(parseInt(req.params.id), req.user.id);
      const io = req.app.get('io');
      if (io && result.readyRequests.length > 0) {
        io.emit('team_ready', { team_id: result.team_id });
        for (const r of result.readyRequests) {
          io.emit('request_updated', { id: r.id, tracking_status: 'team_ready' });
        }
      }
      res.json({ message: 'Đã xác nhận nhận hàng.' });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy bản ghi.' });
      if (err.message === 'NOT_LEADER') return res.status(403).json({ error: 'Bạn không phải trưởng đội nhận hàng này.' });
      if (err.message === 'INVALID_STATUS') return res.status(400).json({ error: "Chỉ xác nhận được khi trạng thái là 'issued'." });
      if (err.message === 'WAREHOUSE_NOT_CONFIRMED') return res.status(400).json({ error: 'Kho chưa xác nhận bàn giao. Vui lòng chờ kho xác nhận trước.' });
      next(err);
    }
  },

  async warehouseConfirmDistribution(req, res, next) {
    try {
      await ResourceService.warehouseConfirmDistribution(parseInt(req.params.id), req.user.id);
      const io = req.app.get('io');
      if (io) io.emit('distribution_warehouse_confirmed', { id: parseInt(req.params.id) });
      res.json({ message: 'Đã xác nhận bàn giao. Team có thể xác nhận nhận hàng.' });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy bản ghi.' });
      if (err.message === 'INVALID_STATUS') return res.status(400).json({ error: "Chỉ xác nhận bàn giao khi trạng thái là 'issued'." });
      if (err.message === 'ALREADY_CONFIRMED') return res.status(400).json({ error: 'Phiếu này đã được xác nhận bàn giao rồi.' });
      next(err);
    }
  },

  async requestReturnDistribution(req, res, next) {
    try {
      const result = await ResourceService.requestReturnDistribution(
        parseInt(req.params.id), req.body.return_quantity, req.body.return_note, req.user.id
      );
      const io = req.app.get('io');
      if (io) io.emit('distribution_return_requested', { id: parseInt(req.params.id), team_id: result.team_id });
      res.json({ message: 'Đã tạo phiếu trả hàng. Chờ coordinator xác nhận.' });
    } catch (err) {
      if (err.message === 'INVALID_QTY') return res.status(400).json({ error: 'Số lượng trả phải lớn hơn 0.' });
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy bản ghi.' });
      if (err.message === 'NOT_LEADER') return res.status(403).json({ error: 'Bạn không phải trưởng đội.' });
      if (err.message === 'NOT_CONFIRMED') return res.status(400).json({ error: 'Chỉ tạo phiếu trả sau khi đã xác nhận nhận hàng.' });
      if (err.message === 'EXCEEDS_RECEIVED') return res.status(400).json({ error: 'Số lượng trả không được vượt quá số đã nhận.' });
      if (err.message === 'ACTIVE_MISSIONS') return res.status(400).json({ error: 'Không thể trả hàng khi đội vẫn còn nhiệm vụ đang thực hiện.' });
      next(err);
    }
  },

  async confirmReturnDistribution(req, res, next) {
    try {
      const result = await ResourceService.confirmReturnDistribution(
        parseInt(req.params.id), req.body.received_quantity, req.user.id
      );
      const io = req.app.get('io');
      if (io) io.emit('distribution_return_confirmed', { id: parseInt(req.params.id), status: result.status });
      res.json({ message: `Đã xác nhận nhận lại ${result.actualQty} đơn vị. Tồn kho đã cộng.`, status: result.status });
    } catch (err) {
      if (err.message === 'INVALID_QTY') return res.status(400).json({ error: 'Số lượng thực nhận phải lớn hơn 0.' });
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy bản ghi.' });
      if (err.message === 'NO_RETURN_REQUEST') return res.status(400).json({ error: 'Chưa có phiếu trả từ team.' });
      if (err.message === 'EXCEEDS_RETURN_QTY') return res.status(400).json({ error: 'Số thực nhận không được vượt quá số team khai trả.' });
      next(err);
    }
  },

  // ── VEHICLE REQUESTS ──────────────────────────────────────────────────────────
  async getVehicleRequests(req, res, next) {
    try {
      const data = await ResourceService.getVehicleRequests(req.query, req.user);
      res.json(data);
    } catch (err) { next(err); }
  },

  async createVehicleRequest(req, res, next) {
    try {
      const result = await ResourceService.createVehicleRequest(req.body, req.user.id);
      const io = req.app.get('io');
      if (io) io.emit('vehicle_request_new', result);
      res.status(201).json(result);
    } catch (err) {
      if (err.message === 'MISSING_FIELDS') return res.status(400).json({ error: 'Thiếu thông tin: vehicle_type, quantity, source_type' });
      if (err.message === 'NO_WAREHOUSE') return res.status(400).json({ error: 'Tài khoản của bạn chưa được gán kho. Liên hệ quản trị viên.' });
      next(err);
    }
  },

  async updateVehicleRequestStatus(req, res, next) {
    try {
      const result = await ResourceService.updateVehicleRequestStatus(
        req.params.id, req.body.status, req.user.id, req.user.role, req.body.notes
      );
      const io = req.app.get('io');
      if (io) io.emit('vehicle_request_updated', { id: req.params.id, status: req.body.status });
      res.json(result);
    } catch (err) {
      if (err.message === 'INVALID_STATUS') return res.status(400).json({ error: 'Trạng thái không hợp lệ.' });
      if (err.message === 'MANAGER_SCOPE') return res.status(403).json({ error: 'Manager chỉ được duyệt hoặc từ chối.' });
      if (err.message === 'WH_SCOPE') return res.status(403).json({ error: 'Kiểm kho chỉ được xác nhận nhập kho.' });
      next(err);
    }
  },

  async confirmVehicleRequest(req, res, next) {
    try {
      const result = await ResourceService.confirmVehicleRequest(
        req.params.id, req.body.action, req.user.id, req.user.is_team_leader, req.user.role
      );
      const io = req.app.get('io');
      if (io) io.emit('vehicle_request_updated', { id: req.params.id, status: result.newStatus });
      res.json({ message: req.body.action === 'received' ? 'Xác nhận đã nhận xe.' : 'Xác nhận đã trả xe.' });
    } catch (err) {
      if (err.message === 'INVALID_ACTION') return res.status(400).json({ error: "action phải là 'received' hoặc 'returned'." });
      if (err.message === 'NOT_LEADER') return res.status(403).json({ error: 'Chỉ team leader mới có thể xác nhận.' });
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy yêu cầu.' });
      if (err.message === 'INVALID_STATUS') return res.status(400).json({ error: 'Trạng thái không phù hợp để thực hiện hành động này.' });
      next(err);
    }
  },

  // ── VEHICLE DISPATCHES ────────────────────────────────────────────────────────
  async getVehicleDispatches(req, res, next) {
    try {
      const data = await ResourceService.getVehicleDispatches(req.query, req.user);
      res.json(data);
    } catch (err) { next(err); }
  },

  async createVehicleDispatch(req, res, next) {
    try {
      const result = await ResourceService.createVehicleDispatch(req.body, req.user.id, req.user.role);
      const io = req.app.get('io');
      if (io) io.emit('vehicle_dispatch_new', { id: result.id, team_id: result.team_id });
      res.status(201).json({ id: result.id, message: 'Đã điều xe cho đội. Xe đang được sử dụng.' });
    } catch (err) {
      if (err.message === 'MISSING_FIELDS') return res.status(400).json({ error: 'Thiếu thông tin: vehicle_id, team_id.' });
      if (err.message === 'VEHICLE_NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy xe.' });
      if (err.message === 'VEHICLE_NOT_AVAILABLE') return res.status(400).json({ error: 'Xe không ở trạng thái sẵn sàng (available).' });
      if (err.message === 'PROVINCE_SCOPE') return res.status(403).json({ error: 'Bạn chỉ được điều xe trong tỉnh của mình.' });
      next(err);
    }
  },

  async reassignVehicleDispatch(req, res, next) {
    try {
      const result = await ResourceService.reassignVehicleDispatch(
        req.params.id, req.body.task_id, req.body.mission_note
      );
      const io = req.app.get('io');
      if (io) {
        io.emit('vehicle_dispatch_reassigned', { id: parseInt(req.params.id), new_task_id: parseInt(req.body.task_id) });
        for (const r of result.readyRequests) {
          io.emit('request_updated', { id: r.id, tracking_status: 'team_ready' });
        }
      }
      res.json({ message: 'Đã gán lại xe sang task mới thành công.' });
    } catch (err) {
      if (err.message === 'MISSING_TASK_ID') return res.status(400).json({ error: 'Thiếu task_id mới cần gán.' });
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy điều xe.' });
      if (err.message === 'INVALID_STATUS') return res.status(400).json({ error: 'Chỉ có thể gán lại xe khi đội đang giữ xe.' });
      if (err.message === 'TASK_NOT_BELONG') return res.status(400).json({ error: 'Task mới không thuộc đội này.' });
      next(err);
    }
  },

  async cancelVehicleDispatch(req, res, next) {
    try {
      await ResourceService.cancelVehicleDispatch(req.params.id);
      res.json({ message: 'Đã hoàn tác điều xe. Xe đã được trả về trạng thái sẵn sàng.' });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy phiếu điều xe.' });
      if (err.message === 'ALREADY_CONFIRMED') return res.status(400).json({ error: 'Chỉ hoàn tác khi xe chưa được đội xác nhận nhận.' });
      if (err.message === 'WAREHOUSE_CONFIRMED') return res.status(400).json({ error: 'Kho đã xác nhận bàn giao, không thể hoàn tác.' });
      next(err);
    }
  },

  async warehouseConfirmVehicleDispatch(req, res, next) {
    try {
      await ResourceService.warehouseConfirmVehicleDispatch(parseInt(req.params.id), req.user.id);
      const io = req.app.get('io');
      if (io) io.emit('vehicle_dispatch_updated', { id: parseInt(req.params.id), warehouse_confirmed: 1 });
      res.json({ message: 'Đã xác nhận bàn giao xe. Đội cứu hộ có thể xác nhận nhận xe.' });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy bản ghi.' });
      if (err.message === 'INVALID_STATUS') return res.status(400).json({ error: "Chỉ xác nhận khi xe đang ở trạng thái 'dispatched'." });
      if (err.message === 'ALREADY_CONFIRMED') return res.status(400).json({ error: 'Xe đã được xác nhận bàn giao trước đó.' });
      next(err);
    }
  },

  async confirmVehicleDispatch(req, res, next) {
    try {
      const result = await ResourceService.confirmVehicleDispatch(parseInt(req.params.id), req.user.id);
      const io = req.app.get('io');
      if (io) {
        io.emit('vehicle_dispatch_updated', { id: parseInt(req.params.id), status: 'confirmed' });
        if (result.readyRequests.length > 0) {
          io.emit('team_ready', { team_id: result.team_id });
          for (const r of result.readyRequests) {
            io.emit('request_updated', { id: r.id, tracking_status: 'team_ready' });
          }
        }
      }
      res.json({ message: 'Đã xác nhận nhận xe.' });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy bản ghi.' });
      if (err.message === 'NOT_LEADER') return res.status(403).json({ error: 'Bạn không phải trưởng đội nhận xe này.' });
      if (err.message === 'WAREHOUSE_NOT_CONFIRMED') return res.status(400).json({ error: 'Kho chưa xác nhận bàn giao xe. Vui lòng chờ quản lý kho xác nhận.' });
      if (err.message === 'INVALID_STATUS') return res.status(400).json({ error: "Chỉ xác nhận được khi trạng thái là 'dispatched'." });
      next(err);
    }
  },

  async returnVehicleDispatch(req, res, next) {
    try {
      const result = await ResourceService.returnVehicleDispatch(parseInt(req.params.id), req.user.id);
      const io = req.app.get('io');
      if (io) io.emit('vehicle_dispatch_returned', { id: parseInt(req.params.id), vehicle_id: result.vehicle_id });
      res.json({ message: 'Đã gửi yêu cầu trả xe. Chờ coordinator xác nhận.' });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy bản ghi.' });
      if (err.message === 'NOT_LEADER') return res.status(403).json({ error: 'Bạn không phải trưởng đội.' });
      if (err.message === 'NOT_CONFIRMED') return res.status(400).json({ error: 'Chỉ trả xe sau khi đã xác nhận nhận.' });
      next(err);
    }
  },

  async confirmReturnVehicleDispatch(req, res, next) {
    try {
      const result = await ResourceService.confirmReturnVehicleDispatch(
        req.params.id, req.user.id, req.user.role
      );
      const io = req.app.get('io');
      if (io) io.emit('vehicle_dispatch_returned', { id: parseInt(req.params.id), vehicle_id: result.vehicle_id });
      res.json({ message: 'Đã xác nhận nhận lại xe. Xe trở về trạng thái sẵn sàng.' });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy bản ghi.' });
      if (err.message === 'NOT_RETURNED') return res.status(400).json({ error: 'Team chưa gửi yêu cầu trả xe.' });
      if (err.message === 'PROVINCE_SCOPE') return res.status(403).json({ error: 'Bạn không có quyền xác nhận xe này.' });
      next(err);
    }
  },

  async reportVehicleIncident(req, res, next) {
    try {
      await ResourceService.reportVehicleIncident(
        req.params.id, req.body.incident_type, req.body.incident_note, req.user.id
      );
      const io = req.app.get('io');
      if (io) io.emit('vehicle_incident_reported', { id: parseInt(req.params.id), incident_type: req.body.incident_type });
      res.json({ message: 'Đã gửi báo cáo sự cố. Kho sẽ xác nhận tình trạng thực tế.' });
    } catch (err) {
      if (err.message === 'INVALID_INCIDENT_TYPE') return res.status(400).json({ error: "Loại sự cố phải là 'damaged' hoặc 'lost'." });
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy bản ghi.' });
      if (err.message === 'NOT_LEADER') return res.status(403).json({ error: 'Bạn không phải trưởng đội.' });
      if (err.message === 'NOT_CONFIRMED') return res.status(400).json({ error: 'Chỉ báo sự cố khi đang sử dụng xe.' });
      next(err);
    }
  },

  async confirmVehicleIncident(req, res, next) {
    try {
      const result = await ResourceService.confirmVehicleIncident(
        req.params.id, req.body.confirmed_type, req.body.confirmed_note
      );
      const io = req.app.get('io');
      if (io) io.emit('vehicle_incident_confirmed', { id: parseInt(req.params.id), confirmed_type: result.confirmedType });
      const msg = result.confirmedType === 'lost'
        ? 'Đã xác nhận xe mất. Coordinator sẽ được thông báo.'
        : result.confirmedType === 'damaged'
          ? 'Đã xác nhận xe hỏng. Xe chuyển sang bảo trì.'
          : 'Đã xác nhận xe ổn, trả về available.';
      res.json({ message: msg });
    } catch (err) {
      if (err.message === 'INVALID_TYPE') return res.status(400).json({ error: 'confirmed_type phải là damaged / lost / ok.' });
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy bản ghi.' });
      if (err.message === 'NO_INCIDENT') return res.status(400).json({ error: 'Không có sự cố cần xác nhận.' });
      next(err);
    }
  },

  // ── SUPPLY TRANSFERS ──────────────────────────────────────────────────────────
  async getSupplyTransfers(req, res, next) {
    try {
      const data = await ResourceService.getSupplyTransfers(req.query, req.user);
      res.json(data);
    } catch (err) { next(err); }
  },

  async createSupplyTransfer(req, res, next) {
    try {
      const result = await ResourceService.createSupplyTransfer(req.body, req.user.id);
      const io = req.app.get('io');
      if (io) io.emit('supply_transfer_new', { id: result.id, to_warehouse_id: parseInt(req.body.to_warehouse_id) });
      res.status(201).json({ id: result.id, message: 'Đã tạo lệnh điều vật tư. Kho nguồn đã trừ.' });
    } catch (err) {
      if (err.message === 'MISSING_FIELDS') return res.status(400).json({ error: 'Thiếu: from_warehouse_id, to_warehouse_id, item_id, quantity.' });
      if (err.message === 'SAME_WAREHOUSE') return res.status(400).json({ error: 'Kho nguồn và kho đích không được trùng.' });
      if (err.message === 'NO_ITEM') return res.status(400).json({ error: 'Kho nguồn không có vật phẩm này.' });
      if (err.message === 'INSUFFICIENT') return res.status(400).json({ error: `Tồn kho nguồn không đủ. Hiện có: ${err.available}` });
      next(err);
    }
  },

  async confirmSupplyTransfer(req, res, next) {
    try {
      const result = await ResourceService.confirmSupplyTransfer(
        req.params.id, req.body.confirmed_quantity, req.user.id, req.user.role
      );
      res.json({ message: `Đã xác nhận nhận ${result.actualQty} đơn vị. Kho đích đã cộng.` });
    } catch (err) {
      if (err.message === 'INVALID_QTY') return res.status(400).json({ error: 'Số lượng thực nhận phải lớn hơn 0.' });
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy transfer.' });
      if (err.message === 'NOT_IN_TRANSIT') return res.status(400).json({ error: 'Transfer không ở trạng thái in_transit.' });
      if (err.message === 'EXCEEDS_QTY') return res.status(400).json({ error: 'Số thực nhận không vượt quá số điều.' });
      if (err.message === 'PROVINCE_SCOPE') return res.status(403).json({ error: 'Bạn không có quyền xác nhận kho này.' });
      next(err);
    }
  },

  async cancelSupplyTransfer(req, res, next) {
    try {
      await ResourceService.cancelSupplyTransfer(req.params.id);
      res.json({ message: 'Đã huỷ transfer. Kho nguồn đã hoàn lại.' });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy transfer.' });
      if (err.message === 'NOT_IN_TRANSIT') return res.status(400).json({ error: 'Chỉ huỷ được khi transfer đang in_transit.' });
      next(err);
    }
  },

  // ── VEHICLE TRANSFERS ─────────────────────────────────────────────────────────
  async getVehicleTransfers(req, res, next) {
    try {
      const data = await ResourceService.getVehicleTransfers(req.query, req.user);
      res.json(data);
    } catch (err) { next(err); }
  },

  async createVehicleTransfer(req, res, next) {
    try {
      const result = await ResourceService.createVehicleTransfer(req.body, req.user.id);
      const io = req.app.get('io');
      if (io) io.emit('vehicle_transfer_new', { id: result.id, to_province_id: result.to_province_id });
      res.status(201).json({ id: result.id, message: 'Đã tạo lệnh điều xe. Xe đang vận chuyển.' });
    } catch (err) {
      if (err.message === 'MISSING_FIELDS') return res.status(400).json({ error: 'Thiếu: vehicle_id, to_province_id.' });
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy xe.' });
      if (err.message === 'NOT_AVAILABLE') return res.status(400).json({ error: 'Xe phải ở trạng thái available.' });
      if (err.message === 'SAME_PROVINCE') return res.status(400).json({ error: 'Xe đã ở tỉnh đích rồi.' });
      next(err);
    }
  },

  async confirmVehicleTransfer(req, res, next) {
    try {
      await ResourceService.confirmVehicleTransfer(req.params.id, req.user.id, req.user.role);
      res.json({ message: 'Đã xác nhận nhận xe. Xe sẵn sàng tại tỉnh mới.' });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy transfer.' });
      if (err.message === 'NOT_IN_TRANSIT') return res.status(400).json({ error: 'Transfer không ở trạng thái in_transit.' });
      if (err.message === 'PROVINCE_SCOPE') return res.status(403).json({ error: 'Bạn không có quyền xác nhận xe cho tỉnh này.' });
      next(err);
    }
  },

  async cancelVehicleTransfer(req, res, next) {
    try {
      await ResourceService.cancelVehicleTransfer(req.params.id);
      res.json({ message: 'Đã huỷ transfer. Xe trở về tỉnh cũ.' });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy transfer.' });
      if (err.message === 'NOT_IN_TRANSIT') return res.status(400).json({ error: 'Chỉ huỷ được khi transfer đang in_transit.' });
      next(err);
    }
  },

  // ── SUPPLY REQUESTS ───────────────────────────────────────────────────────────
  async getSupplyRequests(req, res, next) {
    try {
      const data = await ResourceService.getSupplyRequests(req.user);
      res.json(data);
    } catch (err) { next(err); }
  },

  async createSupplyRequest(req, res, next) {
    try {
      const result = await ResourceService.createSupplyRequest(req.body, req.user.id);
      const io = req.app.get('io');
      if (io) io.emit('supply_request_created', { id: result.id });
      res.status(201).json({ id: result.id, message: 'Đã gửi yêu cầu bổ sung vật tư.' });
    } catch (err) {
      if (err.message === 'MISSING_FIELDS') return res.status(400).json({ error: 'Thiếu thông tin bắt buộc.' });
      next(err);
    }
  },

  async approveSupplyRequest(req, res, next) {
    try {
      await ResourceService.approveSupplyRequest(req.params.id, req.user.id, req.body.review_note);
      const io = req.app.get('io');
      if (io) io.emit('supply_request_updated', { id: parseInt(req.params.id), status: 'manager_approved' });
      res.json({ message: 'Đã duyệt. Kho hàng sẽ xác nhận nhập và cập nhật tồn kho.' });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy yêu cầu đang chờ duyệt.' });
      next(err);
    }
  },

  async rejectSupplyRequest(req, res, next) {
    try {
      await ResourceService.rejectSupplyRequest(req.params.id, req.user.id, req.body.review_note);
      const io = req.app.get('io');
      if (io) io.emit('supply_request_updated', { id: parseInt(req.params.id), status: 'rejected' });
      res.json({ message: 'Đã từ chối yêu cầu.' });
    } catch (err) {
      if (err.message === 'NOTE_REQUIRED') return res.status(400).json({ error: 'Cần nhập lý do từ chối.' });
      next(err);
    }
  },

  async warehouseConfirmSupplyRequest(req, res, next) {
    try {
      const result = await ResourceService.warehouseConfirmSupplyRequest(req.params.id);
      const io = req.app.get('io');
      if (io) io.emit('supply_request_updated', { id: parseInt(req.params.id), status: 'approved' });
      res.json({ message: `Đã xác nhận nhập kho. Tồn kho đã được cộng ${result.quantity}.` });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy yêu cầu đã được manager duyệt.' });
      next(err);
    }
  },

  // ── HISTORY ───────────────────────────────────────────────────────────────────
  async getHistory(req, res, next) {
    try {
      const data = await ResourceService.getHistory(req.query);
      res.json(data);
    } catch (err) { next(err); }
  },
};

module.exports = ResourceController;
