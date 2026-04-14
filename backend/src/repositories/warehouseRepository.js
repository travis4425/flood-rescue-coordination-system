const { query } = require('../config/database');

const WarehouseRepository = {
  async findForMap() {
    const result = await query(
      `SELECT w.id, w.name, w.address, w.latitude, w.longitude,
              w.warehouse_type, w.capacity_tons,
              p.name as province_name
       FROM warehouses w
       LEFT JOIN provinces p ON w.province_id = p.id
       WHERE w.status = 'active' AND w.latitude IS NOT NULL AND w.longitude IS NOT NULL
       ORDER BY w.warehouse_type, w.name`
    );
    return result.rows;
  },

  async findAll({ province_id, coordinator_id } = {}) {
    const params = [];
    let extraWhere = '';
    if (province_id) {
      params.push(parseInt(province_id));
      extraWhere += ` AND w.province_id = $${params.length}`;
    }
    if (coordinator_id) {
      params.push(parseInt(coordinator_id));
      extraWhere += ` AND w.coordinator_id = $${params.length}`;
    }
    const result = await query(
      `SELECT w.*, p.name as province_name, d.name as district_name,
              um.full_name as manager_name, uc.full_name as coordinator_name
       FROM warehouses w
       LEFT JOIN provinces p ON w.province_id = p.id
       LEFT JOIN districts d ON w.district_id = d.id
       LEFT JOIN users um ON w.manager_id = um.id
       LEFT JOIN users uc ON w.coordinator_id = uc.id
       WHERE w.status = 'active'${extraWhere}
       ORDER BY w.warehouse_type, w.name`,
      params
    );
    return result.rows;
  },

  async getWarehouseType(id) {
    const result = await query('SELECT warehouse_type FROM warehouses WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async create(data) {
    const result = await query(
      `INSERT INTO warehouses (name, address, province_id, district_id, latitude, longitude,
                               capacity_tons, manager_id, coordinator_id, phone, warehouse_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        data.name,
        data.address || null,
        parseInt(data.province_id),
        data.district_id ? parseInt(data.district_id) : null,
        parseFloat(data.latitude) || null,
        parseFloat(data.longitude) || null,
        parseFloat(data.capacity_tons) || 0,
        data.manager_id ? parseInt(data.manager_id) : null,
        data.coordinator_id ? parseInt(data.coordinator_id) : null,
        data.phone || null,
        data.warehouse_type || 'central'
      ]
    );
    return result.rows[0].id;
  },

  async update(id, data) {
    await query(
      `UPDATE warehouses SET name=$1, address=$2, province_id=$3,
       capacity_tons=$4, manager_id=$5, coordinator_id=$6, phone=$7
       WHERE id=$8`,
      [
        data.name,
        data.address || null,
        parseInt(data.province_id),
        parseFloat(data.capacity_tons) || 0,
        data.manager_id ? parseInt(data.manager_id) : null,
        data.coordinator_id ? parseInt(data.coordinator_id) : null,
        data.phone || null,
        id
      ]
    );
  },

  async softDelete(id) {
    await query("UPDATE warehouses SET status='inactive' WHERE id=$1", [id]);
  },

  // === INVENTORY ===
  async findInventory(warehouseId) {
    const params = [];
    let where = '';
    if (warehouseId) {
      params.push(parseInt(warehouseId));
      where = `WHERE ri.warehouse_id = $1`;
    }
    const result = await query(
      `SELECT ri.id, ri.warehouse_id, ri.item_id, ri.quantity, ri.min_threshold,
              ri.last_restocked, ri.updated_at,
              rli.name as item_name, rli.category, rli.unit,
              w.name as warehouse_name
       FROM relief_inventory ri
       JOIN relief_items rli ON ri.item_id = rli.id
       JOIN warehouses w ON ri.warehouse_id = w.id
       ${where}
       ORDER BY w.name, rli.category, rli.name`,
      params
    );
    return result.rows;
  },

  async updateInventory(id, quantity) {
    await query(
      `UPDATE relief_inventory SET quantity = $1,
       last_restocked = CASE WHEN $1 > quantity THEN NOW() ELSE last_restocked END,
       updated_at = NOW() WHERE id = $2`,
      [parseFloat(quantity), id]
    );
  },

  async getInventoryItem(warehouseId, itemId) {
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

  async addInventory(warehouseId, itemId, qty) {
    await query(
      `UPDATE relief_inventory SET quantity = quantity + $1, updated_at = NOW()
       WHERE warehouse_id = $2 AND item_id = $3`,
      [qty, warehouseId, itemId]
    );
  },

  // === RELIEF ITEMS ===
  async findReliefItems() {
    const result = await query('SELECT * FROM relief_items ORDER BY category, name');
    return result.rows;
  },

  // === COORDINATOR SCOPE CHECK ===
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
  }
};

module.exports = WarehouseRepository;
