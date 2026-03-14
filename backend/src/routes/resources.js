const router = require("express").Router();
const { query } = require("../config/database");
const { authenticate, authorize } = require("../middlewares/auth");

// ======== VEHICLES ========

router.get("/vehicles", authenticate, async (req, res, next) => {
  try {
    const { province_id, status, type } = req.query;
    let where = "WHERE 1=1";
    const params = {};
    if (province_id) {
      where += " AND v.province_id = @province_id";
      params.province_id = parseInt(province_id);
    }
    if (status) {
      where += " AND v.status = @status";
      params.status = status;
    }
    if (type) {
      where += " AND v.type = @type";
      params.type = type;
    }

    const result = await query(
      `SELECT v.*, p.name as province_name, rt.name as team_name,
              w.name as warehouse_name
       FROM vehicles v WITH (NOLOCK)
       LEFT JOIN provinces p WITH (NOLOCK) ON v.province_id = p.id
       LEFT JOIN rescue_teams rt WITH (NOLOCK) ON v.team_id = rt.id
       LEFT JOIN warehouses w WITH (NOLOCK) ON v.warehouse_id = w.id
       ${where} ORDER BY v.name`,
      params,
    );
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/vehicles",
  authenticate,
  authorize("admin", "manager", "warehouse_manager"),
  async (req, res, next) => {
    try {
      const { name, plate_number, type, capacity, province_id, team_id } =
        req.body;
      const result = await query(
        `INSERT INTO vehicles (name, plate_number, type, capacity, province_id, team_id)
       OUTPUT INSERTED.id VALUES (@name, @plate_number, @type, @capacity, @province_id, @team_id)`,
        {
          name,
          plate_number,
          type,
          capacity: parseInt(capacity) || 0,
          province_id: parseInt(province_id),
          team_id: team_id ? parseInt(team_id) : null,
        },
      );
      res.status(201).json({
        id: result.recordset[0].id,
        message: "Thêm phương tiện thành công.",
      });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/vehicles/:id",
  authenticate,
  authorize("admin", "manager", "warehouse_manager"),
  async (req, res, next) => {
    try {
      const { name, status, team_id, plate_number, type, capacity } = req.body;
      let setClause = "updated_at = GETDATE()";
      const params = { id: parseInt(req.params.id) };
      if (name) {
        setClause += ", name = @name";
        params.name = name;
      }
      if (status) {
        setClause += ", status = @status";
        params.status = status;
      }
      if (team_id !== undefined) {
        setClause += ", team_id = @team_id";
        params.team_id = team_id ? parseInt(team_id) : null;
      }
      if (plate_number) {
        setClause += ", plate_number = @plate_number";
        params.plate_number = plate_number;
      }
      if (type) {
        setClause += ", type = @type";
        params.type = type;
      }
      if (capacity !== undefined) {
        setClause += ", capacity = @capacity";
        params.capacity = parseInt(capacity);
      }

      await query(`UPDATE vehicles SET ${setClause} WHERE id = @id`, params);
      res.json({ message: "Cập nhật phương tiện thành công." });
    } catch (err) {
      next(err);
    }
  },
);

// ======== WAREHOUSES ========

// GET /api/resources/warehouses/map — Public, chỉ trả tọa độ + tên (cho bản đồ công khai)
router.get("/warehouses/map", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT w.id, w.name, w.address, w.latitude, w.longitude,
              w.warehouse_type, w.capacity_tons,
              p.name as province_name
       FROM warehouses w
       LEFT JOIN provinces p ON w.province_id = p.id
       WHERE w.status = 'active' AND w.latitude IS NOT NULL AND w.longitude IS NOT NULL
       ORDER BY w.warehouse_type, w.name`,
    );
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

router.get("/warehouses", authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT w.*, p.name as province_name, d.name as district_name,
              um.full_name as manager_name,
              uc.full_name as coordinator_name
       FROM warehouses w WITH (NOLOCK)
       LEFT JOIN provinces p WITH (NOLOCK) ON w.province_id = p.id
       LEFT JOIN districts d WITH (NOLOCK) ON w.district_id = d.id
       LEFT JOIN users um WITH (NOLOCK) ON w.manager_id = um.id
       LEFT JOIN users uc WITH (NOLOCK) ON w.coordinator_id = uc.id
       WHERE w.status = 'active'
       ORDER BY w.warehouse_type, w.name`,
    );
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/warehouses",
  authenticate,
  authorize("admin", "manager", "warehouse_manager"),
  async (req, res, next) => {
    try {
      const {
        name,
        address,
        province_id,
        district_id,
        latitude,
        longitude,
        capacity_tons,
        manager_id,
        coordinator_id,
        phone,
        warehouse_type,
      } = req.body;
      const result = await query(
        `INSERT INTO warehouses (name, address, province_id, district_id, latitude, longitude,
                                 capacity_tons, manager_id, coordinator_id, phone, warehouse_type)
         OUTPUT INSERTED.id
         VALUES (@name, @address, @province_id, @district_id, @lat, @lng,
                 @cap, @manager_id, @coordinator_id, @phone, @warehouse_type)`,
        {
          name,
          address: address || null,
          province_id: parseInt(province_id),
          district_id: district_id ? parseInt(district_id) : null,
          lat: parseFloat(latitude) || null,
          lng: parseFloat(longitude) || null,
          cap: parseFloat(capacity_tons) || 0,
          manager_id: manager_id ? parseInt(manager_id) : null,
          coordinator_id: coordinator_id ? parseInt(coordinator_id) : null,
          phone: phone || null,
          warehouse_type: warehouse_type || "central",
        },
      );
      res
        .status(201)
        .json({ id: result.recordset[0].id, message: "Thêm kho thành công." });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/warehouses/:id",
  authenticate,
  authorize("admin", "manager", "warehouse_manager"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      // Manager chỉ được sửa kho tổng (central)
      if (req.user.role === "manager") {
        const check = await query(
          "SELECT warehouse_type FROM warehouses WHERE id = @id",
          { id },
        );
        if (!check.recordset.length)
          return res.status(404).json({ error: "Không tìm thấy kho." });
        if (check.recordset[0].warehouse_type !== "central")
          return res
            .status(403)
            .json({ error: "Manager chỉ được chỉnh sửa kho tổng." });
      }
      const {
        name,
        address,
        province_id,
        capacity_tons,
        manager_id,
        coordinator_id,
        phone,
      } = req.body;
      await query(
        `UPDATE warehouses SET name=@name, address=@address, province_id=@province_id,
         capacity_tons=@cap, manager_id=@manager_id, coordinator_id=@coordinator_id, phone=@phone
         WHERE id=@id`,
        {
          id,
          name,
          address: address || null,
          province_id: parseInt(province_id),
          cap: parseFloat(capacity_tons) || 0,
          manager_id: manager_id ? parseInt(manager_id) : null,
          coordinator_id: coordinator_id ? parseInt(coordinator_id) : null,
          phone: phone || null,
        },
      );
      res.json({ message: "Cập nhật kho thành công." });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/warehouses/:id",
  authenticate,
  authorize("admin", "manager", "warehouse_manager"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (req.user.role === "manager") {
        const check = await query(
          "SELECT warehouse_type FROM warehouses WHERE id = @id",
          { id },
        );
        if (!check.recordset.length)
          return res.status(404).json({ error: "Không tìm thấy kho." });
        if (check.recordset[0].warehouse_type !== "central")
          return res
            .status(403)
            .json({ error: "Manager chỉ được xóa kho tổng." });
      }
      await query("UPDATE warehouses SET status='inactive' WHERE id=@id", {
        id,
      });
      res.json({ message: "Đã vô hiệu hóa kho." });
    } catch (err) {
      next(err);
    }
  },
);

// ======== INVENTORY ========

router.get("/inventory", authenticate, async (req, res, next) => {
  try {
    const { warehouse_id } = req.query;
    let where = "";
    const params = {};
    if (warehouse_id) {
      where = "WHERE ri.warehouse_id = @warehouse_id";
      params.warehouse_id = parseInt(warehouse_id);
    }

    const result = await query(
      `SELECT ri.id, ri.warehouse_id, ri.item_id, ri.quantity, ri.min_threshold,
              ri.last_restocked, ri.updated_at,
              rli.name as item_name, rli.category, rli.unit,
              w.name as warehouse_name
       FROM relief_inventory ri WITH (NOLOCK)
       JOIN relief_items rli WITH (NOLOCK) ON ri.item_id = rli.id
       JOIN warehouses w WITH (NOLOCK) ON ri.warehouse_id = w.id
       ${where}
       ORDER BY w.name, rli.category, rli.name`,
      params,
    );
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

router.put(
  "/inventory/:id",
  authenticate,
  authorize("admin", "manager", "warehouse_manager"),
  async (req, res, next) => {
    try {
      const { quantity } = req.body;
      await query(
        `UPDATE relief_inventory SET quantity = @quantity, last_restocked = CASE WHEN @quantity > quantity THEN GETDATE() ELSE last_restocked END, updated_at = GETDATE() WHERE id = @id`,
        { id: parseInt(req.params.id), quantity: parseFloat(quantity) },
      );
      res.json({ message: "Cập nhật tồn kho thành công." });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/resources/relief-items
router.get("/relief-items", authenticate, async (req, res, next) => {
  try {
    const result = await query(
      "SELECT * FROM relief_items ORDER BY category, name",
    );
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// ======== DISTRIBUTIONS (Phân phối cứu trợ) ========

// Helper: lấy distribution + kiểm tra quyền coordinator
async function getDistAndCheckScope(id, user) {
  const dist = await query(
    `SELECT rd.*, w.province_id
     FROM relief_distributions rd
     JOIN warehouses w ON rd.warehouse_id = w.id
     WHERE rd.id = @id`,
    { id },
  );
  if (!dist.recordset.length)
    return { error: "Không tìm thấy bản ghi.", status: 404 };
  const row = dist.recordset[0];
  if (user.role === "coordinator") {
    const allowed = await query(
      `SELECT 1 FROM coordinator_regions WHERE user_id = @uid AND province_id = @prov`,
      { uid: user.id, prov: row.province_id },
    );
    if (!allowed.recordset.length)
      return { error: "Bạn không có quyền thao tác kho này.", status: 403 };
  }
  return { row };
}

// GET /api/resources/distributions
// - manager: kho trong vùng mình
// - coordinator: kho trong tỉnh mình
// - rescue_team: distributions của đội mình
router.get(
  "/distributions",
  authenticate,
  authorize("manager", "warehouse_manager", "coordinator", "rescue_team"),
  async (req, res, next) => {
    try {
      const { warehouse_id, team_id, status } = req.query;
      let where = "WHERE rd.distribution_type = 'issue'";
      const params = {};
      if (warehouse_id) {
        where += " AND rd.warehouse_id = @warehouse_id";
        params.warehouse_id = parseInt(warehouse_id);
      }
      if (team_id) {
        where += " AND rd.team_id = @team_id";
        params.team_id = parseInt(team_id);
      }
      if (status) {
        where += " AND rd.status = @status";
        params.status = status;
      }

      if (req.user.role === "coordinator") {
        where += ` AND w.province_id IN (
          SELECT province_id FROM coordinator_regions WHERE user_id = @coord_uid AND province_id IS NOT NULL)`;
        params.coord_uid = req.user.id;
      } else if (req.user.role === "manager" && req.user.region_id) {
        where += ` AND w.province_id IN (SELECT id FROM provinces WHERE region_id = @region_id)`;
        params.region_id = req.user.region_id;
      } else if (req.user.role === "rescue_team") {
        // Team leader chỉ thấy distributions của đội mình
        where += ` AND rd.team_id = (SELECT id FROM rescue_teams WHERE leader_id = @uid)`;
        params.uid = req.user.id;
      }

      const result = await query(
        `SELECT rd.*, ri.name as item_name, ri.unit as item_unit, ri.category,
                w.name as warehouse_name, u.full_name as distributed_by_name,
                rt.name as team_name,
                rcb.full_name as return_confirmed_by_name
         FROM relief_distributions rd
         JOIN relief_items ri    ON rd.item_id = ri.id
         JOIN warehouses w       ON rd.warehouse_id = w.id
         JOIN users u            ON rd.distributed_by = u.id
         LEFT JOIN rescue_teams rt  ON rd.team_id = rt.id
         LEFT JOIN users rcb        ON rd.return_confirmed_by = rcb.id
         ${where}
         ORDER BY rd.created_at DESC`,
        params,
      );
      res.json(result.recordset);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/resources/distributions — Coordinator/Manager cấp phát vật tư cho team
router.post(
  "/distributions",
  authenticate,
  authorize("manager", "warehouse_manager", "coordinator"),
  async (req, res, next) => {
    try {
      const { team_id, warehouse_id, item_id, quantity, notes } = req.body;
      if (!team_id || !warehouse_id || !item_id || !quantity)
        return res.status(400).json({
          error: "Thiếu thông tin: team_id, warehouse_id, item_id, quantity.",
        });

      // Coordinator chỉ được xuất từ kho tỉnh mình
      if (req.user.role === "coordinator") {
        const allowed = await query(
          `SELECT 1 FROM coordinator_regions cr
           JOIN warehouses w ON w.province_id = cr.province_id
           WHERE cr.user_id = @uid AND w.id = @wid`,
          { uid: req.user.id, wid: parseInt(warehouse_id) },
        );
        if (!allowed.recordset.length)
          return res
            .status(403)
            .json({ error: "Bạn chỉ được xuất từ kho trong tỉnh của mình." });
      }

      const inv = await query(
        "SELECT id, quantity FROM relief_inventory WHERE warehouse_id = @wid AND item_id = @iid",
        { wid: parseInt(warehouse_id), iid: parseInt(item_id) },
      );
      if (!inv.recordset.length)
        return res.status(400).json({ error: "Kho không có vật phẩm này." });
      if (inv.recordset[0].quantity < parseFloat(quantity))
        return res.status(400).json({
          error: `Tồn kho không đủ. Hiện có: ${inv.recordset[0].quantity}`,
        });

      await query(
        "UPDATE relief_inventory SET quantity = quantity - @qty, updated_at = GETDATE() WHERE id = @id",
        { qty: parseFloat(quantity), id: inv.recordset[0].id },
      );

      const result = await query(
        `INSERT INTO relief_distributions
           (distribution_type, team_id, warehouse_id, item_id, quantity, distributed_by, notes, status)
         OUTPUT INSERTED.id
         VALUES ('issue', @team_id, @warehouse_id, @item_id, @quantity, @user_id, @notes, 'issued')`,
        {
          team_id: parseInt(team_id),
          warehouse_id: parseInt(warehouse_id),
          item_id: parseInt(item_id),
          quantity: parseFloat(quantity),
          user_id: req.user.id,
          notes: notes || null,
        },
      );

      const io = req.app.get("io");
      if (io)
        io.emit("distribution_new", {
          id: result.recordset[0].id,
          team_id: parseInt(team_id),
        });
      res.status(201).json({
        id: result.recordset[0].id,
        message: "Cấp phát thành công. Tồn kho đã trừ.",
      });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/resources/distributions/:id/confirm — Team leader xác nhận đã nhận hàng
router.put(
  "/distributions/:id/confirm",
  authenticate,
  authorize("rescue_team"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const dist = await query(
        `SELECT rd.id, rd.status, rd.team_id, rt.leader_id
         FROM relief_distributions rd
         JOIN rescue_teams rt ON rd.team_id = rt.id
         WHERE rd.id = @id`,
        { id },
      );
      if (!dist.recordset.length)
        return res.status(404).json({ error: "Không tìm thấy bản ghi." });
      const row = dist.recordset[0];
      if (row.leader_id !== req.user.id)
        return res
          .status(403)
          .json({ error: "Bạn không phải trưởng đội nhận hàng này." });
      if (row.status !== "issued")
        return res
          .status(400)
          .json({ error: "Chỉ xác nhận được khi trạng thái là 'issued'." });

      await query(
        `UPDATE relief_distributions SET status = 'confirmed', confirmed_at = GETDATE() WHERE id = @id`,
        { id },
      );
      res.json({ message: "Đã xác nhận nhận hàng." });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/resources/distributions/:id/request-return — Team leader tạo phiếu trả hàng dư
router.put(
  "/distributions/:id/request-return",
  authenticate,
  authorize("rescue_team"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const { return_quantity, return_note } = req.body;
      if (!return_quantity || parseFloat(return_quantity) <= 0)
        return res.status(400).json({ error: "Số lượng trả phải lớn hơn 0." });

      const dist = await query(
        `SELECT rd.id, rd.status, rd.quantity, rd.team_id, rt.leader_id
         FROM relief_distributions rd
         JOIN rescue_teams rt ON rd.team_id = rt.id
         WHERE rd.id = @id`,
        { id },
      );
      if (!dist.recordset.length)
        return res.status(404).json({ error: "Không tìm thấy bản ghi." });
      const row = dist.recordset[0];
      if (row.leader_id !== req.user.id)
        return res.status(403).json({ error: "Bạn không phải trưởng đội." });
      if (row.status !== "confirmed")
        return res
          .status(400)
          .json({ error: "Chỉ tạo phiếu trả sau khi đã xác nhận nhận hàng." });
      if (parseFloat(return_quantity) > row.quantity)
        return res.status(400).json({
          error: `Số lượng trả không được vượt quá số đã nhận (${row.quantity}).`,
        });

      await query(
        `UPDATE relief_distributions
         SET status = 'return_requested',
             return_quantity = @qty,
             return_note = @note,
             return_requested_at = GETDATE()
         WHERE id = @id`,
        { id, qty: parseFloat(return_quantity), note: return_note || null },
      );

      const io = req.app.get("io");
      if (io)
        io.emit("distribution_return_requested", { id, team_id: row.team_id });
      res.json({ message: "Đã tạo phiếu trả hàng. Chờ coordinator xác nhận." });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/resources/distributions/:id/confirm-return — Coordinator xác nhận nhận lại hàng dư
router.put(
  "/distributions/:id/confirm-return",
  authenticate,
  authorize("manager", "warehouse_manager", "coordinator"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const { received_quantity } = req.body;
      if (!received_quantity || parseFloat(received_quantity) <= 0)
        return res
          .status(400)
          .json({ error: "Số lượng thực nhận phải lớn hơn 0." });

      const { row, error, status } = await getDistAndCheckScope(id, req.user);
      if (error) return res.status(status).json({ error });
      if (row.status !== "return_requested")
        return res.status(400).json({ error: "Chưa có phiếu trả từ team." });
      if (parseFloat(received_quantity) > row.return_quantity)
        return res.status(400).json({
          error: `Số thực nhận không được vượt quá số team khai trả (${row.return_quantity}).`,
        });

      const actualQty = parseFloat(received_quantity);
      const newStatus =
        actualQty < row.quantity ? "partially_returned" : "returned";

      // Nhập lại kho
      const inv = await query(
        "SELECT id FROM relief_inventory WHERE warehouse_id = @wid AND item_id = @iid",
        { wid: row.warehouse_id, iid: row.item_id },
      );
      if (inv.recordset.length) {
        await query(
          "UPDATE relief_inventory SET quantity = quantity + @qty, updated_at = GETDATE() WHERE id = @id",
          { qty: actualQty, id: inv.recordset[0].id },
        );
      } else {
        await query(
          "INSERT INTO relief_inventory (warehouse_id, item_id, quantity, updated_at) VALUES (@wid, @iid, @qty, GETDATE())",
          { wid: row.warehouse_id, iid: row.item_id, qty: actualQty },
        );
      }

      await query(
        `UPDATE relief_distributions
         SET status = @status,
             received_return_qty = @qty,
             return_confirmed_at = GETDATE(),
             return_confirmed_by = @uid,
             returned_at = GETDATE()
         WHERE id = @id`,
        { id, status: newStatus, qty: actualQty, uid: req.user.id },
      );

      res.json({
        message: `Đã xác nhận nhận lại ${actualQty} đơn vị. Tồn kho đã cộng.`,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ======== VEHICLE REQUESTS (Manager xin điều phối phương tiện) ========
// Không cần biển số/tên xe - chỉ cần loại, số lượng, đích đến, nguồn gốc

router.get(
  "/vehicle-requests",
  authenticate,
  authorize("admin", "manager", "warehouse_manager", "coordinator"),
  async (req, res, next) => {
    try {
      const { status } = req.query;
      let where = "WHERE 1=1";
      const params = {};
      if (status) {
        where += " AND vr.status = @status";
        params.status = status;
      }
      // Manager chỉ thấy request của tỉnh mình
      if (req.user.role === "manager" && req.user.province_id) {
        where += " AND vr.province_id = @province_id";
        params.province_id = req.user.province_id;
      }

      const result = await query(
        `SELECT vr.*, 
              u.full_name as requested_by_name,
              rt.name as destination_team_name, rt.code as destination_team_code,
              p.name as province_name,
              approver.full_name as approved_by_name
       FROM vehicle_requests vr
       LEFT JOIN users u ON vr.requested_by = u.id
       LEFT JOIN rescue_teams rt ON vr.destination_team_id = rt.id
       LEFT JOIN provinces p ON vr.province_id = p.id
       LEFT JOIN users approver ON vr.approved_by = approver.id
       ${where}
       ORDER BY vr.created_at DESC`,
        params,
      );
      res.json(result.recordset);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/vehicle-requests",
  authenticate,
  authorize("admin", "manager", "warehouse_manager", "coordinator"),
  async (req, res, next) => {
    try {
      const {
        vehicle_type, // Loại xe: boat, truck, helicopter, car, ambulance
        quantity, // Số lượng cần
        destination_team_id, // Đội nào nhận xe
        source_type, // 'purchase' | 'borrow_local' | 'borrow_external'
        source_region, // Nếu borrow_external: mượn từ khu vực nào
        expected_date, // Ngày cần
        return_date, // Ngày trả (nếu mượn)
        notes, // Ghi chú thêm
      } = req.body;

      if (!vehicle_type || !quantity || !destination_team_id || !source_type) {
        return res.status(400).json({
          error:
            "Thiếu thông tin: vehicle_type, quantity, destination_team_id, source_type",
        });
      }

      // Lấy province_id của team đích
      const teamResult = await query(
        "SELECT province_id FROM rescue_teams WHERE id = @id",
        { id: parseInt(destination_team_id) },
      );
      const province_id =
        teamResult.recordset[0]?.province_id || req.user.province_id;

      const result = await query(
        `INSERT INTO vehicle_requests
         (vehicle_type, quantity, destination_team_id, source_type, source_region,
          expected_date, return_date, notes, province_id, requested_by, status)
       OUTPUT INSERTED.*
       VALUES (@type, @qty, @team_id, @source_type, @source_region,
               @expected_date, @return_date, @notes, @province_id, @user_id, 'pending')`,
        {
          type: vehicle_type,
          qty: parseInt(quantity),
          team_id: parseInt(destination_team_id),
          source_type,
          source_region: source_region || null,
          expected_date: expected_date || null,
          return_date: return_date || null,
          notes: notes || null,
          province_id: province_id ? parseInt(province_id) : null,
          user_id: req.user.id,
        },
      );

      // Emit realtime
      const io = req.app.get("io");
      if (io) io.emit("vehicle_request_new", result.recordset[0]);

      res.status(201).json(result.recordset[0]);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/resources/vehicle-requests/:id/status — Admin/Manager duyệt hoặc từ chối
router.put(
  "/vehicle-requests/:id/status",
  authenticate,
  authorize("admin", "manager", "warehouse_manager"),
  async (req, res, next) => {
    try {
      const { status, notes } = req.body;
      const validStatuses = ["approved", "rejected", "fulfilled", "cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Trạng thái không hợp lệ." });
      }

      await query(
        `UPDATE vehicle_requests
         SET status = @status, notes = COALESCE(@notes, notes),
             approved_by = @approved_by, updated_at = GETDATE()
         WHERE id = @id`,
        {
          id: parseInt(req.params.id),
          status,
          notes: notes || null,
          approved_by: req.user.id,
        },
      );

      const io = req.app.get("io");
      if (io) io.emit("vehicle_request_updated", { id: req.params.id, status });

      res.json({ message: `Đã cập nhật trạng thái: ${status}` });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/resources/vehicle-requests/:id/confirm — Team leader xác nhận nhận xe hoặc trả xe
// action: 'received' (đã nhận xe) | 'returned' (đã trả xe)
router.put(
  "/vehicle-requests/:id/confirm",
  authenticate,
  authorize("admin", "manager", "coordinator", "rescue_team"),
  async (req, res, next) => {
    try {
      const { action } = req.body; // 'received' | 'returned'
      if (!["received", "returned"].includes(action)) {
        return res
          .status(400)
          .json({ error: "action phải là 'received' hoặc 'returned'." });
      }

      // Chỉ team leader được confirm
      if (req.user.role === "rescue_team" && !req.user.is_team_leader) {
        return res
          .status(403)
          .json({ error: "Chỉ team leader mới có thể xác nhận." });
      }

      const vr = await query(
        "SELECT status, destination_team_id FROM vehicle_requests WHERE id = @id",
        { id: parseInt(req.params.id) },
      );
      if (!vr.recordset.length)
        return res.status(404).json({ error: "Không tìm thấy yêu cầu." });

      const current = vr.recordset[0].status;
      if (action === "received" && current !== "approved") {
        return res.status(400).json({
          error: "Chỉ có thể xác nhận nhận xe khi trạng thái là 'approved'.",
        });
      }
      if (action === "returned" && current !== "fulfilled") {
        return res.status(400).json({
          error: "Chỉ có thể xác nhận trả xe khi trạng thái là 'fulfilled'.",
        });
      }

      const newStatus = action === "received" ? "fulfilled" : "returned";
      const timeField =
        action === "received" ? "fulfilled_at" : "returned_confirmed_at";
      const byField = action === "received" ? "fulfilled_by" : "returned_by";

      await query(
        `UPDATE vehicle_requests
         SET status = @status, ${timeField} = GETDATE(), ${byField} = @user_id, updated_at = GETDATE()
         WHERE id = @id`,
        {
          status: newStatus,
          user_id: req.user.id,
          id: parseInt(req.params.id),
        },
      );

      const io = req.app.get("io");
      if (io)
        io.emit("vehicle_request_updated", {
          id: req.params.id,
          status: newStatus,
        });

      res.json({
        message:
          action === "received"
            ? "Xác nhận đã nhận xe."
            : "Xác nhận đã trả xe.",
      });
    } catch (err) {
      next(err);
    }
  },
);

// ======== VEHICLE DISPATCHES (Coordinator điều xe cho team) ========

// GET /api/resources/vehicle-dispatches
router.get(
  "/vehicle-dispatches",
  authenticate,
  authorize("manager", "warehouse_manager", "coordinator", "rescue_team"),
  async (req, res, next) => {
    try {
      const { team_id, status } = req.query;
      let where = "WHERE 1=1";
      const params = {};
      if (team_id) {
        where += " AND vd.team_id = @team_id";
        params.team_id = parseInt(team_id);
      }
      if (status) {
        where += " AND vd.status = @status";
        params.status = status;
      }

      if (req.user.role === "coordinator") {
        // Chỉ thấy xe thuộc tỉnh mình
        where += ` AND v.province_id IN (
          SELECT province_id FROM coordinator_regions WHERE user_id = @uid AND province_id IS NOT NULL)`;
        params.uid = req.user.id;
      } else if (req.user.role === "manager" && req.user.region_id) {
        where += ` AND v.province_id IN (SELECT id FROM provinces WHERE region_id = @region_id)`;
        params.region_id = req.user.region_id;
      } else if (req.user.role === "rescue_team") {
        where += ` AND vd.team_id = (SELECT id FROM rescue_teams WHERE leader_id = @uid)`;
        params.uid = req.user.id;
      }

      const result = await query(
        `SELECT vd.*,
                v.name as vehicle_name, v.plate_number, v.type as vehicle_type,
                rt.name as team_name,
                u.full_name as dispatched_by_name,
                rcb.full_name as return_confirmed_by_name
         FROM vehicle_dispatches vd
         JOIN vehicles v          ON vd.vehicle_id = v.id
         JOIN rescue_teams rt     ON vd.team_id = rt.id
         JOIN users u             ON vd.dispatched_by = u.id
         LEFT JOIN users rcb      ON vd.return_confirmed_by = rcb.id
         ${where}
         ORDER BY vd.created_at DESC`,
        params,
      );
      res.json(result.recordset);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/resources/vehicle-dispatches — Coordinator điều xe cho team
router.post(
  "/vehicle-dispatches",
  authenticate,
  authorize("manager", "warehouse_manager", "coordinator"),
  async (req, res, next) => {
    try {
      const { vehicle_id, team_id, mission_note } = req.body;
      if (!vehicle_id || !team_id)
        return res
          .status(400)
          .json({ error: "Thiếu thông tin: vehicle_id, team_id." });

      // Kiểm tra xe available
      const veh = await query(
        "SELECT id, status, province_id FROM vehicles WHERE id = @id",
        { id: parseInt(vehicle_id) },
      );
      if (!veh.recordset.length)
        return res.status(404).json({ error: "Không tìm thấy xe." });
      if (veh.recordset[0].status !== "available")
        return res
          .status(400)
          .json({ error: "Xe không ở trạng thái sẵn sàng (available)." });

      // Coordinator chỉ điều xe thuộc tỉnh mình
      if (req.user.role === "coordinator") {
        const allowed = await query(
          `SELECT 1 FROM coordinator_regions WHERE user_id = @uid AND province_id = @prov`,
          { uid: req.user.id, prov: veh.recordset[0].province_id },
        );
        if (!allowed.recordset.length)
          return res
            .status(403)
            .json({ error: "Bạn chỉ được điều xe trong tỉnh của mình." });
      }

      // Đánh dấu xe đang được sử dụng
      await query(
        "UPDATE vehicles SET status = 'in_use', updated_at = GETDATE() WHERE id = @id",
        { id: parseInt(vehicle_id) },
      );

      const result = await query(
        `INSERT INTO vehicle_dispatches (vehicle_id, team_id, dispatched_by, mission_note, status)
         OUTPUT INSERTED.id
         VALUES (@vid, @tid, @uid, @note, 'dispatched')`,
        {
          vid: parseInt(vehicle_id),
          tid: parseInt(team_id),
          uid: req.user.id,
          note: mission_note || null,
        },
      );

      const io = req.app.get("io");
      if (io)
        io.emit("vehicle_dispatch_new", {
          id: result.recordset[0].id,
          team_id: parseInt(team_id),
        });
      res.status(201).json({
        id: result.recordset[0].id,
        message: "Đã điều xe cho đội. Xe đang được sử dụng.",
      });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/resources/vehicle-dispatches/:id/confirm — Team leader xác nhận đã nhận xe
router.put(
  "/vehicle-dispatches/:id/confirm",
  authenticate,
  authorize("rescue_team"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const vd = await query(
        `SELECT vd.id, vd.status, vd.team_id, rt.leader_id
         FROM vehicle_dispatches vd
         JOIN rescue_teams rt ON vd.team_id = rt.id
         WHERE vd.id = @id`,
        { id },
      );
      if (!vd.recordset.length)
        return res.status(404).json({ error: "Không tìm thấy bản ghi." });
      const row = vd.recordset[0];
      if (row.leader_id !== req.user.id)
        return res
          .status(403)
          .json({ error: "Bạn không phải trưởng đội nhận xe này." });
      if (row.status !== "dispatched")
        return res
          .status(400)
          .json({ error: "Chỉ xác nhận được khi trạng thái là 'dispatched'." });

      await query(
        `UPDATE vehicle_dispatches SET status = 'confirmed', confirmed_at = GETDATE(), updated_at = GETDATE() WHERE id = @id`,
        { id },
      );
      res.json({ message: "Đã xác nhận nhận xe." });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/resources/vehicle-dispatches/:id/return — Team leader trả xe sau nhiệm vụ
router.put(
  "/vehicle-dispatches/:id/return",
  authenticate,
  authorize("rescue_team"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const vd = await query(
        `SELECT vd.id, vd.status, vd.team_id, vd.vehicle_id, rt.leader_id
         FROM vehicle_dispatches vd
         JOIN rescue_teams rt ON vd.team_id = rt.id
         WHERE vd.id = @id`,
        { id },
      );
      if (!vd.recordset.length)
        return res.status(404).json({ error: "Không tìm thấy bản ghi." });
      const row = vd.recordset[0];
      if (row.leader_id !== req.user.id)
        return res.status(403).json({ error: "Bạn không phải trưởng đội." });
      if (row.status !== "confirmed")
        return res
          .status(400)
          .json({ error: "Chỉ trả xe sau khi đã xác nhận nhận." });

      await query(
        `UPDATE vehicle_dispatches SET status = 'returned', returned_at = GETDATE(), updated_at = GETDATE() WHERE id = @id`,
        { id },
      );

      const io = req.app.get("io");
      if (io)
        io.emit("vehicle_dispatch_returned", {
          id,
          vehicle_id: row.vehicle_id,
        });
      res.json({ message: "Đã gửi yêu cầu trả xe. Chờ coordinator xác nhận." });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/resources/vehicle-dispatches/:id/confirm-return — Coordinator xác nhận nhận lại xe
router.put(
  "/vehicle-dispatches/:id/confirm-return",
  authenticate,
  authorize("manager", "warehouse_manager", "coordinator"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const vd = await query(
        `SELECT vd.id, vd.status, vd.vehicle_id, v.province_id
         FROM vehicle_dispatches vd
         JOIN vehicles v ON vd.vehicle_id = v.id
         WHERE vd.id = @id`,
        { id },
      );
      if (!vd.recordset.length)
        return res.status(404).json({ error: "Không tìm thấy bản ghi." });
      const row = vd.recordset[0];
      if (row.status !== "returned")
        return res.status(400).json({ error: "Team chưa gửi yêu cầu trả xe." });

      // Coordinator chỉ xác nhận xe thuộc tỉnh mình
      if (req.user.role === "coordinator") {
        const allowed = await query(
          `SELECT 1 FROM coordinator_regions WHERE user_id = @uid AND province_id = @prov`,
          { uid: req.user.id, prov: row.province_id },
        );
        if (!allowed.recordset.length)
          return res
            .status(403)
            .json({ error: "Bạn không có quyền xác nhận xe này." });
      }

      await query(
        `UPDATE vehicle_dispatches
         SET status = 'cancelled', return_confirmed_at = GETDATE(), return_confirmed_by = @uid, updated_at = GETDATE()
         WHERE id = @id`,
        { id, uid: req.user.id },
      );
      // Trả xe về available
      await query(
        "UPDATE vehicles SET status = 'available', updated_at = GETDATE() WHERE id = @id",
        { id: row.vehicle_id },
      );

      res.json({
        message: "Đã xác nhận nhận lại xe. Xe trở về trạng thái sẵn sàng.",
      });
    } catch (err) {
      next(err);
    }
  },
);

// ======== SUPPLY TRANSFERS (Manager điều vật tư liên tỉnh) ========

router.get(
  "/supply-transfers",
  authenticate,
  authorize("manager", "warehouse_manager", "coordinator"),
  async (req, res, next) => {
    try {
      const { status } = req.query;
      let where = "WHERE 1=1";
      const params = {};
      if (status) {
        where += " AND st.status = @status";
        params.status = status;
      }

      if (req.user.role === "manager" && req.user.region_id) {
        where += ` AND (
          wf.province_id IN (SELECT id FROM provinces WHERE region_id = @region_id)
          OR wt.province_id IN (SELECT id FROM provinces WHERE region_id = @region_id))`;
        params.region_id = req.user.region_id;
      } else if (req.user.role === "coordinator") {
        // Coordinator chỉ thấy transfer đến tỉnh mình
        where += ` AND wt.province_id IN (
          SELECT province_id FROM coordinator_regions WHERE user_id = @uid AND province_id IS NOT NULL)`;
        params.uid = req.user.id;
      }

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
        params,
      );
      res.json(result.recordset);
    } catch (err) {
      next(err);
    }
  },
);

// POST — Manager tạo lệnh điều vật tư, kho nguồn trừ ngay
router.post(
  "/supply-transfers",
  authenticate,
  authorize("manager", "warehouse_manager"),
  async (req, res, next) => {
    try {
      const { from_warehouse_id, to_warehouse_id, item_id, quantity, notes } =
        req.body;
      if (!from_warehouse_id || !to_warehouse_id || !item_id || !quantity)
        return res.status(400).json({
          error:
            "Thiếu: from_warehouse_id, to_warehouse_id, item_id, quantity.",
        });
      if (parseInt(from_warehouse_id) === parseInt(to_warehouse_id))
        return res
          .status(400)
          .json({ error: "Kho nguồn và kho đích không được trùng." });

      const inv = await query(
        "SELECT id, quantity FROM relief_inventory WHERE warehouse_id = @wid AND item_id = @iid",
        { wid: parseInt(from_warehouse_id), iid: parseInt(item_id) },
      );
      if (!inv.recordset.length)
        return res
          .status(400)
          .json({ error: "Kho nguồn không có vật phẩm này." });
      if (inv.recordset[0].quantity < parseFloat(quantity))
        return res.status(400).json({
          error: `Tồn kho nguồn không đủ. Hiện có: ${inv.recordset[0].quantity}`,
        });

      await query(
        "UPDATE relief_inventory SET quantity = quantity - @qty, updated_at = GETDATE() WHERE id = @id",
        { qty: parseFloat(quantity), id: inv.recordset[0].id },
      );

      const result = await query(
        `INSERT INTO supply_transfers (from_warehouse_id, to_warehouse_id, item_id, quantity, transferred_by, notes, status)
         OUTPUT INSERTED.id
         VALUES (@fwid, @twid, @iid, @qty, @uid, @notes, 'in_transit')`,
        {
          fwid: parseInt(from_warehouse_id),
          twid: parseInt(to_warehouse_id),
          iid: parseInt(item_id),
          qty: parseFloat(quantity),
          uid: req.user.id,
          notes: notes || null,
        },
      );

      const io = req.app.get("io");
      if (io)
        io.emit("supply_transfer_new", {
          id: result.recordset[0].id,
          to_warehouse_id: parseInt(to_warehouse_id),
        });
      res.status(201).json({
        id: result.recordset[0].id,
        message: "Đã tạo lệnh điều vật tư. Kho nguồn đã trừ.",
      });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /:id/confirm — Coordinator tỉnh B xác nhận nhận (nhập số thực)
router.put(
  "/supply-transfers/:id/confirm",
  authenticate,
  authorize("manager", "warehouse_manager", "coordinator"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const { confirmed_quantity } = req.body;
      if (!confirmed_quantity || parseFloat(confirmed_quantity) <= 0)
        return res
          .status(400)
          .json({ error: "Số lượng thực nhận phải lớn hơn 0." });

      const st = await query(
        `SELECT st.*, wt.province_id as to_province_id
         FROM supply_transfers st JOIN warehouses wt ON st.to_warehouse_id = wt.id
         WHERE st.id = @id`,
        { id },
      );
      if (!st.recordset.length)
        return res.status(404).json({ error: "Không tìm thấy transfer." });
      const row = st.recordset[0];
      if (row.status !== "in_transit")
        return res
          .status(400)
          .json({ error: "Transfer không ở trạng thái in_transit." });
      if (parseFloat(confirmed_quantity) > row.quantity)
        return res.status(400).json({
          error: `Số thực nhận không vượt quá số điều (${row.quantity}).`,
        });

      if (req.user.role === "coordinator") {
        const allowed = await query(
          `SELECT 1 FROM coordinator_regions WHERE user_id = @uid AND province_id = @prov`,
          { uid: req.user.id, prov: row.to_province_id },
        );
        if (!allowed.recordset.length)
          return res
            .status(403)
            .json({ error: "Bạn không có quyền xác nhận kho này." });
      }

      const actualQty = parseFloat(confirmed_quantity);
      const diff = row.quantity - actualQty;

      // Cộng kho đích
      const invDest = await query(
        "SELECT id FROM relief_inventory WHERE warehouse_id = @wid AND item_id = @iid",
        { wid: row.to_warehouse_id, iid: row.item_id },
      );
      if (invDest.recordset.length) {
        await query(
          "UPDATE relief_inventory SET quantity = quantity + @qty, last_restocked = GETDATE(), updated_at = GETDATE() WHERE id = @id",
          { qty: actualQty, id: invDest.recordset[0].id },
        );
      } else {
        await query(
          "INSERT INTO relief_inventory (warehouse_id, item_id, quantity, updated_at) VALUES (@wid, @iid, @qty, GETDATE())",
          { wid: row.to_warehouse_id, iid: row.item_id, qty: actualQty },
        );
      }

      // Hoàn lại phần chênh lệch cho kho nguồn nếu nhận thiếu
      if (diff > 0) {
        const invSrc = await query(
          "SELECT id FROM relief_inventory WHERE warehouse_id = @wid AND item_id = @iid",
          { wid: row.from_warehouse_id, iid: row.item_id },
        );
        if (invSrc.recordset.length) {
          await query(
            "UPDATE relief_inventory SET quantity = quantity + @qty, updated_at = GETDATE() WHERE id = @id",
            { qty: diff, id: invSrc.recordset[0].id },
          );
        }
      }

      await query(
        `UPDATE supply_transfers
         SET status = 'completed', confirmed_quantity = @qty, confirmed_by = @uid, confirmed_at = GETDATE(), updated_at = GETDATE()
         WHERE id = @id`,
        { id, qty: actualQty, uid: req.user.id },
      );
      res.json({
        message: `Đã xác nhận nhận ${actualQty} đơn vị. Kho đích đã cộng.`,
      });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /:id/cancel — Manager huỷ transfer, hoàn kho nguồn
router.put(
  "/supply-transfers/:id/cancel",
  authenticate,
  authorize("manager", "warehouse_manager"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const st = await query(
        "SELECT id, status, from_warehouse_id, item_id, quantity FROM supply_transfers WHERE id = @id",
        { id },
      );
      if (!st.recordset.length)
        return res.status(404).json({ error: "Không tìm thấy transfer." });
      const row = st.recordset[0];
      if (row.status !== "in_transit")
        return res
          .status(400)
          .json({ error: "Chỉ huỷ được khi transfer đang in_transit." });

      const inv = await query(
        "SELECT id FROM relief_inventory WHERE warehouse_id = @wid AND item_id = @iid",
        { wid: row.from_warehouse_id, iid: row.item_id },
      );
      if (inv.recordset.length) {
        await query(
          "UPDATE relief_inventory SET quantity = quantity + @qty, updated_at = GETDATE() WHERE id = @id",
          { qty: row.quantity, id: inv.recordset[0].id },
        );
      }
      await query(
        "UPDATE supply_transfers SET status = 'cancelled', updated_at = GETDATE() WHERE id = @id",
        { id },
      );
      res.json({ message: "Đã huỷ transfer. Kho nguồn đã hoàn lại." });
    } catch (err) {
      next(err);
    }
  },
);

// ======== VEHICLE TRANSFERS (Manager điều xe liên tỉnh) ========

router.get(
  "/vehicle-transfers",
  authenticate,
  authorize("manager", "warehouse_manager", "coordinator"),
  async (req, res, next) => {
    try {
      const { status } = req.query;
      let where = "WHERE 1=1";
      const params = {};
      if (status) {
        where += " AND vt.status = @status";
        params.status = status;
      }

      if (req.user.role === "manager" && req.user.region_id) {
        where += ` AND (
          fp.region_id = @region_id OR tp.region_id = @region_id)`;
        params.region_id = req.user.region_id;
      } else if (req.user.role === "coordinator") {
        // Coordinator thấy xe đang về tỉnh mình
        where += ` AND vt.to_province_id IN (
          SELECT province_id FROM coordinator_regions WHERE user_id = @uid AND province_id IS NOT NULL)`;
        params.uid = req.user.id;
      }

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
        params,
      );
      res.json(result.recordset);
    } catch (err) {
      next(err);
    }
  },
);

// POST — Manager tạo lệnh điều xe liên tỉnh, xe → in_transit
router.post(
  "/vehicle-transfers",
  authenticate,
  authorize("manager", "warehouse_manager"),
  async (req, res, next) => {
    try {
      const { vehicle_id, to_province_id, notes } = req.body;
      if (!vehicle_id || !to_province_id)
        return res
          .status(400)
          .json({ error: "Thiếu: vehicle_id, to_province_id." });

      const veh = await query(
        "SELECT id, status, province_id FROM vehicles WHERE id = @id",
        { id: parseInt(vehicle_id) },
      );
      if (!veh.recordset.length)
        return res.status(404).json({ error: "Không tìm thấy xe." });
      if (veh.recordset[0].status !== "available")
        return res
          .status(400)
          .json({ error: "Xe phải ở trạng thái available." });
      if (veh.recordset[0].province_id === parseInt(to_province_id))
        return res.status(400).json({ error: "Xe đã ở tỉnh đích rồi." });

      await query(
        "UPDATE vehicles SET status = 'in_transit', updated_at = GETDATE() WHERE id = @id",
        { id: parseInt(vehicle_id) },
      );

      const result = await query(
        `INSERT INTO vehicle_transfers (vehicle_id, from_province_id, to_province_id, transferred_by, notes, status)
         OUTPUT INSERTED.id
         VALUES (@vid, @fpid, @tpid, @uid, @notes, 'in_transit')`,
        {
          vid: parseInt(vehicle_id),
          fpid: veh.recordset[0].province_id,
          tpid: parseInt(to_province_id),
          uid: req.user.id,
          notes: notes || null,
        },
      );

      const io = req.app.get("io");
      if (io)
        io.emit("vehicle_transfer_new", {
          id: result.recordset[0].id,
          to_province_id: parseInt(to_province_id),
        });
      res.status(201).json({
        id: result.recordset[0].id,
        message: "Đã tạo lệnh điều xe. Xe đang vận chuyển.",
      });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /:id/confirm — Coordinator tỉnh B xác nhận nhận xe
router.put(
  "/vehicle-transfers/:id/confirm",
  authenticate,
  authorize("manager", "warehouse_manager", "coordinator"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const vt = await query(
        "SELECT id, status, vehicle_id, to_province_id FROM vehicle_transfers WHERE id = @id",
        { id },
      );
      if (!vt.recordset.length)
        return res.status(404).json({ error: "Không tìm thấy transfer." });
      const row = vt.recordset[0];
      if (row.status !== "in_transit")
        return res
          .status(400)
          .json({ error: "Transfer không ở trạng thái in_transit." });

      if (req.user.role === "coordinator") {
        const allowed = await query(
          `SELECT 1 FROM coordinator_regions WHERE user_id = @uid AND province_id = @prov`,
          { uid: req.user.id, prov: row.to_province_id },
        );
        if (!allowed.recordset.length)
          return res
            .status(403)
            .json({ error: "Bạn không có quyền xác nhận xe cho tỉnh này." });
      }

      // Cập nhật xe: available ở tỉnh mới
      await query(
        "UPDATE vehicles SET status = 'available', province_id = @prov, updated_at = GETDATE() WHERE id = @id",
        { id: row.vehicle_id, prov: row.to_province_id },
      );
      await query(
        `UPDATE vehicle_transfers SET status = 'completed', confirmed_by = @uid, confirmed_at = GETDATE(), updated_at = GETDATE() WHERE id = @id`,
        { id, uid: req.user.id },
      );
      res.json({ message: "Đã xác nhận nhận xe. Xe sẵn sàng tại tỉnh mới." });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /:id/cancel — Manager huỷ vehicle transfer, xe về available ở tỉnh cũ
router.put(
  "/vehicle-transfers/:id/cancel",
  authenticate,
  authorize("manager", "warehouse_manager"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const vt = await query(
        "SELECT id, status, vehicle_id, from_province_id FROM vehicle_transfers WHERE id = @id",
        { id },
      );
      if (!vt.recordset.length)
        return res.status(404).json({ error: "Không tìm thấy transfer." });
      const row = vt.recordset[0];
      if (row.status !== "in_transit")
        return res
          .status(400)
          .json({ error: "Chỉ huỷ được khi transfer đang in_transit." });

      await query(
        "UPDATE vehicles SET status = 'available', province_id = @prov, updated_at = GETDATE() WHERE id = @id",
        { id: row.vehicle_id, prov: row.from_province_id },
      );
      await query(
        "UPDATE vehicle_transfers SET status = 'cancelled', updated_at = GETDATE() WHERE id = @id",
        { id },
      );
      res.json({ message: "Đã huỷ transfer. Xe trở về tỉnh cũ." });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
