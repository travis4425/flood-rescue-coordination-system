require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const logger = require('./config/logger');
const { getPool } = require('./config/database');
const { errorHandler, sanitizeInput } = require('./middlewares/validation');
const setupSocket = require('./socket/handler');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Routes
const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/requests');
const missionRoutes = require('./routes/missions');
const teamRoutes = require('./routes/teams');
const resourceRoutes = require('./routes/resources');
const regionRoutes = require('./routes/regions');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const dashboardRoutes = require('./routes/dashboard');
const configRoutes = require('./routes/config');
const auditLogRoutes = require('./routes/auditLogs');

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});
setupSocket(io);
app.set('io', io);

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' }
});

// Separate, strict limiter CHỈ cho POST /api/auth/login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 50, // 50 lần đăng nhập / 15 phút (khớp với auth.js)
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
  message: { error: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.' },
  skipSuccessfulRequests: true, // Không đếm đăng nhập thành công
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(sanitizeInput);

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: `
    .swagger-ui .topbar { background-color: #0c1e3a; }
    .swagger-ui .topbar .download-url-wrapper .select-label select { border-color: #38bdf8; }
    .swagger-ui .info .title { color: #0c1e3a; }
  `,
  customSiteTitle: 'Flood Rescue API - Swagger Documentation',
  customfavIcon: '/uploads/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true,
    tagsSorter: 'alpha',
    operationsSorter: 'alpha'
  }
}));
// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API Routes
// loginLimiter được gắn trực tiếp vào POST /login trong auth.js
// generalLimiter cho /me, /password
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);  // citizenLimiter applied inside for POST
app.use('/api/missions', generalLimiter, missionRoutes);
app.use('/api/teams', generalLimiter, teamRoutes);
app.use('/api/resources', generalLimiter, resourceRoutes);
app.use('/api/regions', regionRoutes);  // public, no rate limit needed
app.use('/api/users', generalLimiter, userRoutes);
app.use('/api/notifications', generalLimiter, notificationRoutes);
app.use('/api/dashboard', generalLimiter, dashboardRoutes);
app.use('/api/config', generalLimiter, configRoutes);
app.use('/api/audit-logs', generalLimiter, auditLogRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'flood-rescue-api' });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await getPool(); // Test DB connection
    server.listen(PORT, () => {
      logger.info(`🚀 Flood Rescue API running on port ${PORT}`);
      logger.info(`📡 Socket.io ready`);
      logger.info(`📋 Swagger API Docs: http://localhost:${PORT}/api-docs`);
      logger.info(`🌍 CORS: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    // Start without DB for development
    server.listen(PORT, () => {
      logger.warn(`⚠️ Server started WITHOUT database on port ${PORT}`);
    });
  }
}

start();

module.exports = { app, server, io, loginLimiter, generalLimiter };
