# FLOOD RESCUE SYSTEM — PRODUCTION UPGRADE
## Prompt cho Claude Code in VS Code

---

## CONTEXT

Tôi có project "Flood Rescue Coordination & Relief Management System" — một hệ thống điều phối cứu hộ lũ lụt fullstack cho Việt Nam. Stack: Node.js/Express backend, React/Vite frontend, SQL Server, Socket.io, JWT, Tailwind CSS.

File `.claude/CLAUDE.md` trong project này có đầy đủ kiến trúc chuẩn, patterns, và nguyên tắc bất biến. **Đọc kỹ file đó trước khi làm bất cứ điều gì.**

Mục tiêu: Nâng cấp project lên chuẩn production-grade, ngang với các hệ thống quản lý thiên tai được đầu tư bài bản như Ushahidi, WebEOC.

---

## YÊU CẦU TỔNG QUÁT

- Làm từng phase theo thứ tự — KHÔNG nhảy phase
- Mỗi phase phải chạy được và không break feature cũ trước khi sang phase tiếp
- Sau mỗi phase, tóm tắt những file đã thay đổi và lý do
- Nếu gặp ambiguity, hỏi trước — không tự giả định
- Commit message format: `feat(phase-X): mô tả ngắn`

---

## PHASE 1 — FIX BẢN ĐỒ CHỦ QUYỀN (30 phút)

**Tại sao critical:** OpenStreetMap (`tile.openstreetmap.org`) không hiển thị Hoàng Sa & Trường Sa theo lập trường chủ quyền Việt Nam — vi phạm quy định pháp lý nếu deploy thực tế.

**Làm:**

1. Tạo file `frontend/src/config/mapConfig.js` với nội dung theo pattern trong `.claude/CLAUDE.md` (phần "MAP CONFIG CHUẨN")

2. Tìm toàn bộ file trong `frontend/src/` có chứa `openstreetmap.org` — dùng lệnh:
   ```
   grep -rn "openstreetmap" frontend/src/
   ```
   Với mỗi file tìm được: thay `TileLayer` URL bằng `MAP_CONFIG.tileUrl` từ `mapConfig.js`, import `MAP_CONFIG` vào đầu file.

3. Tìm toàn bộ `MapContainer` trong frontend — đảm bảo tất cả đều dùng `center={MAP_CONFIG.defaultCenter}` và `zoom={MAP_CONFIG.defaultZoom}` làm default (không hardcode).

4. Thêm error handler cho tile load fail — nếu Vmap không load được, tự động fallback sang `MAP_CONFIG.fallbackTileUrl`:
   ```jsx
   <TileLayer
     url={tileError ? MAP_CONFIG.fallbackTileUrl : MAP_CONFIG.tileUrl}
     subdomains={MAP_CONFIG.subdomains}
     attribution={MAP_CONFIG.attribution}
     eventHandlers={{ tileerror: () => setTileError(true) }}
   />
   ```

5. Test: mở bản đồ tại tọa độ `MAP_CONFIG.sovereigntyCheckPoints.hoangSa` và `truongSa` — kiểm tra hiển thị.

---

## PHASE 2 — INFRASTRUCTURE: Cache + Validate Middleware (2 giờ)

Tạo 2 utilities dùng xuyên suốt project — phải làm trước khi refactor routes.

**2A. Tạo Cache Utility:**

Tạo file `backend/src/utils/cache.js` theo pattern trong `.claude/CLAUDE.md` (phần "CACHE UTILITY"). Không thay đổi gì khác.

**2B. Tạo Validate Middleware:**

Tạo file `backend/src/middlewares/validate.js` theo pattern trong `.claude/CLAUDE.md` (phần "VALIDATE MIDDLEWARE").

Cài dependency: `cd backend && npm install zod`

**2C. Tạo thư mục structure mới (empty folders + .gitkeep):**
```
backend/src/controllers/.gitkeep
backend/src/services/.gitkeep (đã có weatherService.js — giữ nguyên)
backend/src/repositories/.gitkeep
backend/src/validators/.gitkeep
```

---

## PHASE 3 — REFACTOR: Auth Module (3 giờ)

Đây là module quan trọng nhất và phức tạp nhất về security. Làm kỹ.

**3A. Tạo `backend/src/repositories/userRepository.js`:**

Extract từ `routes/auth.js` và `routes/users.js` tất cả SQL queries liên quan đến bảng `users`. Implement đầy đủ:
- `findByUsername(username)` → trả về user có password_hash (dùng cho login)
- `findById(id)` → trả về user không có password_hash
- `findAll(filters)` → có pagination, filter theo role/province
- `create(userData)` → INSERT với OUTPUT INSERTED.*
- `update(id, data)` → UPDATE chỉ các field được truyền vào
- `updatePassword(id, hashedPassword)`
- `softDelete(id)` → set is_active = 0

**3B. Tạo `backend/src/validators/authValidator.js`:**

```js
const { z } = require('zod');

exports.loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(1).max(100)
});

exports.changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
      'Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 số')
});
```

**3C. Tạo `backend/src/repositories/refreshTokenRepository.js`:**

```js
const { query } = require('../config/database');

const RefreshTokenRepository = {
  async create(token, userId) {
    await query(
      `INSERT INTO refresh_tokens (token, user_id, expires_at)
       VALUES (@token, @userId, DATEADD(day, 7, GETDATE()))`,
      { token, userId }
    );
  },

  async findValid(token) {
    const result = await query(
      `SELECT rt.*, u.id as user_id, u.username, u.role, u.province_id, u.region_id
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token = @token
         AND rt.expires_at > GETDATE()
         AND rt.revoked_at IS NULL
         AND u.is_active = 1`,
      { token }
    );
    return result.recordset[0] || null;
  },

  async revoke(token) {
    await query(
      'UPDATE refresh_tokens SET revoked_at = GETDATE() WHERE token = @token',
      { token }
    );
  },

  async revokeAllForUser(userId) {
    await query(
      'UPDATE refresh_tokens SET revoked_at = GETDATE() WHERE user_id = @userId AND revoked_at IS NULL',
      { userId }
    );
  }
};

module.exports = RefreshTokenRepository;
```

**3D. Thêm migration SQL:**

Tạo file `database/migrations/001_refresh_tokens.sql`:
```sql
-- Migration: Add refresh_tokens table
-- Run once on existing database

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='refresh_tokens' AND xtype='U')
BEGIN
  CREATE TABLE refresh_tokens (
    id INT IDENTITY(1,1) PRIMARY KEY,
    token UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    user_id INT NOT NULL,
    expires_at DATETIME2 NOT NULL,
    revoked_at DATETIME2 NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_refresh_tokens_user FOREIGN KEY (user_id) 
      REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE UNIQUE INDEX idx_refresh_token_token 
    ON refresh_tokens(token) WHERE revoked_at IS NULL;
  
  CREATE INDEX idx_refresh_token_user 
    ON refresh_tokens(user_id);

  PRINT 'Created refresh_tokens table';
END
ELSE
  PRINT 'refresh_tokens table already exists';
```

**3E. Tạo `backend/src/services/authService.js`:**

```js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UserRepository = require('../repositories/userRepository');
const RefreshTokenRepository = require('../repositories/refreshTokenRepository');
const logger = require('../config/logger');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict'
};

const AuthService = {
  async login(username, password, res) {
    const user = await UserRepository.findByUsername(username);
    
    // Timing-safe: dù user không tồn tại vẫn chạy bcrypt để tránh timing attack
    const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.here';
    const passwordToCheck = user?.password_hash || dummyHash;
    const valid = await bcrypt.compare(password, passwordToCheck);
    
    if (!user || !valid || !user.is_active) {
      logger.warn(`Failed login attempt for username: ${username}`);
      throw Object.assign(new Error('INVALID_CREDENTIALS'), { status: 401 });
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      province_id: user.province_id,
      region_id: user.region_id
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    });

    const refreshToken = crypto.randomUUID();
    await RefreshTokenRepository.create(refreshToken, user.id);

    // Set cookies (httpOnly — không accessible bởi JS)
    res.cookie('access_token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000 // 15 phút
    });
    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
      path: '/api/auth' // Chỉ gửi khi gọi /api/auth/*
    });

    logger.info(`User ${user.username} (${user.role}) logged in`);
    return this._sanitizeUser(user);
  },

  async refresh(refreshToken, res) {
    if (!refreshToken) throw Object.assign(new Error('NO_REFRESH_TOKEN'), { status: 401 });

    const tokenData = await RefreshTokenRepository.findValid(refreshToken);
    if (!tokenData) throw Object.assign(new Error('INVALID_REFRESH_TOKEN'), { status: 401 });

    const payload = {
      id: tokenData.user_id,
      username: tokenData.username,
      role: tokenData.role,
      province_id: tokenData.province_id,
      region_id: tokenData.region_id
    };

    const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    });

    res.cookie('access_token', newAccessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000
    });

    return { message: 'Token refreshed' };
  },

  async logout(refreshToken, res) {
    if (refreshToken) {
      await RefreshTokenRepository.revoke(refreshToken);
    }
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/api/auth' });
  },

  _sanitizeUser(user) {
    const { password_hash, ...safe } = user;
    return safe;
  }
};

module.exports = AuthService;
```

**3F. Tạo `backend/src/controllers/authController.js`:**

```js
const AuthService = require('../services/authService');

const AuthController = {
  async login(req, res, next) {
    try {
      const user = await AuthService.login(req.body.username, req.body.password, res);
      res.json({ user, message: 'Đăng nhập thành công' });
    } catch (err) {
      if (err.message === 'INVALID_CREDENTIALS')
        return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
      next(err);
    }
  },

  async refresh(req, res, next) {
    try {
      const result = await AuthService.refresh(req.cookies?.refresh_token, res);
      res.json(result);
    } catch (err) {
      if (['NO_REFRESH_TOKEN','INVALID_REFRESH_TOKEN'].includes(err.message))
        return res.status(401).json({ error: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' });
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      await AuthService.logout(req.cookies?.refresh_token, res);
      res.json({ message: 'Đăng xuất thành công' });
    } catch (err) {
      next(err);
    }
  },

  async getMe(req, res, next) {
    try {
      const UserRepository = require('../repositories/userRepository');
      const user = await UserRepository.findById(req.user.id);
      if (!user) return res.status(404).json({ error: 'Người dùng không tồn tại.' });
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = AuthController;
```

**3G. Cập nhật `backend/src/middlewares/auth.js`:**

Sửa `authenticate` để đọc từ cookie TRƯỚC, fallback sang Bearer header (backward compat):
```js
function authenticate(req, res, next) {
  // Ưu tiên cookie (production), fallback Bearer header (dev/API testing)
  const token = req.cookies?.access_token || 
    (req.headers.authorization?.startsWith('Bearer ') 
      ? req.headers.authorization.split(' ')[1] 
      : null);

  if (!token) return res.status(401).json({ error: 'Không có quyền truy cập. Vui lòng đăng nhập.' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ error: 'TOKEN_EXPIRED', message: 'Phiên làm việc hết hạn.' });
    return res.status(401).json({ error: 'Token không hợp lệ.' });
  }
}
```

**3H. Cập nhật `backend/src/server.js`:**

Thêm cookie-parser:
```bash
npm install cookie-parser
```
Thêm vào server.js: `app.use(require('cookie-parser')());` (trước các routes)

**3I. Cập nhật `frontend/src/store/authStore.js`:**

Xóa `localStorage.setItem('token', ...)` và `localStorage.setItem('user', ...)`. Token giờ tự động qua cookie. Chỉ lưu `user` object vào state (không cần localStorage).

Thêm auto-refresh logic:
```js
// Trong api.js — thêm interceptor
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.data?.error === 'TOKEN_EXPIRED' && !original._retry) {
      original._retry = true;
      try {
        await authAPI.refresh(); // POST /api/auth/refresh
        return api(original);   // Retry original request
      } catch {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(err);
  }
);
```

Thêm `withCredentials: true` vào axios instance.

**3J. Thay thế `routes/auth.js`:** Xóa toàn bộ logic inline, chỉ giữ router:
```js
const router = require('express').Router();
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const { loginSchema, changePasswordSchema } = require('../validators/authValidator');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 50, skipSuccessfulRequests: true });

router.post('/login', loginLimiter, validateBody(loginSchema), AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/me', authenticate, AuthController.getMe);

module.exports = router;
```

---

## PHASE 4 — REFACTOR: Modules còn lại (theo thứ tự)

Làm từng module theo pattern đã thiết lập ở Phase 3. Thứ tự: **regions → teams → missions → requests → resources → tasks**

Với mỗi module, làm đúng thứ tự:
1. `repositories/[module]Repository.js` — extract SQL
2. `validators/[module]Validator.js` — Zod schemas
3. `services/[module]Service.js` — business logic + cache
4. `controllers/[module]Controller.js` — HTTP layer
5. Cập nhật `routes/[module].js` — chỉ còn router definitions

**Lưu ý đặc biệt cho requests module:**
- Tracking code generation phải ở trong RequestService
- SMS/notification emit phải qua Socket.io (lấy io từ `req.app.get('io')`)
- Citizen rate limiting giữ nguyên

**Lưu ý đặc biệt cho resources module (96KB — lớn nhất):**
- Tách ra 2 repositories: `resourceRepository.js` và `warehouseRepository.js`
- Tách ra 2 services tương ứng
- Tách ra 2 controllers tương ứng
- Giữ nguyên 1 file routes nhưng import từ cả 2 controllers

**Lưu ý cho cache:**
- Regions: cache 3600s (1 tiếng) — dữ liệu tỉnh/thành không đổi
- Config: cache 1800s (30 phút)
- Dashboard stats: cache 120s (2 phút)
- Warehouses list: cache 300s (5 phút)
- Invalidate cache sau mỗi write operation

---

## PHASE 5 — FRONTEND: Component Splitting

**Mục tiêu:** Không file nào > 300 lines. Mỗi component có single responsibility.

**5A. Tạo common components:**

`frontend/src/components/common/DataTable.jsx` — Reusable sortable/paginated table:
- Props: `columns, data, loading, pagination, onPageChange, onSort`
- Có loading skeleton state
- Có empty state với icon + message

`frontend/src/components/common/StatusBadge.jsx` — Reusable status badge:
- Props: `status, type` (type = 'request' | 'mission' | 'task' | 'resource')
- Tự map status → màu (dùng Tailwind classes)

`frontend/src/components/common/ConfirmDialog.jsx` — Modal xác nhận:
- Props: `open, title, message, onConfirm, onCancel, variant` (variant = 'danger' | 'warning')

`frontend/src/components/common/EmptyState.jsx`:
- Props: `icon, title, description, action`

**5B. Tạo map components:**

`frontend/src/components/map/FloodMap.jsx` — Central map component:
- Tất cả logic bản đồ tập trung vào đây
- Props: `requests, warehouses, onMapClick, height`
- Dùng `MAP_CONFIG` từ `mapConfig.js`
- Có tile error fallback

`frontend/src/components/map/RequestMarker.jsx` — Marker cho từng request
`frontend/src/components/map/WarehouseMarker.jsx` — Marker cho warehouse

**5C. Tách ResourcesPage.jsx (138KB → nhiều files):**

Tạo thư mục `frontend/src/pages/resources/`:
- `ResourcesPage.jsx` — Orchestration only (≤150 lines), import các components
- `ResourceList.jsx` — Bảng danh sách resources
- `ResourceForm.jsx` — Form thêm/sửa resource  
- `ResourceFilters.jsx` — Bộ lọc
- `ResourceCard.jsx` — Card hiển thị một resource
- `InventoryAdjustModal.jsx` — Modal điều chỉnh tồn kho
- `hooks/useResources.js` — Data fetching & state

**5D. Tách TasksPage.jsx (115KB → nhiều files):**

Tạo thư mục `frontend/src/pages/tasks/`:
- `TasksPage.jsx` — Orchestration only
- `TaskList.jsx` — Kanban board hoặc bảng tasks
- `TaskCard.jsx` — Card task với actions
- `TaskForm.jsx` — Form tạo/sửa task
- `TaskFilters.jsx`
- `hooks/useTasks.js`

**5E. Tạo shared custom hooks:**

`frontend/src/hooks/useSocket.js`:
```js
import { useEffect, useRef } from 'react';
import { getSocket } from '../services/socket';

export function useSocket(events) {
  const socketRef = useRef(getSocket());
  
  useEffect(() => {
    const socket = socketRef.current;
    Object.entries(events).forEach(([event, handler]) => socket.on(event, handler));
    return () => Object.entries(events).forEach(([event, handler]) => socket.off(event, handler));
  }, []);
  
  return socketRef.current;
}
```

`frontend/src/hooks/useRequests.js`, `useResources.js`, `useTasks.js` — theo pattern trong `.claude/CLAUDE.md`

---

## PHASE 6 — EXPORT REPORTS

**6A. Backend — Install ExcelJS:**
```bash
cd backend && npm install exceljs
```

**6B. Tạo `backend/src/services/reportService.js`:**

Implement export functions:
- `exportRequestsToExcel(filters)` → ExcelJS Workbook buffer
  - Columns: Mã theo dõi, Họ tên, SĐT, Địa chỉ, Tỉnh/thành, Loại khẩn cấp, Mức độ, Trạng thái, Ngày tạo, Ngày cập nhật
  - Header row: màu xanh navy `#0c1e3a`, chữ trắng, bold
  - Alternate row colors: trắng / xám nhạt `#f5f5f5`
  - Auto-fit column widths

- `exportMissionsToExcel(filters)` → tương tự
- `exportResourcesToExcel(filters)` → tương tự

**6C. Tạo `backend/src/controllers/reportController.js` và `routes/reports.js`:**

```
GET /api/reports/requests?format=excel&from=YYYY-MM-DD&to=YYYY-MM-DD&province_id=X
GET /api/reports/missions?format=excel
GET /api/reports/resources?format=excel
```

Response headers:
```js
res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
res.setHeader('Content-Disposition', `attachment; filename="bao-cao-yeu-cau-${Date.now()}.xlsx"`);
```

**6D. Frontend — Thêm nút "Xuất báo cáo":**
- Trên `Dashboard.jsx`: nút "Xuất báo cáo tổng hợp"
- Trên `RequestsManagementPage.jsx`: nút "Xuất danh sách"
- Trên `ResourcesPage.jsx`: nút "Xuất kho"
- Dùng `window.open(url)` hoặc `<a download href={url}>` để trigger download

---

## PHASE 7 — PWA SUPPORT

**7A. Install và config:**
```bash
cd frontend && npm install -D vite-plugin-pwa workbox-window
```

Cập nhật `vite.config.js` thêm VitePWA plugin:
```js
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Hệ thống Cứu hộ Lũ lụt',
        short_name: 'CứuHộ',
        description: 'Flood Rescue Coordination & Relief Management System',
        theme_color: '#0c1e3a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/regions'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'api-regions',
              expiration: { maxAgeSeconds: 3600 }
            }
          },
          {
            urlPattern: ({ url }) => url.hostname.includes('viettelmap.vn'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 86400 }
            }
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxAgeSeconds: 300 }
            }
          }
        ]
      }
    })
  ]
});
```

**7B. Offline queue cho Citizen requests:**

Tạo `frontend/src/utils/offlineQueue.js`:
```js
const DB_NAME = 'flood-rescue-offline';
const STORE_NAME = 'pending-requests';

async function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE_NAME, { autoIncrement: true, keyPath: 'id' });
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueOfflineRequest(requestData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({ ...requestData, queuedAt: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function syncPendingRequests() {
  if (!navigator.onLine) return;
  const db = await openDB();
  const items = await new Promise(resolve => {
    const req = db.transaction(STORE_NAME).objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
  });
  
  for (const item of items) {
    try {
      const { id, queuedAt, ...data } = item;
      await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
    } catch {
      break; // Còn offline, dừng lại
    }
  }
}

// Auto-sync khi có lại mạng
if (typeof window !== 'undefined') {
  window.addEventListener('online', syncPendingRequests);
}
```

Cập nhật `CitizenHome.jsx`: Khi submit form mà `!navigator.onLine`, call `queueOfflineRequest()` thay vì gọi API trực tiếp. Hiển thị toast "Đã lưu offline, sẽ gửi khi có lại mạng."

**7C. Online/Offline indicator:**

Thêm component `frontend/src/components/common/OnlineStatus.jsx`:
```jsx
// Hiển thị banner nhỏ khi offline: "Bạn đang offline. Dữ liệu có thể chưa được cập nhật."
// Tự ẩn khi online lại
```

Thêm vào `DashboardLayout.jsx`.

---

## PHASE 8 — DOCKER

**8A. Tạo `backend/Dockerfile`:**
```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY src/ ./src/
EXPOSE 5000
USER node
CMD ["node", "src/server.js"]
```

**8B. Tạo `frontend/Dockerfile`:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**8C. Tạo `frontend/nginx.conf`:**
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API về backend
    location /api/ {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**8D. Tạo `docker-compose.yml` ở root:**
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    environment:
      NODE_ENV: production
      PORT: 5000
      DB_SERVER: mssql
      DB_NAME: ${DB_NAME:-flood_rescue_db}
      DB_USER: sa
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: http://localhost
    depends_on:
      mssql:
        condition: service_healthy
    restart: unless-stopped
    volumes:
      - backend_uploads:/app/uploads
      - backend_logs:/app/logs

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  mssql:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      ACCEPT_EULA: Y
      SA_PASSWORD: ${DB_PASSWORD}
      MSSQL_PID: Developer
    volumes:
      - mssql_data:/var/opt/mssql
    healthcheck:
      test: /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P $$SA_PASSWORD -Q "SELECT 1" || exit 1
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s
    restart: unless-stopped

volumes:
  mssql_data:
  backend_uploads:
  backend_logs:
```

**8E. Tạo `.env.docker.example`:**
```env
DB_PASSWORD=YourStrongPassword123!
JWT_SECRET=your-256-bit-random-secret-here
DB_NAME=flood_rescue_db
```

**8F. Cập nhật `.gitignore`:** Thêm `.env.docker`

---

## PHASE 9 — CLEANUP & FINAL TOUCHES

**9A. Xóa `frontend/dist/` khỏi git tracking:**
```bash
# Thêm vào frontend/.gitignore
dist/

# Remove from git tracking (giữ file local)
git rm -r --cached frontend/dist/
```

**9B. Thêm startup env validation vào `backend/src/server.js`:**
```js
// Validate required env vars on startup
const REQUIRED_ENV = ['JWT_SECRET', 'DB_SERVER', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missing = REQUIRED_ENV.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
```

**9C. Tạo `ecosystem.config.js` cho PM2:**
```js
module.exports = {
  apps: [{
    name: 'flood-rescue-api',
    script: 'src/server.js',
    cwd: './backend',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './backend/logs/pm2-error.log',
    out_file: './backend/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
```

**9D. Cập nhật `README.md`:** Thêm hướng dẫn:
- Quick start với Docker: `docker-compose up`
- Quick start manual: từng bước setup
- Architecture overview
- API documentation link
- Map config note (Vmap)

---

## CHECKLIST HOÀN THÀNH

Sau khi hoàn tất tất cả phase, kiểm tra:

- [ ] Bản đồ hiển thị đúng tại Hoàng Sa và Trường Sa
- [ ] Login/logout hoạt động với cookie (không có token trong localStorage)
- [ ] Token tự động refresh khi expire
- [ ] Tất cả route file không chứa SQL queries trực tiếp
- [ ] Mỗi file component frontend ≤ 300 lines
- [ ] `docker-compose up` chạy được toàn bộ stack
- [ ] Export Excel hoạt động
- [ ] Offline form submission hoạt động (test bằng cách tắt network trong DevTools)
- [ ] Tất cả API endpoints vẫn hoạt động như trước (không regression)
- [ ] `frontend/dist/` không còn tracked bởi git
