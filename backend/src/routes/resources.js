const router = require("express").Router();
const { query } = require("../config/database");
const { authenticate, authorize } = require("../middlewares/auth");
const crypto = require("crypto");

function genVoucherCode() {
  return "VT-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

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
      `SELECT v.*, p.name as province_name,
              COALESCE(rt.name, dispatch_team.name) as team_name,
              w.name as warehouse_name
       FROM vehicles v WITH (NOLOCK)
       LEFT JOIN provinces p WITH (NOLOCK) ON v.province_id = p.id
       LEFT JOIN rescue_teams rt WITH (NOLOCK) ON v.team_id = rt.id
       LEFT JOIN warehouses w WITH (NOLOCK) ON v.warehouse_id = w.id
       LEFT JOIN (
         SELECT vd.vehicle_id, rt2.name
         FROM vehicle_dispatches vd
         JOIN rescue_teams rt2 ON vd.team_id = rt2.id
         WHERE vd.status IN ('dispatched', 'confirmed')
           AND vd.id = (SELECT TOP 1 id FROM vehicle_dispatches vd2
                        WHERE vd2.vehicle_id = vd.vehicle_id
                          AND vd2.status IN ('dispatched','confirmed')
                        ORDER BY vd2.created_at DESC)
       ) dispatch_team ON dispatch_team.vehicle_id = v.id
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
    const { province_id, coordinator_id } = req.query;
    const params = {};
    let extraWhere = "";
    if (province_id) {
      extraWhere += " AND w.province_id = @province_id";
      params.province_id = parseInt(province_id);
    }
    if (coordinator_id) {
      extraWhere += " AND w.coordinator_id = @coordinator_id";
      params.coordinator_id = parseInt(coordinator_id);
    }
    const result = await query(
      `SELECT w.*, p.name as province_name, d.name as district_name,
              um.full_name as manager_name,
              uc.full_name as coordinator_name
       FROM warehouses w WITH (NOLOCK)
       LEFT JOIN provinces p WITH (NOLOCK) ON w.province_id = p.id
       LEFT JOIN districts d WITH (NOLOCK) ON w.district_id = d.id
       LEFT JOIN users um WITH (NOLOCK) ON w.manager_id = um.id
       LEFT JOIN users uc WITH (NOLOCK) ON w.coordinator_id = uc.id
       WHERE w.status = 'active'${extraWhere}
       ORDER BY w.warehouse_type, w.name`,
      params,
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
      } else if (req.user.role === "rescue_team") {
        // Team leader chỉ thấy distributions của đội mình
        where += ` AND rd.team_id = (SELECT id FROM rescue_teams WHERE leader_id = @uid)`;
        params.uid = req.user.id;
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

        // Coordinator chỉ được cấp phát cho team trong tỉnh mình
        const teamCheck = await query(
          `SELECT 1 FROM rescue_teams rt
           JOIN coordinator_regions cr ON rt.province_id = cr.province_id
           WHERE rt.id = @tid AND cr.user_id = @uid`,
          { tid: parseInt(team_id), uid: req.user.id },
        );
        if (!teamCheck.recordset.length)
          return res
            .status(403)
            .json({ error: "Bạn chỉ được cấp phát cho đội trong tỉnh của mình." });
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

      const voucher = genVoucherCode();

      const result = await query(
        `INSERT INTO relief_distributions
           (distribution_type, team_id, warehouse_id, item_id, quantity, distributed_by, notes, status, voucher_code)
         OUTPUT INSERTED.id
         VALUES ('issue', @team_id, @warehouse_id, @item_id, @quantity, @user_id, @notes, 'issued', @voucher)`,
        {
          team_id: parseInt(team_id),
          warehouse_id: parseInt(warehouse_id),
          item_id: parseInt(item_id),
          quantity: parseFloat(quantity),
          user_id: req.user.id,
          notes: notes || null,
          voucher,
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
        voucher_code: voucher,
        message: "Cấp phát thành công. Tồn kho đã trừ.",
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/resources/distributions/batch — Cấp phát nhiều vật tư 1 lần (1 phiếu chung)
router.post(
  "/distributions/batch",
  authenticate,
  authorize("manager", "warehouse_manager", "coordinator"),
  async (req, res, next) => {
    try {
      const { team_id, warehouse_id, notes, items, task_id } = req.body;
      if (!team_id || !warehouse_id || !Array.isArray(items) || items.length === 0)
        return res.status(400).json({ error: "Thiếu thông tin: team_id, warehouse_id, items." });

      // Coordinator chỉ được xuất từ kho tỉnh mình
      if (req.user.role === "coordinator") {
        const allowed = await query(
          `SELECT 1 FROM coordinator_regions cr
           JOIN warehouses w ON w.province_id = cr.province_id
           WHERE cr.user_id = @uid AND w.id = @wid`,
          { uid: req.user.id, wid: parseInt(warehouse_id) },
        );
        if (!allowed.recordset.length)
          return res.status(403).json({ error: "Bạn chỉ được xuất từ kho trong tỉnh của mình." });

        // Coordinator chỉ được cấp phát cho team trong tỉnh mình
        const teamCheck = await query(
          `SELECT 1 FROM rescue_teams rt
           JOIN coordinator_regions cr ON rt.province_id = cr.province_id
           WHERE rt.id = @tid AND cr.user_id = @uid`,
          { tid: parseInt(team_id), uid: req.user.id },
        );
        if (!teamCheck.recordset.length)
          return res.status(403).json({ error: "Bạn chỉ được cấp phát cho đội trong tỉnh của mình." });
      }

      // Kiểm tra tồn kho đủ cho tất cả items trước khi trừ
      for (const item of items) {
        const inv = await query(
          "SELECT quantity FROM relief_inventory WHERE warehouse_id = @wid AND item_id = @iid",
          { wid: parseInt(warehouse_id), iid: parseInt(item.item_id) },
        );
        if (!inv.recordset.length)
          return res.status(400).json({ error: `Kho không có vật phẩm ID ${item.item_id}.` });
        if (inv.recordset[0].quantity < parseFloat(item.quantity))
          return res.status(400).json({
            error: `Tồn kho không đủ cho vật phẩm ID ${item.item_id}. Hiện có: ${inv.recordset[0].quantity}.`,
          });
      }

      // Tạo batch
      const voucher = genVoucherCode();
      const batchResult = await query(
        `INSERT INTO distribution_batches (voucher_code, team_id, warehouse_id, distributed_by, notes, task_id)
         OUTPUT INSERTED.id
         VALUES (@voucher, @team_id, @warehouse_id, @user_id, @notes, @task_id)`,
        {
          voucher,
          team_id: parseInt(team_id),
          warehouse_id: parseInt(warehouse_id),
          user_id: req.user.id,
          notes: notes || null,
          task_id: task_id ? parseInt(task_id) : null,
        },
      );
      const batchId = batchResult.recordset[0].id;

      // Trừ kho + tạo từng dòng distribution
      const distributionIds = [];
      for (const item of items) {
        const qty = parseFloat(item.quantity);
        await query(
          "UPDATE relief_inventory SET quantity = quantity - @qty, updated_at = GETDATE() WHERE warehouse_id = @wid AND item_id = @iid",
          { qty, wid: parseInt(warehouse_id), iid: parseInt(item.item_id) },
        );
        const distResult = await query(
          `INSERT INTO relief_distributions
             (distribution_type, team_id, warehouse_id, item_id, quantity, distributed_by, notes, status, voucher_code, batch_id)
           OUTPUT INSERTED.id
           VALUES ('issue', @team_id, @warehouse_id, @item_id, @qty, @user_id, @notes, 'issued', @voucher, @batch_id)`,
          {
            team_id: parseInt(team_id),
            warehouse_id: parseInt(warehouse_id),
            item_id: parseInt(item.item_id),
            qty,
            user_id: req.user.id,
            notes: notes || null,
            voucher,
            batch_id: batchId,
          },
        );
        distributionIds.push(distResult.recordset[0].id);
      }

      const io = req.app.get("io");
      if (io) io.emit("distribution_new", { batch_id: batchId, team_id: parseInt(team_id) });

      res.status(201).json({
        batch_id: batchId,
        voucher_code: voucher,
        distribution_ids: distributionIds,
        message: `Cấp phát ${items.length} loại vật tư thành công.`,
      });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/resources/distributions/:id/cancel — Coordinator/manager huỷ cấp phát (chưa có kho xác nhận)
router.put(
  "/distributions/:id/cancel",
  authenticate,
  authorize("manager", "warehouse_manager", "coordinator"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const dist = await query(
        `SELECT id, status, warehouse_confirmed, item_id, quantity, warehouse_id
         FROM relief_distributions WHERE id = @id`,
        { id },
      );
      if (!dist.recordset.length)
        return res.status(404).json({ error: "Không tìm thấy bản ghi." });
      const row = dist.recordset[0];
      if (row.status !== "issued")
        return res.status(400).json({ error: "Chỉ hoàn tác khi chưa đội xác nhận nhận." });
      if (row.warehouse_confirmed)
        return res.status(400).json({ error: "Kho đã xác nhận bàn giao, không thể hoàn tác." });

      await query(
        `UPDATE relief_distributions SET status = 'cancelled' WHERE id = @id`,
        { id },
      );
      // Hoàn lại tồn kho
      await query(
        `UPDATE relief_inventory SET quantity = quantity + @qty, updated_at = GETDATE()
         WHERE warehouse_id = @wid AND item_id = @iid`,
        { qty: row.quantity, wid: row.warehouse_id, iid: row.item_id },
      );
      res.json({ message: "Đã hoàn tác cấp phát. Tồn kho đã được cộng lại." });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/resources/distributions/batch/:batchId/cancel — Huỷ phiếu cấp phát theo lô
router.put(
  "/distributions/batch/:batchId/cancel",
  authenticate,
  authorize("manager", "warehouse_manager", "coordinator"),
  async (req, res, next) => {
    try {
      const batchId = parseInt(req.params.batchId);
      const items = await query(
        `SELECT id, status, warehouse_confirmed, item_id, quantity, warehouse_id
         FROM relief_distributions WHERE batch_id = @batchId`,
        { batchId },
      );
      if (!items.recordset.length)
        return res.status(404).json({ error: "Không tìm thấy phiếu." });
      const anyConfirmed = items.recordset.some((r) => r.status !== "issued" || r.warehouse_confirmed);
      if (anyConfirmed)
        return res.status(400).json({ error: "Phiếu đã được xác nhận bàn giao, không thể hoàn tác." });

      await query(
        `UPDATE relief_distributions SET status = 'cancelled' WHERE batch_id = @batchId`,
        { batchId },
      );
      for (const row of items.recordset) {
        await query(
          `UPDATE relief_inventory SET quantity = quantity + @qty, updated_at = GETDATE()
           WHERE warehouse_id = @wid AND item_id = @iid`,
          { qty: row.quantity, wid: row.warehouse_id, iid: row.item_id },
        );
      }
      res.json({ message: "Đã hoàn tác phiếu cấp phát. Tồn kho đã được cộng lại." });
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
        `SELECT rd.id, rd.status, rd.team_id, rd.warehouse_confirmed, rt.leader_id
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
      if (!row.warehouse_confirmed)
        return res
          .status(400)
          .json({
            error:
              "Kho chưa xác nhận bàn giao. Vui lòng chờ kho xác nhận trước.",
          });

      await query(
        `UPDATE relief_distributions SET status = 'confirmed', confirmed_at = GETDATE() WHERE id = @id`,
        { id },
      );

      // Check nếu team đã nhận đủ tất cả vật tư cho task này
      const batchInfo = await query(
        `SELECT db.task_id FROM distribution_batches db
         JOIN relief_distributions rd ON rd.batch_id = db.id
         WHERE rd.id = @id`,
        { id },
      );
      const taskId = batchInfo.recordset[0]?.task_id;

      let pending;
      if (taskId) {
        pending = await query(
          `SELECT COUNT(*) as cnt FROM relief_distributions rd
           JOIN distribution_batches db ON rd.batch_id = db.id
           WHERE db.task_id = @task_id AND rd.status = 'issued' AND rd.distribution_type = 'issue'`,
          { task_id: taskId },
        );
      } else {
        pending = await query(
          `SELECT COUNT(*) as cnt FROM relief_distributions
           WHERE team_id = @team_id AND status = 'issued' AND distribution_type = 'issue'`,
          { team_id: row.team_id },
        );
      }
      if (pending.recordset[0].cnt === 0) {
        // Also check pending vehicle dispatches for this task before setting team_ready
        let pendingVehicles = { recordset: [{ cnt: 0 }] };
        if (taskId) {
          pendingVehicles = await query(
            `SELECT COUNT(*) as cnt FROM vehicle_dispatches WHERE task_id = @task_id AND status = 'dispatched'`,
            { task_id: taskId },
          );
        }
        if (pendingVehicles.recordset[0].cnt === 0) {
          const teamReadyResult = await query(
            `UPDATE rescue_requests
             SET tracking_status = 'team_ready', updated_at = GETDATE()
             OUTPUT INSERTED.id
             WHERE assigned_team_id = @team_id AND status = 'assigned' AND tracking_status = 'assigned'`,
            { team_id: row.team_id },
          );
          const io = req.app.get("io");
          if (io) {
            io.emit("team_ready", { team_id: row.team_id });
            for (const r of teamReadyResult.recordset) {
              io.emit("request_updated", { id: r.id, tracking_status: "team_ready" });
            }
          }
        }
      }

      res.json({ message: "Đã xác nhận nhận hàng." });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/resources/distributions/:id/warehouse-confirm — Kho xác nhận đã bàn giao hàng cho team
router.put(
  "/distributions/:id/warehouse-confirm",
  authenticate,
  authorize("manager", "warehouse_manager"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const dist = await query(
        `SELECT rd.id, rd.status, rd.warehouse_confirmed, rd.warehouse_id
         FROM relief_distributions rd
         WHERE rd.id = @id`,
        { id },
      );
      if (!dist.recordset.length)
        return res.status(404).json({ error: "Không tìm thấy bản ghi." });
      const row = dist.recordset[0];
      if (row.status !== "issued")
        return res
          .status(400)
          .json({ error: "Chỉ xác nhận bàn giao khi trạng thái là 'issued'." });
      if (row.warehouse_confirmed)
        return res
          .status(400)
          .json({ error: "Phiếu này đã được xác nhận bàn giao rồi." });

      await query(
        `UPDATE relief_distributions
         SET warehouse_confirmed = 1,
             warehouse_confirmed_at = GETDATE(),
             warehouse_confirmed_by = @by
         WHERE id = @id`,
        { id, by: req.user.id },
      );

      const io = req.app.get("io");
      if (io) io.emit("distribution_warehouse_confirmed", { id });

      res.json({
        message: "Đã xác nhận bàn giao. Team có thể xác nhận nhận hàng.",
      });
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

      // Block return if team still has active (non-completed) missions
      const activeMissions = await query(
        `SELECT COUNT(*) as cnt FROM missions
         WHERE team_id = @team_id AND status NOT IN ('completed','aborted','failed')`,
        { team_id: row.team_id },
      );
      if (activeMissions.recordset[0].cnt > 0)
        return res.status(400).json({
          error: "Không thể trả hàng khi đội vẫn còn nhiệm vụ đang thực hiện.",
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

// PUT /api/resources/distributions/:id/confirm-return — Kho xác nhận nhận lại hàng dư
router.put(
  "/distributions/:id/confirm-return",
  authenticate,
  authorize("manager", "warehouse_manager"),
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

      const io = req.app.get("io");
      if (io) io.emit("distribution_return_confirmed", { id, status: newStatus });

      res.json({
        message: `Đã xác nhận nhận lại ${actualQty} đơn vị. Tồn kho đã cộng.`,
        status: newStatus,
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
      if (req.user.role === "coordinator") {
        where += " AND vr.requested_by = @uid";
        params.uid = req.user.id;
      }
      // warehouse_manager và manager thấy tất cả request

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
       LEFT JOIN warehouses w ON w.id = (SELECT TOP 1 id FROM warehouses WHERE coordinator_id = vr.requested_by ORDER BY id)
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
  authorize("admin", "coordinator"),
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

      if (!vehicle_type || !quantity || !source_type) {
        return res.status(400).json({
          error: "Thiếu thông tin: vehicle_type, quantity, source_type",
        });
      }

      // Lấy province_id: ưu tiên từ team đích, fallback về user → kho được gán
      let province_id = req.user.province_id;
      if (!province_id) {
        const wRes = await query(
          "SELECT province_id FROM warehouses WHERE coordinator_id = @uid",
          { uid: req.user.id }
        );
        province_id = wRes.recordset[0]?.province_id;
      }
      if (!province_id) {
        return res.status(400).json({ error: "Tài khoản của bạn chưa được gán kho. Liên hệ quản trị viên." });
      }
      if (destination_team_id) {
        const teamResult = await query(
          "SELECT province_id FROM rescue_teams WHERE id = @id",
          { id: parseInt(destination_team_id) },
        );
        province_id = teamResult.recordset[0]?.province_id || province_id;
      }

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
          team_id: destination_team_id ? parseInt(destination_team_id) : null,
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
      const validStatuses = ["manager_approved", "approved", "rejected", "fulfilled", "cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Trạng thái không hợp lệ." });
      }

      // Manager chỉ được set manager_approved hoặc rejected
      if (req.user.role === "manager" && !["manager_approved", "rejected"].includes(status)) {
        return res.status(403).json({ error: "Manager chỉ được duyệt hoặc từ chối." });
      }
      // Warehouse manager chỉ được set approved
      if (req.user.role === "warehouse_manager" && status !== "approved") {
        return res.status(403).json({ error: "Kiểm kho chỉ được xác nhận nhập kho." });
      }

      const reqId = parseInt(req.params.id);

      await query(
        `UPDATE vehicle_requests
         SET status = @status, notes = COALESCE(@notes, notes),
             approved_by = @approved_by, updated_at = GETDATE()
         WHERE id = @id`,
        { id: reqId, status, notes: notes || null, approved_by: req.user.id },
      );

      // Kho duyệt → tự động tạo xe vào kho của coordinator gửi request
      if (status === "approved" && req.user.role === "warehouse_manager") {
        const vrRes = await query(
          `SELECT vr.vehicle_type, vr.quantity, vr.province_id, vr.requested_by
           FROM vehicle_requests vr WHERE vr.id = @id`,
          { id: reqId },
        );
        const vr = vrRes.recordset[0];
        if (vr) {
          // Tìm kho của coordinator đã gửi request
          const warehouseRes = await query(
            "SELECT id, province_id FROM warehouses WHERE coordinator_id = @uid",
            { uid: vr.requested_by },
          );
          const warehouse = warehouseRes.recordset[0];
          const provinceId = warehouse?.province_id || vr.province_id || null;

          const VN_LABELS = {
            boat: 'Xuồng/Tàu', truck: 'Xe tải', car: 'Xe con',
            helicopter: 'Trực thăng', ambulance: 'Xe cứu thương',
          };
          const DEFAULT_CAPACITY = {
            boat: 8, truck: 20, car: 4, helicopter: 6, ambulance: 4, other: 5,
          };
          const typeName = VN_LABELS[vr.vehicle_type] || vr.vehicle_type;
          const capacity = DEFAULT_CAPACITY[vr.vehicle_type] || 4;

          for (let i = 0; i < vr.quantity; i++) {
            const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
            await query(
              `INSERT INTO vehicles (name, type, plate_number, capacity, province_id, warehouse_id, status)
               VALUES (@name, @type, @plate, @capacity, @province_id, @warehouse_id, 'available')`,
              {
                name: typeName,
                type: vr.vehicle_type,
                plate: `YC${reqId}-${suffix}`,
                capacity,
                province_id: provinceId,
                warehouse_id: warehouse?.id || null,
              },
            );
          }
        }
      }

      const io = req.app.get("io");
      if (io) io.emit("vehicle_request_updated", { id: req.params.id, status });

      const msg = status === "approved" && req.user.role === "warehouse_manager"
        ? "Đã duyệt. Xe đã được thêm vào kho."
        : `Đã cập nhật trạng thái: ${status}`;
      res.json({ message: msg });
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
      } else if (req.user.role === "rescue_team") {
        where += ` AND vd.team_id = (SELECT id FROM rescue_teams WHERE leader_id = @uid)`;
        params.uid = req.user.id;
      }

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
      const { vehicle_id, team_id, mission_note, task_id } = req.body;
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
        `INSERT INTO vehicle_dispatches (vehicle_id, team_id, dispatched_by, mission_note, status, task_id)
         OUTPUT INSERTED.id
         VALUES (@vid, @tid, @uid, @note, 'dispatched', @task_id)`,
        {
          vid: parseInt(vehicle_id),
          tid: parseInt(team_id),
          uid: req.user.id,
          note: mission_note || null,
          task_id: task_id ? parseInt(task_id) : null,
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

// PUT /api/resources/vehicle-dispatches/:id/reassign — Gán xe đang dùng sang task khác (cùng team)
// Dùng khi đội cứu hộ dùng xe liên tiếp nhiều task mà không cần trả-rồi-mượn lại
router.put(
  "/vehicle-dispatches/:id/reassign",
  authenticate,
  authorize("coordinator", "manager"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const { task_id, mission_note } = req.body;

      if (!task_id)
        return res.status(400).json({ error: "Thiếu task_id mới cần gán." });

      // Lấy thông tin dispatch hiện tại
      const vd = await query(
        `SELECT vd.id, vd.status, vd.team_id, vd.vehicle_id, vd.task_id as current_task_id,
                v.province_id
         FROM vehicle_dispatches vd
         JOIN vehicles v ON vd.vehicle_id = v.id
         WHERE vd.id = @id`,
        { id },
      );
      if (!vd.recordset.length)
        return res.status(404).json({ error: "Không tìm thấy điều xe." });

      const dispatch = vd.recordset[0];

      // Chỉ cho phép reassign khi xe đang được xác nhận (đội đã nhận xe)
      if (!["confirmed", "dispatched"].includes(dispatch.status))
        return res.status(400).json({
          error: "Chỉ có thể gán lại xe khi đội đang giữ xe (đã xác nhận hoặc đang điều).",
        });

      // Kiểm tra task_id mới có thuộc cùng team không
      const taskCheck = await query(
        `SELECT id FROM task_groups WHERE id = @task_id AND team_id = @team_id`,
        { task_id: parseInt(task_id), team_id: dispatch.team_id },
      );
      if (!taskCheck.recordset.length) {
        // Cũng check trong task_group_teams (multi-team task)
        const taskCheck2 = await query(
          `SELECT 1 FROM task_group_teams WHERE task_group_id = @task_id AND team_id = @team_id`,
          { task_id: parseInt(task_id), team_id: dispatch.team_id },
        );
        if (!taskCheck2.recordset.length)
          return res.status(400).json({
            error: "Task mới không thuộc đội này.",
          });
      }

      // Cập nhật task_id và ghi chú (nếu có)
      await query(
        `UPDATE vehicle_dispatches
         SET task_id = @task_id,
             mission_note = COALESCE(@note, mission_note),
             updated_at = GETDATE()
         WHERE id = @id`,
        { task_id: parseInt(task_id), note: mission_note || null, id },
      );

      // Cập nhật team_ready cho task mới nếu tất cả điều kiện đã đủ
      const pendingSupplies = await query(
        `SELECT COUNT(*) as cnt FROM distribution_batches
         WHERE task_id = @task_id AND status = 'issued'`,
        { task_id: parseInt(task_id) },
      );
      const io = req.app.get("io");
      if (pendingSupplies.recordset[0].cnt === 0) {
        const teamReadyResult = await query(
          `UPDATE rescue_requests
           SET tracking_status = 'team_ready', updated_at = GETDATE()
           OUTPUT INSERTED.id
           WHERE assigned_team_id = @team_id
             AND status = 'assigned'
             AND tracking_status = 'assigned'`,
          { team_id: dispatch.team_id },
        );
        if (io) {
          for (const r of teamReadyResult.recordset) {
            io.emit("request_updated", { id: r.id, tracking_status: "team_ready" });
          }
        }
      }

      if (io) io.emit("vehicle_dispatch_reassigned", { id, new_task_id: parseInt(task_id) });

      res.json({ message: "Đã gán lại xe sang task mới thành công." });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/resources/vehicle-dispatches/:id/cancel — Huỷ điều xe (chưa có kho xác nhận bàn giao)
router.put(
  "/vehicle-dispatches/:id/cancel",
  authenticate,
  authorize("manager", "warehouse_manager", "coordinator"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const vd = await query(
        `SELECT id, status, warehouse_confirmed, vehicle_id FROM vehicle_dispatches WHERE id = @id`,
        { id },
      );
      if (!vd.recordset.length)
        return res.status(404).json({ error: "Không tìm thấy phiếu điều xe." });
      const row = vd.recordset[0];
      if (row.status !== "dispatched")
        return res.status(400).json({ error: "Chỉ hoàn tác khi xe chưa được đội xác nhận nhận." });
      if (row.warehouse_confirmed)
        return res.status(400).json({ error: "Kho đã xác nhận bàn giao, không thể hoàn tác." });

      await query(
        `UPDATE vehicle_dispatches SET status = 'cancelled', updated_at = GETDATE() WHERE id = @id`,
        { id },
      );
      // Trả xe về available
      await query(
        `UPDATE vehicles SET status = 'available', updated_at = GETDATE() WHERE id = @vid`,
        { vid: row.vehicle_id },
      );
      res.json({ message: "Đã hoàn tác điều xe. Xe đã được trả về trạng thái sẵn sàng." });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/resources/vehicle-dispatches/:id/warehouse-confirm — Kho xác nhận đã bàn giao xe
router.put(
  "/vehicle-dispatches/:id/warehouse-confirm",
  authenticate,
  authorize("manager", "warehouse_manager"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const vd = await query(
        `SELECT id, status, warehouse_confirmed FROM vehicle_dispatches WHERE id = @id`,
        { id },
      );
      if (!vd.recordset.length)
        return res.status(404).json({ error: "Không tìm thấy bản ghi." });
      const row = vd.recordset[0];
      if (row.status !== "dispatched")
        return res
          .status(400)
          .json({
            error: "Chỉ xác nhận khi xe đang ở trạng thái 'dispatched'.",
          });
      if (row.warehouse_confirmed)
        return res
          .status(400)
          .json({ error: "Xe đã được xác nhận bàn giao trước đó." });

      await query(
        `UPDATE vehicle_dispatches SET warehouse_confirmed = 1, warehouse_confirmed_at = GETDATE(),
         warehouse_confirmed_by = @uid, updated_at = GETDATE() WHERE id = @id`,
        { id, uid: req.user.id },
      );
      const ioWC = req.app.get("io");
      if (ioWC) ioWC.emit("vehicle_dispatch_updated", { id, warehouse_confirmed: 1 });
      res.json({
        message: "Đã xác nhận bàn giao xe. Đội cứu hộ có thể xác nhận nhận xe.",
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
        `SELECT vd.id, vd.status, vd.warehouse_confirmed, vd.team_id, rt.leader_id
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
      if (!row.warehouse_confirmed)
        return res
          .status(400)
          .json({
            error:
              "Kho chưa xác nhận bàn giao xe. Vui lòng chờ quản lý kho xác nhận.",
          });
      if (row.status !== "dispatched")
        return res
          .status(400)
          .json({ error: "Chỉ xác nhận được khi trạng thái là 'dispatched'." });

      await query(
        `UPDATE vehicle_dispatches SET status = 'confirmed', confirmed_at = GETDATE(), updated_at = GETDATE() WHERE id = @id`,
        { id },
      );
      const ioTC = req.app.get("io");
      if (ioTC) ioTC.emit("vehicle_dispatch_updated", { id, status: "confirmed" });

      // Check if all supplies AND vehicles for this task are confirmed → set team_ready
      const vdTaskInfo = await query(
        `SELECT task_id FROM vehicle_dispatches WHERE id = @id`,
        { id },
      );
      const vdTaskId = vdTaskInfo.recordset[0]?.task_id;
      if (vdTaskId) {
        const pendingSupplies = await query(
          `SELECT COUNT(*) as cnt FROM relief_distributions rd
           JOIN distribution_batches db ON rd.batch_id = db.id
           WHERE db.task_id = @task_id AND rd.status = 'issued' AND rd.distribution_type = 'issue'`,
          { task_id: vdTaskId },
        );
        const pendingVehicles = await query(
          `SELECT COUNT(*) as cnt FROM vehicle_dispatches WHERE task_id = @task_id AND status = 'dispatched'`,
          { task_id: vdTaskId },
        );
        if (pendingSupplies.recordset[0].cnt === 0 && pendingVehicles.recordset[0].cnt === 0) {
          const teamReadyResult = await query(
            `UPDATE rescue_requests
             SET tracking_status = 'team_ready', updated_at = GETDATE()
             OUTPUT INSERTED.id
             WHERE assigned_team_id = @team_id AND status = 'assigned' AND tracking_status = 'assigned'`,
            { team_id: row.team_id },
          );
          const io = req.app.get("io");
          if (io) {
            io.emit("team_ready", { team_id: row.team_id });
            for (const r of teamReadyResult.recordset) {
              io.emit("request_updated", { id: r.id, tracking_status: "team_ready" });
            }
          }
        }
      }

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

// PUT /api/resources/vehicle-dispatches/:id/confirm-return — Kho xác nhận nhận lại xe
router.put(
  "/vehicle-dispatches/:id/confirm-return",
  authenticate,
  authorize("manager", "warehouse_manager"),
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

      const io = req.app.get("io");
      if (io) io.emit("vehicle_dispatch_returned", { id, vehicle_id: row.vehicle_id });

      res.json({
        message: "Đã xác nhận nhận lại xe. Xe trở về trạng thái sẵn sàng.",
      });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/resources/vehicle-dispatches/:id/report-incident — Team leader báo hỏng/mất xe
router.put(
  "/vehicle-dispatches/:id/report-incident",
  authenticate,
  authorize("rescue_team"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const { incident_type, incident_note } = req.body;
      if (!["damaged", "lost"].includes(incident_type))
        return res
          .status(400)
          .json({ error: "Loại sự cố phải là 'damaged' hoặc 'lost'." });

      const vd = await query(
        `SELECT vd.id, vd.status, vd.vehicle_id, rt.leader_id
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
          .json({ error: "Chỉ báo sự cố khi đang sử dụng xe." });

      // Dispatch → incident_pending, chờ kho xác nhận tình trạng thực tế
      await query(
        `UPDATE vehicle_dispatches
         SET incident_type = @type, incident_note = @note,
             incident_reported_at = GETDATE(), incident_reported_by = @uid,
             status = 'incident_pending', updated_at = GETDATE()
         WHERE id = @id`,
        {
          id,
          type: incident_type,
          note: incident_note || null,
          uid: req.user.id,
        },
      );

      const io = req.app.get("io");
      if (io) io.emit("vehicle_incident_reported", { id, incident_type });

      res.json({
        message: "Đã gửi báo cáo sự cố. Kho sẽ xác nhận tình trạng thực tế.",
      });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/resources/vehicle-dispatches/:id/confirm-incident — Kho xác nhận tình trạng sự cố xe
router.put(
  "/vehicle-dispatches/:id/confirm-incident",
  authenticate,
  authorize("manager", "warehouse_manager"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const { confirmed_type, confirmed_note } = req.body;
      // confirmed_type: 'damaged' | 'lost' | 'ok' (tìm lại được / hỏng nhẹ)
      if (!["damaged", "lost", "ok"].includes(confirmed_type))
        return res
          .status(400)
          .json({ error: "confirmed_type phải là damaged / lost / ok." });

      const vd = await query(
        `SELECT id, status, vehicle_id, incident_type FROM vehicle_dispatches WHERE id = @id`,
        { id },
      );
      if (!vd.recordset.length)
        return res.status(404).json({ error: "Không tìm thấy bản ghi." });
      const row = vd.recordset[0];
      if (row.status !== "incident_pending")
        return res.status(400).json({ error: "Không có sự cố cần xác nhận." });

      // Xác định trạng thái xe sau khi kho xác nhận
      const vehicleStatus =
        confirmed_type === "lost"
          ? "lost"
          : confirmed_type === "damaged"
            ? "maintenance"
            : "available";

      await query(
        `UPDATE vehicle_dispatches
         SET status = 'cancelled',
             incident_note = COALESCE(@note, incident_note),
             incident_type = @ctype,
             updated_at = GETDATE()
         WHERE id = @id`,
        { id, ctype: confirmed_type, note: confirmed_note || null },
      );
      await query(
        "UPDATE vehicles SET status = @vs, updated_at = GETDATE() WHERE id = @vid",
        { vs: vehicleStatus, vid: row.vehicle_id },
      );

      const io = req.app.get("io");
      if (io) io.emit("vehicle_incident_confirmed", { id, confirmed_type });

      const msg =
        confirmed_type === "lost"
          ? "Đã xác nhận xe mất. Coordinator sẽ được thông báo."
          : confirmed_type === "damaged"
            ? "Đã xác nhận xe hỏng. Xe chuyển sang bảo trì."
            : "Đã xác nhận xe ổn, trả về available.";
      res.json({ message: msg });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/resources/vehicles/:id/mark-repaired — Kho xác nhận xe đã sửa xong
router.put(
  "/vehicles/:id/mark-repaired",
  authenticate,
  authorize("warehouse_manager"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const veh = await query(
        "SELECT id, status FROM vehicles WHERE id = @id",
        { id },
      );
      if (veh.recordset.length === 0)
        return res.status(404).json({ error: "Không tìm thấy xe." });
      if (veh.recordset[0].status !== "maintenance")
        return res
          .status(400)
          .json({ error: "Xe không ở trạng thái bảo trì." });

      await query(
        "UPDATE vehicles SET status = 'available', updated_at = GETDATE() WHERE id = @id",
        { id },
      );

      const io = req.app.get("io");
      if (io) io.emit("vehicle_repaired", { id });

      res.json({ message: "Xe đã sửa xong, trả về trạng thái sẵn sàng." });
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

      if (req.user.role === "coordinator") {
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

      if (req.user.role === "coordinator") {
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

// ─── SUPPLY REQUESTS (Coordinator → Manager) ─────────────────────────────────
router.get(
  "/supply-requests",
  authenticate,
  authorize("coordinator", "manager", "warehouse_manager"),
  async (req, res, next) => {
    try {
      const { user } = req;
      let where = "";
      const params = {};
      if (user.role === "coordinator") {
        where = "WHERE sr.requester_id = @uid";
        params.uid = user.id;
      } else if (user.role === "warehouse_manager") {
        // Kho manager thấy toàn bộ lịch sử request cho kho của mình
        where = `WHERE sr.warehouse_id IN (SELECT id FROM warehouses WHERE manager_id = @uid)`;
        params.uid = user.id;
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
        params,
      );
      res.json(result.recordset);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/supply-requests",
  authenticate,
  authorize("coordinator"),
  async (req, res, next) => {
    try {
      const { warehouse_id, item_id, requested_quantity, reason } = req.body;
      if (!warehouse_id || !item_id || !requested_quantity)
        return res.status(400).json({ error: "Thiếu thông tin bắt buộc." });
      const result = await query(
        `INSERT INTO supply_requests (requester_id, warehouse_id, item_id, requested_quantity, reason)
         OUTPUT INSERTED.id
         VALUES (@uid, @wid, @iid, @qty, @reason)`,
        {
          uid: req.user.id,
          wid: parseInt(warehouse_id),
          iid: parseInt(item_id),
          qty: parseFloat(requested_quantity),
          reason: reason || null,
        },
      );
      const io = req.app.get("io");
      if (io) io.emit("supply_request_created", { id: result.recordset[0].id });
      res
        .status(201)
        .json({
          id: result.recordset[0].id,
          message: "Đã gửi yêu cầu bổ sung vật tư.",
        });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/supply-requests/:id/approve",
  authenticate,
  authorize("manager"),
  async (req, res, next) => {
    try {
      const { review_note } = req.body;
      const id = parseInt(req.params.id);

      // Lấy thông tin yêu cầu
      const srRes = await query(
        `SELECT * FROM supply_requests WHERE id = @id AND status = 'pending'`,
        { id },
      );
      if (srRes.recordset.length === 0)
        return res
          .status(404)
          .json({ error: "Không tìm thấy yêu cầu đang chờ duyệt." });

      // Cập nhật status → manager_approved (kho sẽ xác nhận nhập hàng sau)
      await query(
        `UPDATE supply_requests SET status = 'manager_approved', reviewed_by = @uid,
         review_note = @note, reviewed_at = GETDATE()
         WHERE id = @id`,
        { uid: req.user.id, note: review_note || null, id },
      );

      const io = req.app.get("io");
      if (io) io.emit("supply_request_updated", { id, status: "manager_approved" });
      res.json({
        message: "Đã duyệt. Kho hàng sẽ xác nhận nhập và cập nhật tồn kho.",
      });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/supply-requests/:id/reject",
  authenticate,
  authorize("manager"),
  async (req, res, next) => {
    try {
      const { review_note } = req.body;
      if (!review_note?.trim())
        return res.status(400).json({ error: "Cần nhập lý do từ chối." });
      await query(
        `UPDATE supply_requests SET status = 'rejected', reviewed_by = @uid,
         review_note = @note, reviewed_at = GETDATE()
         WHERE id = @id AND status = 'pending'`,
        { uid: req.user.id, note: review_note, id: parseInt(req.params.id) },
      );
      const io = req.app.get("io");
      if (io)
        io.emit("supply_request_updated", {
          id: parseInt(req.params.id),
          status: "rejected",
        });
      res.json({ message: "Đã từ chối yêu cầu." });
    } catch (err) {
      next(err);
    }
  },
);

// Kho xác nhận nhập hàng → cộng inventory
router.put(
  "/supply-requests/:id/warehouse-confirm",
  authenticate,
  authorize("warehouse_manager"),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const srRes = await query(
        `SELECT * FROM supply_requests WHERE id = @id AND status = 'manager_approved'`,
        { id },
      );
      if (srRes.recordset.length === 0)
        return res.status(404).json({ error: "Không tìm thấy yêu cầu đã được manager duyệt." });

      const sr = srRes.recordset[0];

      await query(
        `UPDATE supply_requests SET status = 'approved', reviewed_at = GETDATE() WHERE id = @id`,
        { id },
      );

      // Cộng số lượng vào relief_inventory
      const invCheck = await query(
        `SELECT id FROM relief_inventory WHERE warehouse_id = @wid AND item_id = @iid`,
        { wid: sr.warehouse_id, iid: sr.item_id },
      );
      if (invCheck.recordset.length > 0) {
        await query(
          `UPDATE relief_inventory SET quantity = quantity + @qty, last_restocked = GETDATE(), updated_at = GETDATE()
           WHERE warehouse_id = @wid AND item_id = @iid`,
          { qty: sr.requested_quantity, wid: sr.warehouse_id, iid: sr.item_id },
        );
      } else {
        await query(
          `INSERT INTO relief_inventory (warehouse_id, item_id, quantity, min_threshold)
           VALUES (@wid, @iid, @qty, 0)`,
          { wid: sr.warehouse_id, iid: sr.item_id, qty: sr.requested_quantity },
        );
      }

      const io = req.app.get("io");
      if (io) io.emit("supply_request_updated", { id, status: "approved" });
      res.json({ message: `Đã xác nhận nhập kho. Tồn kho đã được cộng ${sr.requested_quantity}.` });
    } catch (err) {
      next(err);
    }
  },
);

// ======== HISTORY ========

// GET /api/resources/history - Combined import/export history
router.get(
  "/history",
  authenticate,
  authorize("admin", "manager", "warehouse_manager", "coordinator"),
  async (req, res, next) => {
    try {
      const { date_from, date_to, team_id, type, warehouse_id } = req.query;
      const params = {};
      let distWhere = "WHERE 1=1";
      let vdWhere = "WHERE 1=1";

      if (date_from) {
        distWhere += " AND rd.created_at >= @date_from";
        vdWhere += " AND vd.dispatched_at >= @date_from";
        params.date_from = date_from;
      }
      if (date_to) {
        distWhere += " AND rd.created_at <= @date_to";
        vdWhere += " AND vd.dispatched_at <= @date_to";
        params.date_to = date_to;
      }
      if (team_id) {
        distWhere += " AND rd.team_id = @team_id";
        vdWhere += " AND vd.team_id = @team_id";
        params.team_id = parseInt(team_id);
      }
      if (warehouse_id) {
        distWhere += " AND rd.warehouse_id = @warehouse_id";
        params.warehouse_id = parseInt(warehouse_id);
      }

      // Supplies (distributions)
      let distTypeFilter = "";
      if (type === "issue") distTypeFilter = " AND rd.distribution_type = 'issue'";
      else if (type === "return") distTypeFilter = " AND rd.distribution_type = 'return'";

      const distResult = await query(
        `SELECT
           'supply' as record_type,
           rd.distribution_type as direction,
           rd.voucher_code,
           rd.quantity,
           rd.status,
           rd.created_at as event_time,
           ri.name as item_name,
           ri.unit,
           rt.name as team_name,
           w.name as warehouse_name,
           u.full_name as handled_by
         FROM relief_distributions rd
         JOIN relief_items ri ON rd.item_id = ri.id
         LEFT JOIN rescue_teams rt ON rd.team_id = rt.id
         LEFT JOIN warehouses w ON rd.warehouse_id = w.id
         LEFT JOIN users u ON rd.distributed_by = u.id
         ${distWhere}${distTypeFilter}`,
        params,
      );

      // Vehicles (dispatches) — only if type filter is not 'return'
      let vdRows = [];
      if (!type || type === "issue") {
        // vehicle_dispatches has no warehouse_id or dispatch_code columns
        // use generated voucher-style code from id
        const vdWhereFinal = vdWhere; // warehouse_id filter not applicable for vehicles
        const vdResult = await query(
          `SELECT
             'vehicle' as record_type,
             'issue' as direction,
             CONCAT('XE-', FORMAT(vd.id, '0000')) as voucher_code,
             1 as quantity,
             CASE
               WHEN vd.status = 'cancelled' AND vd.return_confirmed_at IS NOT NULL THEN 'returned'
               ELSE vd.status
             END as status,
             vd.created_at as event_time,
             v.name as item_name,
             v.plate_number as unit,
             rt.name as team_name,
             NULL as warehouse_name,
             u.full_name as handled_by
           FROM vehicle_dispatches vd
           JOIN vehicles v ON vd.vehicle_id = v.id
           LEFT JOIN rescue_teams rt ON vd.team_id = rt.id
           LEFT JOIN users u ON vd.dispatched_by = u.id
           ${vdWhereFinal}`,
          params,
        );
        vdRows = vdResult.recordset;
      }

      // Import receipts from supply_requests (nhập kho)
      let importRows = [];
      if (!type || type === "import") {
        let importWhere = "WHERE sr.status = 'approved'";
        if (warehouse_id) {
          importWhere += " AND sr.warehouse_id = @warehouse_id";
        }
        if (date_from) importWhere += " AND sr.created_at >= @date_from";
        if (date_to) importWhere += " AND sr.created_at <= @date_to";
        const importResult = await query(
          `SELECT
             'import' as record_type,
             'import' as direction,
             CONCAT('SR-', FORMAT(sr.id, '0000')) as voucher_code,
             sr.requested_quantity as quantity,
             sr.status,
             sr.created_at as event_time,
             ri.name as item_name,
             ri.unit,
             NULL as team_name,
             w.name as warehouse_name,
             u.full_name as handled_by
           FROM supply_requests sr
           JOIN relief_items ri ON sr.item_id = ri.id
           LEFT JOIN warehouses w ON sr.warehouse_id = w.id
           LEFT JOIN users u ON sr.approved_by = u.id
           ${importWhere}`,
          params,
        );
        importRows = importResult.recordset;
      }

      const combined = [...distResult.recordset, ...vdRows, ...importRows].sort(
        (a, b) => new Date(b.event_time) - new Date(a.event_time),
      );

      res.json(combined);
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
