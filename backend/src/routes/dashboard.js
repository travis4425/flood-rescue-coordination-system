const express = require("express");
const router = express.Router();
const { query } = require("../config/database");
const { authenticate, authorize } = require("../middlewares/auth");

// GET /api/dashboard/overview - Overall system stats
router.get("/overview", authenticate, async (req, res, next) => {
  try {
    const { province_id, region_id, date_from, date_to } = req.query;
    let where = "WHERE 1=1";
    const inputs = {};

    // Role-based filtering
    if (req.user.role === "coordinator") {
      where += ` AND (
        rr.province_id = (SELECT province_id FROM users WHERE id = @coordId)
        OR rr.province_id IN (SELECT province_id FROM coordinator_regions WHERE user_id = @coordId)
        OR rr.province_id IN (SELECT province_id FROM warehouses WHERE coordinator_id = @coordId)
      )`;
      inputs.coordId = req.user.id;
    }

    if (province_id) {
      where += " AND rr.province_id = @filterProvince";
      inputs.filterProvince = parseInt(province_id);
    }
    if (region_id) {
      where +=
        " AND rr.province_id IN (SELECT id FROM provinces WHERE region_id = @filterRegion)";
      inputs.filterRegion = parseInt(region_id);
    }
    if (date_from) {
      where += " AND rr.created_at >= @dateFrom";
      inputs.dateFrom = date_from;
    }
    if (date_to) {
      where += " AND rr.created_at <= @dateTo";
      inputs.dateTo = date_to;
    }

    // Summary stats
    const stats = await query(
      `
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(ISNULL(victim_count, 0)) as total_victims,
        SUM(ISNULL(rescued_count, 0)) as total_rescued
      FROM rescue_requests rr ${where}
    `,
      inputs,
    );

    // Team stats
    const teamStats = await query(`
      SELECT 
        COUNT(*) as total_teams,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'on_mission' THEN 1 ELSE 0 END) as on_mission,
        SUM(CASE WHEN status = 'standby' THEN 1 ELSE 0 END) as standby,
        SUM(CASE WHEN status = 'off_duty' THEN 1 ELSE 0 END) as off_duty
      FROM rescue_teams
    `);

    // Vehicle stats
    const vehicleStats = await query(`
      SELECT 
        COUNT(*) as total_vehicles,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'in_use' THEN 1 ELSE 0 END) as in_use,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
      FROM vehicles
    `);

    // Active weather alerts
    const alertCount = await query(
      "SELECT COUNT(*) as count FROM weather_alerts WHERE expires_at > GETDATE()",
    );

    res.json({
      requests: stats.recordset[0],
      teams: teamStats.recordset[0],
      vehicles: vehicleStats.recordset[0],
      active_alerts: alertCount.recordset[0].count,
    });
  } catch (err) {
    next(err);
  }
});


// GET /api/dashboard/heatmap - Incident heatmap data
router.get("/heatmap", authenticate, async (req, res, next) => {
  try {
    const { days = 30, status } = req.query;
    let where =
      "WHERE rr.latitude IS NOT NULL AND rr.longitude IS NOT NULL AND rr.created_at >= DATEADD(DAY, -@days, GETDATE())";
    const inputs = { days: parseInt(days) };

    if (status) {
      where += " AND rr.status = @status";
      inputs.status = status;
    }

    const result = await query(
      `
      SELECT 
        rr.latitude, rr.longitude, rr.priority_score,
        rr.status, rr.victim_count, rr.flood_severity,
        it.name as incident_type
      FROM rescue_requests rr
      LEFT JOIN incident_types it ON rr.incident_type_id = it.id
      ${where}
    `,
      inputs,
    );

    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/by-province - Stats grouped by province
router.get(
  "/by-province",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      const { days = 30 } = req.query;
      const result = await query(
        `
      SELECT 
        p.id as province_id, p.name as province_name,
        COUNT(rr.id) as total_requests,
        SUM(CASE WHEN rr.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN rr.status IN ('pending', 'verified') THEN 1 ELSE 0 END) as pending,
        SUM(ISNULL(rr.victim_count, 0)) as total_victims,
        SUM(ISNULL(rr.rescued_count, 0)) as total_rescued,
        AVG(CASE WHEN rr.status = 'completed' THEN DATEDIFF(MINUTE, rr.created_at, rr.completed_at) END) as avg_response_minutes
      FROM provinces p
      LEFT JOIN rescue_requests rr ON p.id = rr.province_id 
        AND rr.created_at >= DATEADD(DAY, -@days, GETDATE())
      GROUP BY p.id, p.name
      ORDER BY total_requests DESC
    `,
        { days: parseInt(days) },
      );

      res.json(result.recordset);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/dashboard/coordinator-workload - Coordinator workload monitoring
router.get(
  "/coordinator-workload",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      const result = await query(`
      SELECT 
        u.id, u.full_name, u.username, u.phone,
        p.name as province_name,
        cr.max_workload, cr.current_workload,
        CAST(cr.current_workload AS FLOAT) / NULLIF(cr.max_workload, 0) * 100 as workload_percent,
        (SELECT COUNT(*) FROM rescue_requests rr 
         WHERE rr.coordinator_id = u.id 
         AND rr.status IN ('pending', 'verified', 'assigned', 'in_progress')) as active_requests,
        (SELECT COUNT(*) FROM rescue_requests rr 
         WHERE rr.coordinator_id = u.id 
         AND rr.status = 'completed'
         AND rr.completed_at >= DATEADD(DAY, -7, GETDATE())) as completed_7days
      FROM users u
      INNER JOIN coordinator_regions cr ON u.id = cr.user_id
      LEFT JOIN provinces p ON cr.province_id = p.id
      WHERE u.role = 'coordinator' AND u.is_active = 1
      ORDER BY workload_percent DESC
    `);

      res.json(result.recordset);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/dashboard/daily-trend - Request trend over time
router.get("/daily-trend", authenticate, async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const result = await query(
      `
      SELECT 
        CAST(created_at AS DATE) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status IN ('pending', 'verified') THEN 1 ELSE 0 END) as pending,
        SUM(ISNULL(victim_count, 0)) as victims
      FROM rescue_requests
      WHERE created_at >= DATEADD(DAY, -@days, GETDATE())
      GROUP BY CAST(created_at AS DATE)
      ORDER BY date
    `,
      { days: parseInt(days) },
    );

    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/resource-usage - Resource utilization
router.get(
  "/resource-usage",
  authenticate,
  authorize("admin", "manager"),
  async (req, res, next) => {
    try {
      // Low stock alerts
      const lowStock = await query(`
      SELECT ri.id, rl.name as item_name, rl.category, w.name as warehouse_name,
        ri.quantity, ri.min_threshold, ri.unit,
        CASE WHEN ri.quantity <= ri.min_threshold THEN 1 ELSE 0 END as is_low
      FROM relief_inventory ri
      INNER JOIN relief_items rl ON ri.item_id = rl.id
      INNER JOIN warehouses w ON ri.warehouse_id = w.id
      WHERE ri.quantity <= ri.min_threshold
      ORDER BY (ri.quantity / NULLIF(ri.min_threshold, 0)) ASC
    `);

      // Vehicle utilization
      const vehicles = await query(`
      SELECT type,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'in_use' THEN 1 ELSE 0 END) as in_use
      FROM vehicles
      GROUP BY type
    `);

      // Warehouse capacity
      const warehouses = await query(`
      SELECT w.id, w.name, w.capacity_tons,
        (SELECT SUM(ri.quantity) FROM relief_inventory ri WHERE ri.warehouse_id = w.id) as current_stock
      FROM warehouses w
    `);

      res.json({
        low_stock_alerts: lowStock.recordset,
        vehicle_utilization: vehicles.recordset,
        warehouse_capacity: warehouses.recordset,
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/dashboard/team-stats - Team performance statistics
router.get("/team-stats", authenticate, async (req, res, next) => {
  try {
    const teamStatus = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'on_mission' THEN 1 ELSE 0 END) as on_mission,
        SUM(CASE WHEN status = 'standby' THEN 1 ELSE 0 END) as standby,
        SUM(CASE WHEN status = 'off_duty' THEN 1 ELSE 0 END) as off_duty
      FROM rescue_teams
    `);

    const topTeams = await query(`
      SELECT TOP 10
        rt.id, rt.name, rt.code, rt.status,
        p.name as province_name,
        (SELECT COUNT(*) FROM missions m WHERE m.team_id = rt.id) as total_missions,
        (SELECT COUNT(*) FROM missions m WHERE m.team_id = rt.id AND m.status = 'completed') as completed_missions
      FROM rescue_teams rt
      LEFT JOIN provinces p ON rt.province_id = p.id
      ORDER BY completed_missions DESC
    `);

    res.json({
      status_summary: teamStatus.recordset[0],
      top_teams: topTeams.recordset,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/resource-overview - Resource summary for dashboard
router.get("/resource-overview", authenticate, async (req, res, next) => {
  try {
    const isCoord = req.user.role === "coordinator";
    const coordFilter = isCoord
      ? `AND province_id IN (
           SELECT province_id FROM users WHERE id = @cid
           UNION SELECT province_id FROM coordinator_regions WHERE user_id = @cid
           UNION SELECT province_id FROM warehouses WHERE coordinator_id = @cid
         )`
      : "";
    const coordParams = isCoord ? { cid: req.user.id } : {};

    const vehicles = await query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'in_use' THEN 1 ELSE 0 END) as in_use,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
      FROM vehicles WHERE 1=1 ${coordFilter}
    `, coordParams);

    const inventory = await query(`
      SELECT
        COUNT(*) as total_items,
        SUM(CASE WHEN ri.quantity <= ri.min_threshold THEN 1 ELSE 0 END) as low_stock_count,
        SUM(ri.quantity) as total_quantity
      FROM relief_inventory ri
      JOIN warehouses w ON ri.warehouse_id = w.id
      WHERE 1=1 ${coordFilter.replace(/province_id/g, 'w.province_id')}
    `, coordParams);

    const warehouses = await query(`
      SELECT COUNT(*) as total FROM warehouses WHERE status = 'active' ${coordFilter}
    `, coordParams);

    const pendingVehicleRequests = await query(`
      SELECT COUNT(*) as count FROM vehicle_requests WHERE status = 'pending'
      ${isCoord ? `AND province_id IN (
        SELECT province_id FROM users WHERE id = @cid
        UNION SELECT province_id FROM coordinator_regions WHERE user_id = @cid
        UNION SELECT province_id FROM warehouses WHERE coordinator_id = @cid
      )` : ""}
    `, coordParams);

    res.json({
      vehicles: vehicles.recordset[0],
      inventory: inventory.recordset[0],
      warehouses: warehouses.recordset[0],
      pending_vehicle_requests: pendingVehicleRequests.recordset[0].count,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/weather-impact - Weather alerts correlation
router.get("/weather-impact", authenticate, async (req, res, next) => {
  try {
    const activeAlerts = await query(`
      SELECT wa.*, p.name as province_name
      FROM weather_alerts wa
      LEFT JOIN provinces p ON wa.province_id = p.id
      WHERE wa.expires_at > GETDATE()
      ORDER BY wa.severity DESC, wa.starts_at DESC
    `);

    // Count active requests in provinces with alerts
    const impactedRequests = await query(`
      SELECT COUNT(*) as count
      FROM rescue_requests rr
      WHERE rr.status IN ('pending','verified','assigned','in_progress')
        AND rr.province_id IN (
          SELECT province_id FROM weather_alerts 
          WHERE expires_at > GETDATE() AND province_id IS NOT NULL
        )
    `);

    res.json({
      active_alerts: activeAlerts.recordset,
      impacted_active_requests: impactedRequests.recordset[0].count,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
