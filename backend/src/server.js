require("dotenv").config();

// Validate required environment variables on startup
const REQUIRED_ENV = ['JWT_SECRET', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missing = REQUIRED_ENV.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors"); //Cho phép browser gọi API từ domain khác (React dev server ở port 5173, backend ở 5000)
// CORS = Cross Origin Resource Sharing
const helmet = require("helmet"); //Tự động set 15+ HTTP security headers (X-Frame-Options, Content-Security-Policy, v.v.) — ngăn clickjacking, MIME sniffing, v.v.
const morgan = require("morgan"); //HTTP request logger — ghi mọi request ra log
const rateLimit = require("express-rate-limit"); //Giới hạn số request theo IP để chống DDoS/brute force
const path = require("path");

const logger = require("./config/logger");
const { getPool } = require("./config/database");
const { errorHandler, sanitizeInput } = require("./middlewares/validation");
const setupSocket = require("./socket/handler");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

// Routes
const authRoutes = require("./routes/auth");
const requestRoutes = require("./routes/requests");
const missionRoutes = require("./routes/missions");
const teamRoutes = require("./routes/teams");
const resourceRoutes = require("./routes/resources");
const regionRoutes = require("./routes/regions");
const userRoutes = require("./routes/users");
const notificationRoutes = require("./routes/notifications");
const dashboardRoutes = require("./routes/dashboard");
const configRoutes = require("./routes/config");
const auditLogRoutes = require("./routes/auditLogs");
const taskRoutes = require("./routes/tasks");
const reportRoutes = require("./routes/reports");
const disasterEventRoutes = require("./routes/disasterEvents");
const ExternalAlertService = require("./services/externalAlertService");

const app = express();
const server = http.createServer(app);

// Socket.io — dùng cùng danh sách origin với Express CORS
const SOCKET_ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",").map(o => o.trim()).filter(Boolean);
const io = new Server(server, {
  cors: {
    origin: SOCKET_ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
});
setupSocket(io);
app.set("io", io);

// HTTPS redirect (production only)
app.use(require('./middlewares/httpsRedirect'));

// Security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", "data:", "https://*.viettelmap.vn", "https://res.cloudinary.com"],
      connectSrc: ["'self'", "wss:", "https://*.viettelmap.vn",
                   "https://api.openweathermap.org",
                   "https://earthquake.usgs.gov",
                   "https://firms.modaps.eosdis.nasa.gov",
                   "https://nominatim.openstreetmap.org"],
      frameSrc:   ["'none'"],
      objectSrc:  ["'none'"],
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// crossOriginResourcePolicy: "cross-origin" cho phép browser load ảnh từ /uploads/ khi frontend ở domain khác.
// Nếu không có option này, helmet mặc định block cross-origin resource loading.
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",").map(o => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, server-to-server)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  }),
);

// Rate limiting — tắt hoàn toàn trong development
const generalLimiter =
  process.env.NODE_ENV === "development"
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: "Quá nhiều yêu cầu, vui lòng thử lại sau." },
      });

// Separate, strict limiter CHỈ cho POST /api/auth/login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 50, // 50 lần đăng nhập / 15 phút (khớp với auth.js)
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
  message: {
    error: "Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.",
  },
  skipSuccessfulRequests: true, // Không đếm đăng nhập thành công
});

// Middleware
app.use(require('cookie-parser')());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } }),
);
app.use(sanitizeInput);

// Static files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Swagger API Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: `
    .swagger-ui .topbar { background-color: #0c1e3a; }
    .swagger-ui .topbar .download-url-wrapper .select-label select { border-color: #38bdf8; }
    .swagger-ui .info .title { color: #0c1e3a; }
  `,
    customSiteTitle: "Flood Rescue API - Swagger Documentation",
    customfavIcon: "/uploads/favicon.ico",
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "none",
      filter: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha",
    },
  }),
);
// Health check — nâng cao (Phase D1)
app.get('/api/health', async (req, res) => {
  const checks = {
    status: 'OK',
    version: process.env.APP_VERSION || '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    services: {}
  };
  try {
    await require('./config/database').query('SELECT 1');
    checks.services.database = { status: 'OK' };
  } catch (e) {
    checks.services.database = { status: 'ERROR', error: e.message };
    checks.status = 'DEGRADED';
  }
  checks.services.socket = { status: 'OK' };
  res.status(checks.status === 'OK' ? 200 : 503).json(checks);
});

// Swagger JSON endpoint
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// API Routes
// loginLimiter được gắn trực tiếp vào POST /login trong auth.js
// generalLimiter cho /me, /password
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes); // citizenLimiter applied inside for POST
app.use("/api/missions", generalLimiter, missionRoutes);
app.use("/api/teams", generalLimiter, teamRoutes);
app.use("/api/resources", generalLimiter, resourceRoutes);
app.use("/api/regions", regionRoutes); // public, no rate limit needed
app.use("/api/users", generalLimiter, userRoutes);
app.use("/api/notifications", generalLimiter, notificationRoutes);
app.use("/api/dashboard", generalLimiter, dashboardRoutes);
app.use("/api/config", generalLimiter, configRoutes);
app.use("/api/audit-logs", generalLimiter, auditLogRoutes);
app.use("/api/tasks", generalLimiter, taskRoutes);
app.use("/api/reports", generalLimiter, reportRoutes);
app.use("/api/disaster-events", generalLimiter, disasterEventRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "flood-rescue-api",
  });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await getPool(); // Test DB connection
    server.listen(PORT, () => {
      logger.info(`🚀 VDRCS API running on port ${PORT}`);
      logger.info(`📡 Socket.io ready`);
      logger.info(`📋 Swagger API Docs: http://localhost:${PORT}/api-docs`);
      logger.info(`🌍 CORS: ${process.env.CORS_ORIGIN || "http://localhost:5173"}`);
      ExternalAlertService.startScheduler();
    });
  } catch (err) {
    logger.error("Failed to start server:", err);
    // Start without DB for development
    server.listen(PORT, () => {
      logger.warn(`⚠️ Server started WITHOUT database on port ${PORT}`);
    });
  }
}

start();

module.exports = { app, server, io, loginLimiter, generalLimiter };
