const jwt = require("jsonwebtoken");
const logger = require("../config/logger");
const { query } = require("../config/database");

function setupSocket(io) {
  // Authentication middleware for socket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
      } catch (e) {
        /* public user, no auth needed */
      }
    }
    next();
  });

  io.on("connection", (socket) => {
    logger.info(
      `Socket connected: ${socket.id}, user: ${socket.user?.username || "citizen"}`,
    );

    // --- Room Management ---

    // Join user-specific room for targeted notifications
    if (socket.user) {
      socket.join(`user_${socket.user.id}`);
      socket.join(`role_${socket.user.role}`);
      if (socket.user.province_id)
        socket.join(`province_${socket.user.province_id}`);
      if (socket.user.region_id) socket.join(`region_${socket.user.region_id}`);
    }

    // Citizen tracking a request (no login needed)
    socket.on("track_request", (trackingCode) => {
      if (
        typeof trackingCode === "string" &&
        /^RQ-\d{4}-\d{6}$/.test(trackingCode)
      ) {
        socket.join(`request_${trackingCode}`);
        logger.debug(`Socket ${socket.id} tracking request: ${trackingCode}`);
      }
    });

    // Stop tracking a request
    socket.on("untrack_request", (trackingCode) => {
      socket.leave(`request_${trackingCode}`);
    });

    // --- Client to Server Events ---

    // Rescue team location updates (GPS)
    socket.on("update_location", (data) => {
      if (socket.user?.role !== "rescue_team") return;
      const lat = parseFloat(data?.latitude);
      const lng = parseFloat(data?.longitude);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

      const payload = {
        user_id: socket.user.id,
        team_id: data.team_id ? parseInt(data.team_id) : null,
        latitude: lat,
        longitude: lng,
        timestamp: new Date(),
      };
      // Broadcast only to province room nếu biết tỉnh, tránh leak sang tỉnh khác
      if (socket.user.province_id) {
        io.to(`province_${socket.user.province_id}`).emit("team_location", payload);
      } else {
        io.to("role_coordinator").to("role_manager").emit("team_location", payload);
      }
      logger.debug(`Team ${data.team_id} location: ${lat}, ${lng}`);
    });

    // Join province room for regional updates
    socket.on("join_province", (provinceId) => {
      if (provinceId) {
        socket.join(`province_${provinceId}`);
        logger.debug(`Socket ${socket.id} joined province_${provinceId}`);
      }
    });

    // Leave province room
    socket.on("leave_province", (provinceId) => {
      socket.leave(`province_${provinceId}`);
    });

    // Join region room
    socket.on("join_region", (regionId) => {
      if (regionId) {
        socket.join(`region_${regionId}`);
        logger.debug(`Socket ${socket.id} joined region_${regionId}`);
      }
    });

    // Mark notification as read via socket
    socket.on("mark_notification_read", async (notificationId) => {
      if (socket.user && notificationId) {
        try {
          await query(
            "UPDATE notifications SET is_read = true WHERE id = $1",
            [parseInt(notificationId)],
          );
          logger.debug(`User ${socket.user.id} read notification ${notificationId}`);
        } catch (e) {
          logger.error(`mark_notification_read error: ${e.message}`);
        }
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = setupSocket;
