# 🚨 Flood Rescue System — Backend API

## Cấu trúc thư mục

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          # SQL Server connection pool + auto-typed params
│   │   └── logger.js            # Winston logging (error.log + combined.log)
│   ├── middlewares/
│   │   ├── auth.js              # JWT authenticate, authorize(roles...), optionalAuth
│   │   ├── validation.js        # Error handler, validateRequired, sanitizeInput (XSS)
│   │   └── upload.js            # Multer image upload (10MB, JPEG/PNG/GIF/WebP)
│   ├── routes/
│   │   ├── auth.js              # POST /login, GET /me, PUT /password
│   │   ├── requests.js          # Yêu cầu cứu hộ: submit, track, verify, assign, reject
│   │   ├── missions.js          # Nhiệm vụ: list (kèm all members), status, result, logs
│   │   ├── teams.js             # Đội cứu hộ: CRUD, members, GPS location
│   │   ├── resources.js         # Phương tiện, kho, tồn kho, dispatches, incident flow
│   │   ├── tasks.js             # Task groups: assign member, scheduled date, reports
│   │   ├── regions.js           # Địa lý + weather alerts + incident types + urgency levels
│   │   ├── users.js             # Quản lý user (6 roles) + coordinator regions
│   │   ├── notifications.js     # Thông báo: CRUD, mark read, unread count
│   │   ├── dashboard.js         # Thống kê: overview, heatmap, trend, workload
│   │   ├── config.js            # Cấu hình hệ thống (Admin)
│   │   └── auditLogs.js         # Nhật ký hệ thống (Admin)
│   ├── socket/
│   │   └── handler.js           # Socket.io real-time events + room management
│   ├── utils/
│   │   └── helpers.js           # Tracking code, Haversine distance, pagination
│   └── server.js                # Express + Socket.io entry point
├── uploads/                     # Thư mục lưu ảnh upload
├── logs/                        # Winston log files
├── .env                         # Cấu hình môi trường
├── .env.example                 # Mẫu cấu hình
└── package.json
```

## Cài đặt & Chạy

```bash
cd backend
npm install
cp .env.example .env   # rồi điền DB_PASSWORD, JWT_SECRET
npm run dev            # → http://localhost:5000
                       # → Swagger: http://localhost:5000/api-docs
```

### Biến môi trường quan trọng

| Biến | Mô tả | Default |
|------|-------|---------|
| `DB_SERVER` | Địa chỉ SQL Server | `localhost` |
| `DB_PASSWORD` | Mật khẩu SQL Server | *(bắt buộc)* |
| `DB_NAME` | Tên database | `flood_rescue_db` |
| `JWT_SECRET` | Secret key JWT | *(đổi khi production!)* |
| `CORS_ORIGIN` | URL frontend | `http://localhost:5173` |
| `OPENWEATHERMAP_API_KEY` | Weather API (tuỳ chọn) | — |
| `CITIZEN_RATE_LIMIT_MAX` | Giới hạn yêu cầu/giờ | `10` |

---

## Roles

| Role | Code | Quyền hạn |
|------|------|-----------|
| Admin | `admin` | Quản lý user, cấu hình, danh mục, nhật ký |
| Manager | `manager` | Toàn bộ tài nguyên, thống kê toàn hệ thống |
| Warehouse Manager | `warehouse_manager` | Kho tổng: xác nhận xuất/nhập vật tư & xe, xử lý sự cố |
| Coordinator | `coordinator` | Xác minh yêu cầu, phân công đội, xuất vật tư/xe theo tỉnh |
| Rescue Team | `rescue_team` | Nhận nhiệm vụ, cập nhật trạng thái, báo sự cố xe |

---

## API Endpoints (90+ endpoints)

### 🔓 Public — Citizen

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/requests` | Gửi yêu cầu cứu hộ + upload ảnh (rate limited) |
| GET | `/api/requests/track/:code` | Theo dõi yêu cầu qua mã |
| GET | `/api/requests/track/:code/notifications` | Thông báo theo mã tracking |
| GET | `/api/requests/map` | Bản đồ tất cả sự cố |
| GET | `/api/regions/provinces` | Danh sách tỉnh |
| GET | `/api/regions/incident-types` | Loại sự cố |
| GET | `/api/regions/urgency-levels` | Mức độ khẩn cấp |
| GET | `/api/regions/weather-alerts` | Cảnh báo thời tiết |
| GET | `/api/regions/weather-current/:id` | Thời tiết thực tế tỉnh |
| GET | `/api/regions/weather-forecast/:id` | Dự báo 5 ngày |

### 🔐 Auth

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/login` | Đăng nhập → trả JWT |
| GET | `/api/auth/me` | Thông tin user hiện tại |
| PUT | `/api/auth/password` | Đổi mật khẩu |

### 🚒 Rescue Team

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/missions` | DS nhiệm vụ (kèm tất cả thành viên được giao) |
| GET | `/api/missions/:id` | Chi tiết nhiệm vụ |
| PUT | `/api/missions/:id/status` | Cập nhật trạng thái nhiệm vụ |
| POST | `/api/missions/:id/result` | Upload kết quả + ảnh |
| GET | `/api/missions/:id/logs` | Nhật ký nhiệm vụ |
| PUT | `/api/teams/:id/location` | Cập nhật GPS |
| GET | `/api/tasks` | DS task của đội |
| PUT | `/api/tasks/:id/assign-member` | Giao thành viên thực hiện task |
| PUT | `/api/tasks/:id/scheduled-date` | Đặt ngày thực hiện |
| PUT | `/api/resources/vehicle-dispatches/:id/report-incident` | 🚨 Báo sự cố xe (damaged/lost) |

### 📋 Coordinator

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/requests` | DS yêu cầu (lọc theo province) |
| PUT | `/api/requests/:id/verify` | Xác minh + phân loại urgency |
| PUT | `/api/requests/:id/reject` | Từ chối + lý do |
| PUT | `/api/requests/:id/assign` | Giao đội cứu hộ |
| GET | `/api/requests/:id/suggest-team` | Gợi ý đội gần nhất |
| GET | `/api/resources/warehouses?province_id=` | Kho trong tỉnh |
| GET | `/api/resources/vehicles?province_id=` | Xe trong tỉnh |
| POST | `/api/resources/distributions` | Tạo phiếu xuất vật tư |
| POST | `/api/resources/vehicle-dispatches` | Tạo lệnh điều xe |

### 🏭 Warehouse Manager

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/resources/distributions` | DS phiếu xuất vật tư |
| PUT | `/api/resources/distributions/:id/warehouse-confirm` | Xác nhận bàn giao vật tư |
| PUT | `/api/resources/distributions/:id/confirm-return` | Xác nhận nhận lại (kèm số lượng thực tế) |
| GET | `/api/resources/vehicle-dispatches` | DS lệnh điều xe |
| PUT | `/api/resources/vehicle-dispatches/:id/warehouse-confirm` | Xác nhận bàn giao xe |
| PUT | `/api/resources/vehicle-dispatches/:id/confirm-return` | Xác nhận nhận lại xe |
| PUT | `/api/resources/vehicle-dispatches/:id/confirm-incident` | Xác nhận tình trạng xe sự cố |

### 📊 Manager

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET/POST/PUT | `/api/resources/vehicles` | CRUD phương tiện |
| GET/POST/PUT | `/api/resources/warehouses` | CRUD kho hàng |
| GET/PUT | `/api/resources/inventory` | Tồn kho |
| GET/POST/PUT | `/api/teams` | CRUD đội cứu hộ |
| POST/DELETE | `/api/teams/:id/members` | Quản lý thành viên |
| GET | `/api/dashboard/overview` | Tổng quan hệ thống |
| GET | `/api/dashboard/by-province` | Thống kê theo tỉnh |
| GET | `/api/dashboard/heatmap` | Bản đồ nhiệt sự cố |
| GET | `/api/dashboard/daily-trend` | Xu hướng theo ngày |
| GET | `/api/dashboard/resource-usage` | Sử dụng tài nguyên |

### ⚙️ Admin

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET/POST/PUT | `/api/users` | CRUD tài khoản (gồm warehouse_manager) |
| PUT | `/api/users/:id/toggle-active` | Kích hoạt/vô hiệu hóa |
| PUT | `/api/users/:id/reset-password` | Reset mật khẩu (→ 123456) |
| GET | `/api/users/coordinators` | DS coordinator + workload |
| GET/PUT | `/api/config` | Cấu hình hệ thống |
| GET | `/api/audit-logs` | Nhật ký hoạt động |

### 🔔 Notifications

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/notifications` | DS thông báo của tôi |
| GET | `/api/notifications/unread-count` | Số chưa đọc |
| PUT | `/api/notifications/:id/read` | Đánh dấu đã đọc |
| PUT | `/api/notifications/read-all` | Đánh dấu tất cả đã đọc |
| DELETE | `/api/notifications/:id` | Xóa thông báo |

---

## Socket.io Events

### Client → Server

| Event | Data | Mô tả |
|-------|------|-------|
| `track_request` | trackingCode | Citizen theo dõi yêu cầu |
| `untrack_request` | trackingCode | Ngừng theo dõi |
| `update_location` | `{team_id, latitude, longitude}` | GPS đội cứu hộ |
| `join_province` | provinceId | Join room tỉnh |
| `mark_notification_read` | notificationId | Đánh dấu đã đọc |

### Server → Client

| Event | Target | Mô tả |
|-------|--------|-------|
| `new_request` | broadcast | Yêu cầu cứu hộ mới |
| `request_updated` | broadcast | Cập nhật yêu cầu |
| `mission_created` | broadcast | Nhiệm vụ mới |
| `mission_updated` | broadcast | Cập nhật nhiệm vụ |
| `team_location` | coordinators + managers | GPS đội cứu hộ |
| `notification` | `user_${id}` | Thông báo cá nhân |
| `weather_alert` | broadcast + province | Cảnh báo thời tiết |
| `vehicle_incident_confirmed` | broadcast | Kho xác nhận xong sự cố xe |

---

## Luồng Sự cố Xe

```
Team báo cáo (report-incident)
  → dispatch.status = incident_pending
  → Warehouse Manager thấy cảnh báo đỏ
  → Xác nhận (confirm-incident): confirmed_type = damaged | lost | ok
      damaged → vehicle.status = maintenance
      lost    → vehicle.status = lost
      ok      → vehicle.status = available
  → dispatch.status = cancelled
  → Socket: vehicle_incident_confirmed
```

## Health Check

```
GET /api/health
```
