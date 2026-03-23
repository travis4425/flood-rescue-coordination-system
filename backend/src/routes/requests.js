const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const https = require("https");
const { query } = require("../config/database");
const {
  authenticate,
  authorize,
  optionalAuth,
} = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const { getFileUrl } = upload;
const {
  generateTrackingCode,
  getPagination,
  formatResponse,
  calculateDistance,
  calculatePriority,
} = require("../utils/helpers");

// Reverse geocode using OpenStreetMap Nominatim
function reverseGeocode(lat, lng) {
  return new Promise((resolve) => {
    const path = `/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi&zoom=10`;
    const req = https.get(
      {
        hostname: "nominatim.openstreetmap.org",
        path,
        headers: { "User-Agent": "FloodRescueApp/1.0" },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.on("error", () => resolve(null));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

// Rate limit for citizen request submission
const citizenLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.CITIZEN_RATE_LIMIT_MAX) || 10,
  message: { error: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau." },
});

router.post(
  "/",
  citizenLimiter,
  upload.array("images", 5),
  async (req, res, next) => {
    try {
      const {
        citizen_name,
        citizen_phone,
        citizen_address,
        latitude,
        longitude,
        address,
        incident_type_id,
        urgency_level_id,
        description,
        victim_count,
        support_type,
        flood_severity,
      } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Vui lòng cung cấp vị trí GPS." });
      }

      if (citizen_phone && !/^(0[35789])[0-9]{8}$/.test(citizen_phone.trim())) {
        return res.status(400).json({ error: "Số điện thoại không hợp lệ." });
      }

      const trackingCode = generateTrackingCode();

      // Auto-detect district/province — luôn dùng tọa độ để tránh sai khi GPS máy khác với pin bản đồ
      let district_id = null;
      let province_id = null;
      let geo_province_name = req.body.geo_province_name || null;
      let geo_district_name = req.body.geo_district_name || null;
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      // Ưu tiên 1: tìm quận/huyện gần nhất theo tọa độ pin
      const geoResult = await query(
        `SELECT TOP 1 d.id as district_id, d.province_id
         FROM districts d
         WHERE d.latitude IS NOT NULL AND d.longitude IS NOT NULL
         ORDER BY ABS(d.latitude - @lat) + ABS(d.longitude - @lng)`,
        { lat, lng },
      );
      district_id = geoResult.recordset[0]?.district_id || null;
      province_id = geoResult.recordset[0]?.province_id || null;

      // Ưu tiên 2: nếu districts không có tọa độ, dùng province gần nhất
      if (!province_id) {
        const provResult = await query(
          `SELECT TOP 1 id as province_id FROM provinces
           WHERE latitude IS NOT NULL AND longitude IS NOT NULL
           ORDER BY ABS(latitude - @lat) + ABS(longitude - @lng)`,
          { lat, lng },
        );
        province_id = provResult.recordset[0]?.province_id || null;
      }

      // Lưu geo_province_name để tra cứu (không dùng để xác định province_id nữa)
      if (!geo_province_name) {
        geo_province_name = geoResult.recordset[0]?.name || null;
      }

      // Auto-assign coordinator based on region
      let coordinator_id = null;
      if (district_id || province_id) {
        const coordResult = await query(
          `SELECT TOP 1 cr.user_id 
         FROM coordinator_regions cr
         JOIN users u ON cr.user_id = u.id AND u.is_active = 1
         WHERE (cr.district_id = @district_id OR cr.province_id = @province_id)
           AND cr.current_workload < cr.max_workload
         ORDER BY cr.current_workload ASC`,
          { district_id, province_id },
        );
        coordinator_id = coordResult.recordset[0]?.user_id || null;
      }

      const insertResult = await query(
        `INSERT INTO rescue_requests
        (tracking_code, citizen_name, citizen_phone, citizen_address,
         latitude, longitude, address, district_id, province_id,
         geo_province_name, geo_district_name,
         incident_type_id, urgency_level_id, description,
         victim_count, support_type, flood_severity, coordinator_id, status)
       OUTPUT INSERTED.id, INSERTED.tracking_code
       VALUES
        (@tracking_code, @citizen_name, @citizen_phone, @citizen_address,
         @latitude, @longitude, @address, @district_id, @province_id,
         @geo_province_name, @geo_district_name,
         @incident_type_id, @urgency_level_id, @description,
         @victim_count, @support_type, @flood_severity, @coordinator_id, 'pending')`,
        {
          tracking_code: trackingCode,
          citizen_name: citizen_name || null,
          citizen_phone: citizen_phone || null,
          citizen_address: citizen_address || address || null,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          address: address || null,
          district_id,
          province_id,
          geo_province_name,
          geo_district_name,
          incident_type_id: incident_type_id
            ? parseInt(incident_type_id)
            : null,
          urgency_level_id: urgency_level_id
            ? parseInt(urgency_level_id)
            : null,
          description: description || null,
          victim_count: parseInt(victim_count) || 1,
          support_type: support_type || null,
          flood_severity: parseInt(flood_severity) || 1,
          coordinator_id,
        },
      );

      const requestId = insertResult.recordset[0].id;

      // Calculate priority score
      const urgencyScore = urgency_level_id
        ? (
            await query(
              "SELECT priority_score FROM urgency_levels WHERE id = @id",
              { id: parseInt(urgency_level_id) },
            )
          ).recordset[0]?.priority_score || 1
        : 1;
      const priorityScore = calculatePriority(
        urgencyScore,
        parseInt(victim_count) || 1,
        parseInt(flood_severity) || 1,
        false,
      );
      await query(
        "UPDATE rescue_requests SET priority_score = @score WHERE id = @id",
        { score: priorityScore, id: requestId },
      );

      // Save uploaded images
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await query(
            `INSERT INTO rescue_request_images (request_id, image_url, image_type) 
           VALUES (@request_id, @image_url, 'request')`,
            { request_id: requestId, image_url: getFileUrl(file) },
          );
        }
      }

      // Increment coordinator workload
      if (coordinator_id) {
        await query(
          `UPDATE coordinator_regions SET current_workload = current_workload + 1 
         WHERE user_id = @user_id AND (district_id = @district_id OR province_id = @province_id)`,
          { user_id: coordinator_id, district_id, province_id },
        );
      }

      // Emit socket event
      const io = req.app.get("io");
      if (io) {
        const fullRequest = await getRequestById(requestId);
        io.emit("new_request", fullRequest);
        if (coordinator_id) {
          io.to(`user_${coordinator_id}`).emit("assigned_request", fullRequest);
        }
      }

      res.status(201).json({
        message: "Yêu cầu cứu hộ đã được gửi thành công!",
        tracking_code: trackingCode,
        request_id: requestId,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================
// PUBLIC: Track request by tracking code
// GET /api/requests/track/:trackingCode
// ============================================================
router.get("/track/:trackingCode", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT rr.id, rr.tracking_code, rr.status, rr.description,
              rr.latitude, rr.longitude, rr.address, rr.victim_count,
              rr.support_type, rr.priority_score, rr.flood_severity,
              rr.citizen_confirmed, rr.citizen_confirmed_at,
              rr.rescue_team_confirmed,
              rr.created_at, rr.verified_at, rr.assigned_at, rr.started_at, rr.completed_at,
              rr.result_notes, rr.rescued_count, rr.reject_reason,
              ISNULL(rr.tracking_status, 'submitted') as tracking_status,
              rr.incident_report_note, rr.incident_team_info,
              it.name as incident_type, it.icon as incident_icon, it.color as incident_color,
              ul.name as urgency_level, ul.color as urgency_color,
              rt.name as team_name, rt.phone as team_phone,
              COALESCE(p.name, rr.geo_province_name) as province_name,
              COALESCE(d.name, rr.geo_district_name) as district_name
       FROM rescue_requests rr
       LEFT JOIN incident_types it ON rr.incident_type_id = it.id
       LEFT JOIN urgency_levels ul ON rr.urgency_level_id = ul.id
       LEFT JOIN rescue_teams rt ON rr.assigned_team_id = rt.id
       LEFT JOIN provinces p ON rr.province_id = p.id
       LEFT JOIN districts d ON rr.district_id = d.id
       WHERE rr.tracking_code = @code`,
      { code: req.params.trackingCode },
    );

    if (result.recordset.length === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy yêu cầu với mã theo dõi này." });
    }

    // Get images
    const images = await query(
      "SELECT image_url, image_type FROM rescue_request_images WHERE request_id = @id",
      { id: result.recordset[0].id },
    );

    res.json({ ...result.recordset[0], images: images.recordset });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// PUBLIC: Citizen check notifications by tracking code (NO LOGIN)
// GET /api/requests/track/:trackingCode/notifications
// ============================================================
router.get("/track/:trackingCode/notifications", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT n.id, n.type, n.title, n.message, n.is_read, n.created_at
       FROM notifications n
       WHERE n.tracking_code = @code
       ORDER BY n.created_at DESC`,
      { code: req.params.trackingCode },
    );
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// ============================================================
// PUBLIC: Citizen confirms rescue received
// PUT /api/requests/track/:trackingCode/confirm
// ============================================================
router.put("/track/:trackingCode/confirm", async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE rescue_requests 
       SET citizen_confirmed = 1, citizen_confirmed_at = GETDATE(), updated_at = GETDATE()
       WHERE tracking_code = @code AND status IN ('in_progress', 'completed')
         AND (citizen_confirmed = 0 OR citizen_confirmed IS NULL)`,
      { code: req.params.trackingCode },
    );
    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({
        error: "Không thể xác nhận. Yêu cầu chưa hoàn thành hoặc đã xác nhận.",
      });
    }
    const io = req.app.get("io");
    if (io)
      io.emit("request_updated", {
        tracking_code: req.params.trackingCode,
        citizen_confirmed: true,
      });
    res.json({ message: "Cảm ơn bạn đã xác nhận! Chúc bạn bình an." });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// PUBLIC: Citizen reports rescued by other citizen (double confirmation)
// PUT /api/requests/track/:trackingCode/rescued-by-other
// ============================================================
router.put("/track/:trackingCode/rescued-by-other", async (req, res, next) => {
  try {
    const current = await query(
      "SELECT id, status, citizen_rescued_by_other_count FROM rescue_requests WHERE tracking_code = @code",
      { code: req.params.trackingCode },
    );
    if (!current.recordset[0]) {
      return res.status(404).json({ error: "Không tìm thấy yêu cầu." });
    }

    const { id, status, citizen_rescued_by_other_count } = current.recordset[0];

    if (["completed", "cancelled", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Yêu cầu này đã kết thúc." });
    }

    const newCount = (citizen_rescued_by_other_count || 0) + 1;

    if (newCount >= 2) {
      // Second confirmation — cancel the request
      await query(
        `UPDATE rescue_requests
         SET citizen_rescued_by_other_count = @count,
             status = 'cancelled',
             reject_reason = N'Nguoi dan bao da duoc cuu boi nguoi khac',
             updated_at = GETDATE()
         WHERE id = @id`,
        { count: newCount, id },
      );

      // Abort any active mission assigned to this request
      await query(
        `UPDATE missions SET status = 'aborted', updated_at = GETDATE()
         WHERE request_id = @req_id AND status NOT IN ('completed','failed','aborted')`,
        { req_id: id },
      );

      const io = req.app.get("io");
      if (io) {
        io.emit("request_updated", { id, status: "cancelled" });
        io.emit("mission_updated", { request_id: id, status: "aborted" });
      }

      return res.json({
        confirmed: true,
        message:
          "Cảm ơn bạn đã xác nhận. Yêu cầu đã được đóng. Chúc bạn bình an!",
      });
    }

    // First confirmation — just increment, wait for second
    await query(
      "UPDATE rescue_requests SET citizen_rescued_by_other_count = @count, updated_at = GETDATE() WHERE id = @id",
      { count: newCount, id },
    );

    res.json({
      confirmed: false,
      current_count: newCount,
      message: "Vui lòng xác nhận lần nữa để đóng yêu cầu.",
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// PUBLIC: Citizen edits their own PENDING request (NO LOGIN)
// PUT /api/requests/track/:trackingCode/update
// ============================================================
router.put("/track/:trackingCode/update", async (req, res, next) => {
  try {
    const check = await query(
      "SELECT id, status FROM rescue_requests WHERE tracking_code = @code",
      { code: req.params.trackingCode },
    );
    if (!check.recordset.length)
      return res.status(404).json({ error: "Không tìm thấy yêu cầu." });
    if (check.recordset[0].status !== "pending") {
      return res
        .status(400)
        .json({ error: "Chỉ có thể chỉnh sửa yêu cầu đang chờ xử lý." });
    }

    const requestId = check.recordset[0].id;
    const {
      citizen_name,
      citizen_phone,
      address,
      incident_type_id,
      urgency_level_id,
      description,
      victim_count,
      flood_severity,
    } = req.body;

    if (citizen_phone && !/^(0[35789])[0-9]{8}$/.test(citizen_phone.trim())) {
      return res.status(400).json({ error: "Số điện thoại không hợp lệ." });
    }

    await query(
      `UPDATE rescue_requests SET
        citizen_name = @citizen_name,
        citizen_phone = @citizen_phone,
        address = @address,
        incident_type_id = @incident_type_id,
        urgency_level_id = @urgency_level_id,
        description = @description,
        victim_count = @victim_count,
        flood_severity = @flood_severity,
        updated_at = GETDATE()
       WHERE id = @id`,
      {
        id: requestId,
        citizen_name: citizen_name || null,
        citizen_phone: citizen_phone || null,
        address: address || null,
        incident_type_id: incident_type_id ? parseInt(incident_type_id) : null,
        urgency_level_id: urgency_level_id ? parseInt(urgency_level_id) : null,
        description: description || null,
        victim_count: parseInt(victim_count) || 1,
        flood_severity: parseInt(flood_severity) || 1,
      },
    );

    const io = req.app.get("io");
    if (io) {
      const fullRequest = await getRequestById(requestId);
      if (fullRequest) io.emit("request_updated", fullRequest);
    }

    res.json({ message: "Đã cập nhật yêu cầu cứu hộ." });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// PUBLIC: Get all requests for map display
// GET /api/requests/map
// ============================================================
router.get("/map", async (req, res, next) => {
  try {
    const { province_id, status, urgency } = req.query;
    let where = "WHERE rr.status NOT IN ('cancelled', 'rejected')";
    const params = {};

    if (province_id) {
      where += " AND rr.province_id = @province_id";
      params.province_id = parseInt(province_id);
    }
    if (status) {
      where += " AND rr.status = @status";
      params.status = status;
    }

    const result = await query(
      `SELECT rr.id, rr.tracking_code, rr.latitude, rr.longitude,
              rr.status, rr.victim_count, rr.priority_score, rr.flood_severity,
              rr.citizen_address, rr.description, rr.created_at,
              rr.citizen_name, rr.citizen_phone,
              it.name as incident_type, it.icon as incident_icon, it.color as incident_color,
              ul.name as urgency_level, ul.color as urgency_color,
              COALESCE(p.name, rr.geo_province_name) as province_name,
              COALESCE(d.name, rr.geo_district_name) as district_name
       FROM rescue_requests rr
       LEFT JOIN incident_types it ON rr.incident_type_id = it.id
       LEFT JOIN urgency_levels ul ON rr.urgency_level_id = ul.id
       LEFT JOIN provinces p ON rr.province_id = p.id
       LEFT JOIN districts d ON rr.district_id = d.id
       ${where}
       ORDER BY rr.created_at DESC, rr.priority_score DESC`,
      params,
    );

    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// ============================================================
// AUTHENTICATED: List requests with filters
// GET /api/requests
// ============================================================
router.get("/", authenticate, async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { status, province_id, urgency_level_id, search, district_id } =
      req.query;

    let where = "WHERE 1=1";
    const params = {};

    // Role-based filtering
    if (req.user.role === "coordinator") {
      where += ` AND (
        rr.coordinator_id = @user_id
        OR rr.province_id = (SELECT province_id FROM users WHERE id = @user_id)
        OR rr.province_id IN (SELECT province_id FROM coordinator_regions WHERE user_id = @user_id)
        OR rr.province_id IN (SELECT province_id FROM warehouses WHERE coordinator_id = @user_id)
      )`;
      params.user_id = req.user.id;
    } else if (req.user.role === "rescue_team") {
      where += ` AND rr.assigned_team_id IN 
        (SELECT team_id FROM rescue_team_members WHERE user_id = @user_id
         UNION SELECT id FROM rescue_teams WHERE leader_id = @user_id)`;
      params.user_id = req.user.id;
    }

    if (status) {
      where += " AND rr.status = @status";
      params.status = status;
    }
    if (province_id) {
      where += " AND rr.province_id = @province_id";
      params.province_id = parseInt(province_id);
    }
    if (district_id) {
      where += " AND rr.district_id = @district_id";
      params.district_id = parseInt(district_id);
    }
    if (urgency_level_id) {
      where += " AND rr.urgency_level_id = @urgency_level_id";
      params.urgency_level_id = parseInt(urgency_level_id);
    }
    if (search) {
      where +=
        " AND (rr.tracking_code LIKE @search OR rr.citizen_name LIKE @search OR rr.citizen_phone LIKE @search OR rr.description LIKE @search)";
      params.search = `%${search}%`;
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM rescue_requests rr ${where}`,
      params,
    );
    const total = countResult.recordset[0].total;

    const result = await query(
      `SELECT rr.*,
              it.name as incident_type, it.icon as incident_icon, it.color as incident_color,
              ul.name as urgency_level, ul.color as urgency_color,
              rt.name as team_name,
              p.name as province_name, d.name as district_name,
              u.full_name as coordinator_name,
              (SELECT COUNT(*) FROM rescue_request_images WHERE request_id = rr.id) as image_count
       FROM rescue_requests rr
       LEFT JOIN incident_types it ON rr.incident_type_id = it.id
       LEFT JOIN urgency_levels ul ON rr.urgency_level_id = ul.id
       LEFT JOIN rescue_teams rt ON rr.assigned_team_id = rt.id
       LEFT JOIN provinces p ON rr.province_id = p.id
       LEFT JOIN districts d ON rr.district_id = d.id
       LEFT JOIN users u ON rr.coordinator_id = u.id
       ${where}
       ORDER BY rr.priority_score DESC, rr.created_at DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { ...params, offset, limit },
    );

    res.json(formatResponse(result.recordset, total, page, limit));
  } catch (err) {
    next(err);
  }
});

// ============================================================
// COORDINATOR: Verify request
// PUT /api/requests/:id/verify
// ============================================================
router.put(
  "/:id/verify",
  authenticate,
  authorize("coordinator", "admin", "manager"),
  async (req, res, next) => {
    try {
      const { urgency_level_id, flood_severity, notes } = req.body;

      await query(
        `UPDATE rescue_requests
       SET status = 'verified',
           tracking_status = 'received',
           urgency_level_id = COALESCE(@urgency_level_id, urgency_level_id),
           flood_severity = COALESCE(@flood_severity, flood_severity),
           coordinator_id = @coordinator_id,
           verified_at = GETDATE(),
           updated_at = GETDATE()
       WHERE id = @id`,
        {
          id: parseInt(req.params.id),
          urgency_level_id: urgency_level_id
            ? parseInt(urgency_level_id)
            : null,
          flood_severity: flood_severity ? parseInt(flood_severity) : null,
          coordinator_id: req.user.id,
        },
      );

      // Recalculate priority score after verify
      const reqData = await query(
        `SELECT rr.victim_count, rr.flood_severity, rr.province_id, 
              ISNULL(ul.priority_score, 1) as urgency_score
       FROM rescue_requests rr
       LEFT JOIN urgency_levels ul ON rr.urgency_level_id = ul.id
       WHERE rr.id = @id`,
        { id: parseInt(req.params.id) },
      );
      if (reqData.recordset[0]) {
        const r = reqData.recordset[0];
        const hasAlert =
          (
            await query(
              "SELECT COUNT(*) as cnt FROM weather_alerts WHERE province_id = @pid AND expires_at > GETDATE()",
              { pid: r.province_id },
            )
          ).recordset[0].cnt > 0;
        const newPriority = calculatePriority(
          r.urgency_score,
          r.victim_count,
          r.flood_severity,
          hasAlert,
        );
        await query(
          "UPDATE rescue_requests SET priority_score = @score WHERE id = @id",
          { score: newPriority, id: parseInt(req.params.id) },
        );
      }

      const fullRequest = await getRequestById(parseInt(req.params.id));

      // Notify citizen
      if (fullRequest?.tracking_code) {
        await query(
          `INSERT INTO notifications (tracking_code, type, title, message)
           VALUES (@code, 'request_verified', N'Yeu cau da duoc xac minh', N'Yeu cau cuu ho cua ban da duoc coordinator xac minh va dang cho phan cong doi cuu ho.')`,
          { code: fullRequest.tracking_code },
        );
      }

      const io = req.app.get("io");
      if (io) io.emit("request_updated", fullRequest);

      res.json({ message: "Đã xác minh yêu cầu.", data: fullRequest });
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================
// COORDINATOR: Reject request with reason
// PUT /api/requests/:id/reject
// ============================================================
router.put(
  "/:id/reject",
  authenticate,
  authorize("coordinator", "admin", "manager"),
  async (req, res, next) => {
    try {
      const { reason } = req.body;
      if (!reason)
        return res.status(400).json({ error: "Vui lòng nhập lý do từ chối." });

      await query(
        `UPDATE rescue_requests 
       SET status = 'rejected', 
           reject_reason = @reason,
           coordinator_id = @coordinator_id,
           updated_at = GETDATE()
       WHERE id = @id AND status IN ('pending', 'verified')`,
        {
          id: parseInt(req.params.id),
          reason,
          coordinator_id: req.user.id,
        },
      );

      // Notify citizen via tracking code
      const reqData = await query(
        "SELECT tracking_code FROM rescue_requests WHERE id = @id",
        { id: parseInt(req.params.id) },
      );
      if (reqData.recordset[0]) {
        await query(
          `
        INSERT INTO notifications (tracking_code, type, title, message)
        VALUES (@code, 'request_rejected', N'Yêu cầu bị từ chối', @msg)
      `,
          { code: reqData.recordset[0].tracking_code, msg: `Lý do: ${reason}` },
        );
      }

      const io = req.app.get("io");
      if (io) {
        const fullRequest = await getRequestById(parseInt(req.params.id));
        io.emit("request_updated", fullRequest);
        if (reqData.recordset[0]) {
          io.to(`request_${reqData.recordset[0].tracking_code}`).emit(
            "request_rejected",
            { reason },
          );
        }
      }

      res.json({ message: "Đã từ chối yêu cầu." });
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================
// COORDINATOR: Assign team to request
// PUT /api/requests/:id/assign — CHỈ Coordinator mới được phân công đội
// ============================================================
router.put(
  "/:id/assign",
  authenticate,
  authorize("coordinator"),
  async (req, res, next) => {
    try {
      const { team_id, vehicle_id } = req.body;
      if (!team_id)
        return res.status(400).json({ error: "Vui lòng chọn đội cứu hộ." });

      // Update request
      await query(
        `UPDATE rescue_requests 
       SET status = 'assigned', assigned_team_id = @team_id, 
           assigned_at = GETDATE(), updated_at = GETDATE()
       WHERE id = @id`,
        { id: parseInt(req.params.id), team_id: parseInt(team_id) },
      );

      // Update team status
      await query(
        "UPDATE rescue_teams SET status = 'on_mission', updated_at = GETDATE() WHERE id = @team_id",
        { team_id: parseInt(team_id) },
      );

      // Create mission
      await query(
        `INSERT INTO missions (request_id, team_id, vehicle_id, status)
       VALUES (@request_id, @team_id, @vehicle_id, 'assigned')`,
        {
          request_id: parseInt(req.params.id),
          team_id: parseInt(team_id),
          vehicle_id: vehicle_id ? parseInt(vehicle_id) : null,
        },
      );

      const fullRequest = await getRequestById(parseInt(req.params.id));
      const io = req.app.get("io");
      if (io) {
        io.emit("request_updated", fullRequest);
        // Notify team leader
        const team = await query(
          "SELECT leader_id FROM rescue_teams WHERE id = @id",
          { id: parseInt(team_id) },
        );
        if (team.recordset[0]?.leader_id) {
          io.to(`user_${team.recordset[0].leader_id}`).emit(
            "new_mission",
            fullRequest,
          );
        }
      }

      // Notify citizen
      if (fullRequest?.tracking_code) {
        const teamName = fullRequest.team_name || "Đội cứu hộ";
        await query(
          `INSERT INTO notifications (tracking_code, type, title, message)
           VALUES (@code, 'request_assigned', N'Da phan cong doi cuu ho', @msg)`,
          {
            code: fullRequest.tracking_code,
            msg: `Doi cuu ho "${teamName}" da duoc phan cong den ho tro ban. Ho se lien he voi ban som.`,
          },
        );
      }

      res.json({ message: "Đã phân công đội cứu hộ.", data: fullRequest });
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================
// TEAM: Update request status
// PUT /api/requests/:id/status
// ============================================================
router.put("/:id/status", authenticate, authorize("rescue_team", "coordinator"), async (req, res, next) => {
  try {
    const { status, result_notes, rescued_count } = req.body;
    const validStatuses = ["in_progress", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Trạng thái không hợp lệ." });
    }

    const updates = { status, updated_at: "GETDATE()" };
    let setClause = "status = @status, updated_at = GETDATE()";
    const params = { id: parseInt(req.params.id), status };

    if (status === "in_progress") {
      setClause += ", started_at = GETDATE()";
    }
    if (status === "completed") {
      setClause += ", completed_at = GETDATE()";
      if (result_notes) {
        setClause += ", result_notes = @result_notes";
        params.result_notes = result_notes;
      }
      if (rescued_count) {
        setClause += ", rescued_count = @rescued_count";
        params.rescued_count = parseInt(rescued_count);
      }

      // Calculate response time
      setClause +=
        ", response_time_minutes = DATEDIFF(MINUTE, created_at, GETDATE())";
    }

    await query(
      `UPDATE rescue_requests SET ${setClause} WHERE id = @id`,
      params,
    );

    // Update mission and team status if completed
    if (status === "completed") {
      await query(
        `UPDATE missions SET status = 'completed', completed_at = GETDATE(), updated_at = GETDATE()
         WHERE request_id = @id AND status NOT IN ('completed', 'aborted')`,
        { id: parseInt(req.params.id) },
      );

      const reqData = await query(
        "SELECT assigned_team_id, coordinator_id, province_id FROM rescue_requests WHERE id = @id",
        { id: parseInt(req.params.id) },
      );
      if (reqData.recordset[0]?.assigned_team_id) {
        // Check if team has other active missions
        const activeMissions = await query(
          `SELECT COUNT(*) as cnt FROM missions 
           WHERE team_id = @team_id AND status NOT IN ('completed', 'aborted')`,
          { team_id: reqData.recordset[0].assigned_team_id },
        );
        if (activeMissions.recordset[0].cnt === 0) {
          await query(
            "UPDATE rescue_teams SET status = 'available', updated_at = GETDATE() WHERE id = @id",
            { id: reqData.recordset[0].assigned_team_id },
          );
        }
      }
      // Decrement coordinator workload
      if (reqData.recordset[0]?.coordinator_id) {
        await query(
          `UPDATE coordinator_regions SET current_workload = CASE WHEN current_workload > 0 THEN current_workload - 1 ELSE 0 END
           WHERE user_id = @user_id`,
          { user_id: reqData.recordset[0].coordinator_id },
        );
      }
    }

    const fullRequest = await getRequestById(parseInt(req.params.id));
    const io = req.app.get("io");
    if (io) io.emit("request_updated", fullRequest);

    res.json({ message: "Cập nhật trạng thái thành công.", data: fullRequest });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// CANCEL: Citizen or Coordinator cancels a request
// PUT /api/requests/:id/cancel
// ============================================================
router.put("/:id/cancel", authenticate, async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.id);

    // Check exists and get current state
    const current = await query(
      "SELECT status, coordinator_id, assigned_team_id FROM rescue_requests WHERE id = @id",
      { id: requestId },
    );
    if (!current.recordset[0]) {
      return res.status(404).json({ error: "Không tìm thấy yêu cầu." });
    }

    const { status, coordinator_id, assigned_team_id } = current.recordset[0];

    // Only cancel if not already completed/rejected
    if (["completed", "cancelled", "rejected"].includes(status)) {
      return res.status(400).json({
        error: `Không thể hủy yêu cầu đang ở trạng thái "${status}".`,
      });
    }

    await query(
      `UPDATE rescue_requests SET status = 'cancelled', updated_at = GETDATE() WHERE id = @id`,
      { id: requestId },
    );

    // Free team if assigned
    if (assigned_team_id) {
      const activeMissions = await query(
        `SELECT COUNT(*) as cnt FROM missions WHERE team_id = @tid AND status NOT IN ('completed','aborted')`,
        { tid: assigned_team_id },
      );
      if (activeMissions.recordset[0].cnt <= 1) {
        await query(
          `UPDATE rescue_teams SET status = 'available', updated_at = GETDATE() WHERE id = @id`,
          { id: assigned_team_id },
        );
      }
      // Abort linked mission
      await query(
        `UPDATE missions SET status = 'aborted', updated_at = GETDATE() WHERE request_id = @rid AND status NOT IN ('completed','aborted')`,
        { rid: requestId },
      );
    }

    // Decrement coordinator workload
    if (coordinator_id) {
      await query(
        `UPDATE coordinator_regions SET current_workload = CASE WHEN current_workload > 0 THEN current_workload - 1 ELSE 0 END WHERE user_id = @uid`,
        { uid: coordinator_id },
      );
    }

    const io = req.app.get("io");
    if (io) io.emit("request_updated", { id: requestId, status: "cancelled" });

    res.json({ message: "Đã hủy yêu cầu cứu hộ." });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// COORDINATOR: Close case after rescue team confirmed completion
// PUT /api/requests/:id/close
// ============================================================
router.put(
  "/:id/close",
  authenticate,
  authorize("coordinator", "admin", "manager"),
  async (req, res, next) => {
    try {
      const requestId = parseInt(req.params.id);

      const current = await query(
        "SELECT status, rescue_team_confirmed, coordinator_id, province_id, tracking_code FROM rescue_requests WHERE id = @id",
        { id: requestId },
      );
      if (!current.recordset[0]) {
        return res.status(404).json({ error: "Không tìm thấy yêu cầu." });
      }

      const { rescue_team_confirmed, status, tracking_code, coordinator_id } =
        current.recordset[0];
      if (!rescue_team_confirmed) {
        return res
          .status(400)
          .json({
            error: "Đội cứu hộ chưa xác nhận hoàn thành. Chưa thể đóng đơn.",
          });
      }
      if (status === "completed") {
        return res.status(400).json({ error: "Đơn này đã được đóng." });
      }

      await query(
        `UPDATE rescue_requests SET
           status = 'completed',
           completed_at = GETDATE(),
           response_time_minutes = DATEDIFF(MINUTE, created_at, GETDATE()),
           updated_at = GETDATE()
         WHERE id = @id`,
        { id: requestId },
      );

      // Decrement coordinator workload
      if (coordinator_id) {
        await query(
          `UPDATE coordinator_regions
           SET current_workload = CASE WHEN current_workload > 0 THEN current_workload - 1 ELSE 0 END
           WHERE user_id = @user_id`,
          { user_id: coordinator_id },
        );
      }

      // Notify citizen
      await query(
        `INSERT INTO notifications (tracking_code, type, title, message)
         VALUES (@code, 'request_closed', N'Don cuu ho da hoan tat', N'Don cuu ho cua ban da duoc xac nhan hoan tat. Cam on ban da su dung dich vu. Chuc ban binh an!')`,
        { code: tracking_code },
      );

      const fullRequest = await getRequestById(requestId);
      const io = req.app.get("io");
      if (io) io.emit("request_updated", fullRequest);

      res.json({ message: "Đã đóng đơn thành công.", data: fullRequest });
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================
// ============================================================
router.get("/stats/overview", authenticate, async (req, res, next) => {
  try {
    let regionFilter = "";
    const params = {};

    if (req.user.role === "coordinator") {
      regionFilter = `AND (
        province_id = (SELECT province_id FROM users WHERE id = @user_id)
        OR province_id IN (SELECT province_id FROM coordinator_regions WHERE user_id = @user_id)
        OR province_id IN (SELECT province_id FROM warehouses WHERE coordinator_id = @user_id)
      )`;
      params.user_id = req.user.id;
    }

    const stats = await query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(ISNULL(victim_count, 0)) as total_victims,
        SUM(ISNULL(rescued_count, 0)) as total_rescued,
        AVG(CASE WHEN response_time_minutes > 0 THEN response_time_minutes ELSE NULL END) as avg_response_time
       FROM rescue_requests
       WHERE 1=1 ${regionFilter}`,
      params,
    );

    // Today's stats
    const todayStats = await query(
      `SELECT COUNT(*) as today_total,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as today_completed
       FROM rescue_requests 
       WHERE CAST(created_at AS DATE) = CAST(GETDATE() AS DATE) ${regionFilter}`,
      params,
    );

    // Active teams
    const teamStats = await query(
      `SELECT 
        COUNT(*) as total_teams,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'on_mission' THEN 1 ELSE 0 END) as on_mission
       FROM rescue_teams`,
    );

    res.json({
      requests: stats.recordset[0],
      today: todayStats.recordset[0],
      teams: teamStats.recordset[0],
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// Suggest nearest available team
// GET /api/requests/:id/suggest-team
// ============================================================
router.get(
  "/:id/suggest-team",
  authenticate,
  authorize("coordinator", "admin", "manager"),
  async (req, res, next) => {
    try {
      const reqResult = await query(
        "SELECT latitude, longitude, province_id FROM rescue_requests WHERE id = @id",
        { id: parseInt(req.params.id) },
      );
      if (reqResult.recordset.length === 0)
        return res.status(404).json({ error: "Không tìm thấy yêu cầu." });

      const { latitude, longitude, province_id } = reqResult.recordset[0];

      const teams = await query(
        `SELECT id, name, code, current_latitude, current_longitude, capacity, specialization, phone,
              status
       FROM rescue_teams
       WHERE status = 'available' AND province_id = @province_id
       ORDER BY ABS(current_latitude - @lat) + ABS(current_longitude - @lng)`,
        { province_id, lat: latitude, lng: longitude },
      );

      // Calculate distances
      const teamsWithDistance = teams.recordset.map((t) => ({
        ...t,
        distance_km: calculateDistance(
          latitude,
          longitude,
          t.current_latitude,
          t.current_longitude,
        ).toFixed(2),
      }));

      res.json(teamsWithDistance);
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================
// Reassign coordinator (Manager)
// PUT /api/requests/:id/reassign-coordinator
// ============================================================
router.put(
  "/:id/reassign-coordinator",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      const { coordinator_id } = req.body;
      if (!coordinator_id)
        return res.status(400).json({ error: "Thiếu coordinator_id" });

      const requestId = parseInt(req.params.id);

      // Verify target coordinator exists and is active
      const coord = await query(
        "SELECT id, full_name, province_id FROM users WHERE id = @id AND role = 'coordinator' AND is_active = 1",
        { id: parseInt(coordinator_id) },
      );
      if (coord.recordset.length === 0)
        return res.status(404).json({ error: "Không tìm thấy điều phối viên" });

      // Get old coordinator
      const oldReq = await query(
        "SELECT coordinator_id FROM rescue_requests WHERE id = @id",
        { id: requestId },
      );
      const oldCoordId = oldReq.recordset[0]?.coordinator_id;

      // Update request
      await query(
        "UPDATE rescue_requests SET coordinator_id = @coordId, updated_at = GETDATE() WHERE id = @id",
        { coordId: parseInt(coordinator_id), id: requestId },
      );

      // Update workload counters
      if (oldCoordId) {
        await query(
          "UPDATE coordinator_regions SET current_workload = CASE WHEN current_workload > 0 THEN current_workload - 1 ELSE 0 END WHERE user_id = @userId",
          { userId: oldCoordId },
        );
      }
      await query(
        "UPDATE coordinator_regions SET current_workload = current_workload + 1 WHERE user_id = @userId",
        { userId: parseInt(coordinator_id) },
      );

      // Audit log
      await query(
        `
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
      VALUES (@userId, 'reassign_coordinator', 'rescue_request', @entityId, @oldVal, @newVal, @ip)
    `,
        {
          userId: req.user.id,
          entityId: requestId,
          oldVal: JSON.stringify({ coordinator_id: oldCoordId }),
          newVal: JSON.stringify({ coordinator_id: parseInt(coordinator_id) }),
          ip: req.ip,
        },
      );

      // Notify new coordinator
      const io = req.app.get("io");
      if (io) {
        io.to(`user_${coordinator_id}`).emit("request_assigned", {
          request_id: requestId,
        });
        io.emit("request_updated", {
          id: requestId,
          action: "coordinator_reassigned",
        });
      }

      res.json({
        message: `Đã chuyển yêu cầu cho ${coord.recordset[0].full_name}`,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================
// PUBLIC: Lookup requests by citizen phone number
// GET /api/requests/lookup?phone=xxx
// ============================================================
router.get("/lookup", async (req, res, next) => {
  try {
    const { phone } = req.query;
    if (!phone || phone.trim().length < 8) {
      return res
        .status(400)
        .json({ error: "Vui lòng nhập số điện thoại hợp lệ." });
    }
    const result = await query(
      `SELECT TOP 5 tracking_code, status, created_at, description, citizen_name
       FROM rescue_requests
       WHERE citizen_phone = @phone
       ORDER BY created_at DESC`,
      { phone: phone.trim() },
    );
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/requests/:id - Get single request detail
// ============================================================
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const request = await getRequestById(parseInt(req.params.id));
    if (!request)
      return res.status(404).json({ error: "Không tìm thấy yêu cầu" });

    // Get images
    const images = await query(
      "SELECT * FROM rescue_request_images WHERE request_id = @id ORDER BY uploaded_at",
      { id: parseInt(req.params.id) },
    );

    // Get missions
    const missions = await query(
      `
      SELECT m.*, rt.name as team_name, rt.code as team_code
      FROM missions m
      JOIN rescue_teams rt ON m.team_id = rt.id
      WHERE m.request_id = @id
      ORDER BY m.created_at DESC
    `,
      { id: parseInt(req.params.id) },
    );

    res.json({
      ...request,
      images: images.recordset,
      missions: missions.recordset,
    });
  } catch (err) {
    next(err);
  }
});

// Helper function
async function getRequestById(id) {
  const result = await query(
    `SELECT rr.*, 
            it.name as incident_type, it.icon as incident_icon, it.color as incident_color,
            ul.name as urgency_level, ul.color as urgency_color,
            rt.name as team_name, rt.phone as team_phone,
            COALESCE(p.name, rr.geo_province_name) as province_name,
            COALESCE(d.name, rr.geo_district_name) as district_name,
            u.full_name as coordinator_name
     FROM rescue_requests rr
     LEFT JOIN incident_types it ON rr.incident_type_id = it.id
     LEFT JOIN urgency_levels ul ON rr.urgency_level_id = ul.id
     LEFT JOIN rescue_teams rt ON rr.assigned_team_id = rt.id
     LEFT JOIN provinces p ON rr.province_id = p.id
     LEFT JOIN districts d ON rr.district_id = d.id
     LEFT JOIN users u ON rr.coordinator_id = u.id
     WHERE rr.id = @id`,
    { id },
  );
  return result.recordset[0] || null;
}

module.exports = router;
