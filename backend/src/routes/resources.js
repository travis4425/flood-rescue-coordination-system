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
      `SELECT v.*, p.name as province_name, rt.name as team_name
       FROM vehicles v
       LEFT JOIN provinces p ON v.province_id = p.id
       LEFT JOIN rescue_teams rt ON v.team_id = rt.id
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
  authorize("admin", "manager"),
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
      res
        .status(201)
        .json({
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
  authorize("admin", "manager"),
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
       FROM warehouses w
       LEFT JOIN provinces p ON w.province_id = p.id
       LEFT JOIN districts d ON w.district_id = d.id
       LEFT JOIN users um ON w.manager_id = um.id
       LEFT JOIN users uc ON w.coordinator_id = uc.id
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
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      const {
        name, address, province_id, district_id, latitude, longitude,
        capacity_tons, manager_id, coordinator_id, phone, warehouse_type,
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
          warehouse_type: warehouse_type || 'central',
        },
      );
      res.status(201).json({ id: result.recordset[0].id, message: "Thêm kho thành công." });
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
      `SELECT ri.*, rli.name as item_name, rli.category, rli.unit, w.name as warehouse_name
       FROM relief_inventory ri
       JOIN relief_items rli ON ri.item_id = rli.id
       JOIN warehouses w ON ri.warehouse_id = w.id
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
  authorize("admin", "manager"),
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

router.get(
  "/distributions",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      const { warehouse_id, request_id } = req.query;
      let where = "WHERE 1=1";
      const params = {};
      if (warehouse_id) {
        where += " AND rd.warehouse_id = @warehouse_id";
        params.warehouse_id = parseInt(warehouse_id);
      }
      if (request_id) {
        where += " AND rd.request_id = @request_id";
        params.request_id = parseInt(request_id);
      }

      const result = await query(
        `SELECT rd.*, ri.name as item_name, ri.unit as item_unit, ri.category,
              w.name as warehouse_name, u.full_name as distributed_by_name,
              rr.tracking_code, rr.citizen_name,
              rt.name as team_name
       FROM relief_distributions rd
       JOIN relief_items ri ON rd.item_id = ri.id
       JOIN warehouses w ON rd.warehouse_id = w.id
       JOIN users u ON rd.distributed_by = u.id
       LEFT JOIN rescue_requests rr ON rd.request_id = rr.id
       LEFT JOIN rescue_teams rt ON rd.team_id = rt.id
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

router.post(
  "/distributions",
  authenticate,
  authorize("admin", "manager", "coordinator"),
  async (req, res, next) => {
    try {
      const { request_id, team_id, warehouse_id, item_id, quantity, notes, distribution_type } = req.body;
      const dtype = distribution_type === 'return' ? 'return' : 'issue';
      if (!warehouse_id || !item_id || !quantity) {
        return res.status(400).json({ error: "Thiếu thông tin: warehouse_id, item_id, quantity." });
      }

      const inv = await query(
        "SELECT id, quantity FROM relief_inventory WHERE warehouse_id = @wid AND item_id = @iid",
        { wid: parseInt(warehouse_id), iid: parseInt(item_id) },
      );

      if (dtype === 'issue') {
        // Xuất kho: kiểm tra tồn
        if (inv.recordset.length === 0)
          return res.status(400).json({ error: "Kho không có vật phẩm này." });
        if (inv.recordset[0].quantity < parseFloat(quantity))
          return res.status(400).json({ error: `Tồn kho không đủ. Hiện có: ${inv.recordset[0].quantity}` });

        await query(
          "UPDATE relief_inventory SET quantity = quantity - @qty, updated_at = GETDATE() WHERE id = @id",
          { qty: parseFloat(quantity), id: inv.recordset[0].id },
        );
      } else {
        // Nhập lại hàng dư
        if (inv.recordset.length === 0) {
          // Tạo mới nếu chưa có dòng inventory
          await query(
            `INSERT INTO relief_inventory (warehouse_id, item_id, quantity, updated_at)
             VALUES (@wid, @iid, @qty, GETDATE())`,
            { wid: parseInt(warehouse_id), iid: parseInt(item_id), qty: parseFloat(quantity) },
          );
        } else {
          await query(
            "UPDATE relief_inventory SET quantity = quantity + @qty, last_restocked = GETDATE(), updated_at = GETDATE() WHERE id = @id",
            { qty: parseFloat(quantity), id: inv.recordset[0].id },
          );
        }
      }

      const result = await query(
        `INSERT INTO relief_distributions (distribution_type, request_id, team_id, warehouse_id, item_id, quantity, distributed_by, notes)
         OUTPUT INSERTED.id
         VALUES (@dtype, @request_id, @team_id, @warehouse_id, @item_id, @quantity, @user_id, @notes)`,
        {
          dtype,
          request_id: request_id ? parseInt(request_id) : null,
          team_id: team_id ? parseInt(team_id) : null,
          warehouse_id: parseInt(warehouse_id),
          item_id: parseInt(item_id),
          quantity: parseFloat(quantity),
          user_id: req.user.id,
          notes: notes || null,
        },
      );

      const msg = dtype === 'return'
        ? "Nhập lại hàng dư thành công. Tồn kho đã cộng."
        : "Ghi nhận phân phối thành công. Tồn kho đã trừ.";
      res.status(201).json({ id: result.recordset[0].id, message: msg });
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
  authorize("admin", "manager", "coordinator"),
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
  authorize("admin", "manager", "coordinator"),
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
  authorize("admin", "manager"),
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
        { id: parseInt(req.params.id), status, notes: notes || null, approved_by: req.user.id },
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
        return res.status(400).json({ error: "action phải là 'received' hoặc 'returned'." });
      }

      // Chỉ team leader được confirm
      if (req.user.role === "rescue_team" && !req.user.is_team_leader) {
        return res.status(403).json({ error: "Chỉ team leader mới có thể xác nhận." });
      }

      const vr = await query(
        "SELECT status, destination_team_id FROM vehicle_requests WHERE id = @id",
        { id: parseInt(req.params.id) },
      );
      if (!vr.recordset.length) return res.status(404).json({ error: "Không tìm thấy yêu cầu." });

      const current = vr.recordset[0].status;
      if (action === "received" && current !== "approved") {
        return res.status(400).json({ error: "Chỉ có thể xác nhận nhận xe khi trạng thái là 'approved'." });
      }
      if (action === "returned" && current !== "fulfilled") {
        return res.status(400).json({ error: "Chỉ có thể xác nhận trả xe khi trạng thái là 'fulfilled'." });
      }

      const newStatus = action === "received" ? "fulfilled" : "returned";
      const timeField = action === "received" ? "fulfilled_at" : "returned_confirmed_at";
      const byField = action === "received" ? "fulfilled_by" : "returned_by";

      await query(
        `UPDATE vehicle_requests
         SET status = @status, ${timeField} = GETDATE(), ${byField} = @user_id, updated_at = GETDATE()
         WHERE id = @id`,
        { status: newStatus, user_id: req.user.id, id: parseInt(req.params.id) },
      );

      const io = req.app.get("io");
      if (io) io.emit("vehicle_request_updated", { id: req.params.id, status: newStatus });

      res.json({ message: action === "received" ? "Xác nhận đã nhận xe." : "Xác nhận đã trả xe." });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
