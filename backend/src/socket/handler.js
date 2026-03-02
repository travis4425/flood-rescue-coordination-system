const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

function setupSocket(io) {
  // Authentication middleware for socket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
      } catch (e) { /* public user, no auth needed */ }
    }
    next();
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}, user: ${socket.user?.username || 'citizen'}`);

    // --- Room Management ---

    // Join user-specific room for targeted notifications
    if (socket.user) {
      socket.join(`user_${socket.user.id}`);
      socket.join(`role_${socket.user.role}`);
      if (socket.user.province_id) socket.join(`province_${socket.user.province_id}`);
      if (socket.user.region_id) socket.join(`region_${socket.user.region_id}`);
    }

    // Citizen tracking a request (no login needed)
    socket.on('track_request', (trackingCode) => {
      if (typeof trackingCode === 'string' && /^RQ-\d{4}-\d{6}$/.test(trackingCode)) {
        socket.join(`request_${trackingCode}`);
        logger.debug(`Socket ${socket.id} tracking request: ${trackingCode}`);
      }
    });

    // Stop tracking a request
    socket.on('untrack_request', (trackingCode) => {
      socket.leave(`request_${trackingCode}`);
    });

    // --- Client to Server Events ---

    // Rescue team location updates (GPS)
    socket.on('update_location', (data) => {
      if (socket.user && data?.latitude && data?.longitude) {
        const payload = {
          user_id: socket.user.id,
          team_id: data.team_id,
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          timestamp: new Date()
        };
        // Broadcast to coordinators and managers
        io.to('role_coordinator').to('role_manager').emit('team_location', payload);
        logger.debug(`Team ${data.team_id} location: ${data.latitude}, ${data.longitude}`);
      }
    });

    // Join province room for regional updates
    socket.on('join_province', (provinceId) => {
      if (provinceId) {
        socket.join(`province_${provinceId}`);
        logger.debug(`Socket ${socket.id} joined province_${provinceId}`);
      }
    });

    // Leave province room
    socket.on('leave_province', (provinceId) => {
      socket.leave(`province_${provinceId}`);
    });

    // Join region room
    socket.on('join_region', (regionId) => {
      if (regionId) {
        socket.join(`region_${regionId}`);
        logger.debug(`Socket ${socket.id} joined region_${regionId}`);
      }
    });

    // Mark notification as read via socket
    socket.on('mark_notification_read', (notificationId) => {
      if (socket.user) {
        logger.debug(`User ${socket.user.id} read notification ${notificationId}`);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  // --- Server to Client Event Reference ---
  // These events are emitted from route handlers via req.app.get('io'):
  //
  // REQUEST lifecycle:
  //   'new_request'           -> broadcast when citizen submits request
  //   'request_updated'       -> broadcast when request status changes
  //   'request_rejected'      -> to request_${trackingCode} room when coordinator rejects
  //   'request_assigned'      -> to user_${coordinatorId} when request reassigned
  //
  // MISSION lifecycle:
  //   'mission_created'       -> broadcast when coordinator assigns team
  //   'mission_updated'       -> broadcast when rescue team updates status/submits result
  //
  // TEAM:
  //   'team_location_updated' -> broadcast when team GPS location updates via REST
  //   'team_location'         -> broadcast when team sends GPS via socket
  //
  // NOTIFICATIONS:
  //   'notification'          -> to user_${userId} for personal notifications
  //
  // WEATHER:
  //   'weather_alert'         -> broadcast + to province_${provinceId} for new alerts
  //

  return io;
}

module.exports = setupSocket;
