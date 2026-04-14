const WarehouseService = require('../services/warehouseService');

const WarehouseController = {
  async getForMap(req, res, next) {
    try {
      const data = await WarehouseService.getForMap();
      res.json(data);
    } catch (err) { next(err); }
  },

  async getAll(req, res, next) {
    try {
      const data = await WarehouseService.getAll(req.query);
      res.json(data);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const result = await WarehouseService.create(req.body);
      res.status(201).json(result);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      await WarehouseService.update(parseInt(req.params.id), req.body, req.user);
      res.json({ message: 'Cập nhật kho thành công.' });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy kho.' });
      if (err.message === 'NOT_CENTRAL') return res.status(403).json({ error: 'Manager chỉ được chỉnh sửa kho tổng.' });
      next(err);
    }
  },

  async softDelete(req, res, next) {
    try {
      await WarehouseService.softDelete(parseInt(req.params.id), req.user);
      res.json({ message: 'Đã vô hiệu hóa kho.' });
    } catch (err) {
      if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy kho.' });
      if (err.message === 'NOT_CENTRAL') return res.status(403).json({ error: 'Manager chỉ được xóa kho tổng.' });
      next(err);
    }
  },

  async getInventory(req, res, next) {
    try {
      const data = await WarehouseService.getInventory(req.query.warehouse_id);
      res.json(data);
    } catch (err) { next(err); }
  },

  async updateInventory(req, res, next) {
    try {
      await WarehouseService.updateInventory(parseInt(req.params.id), req.body.quantity);
      res.json({ message: 'Cập nhật tồn kho thành công.' });
    } catch (err) { next(err); }
  },

  async getReliefItems(req, res, next) {
    try {
      const data = await WarehouseService.getReliefItems();
      res.json(data);
    } catch (err) { next(err); }
  }
};

module.exports = WarehouseController;
