const WarehouseRepository = require('../repositories/warehouseRepository');
const cache = require('../utils/cache');

const WarehouseService = {
  async getForMap() {
    const cached = cache.get('warehouses:map');
    if (cached) return cached;
    const data = await WarehouseRepository.findForMap();
    cache.set('warehouses:map', data, 300); // 5 phút
    return data;
  },

  async getAll(filters) {
    const cacheKey = `warehouses:list:${JSON.stringify(filters)}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    const data = await WarehouseRepository.findAll(filters);
    cache.set(cacheKey, data, 300);
    return data;
  },

  async create(data) {
    const id = await WarehouseRepository.create(data);
    cache.invalidate('warehouses:');
    return { id, message: 'Thêm kho thành công.' };
  },

  async update(id, data, actorUser) {
    if (actorUser.role === 'manager') {
      const wh = await WarehouseRepository.getWarehouseType(id);
      if (!wh) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
      if (wh.warehouse_type !== 'central') throw Object.assign(new Error('NOT_CENTRAL'), { status: 403 });
    }
    await WarehouseRepository.update(id, data);
    cache.invalidate('warehouses:');
  },

  async softDelete(id, actorUser) {
    if (actorUser.role === 'manager') {
      const wh = await WarehouseRepository.getWarehouseType(id);
      if (!wh) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
      if (wh.warehouse_type !== 'central') throw Object.assign(new Error('NOT_CENTRAL'), { status: 403 });
    }
    await WarehouseRepository.softDelete(id);
    cache.invalidate('warehouses:');
  },

  async getInventory(warehouseId) {
    return WarehouseRepository.findInventory(warehouseId);
  },

  async updateInventory(id, quantity) {
    await WarehouseRepository.updateInventory(id, quantity);
  },

  async getReliefItems() {
    const cached = cache.get('warehouses:relief_items');
    if (cached) return cached;
    const data = await WarehouseRepository.findReliefItems();
    cache.set('warehouses:relief_items', data, 3600);
    return data;
  }
};

module.exports = WarehouseService;
