# 🌊 Flood Rescue Coordination & Relief Management System

## Phần mềm Điều phối Cứu hộ và Quản lý Cứu trợ Lũ lụt

---

## 📋 Tổng quan

Hệ thống web hỗ trợ điều phối cứu hộ, quản lý cứu trợ trong các đợt lũ lụt tại Việt Nam. Hỗ trợ tiếp nhận yêu cầu cứu hộ, phân loại mức độ khẩn cấp, phân công lực lượng, quản lý tài nguyên cứu trợ.

### 6 Actors (vai trò)

| Actor                     | Mô tả                                                                 | Cần đăng nhập |
| ------------------------- | --------------------------------------------------------------------- | ------------- |
| **Citizen**               | Gửi yêu cầu cứu hộ, tra cứu bằng mã tracking                         | ❌ Không      |
| **Rescue Team**           | Nhận nhiệm vụ, cập nhật trạng thái, báo cáo kết quả, báo sự cố xe    | ✅ Có         |
| **Rescue Coordinator**    | Xác minh yêu cầu, phân loại, phân công đội, xuất vật tư/xe theo tỉnh | ✅ Có         |
| **Manager**               | Quản lý phương tiện, kho hàng, tồn kho, thống kê toàn hệ thống       | ✅ Có         |
| **Warehouse Manager**     | Quản lý kho tổng, xác nhận xuất/nhập vật tư và xe, kiểm tra sự cố    | ✅ Có         |
| **Admin**                 | Quản lý người dùng, cấu hình hệ thống, danh mục                      | ✅ Có         |

### Phân vùng địa lý

```
Quốc gia → Vùng miền (Bắc/Trung/Nam) → Tỉnh/TP → Quận/Huyện → Phường/Xã
```

---

## 🛠 Công nghệ

| Layer            | Stack                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------- |
| **Frontend**     | React + Vite, Tailwind CSS, React Router, Zustand, Leaflet (OpenStreetMap), Socket.io-client |
| **Backend**      | Node.js + Express, JWT RBAC, Socket.io, Multer (upload ảnh), Swagger API Docs                |
| **Database**     | SQL Server (MSSQL)                                                                           |
| **External API** | OpenWeatherMap (thời tiết thực tế - miễn phí)                                                |

---

## 📁 Cấu trúc thư mục

```
project/
├── backend/          # Backend API (Node.js + Express)
│   ├── src/
│   │   ├── config/      # Database, Logger, Swagger
│   │   ├── middlewares/  # Auth (JWT), Validation, Upload
│   │   ├── routes/       # 12 route modules (90+ endpoints)
│   │   ├── services/     # WeatherService (OpenWeatherMap)
│   │   ├── socket/       # Socket.io handler
│   │   ├── utils/        # Helper functions
│   │   └── server.js     # Entry point
│   ├── uploads/          # Uploaded images
│   ├── .env.example      # Environment variables template
│   └── package.json
│
├── database/         # SQL Server Scripts
│   ├── schema.sql                          # 25 bảng, 40+ indexes
│   ├── seed_data.sql                       # Dữ liệu test
│   ├── migration_mission_assignments.sql   # Migration: bảng multi-member assignment
│   └── migration_warehouse_manager.sql     # Migration: role warehouse_manager
│
└── frontend/         # React Frontend (Vite)
    ├── src/
    │   ├── components/   # Shared components (DashboardLayout)
    │   ├── pages/        # 13 page components
    │   ├── services/     # API client (Axios), Socket client
    │   ├── store/        # Zustand stores (auth, app)
    │   ├── utils/        # Helpers, constants
    │   ├── App.jsx       # Router + Protected Routes
    │   └── main.jsx      # Entry point
    ├── index.html
    └── package.json
```

---

## ⚙️ Hướng dẫn Cài đặt

### Yêu cầu

- **Node.js** >= 18.x ([download](https://nodejs.org))
- **SQL Server** 2019+ ([download Express](https://www.microsoft.com/en-us/sql-server/sql-server-downloads))
- **SQL Server Management Studio (SSMS)** (để chạy SQL scripts)
- **Git** ([download](https://git-scm.com))

### Bước 1: Database

1. Mở **SSMS**, kết nối SQL Server
2. Mở file `database/schema.sql` → **Execute** (F5)
3. Mở file `database/seed_data.sql` → **Execute** (F5)
4. Chạy các migration (nếu cần):
   - `database/migration_mission_assignments.sql`
   - `database/migration_warehouse_manager.sql`
5. Xác nhận: `SELECT COUNT(*) FROM flood_rescue_db.dbo.users` → trả về 17+

### Bước 2: Backend

```bash
cd backend

# Cài dependencies
npm install

# Tạo file .env từ template
cp .env.example .env

# Sửa file .env: điền password SQL Server
# DB_PASSWORD=your_sql_password
# (Nếu muốn dùng Weather API, thêm OPENWEATHERMAP_API_KEY)

# Chạy server
npm run dev
# → Server chạy tại http://localhost:5000
# → Swagger docs: http://localhost:5000/api-docs
```

### Bước 3: Frontend

```bash
cd frontend

# Cài dependencies
npm install

# Chạy dev server
npm run dev
# → Frontend chạy tại http://localhost:5173
```

### Bước 4 (Tùy chọn): Weather API

1. Đăng ký miễn phí: https://home.openweathermap.org/users/sign_up
2. Lấy API key: https://home.openweathermap.org/api_keys
3. Thêm vào `backend/.env`:
   ```
   OPENWEATHERMAP_API_KEY=your_api_key_here
   ```
4. Lưu ý: Key mới cần ~2 giờ để kích hoạt. Free tier = 1,000 calls/ngày.

### Tài khoản test

| Username           | Password | Vai trò                    | Tỉnh/Khu vực |
| ------------------ | -------- | -------------------------- | ------------ |
| admin              | 123456   | Admin                      | —            |
| wm_hcm             | 123456   | Warehouse Manager (Kho tổng) | TP.HCM     |
| mgr_hcm            | 123456   | Manager                    | TP.HCM       |
| coord_hcm          | 123456   | Coordinator                | TP.HCM       |
| coord_la           | 123456   | Coordinator                | Long An      |
| coord_brvt         | 123456   | Coordinator                | Bà Rịa-VT   |
| leader_binhthanh   | 123456   | Rescue Team (Trưởng đội)   | TP.HCM       |
| leader_benluc      | 123456   | Rescue Team (Trưởng đội)   | Long An      |
| mem_hcm_01         | 123456   | Rescue Team (Thành viên)   | TP.HCM       |

---

## 🌐 API Endpoints (90+ endpoints)

### Public (không cần đăng nhập)

| Method | Endpoint                                  | Mô tả                           |
| ------ | ----------------------------------------- | ------------------------------- |
| POST   | `/api/requests`                           | 🆘 Gửi yêu cầu cứu hộ (citizen) |
| GET    | `/api/requests/track/:code`               | 🔍 Tra cứu bằng mã tracking     |
| GET    | `/api/requests/track/:code/notifications` | Thông báo cho tracking code     |
| GET    | `/api/requests/map`                       | Dữ liệu bản đồ                  |
| GET    | `/api/regions`                            | Danh sách vùng miền             |
| GET    | `/api/regions/provinces`                  | Danh sách tỉnh/thành            |
| GET    | `/api/regions/incident-types`             | Loại sự cố                      |
| GET    | `/api/regions/urgency-levels`             | Mức khẩn cấp                    |
| GET    | `/api/regions/weather-alerts`             | Cảnh báo thời tiết              |
| GET    | `/api/regions/weather-current/:id`        | 🌡️ Thời tiết tỉnh (realtime)    |
| GET    | `/api/regions/weather-forecast/:id`       | 📅 Dự báo 5 ngày                |

### Auth

| Method | Endpoint             | Mô tả                   |
| ------ | -------------------- | ----------------------- |
| POST   | `/api/auth/login`    | Đăng nhập               |
| GET    | `/api/auth/me`       | Thông tin user hiện tại |
| PUT    | `/api/auth/password` | Đổi mật khẩu            |

### Requests (Yêu cầu cứu hộ)

| Method | Endpoint                       | Mô tả                       | Quyền                                          |
| ------ | ------------------------------ | --------------------------- | ---------------------------------------------- |
| GET    | `/api/requests`                | Danh sách (phân trang, lọc) | Tất cả                                         |
| GET    | `/api/requests/:id`            | Chi tiết                    | Tất cả                                         |
| GET    | `/api/requests/stats/overview` | Thống kê tổng quan          | Tất cả                                         |
| PUT    | `/api/requests/:id/verify`     | ✅ Xác minh                 | Coordinator, Admin, Manager                    |
| PUT    | `/api/requests/:id/reject`     | ❌ Từ chối                  | Coordinator, Admin, Manager                    |
| PUT    | `/api/requests/:id/assign`     | 🚑 Phân công đội            | Coordinator, Admin, Manager                    |
| GET    | `/api/requests/:id/suggest-team` | Gợi ý đội gần nhất        | Coordinator, Admin, Manager                    |

### Missions (Nhiệm vụ)

| Method | Endpoint                   | Mô tả                              | Quyền  |
| ------ | -------------------------- | ---------------------------------- | ------ |
| GET    | `/api/missions`            | Danh sách (kèm tất cả thành viên)  | Tất cả |
| GET    | `/api/missions/:id`        | Chi tiết                           | Tất cả |
| PUT    | `/api/missions/:id/status` | Cập nhật trạng thái                | Tất cả |
| GET    | `/api/missions/:id/logs`   | Lịch sử hoạt động                  | Tất cả |
| POST   | `/api/missions/:id/result` | Gửi kết quả (upload ảnh)           | Tất cả |

### Teams (Đội cứu hộ)

| Method | Endpoint                      | Mô tả                 | Quyền          |
| ------ | ----------------------------- | --------------------- | -------------- |
| GET    | `/api/teams`                  | Danh sách             | Tất cả         |
| POST   | `/api/teams`                  | Tạo đội mới           | Admin, Manager |
| GET    | `/api/teams/:id`              | Chi tiết + thành viên | Tất cả         |
| PUT    | `/api/teams/:id`              | Cập nhật              | Admin, Manager |
| PUT    | `/api/teams/:id/location`     | Cập nhật GPS          | Tất cả         |
| POST   | `/api/teams/:id/members`      | Thêm thành viên       | Admin, Manager |
| DELETE | `/api/teams/:id/members/:uid` | Xóa thành viên        | Admin, Manager |

### Resources (Tài nguyên)

| Method | Endpoint                                              | Mô tả                              | Quyền                        |
| ------ | ----------------------------------------------------- | ---------------------------------- | ---------------------------- |
| GET    | `/api/resources/vehicles`                             | Phương tiện (lọc theo province_id) | Tất cả                       |
| POST   | `/api/resources/vehicles`                             | Thêm                               | Admin, Manager               |
| PUT    | `/api/resources/vehicles/:id`                         | Cập nhật                           | Admin, Manager               |
| GET    | `/api/resources/warehouses`                           | Kho hàng (lọc theo province_id)    | Tất cả                       |
| POST   | `/api/resources/warehouses`                           | Thêm kho                           | Admin, Manager               |
| GET    | `/api/resources/inventory`                            | Tồn kho                            | Tất cả                       |
| PUT    | `/api/resources/inventory/:id`                        | Cập nhật tồn kho                   | Admin, Manager, Warehouse    |
| GET    | `/api/resources/relief-items`                         | Loại vật phẩm                      | Tất cả                       |
| GET    | `/api/resources/distributions`                        | Phiếu xuất vật tư                  | Tất cả                       |
| POST   | `/api/resources/distributions`                        | Tạo phiếu xuất                     | Coordinator, Manager         |
| PUT    | `/api/resources/distributions/:id/warehouse-confirm`  | Kho xác nhận bàn giao              | Warehouse, Manager           |
| PUT    | `/api/resources/distributions/:id/confirm`            | Đội xác nhận đã nhận               | Rescue Team                  |
| PUT    | `/api/resources/distributions/:id/request-return`     | Đội yêu cầu trả                    | Rescue Team                  |
| PUT    | `/api/resources/distributions/:id/confirm-return`     | Kho xác nhận nhận lại              | Warehouse, Manager           |
| GET    | `/api/resources/vehicle-dispatches`                   | Lệnh điều xe                       | Tất cả                       |
| POST   | `/api/resources/vehicle-dispatches`                   | Tạo lệnh điều xe                   | Coordinator, Manager         |
| PUT    | `/api/resources/vehicle-dispatches/:id/warehouse-confirm` | Kho xác nhận bàn giao xe       | Warehouse, Manager           |
| PUT    | `/api/resources/vehicle-dispatches/:id/confirm`       | Đội xác nhận nhận xe               | Rescue Team                  |
| PUT    | `/api/resources/vehicle-dispatches/:id/return`        | Đội trả xe                         | Rescue Team                  |
| PUT    | `/api/resources/vehicle-dispatches/:id/confirm-return` | Kho xác nhận nhận lại xe          | Warehouse, Manager           |
| PUT    | `/api/resources/vehicle-dispatches/:id/report-incident` | 🚨 Đội báo sự cố xe             | Rescue Team                  |
| PUT    | `/api/resources/vehicle-dispatches/:id/confirm-incident` | Kho xác nhận tình trạng xe     | Warehouse, Manager           |

### Tasks (Nhiệm vụ nội bộ)

| Method | Endpoint                              | Mô tả                     | Quyền          |
| ------ | ------------------------------------- | ------------------------- | -------------- |
| GET    | `/api/tasks`                          | Danh sách                 | Tất cả         |
| POST   | `/api/tasks`                          | Tạo task                  | Coordinator+   |
| PUT    | `/api/tasks/:id/status`               | Cập nhật trạng thái       | Tất cả         |
| PUT    | `/api/tasks/:id/assign-member`        | Giao thành viên           | Leader         |
| PUT    | `/api/tasks/:id/scheduled-date`       | Đặt ngày thực hiện        | Leader         |
| PUT    | `/api/tasks/:id/confirm-complete`     | Xác nhận hoàn thành       | Coordinator+   |

### Users (Quản lý người dùng)

| Method   | Endpoint                             | Mô tả                     | Quyền          |
| -------- | ------------------------------------ | ------------------------- | -------------- |
| GET      | `/api/users`                         | Danh sách                 | Admin, Manager |
| POST     | `/api/users`                         | Tạo user (gồm warehouse_manager) | Admin, Manager |
| GET      | `/api/users/:id`                     | Chi tiết                  | Admin, Manager |
| PUT      | `/api/users/:id`                     | Cập nhật                  | Admin, Manager |
| PUT      | `/api/users/:id/reset-password`      | Reset mật khẩu            | Admin          |
| PUT      | `/api/users/:id/toggle-active`       | Kích hoạt/vô hiệu         | Admin, Manager |
| GET      | `/api/users/coordinators`            | DS coordinator + workload | Admin, Manager |

### Dashboard (Thống kê)

| Method | Endpoint                              | Mô tả              | Quyền          |
| ------ | ------------------------------------- | ------------------ | -------------- |
| GET    | `/api/dashboard/overview`             | Tổng quan          | Tất cả         |
| GET    | `/api/dashboard/by-province`          | Theo tỉnh          | Admin, Manager |
| GET    | `/api/dashboard/heatmap`              | Heatmap tọa độ     | Tất cả         |
| GET    | `/api/dashboard/daily-trend`          | Xu hướng 30 ngày   | Tất cả         |
| GET    | `/api/dashboard/resource-usage`       | Sử dụng tài nguyên | Admin, Manager |

### Notifications, Config, Audit Logs

| Method | Endpoint                          | Mô tả             | Quyền          |
| ------ | --------------------------------- | ----------------- | -------------- |
| GET    | `/api/notifications`              | Thông báo của tôi | Tất cả         |
| GET    | `/api/notifications/unread-count` | Số chưa đọc       | Tất cả         |
| PUT    | `/api/notifications/:id/read`     | Đánh dấu đã đọc   | Tất cả         |
| PUT    | `/api/notifications/read-all`     | Đánh dấu tất cả   | Tất cả         |

---

## 📡 Realtime (Socket.io)

| Event                      | Mô tả                               |
| -------------------------- | ----------------------------------- |
| `new_request`              | Yêu cầu cứu hộ mới                  |
| `request_updated`          | Cập nhật trạng thái yêu cầu         |
| `mission_update`           | Cập nhật nhiệm vụ                   |
| `team_location`            | Vị trí GPS đội cứu hộ               |
| `weather_alert`            | Cảnh báo thời tiết                  |
| `notification`             | Thông báo cá nhân                   |
| `vehicle_incident_confirmed` | Kho xác nhận xong tình trạng xe sự cố |

---

## 🚗 Luồng Sự cố Xe (Vehicle Incident Flow)

```
Team dùng xe → xảy ra sự cố
      ↓
Team báo cáo (loại: hư hỏng / mất xe + ghi chú)
      ↓
dispatch.status = incident_pending
      ↓
Warehouse Manager thấy cảnh báo đỏ → kiểm tra thực tế
      ↓
Xác nhận: damaged → vehicle.status = maintenance
          lost    → vehicle.status = lost
          ok      → vehicle.status = available
      ↓
dispatch.status = cancelled
Socket event: vehicle_incident_confirmed → Coordinator thấy kết quả
```

---

## 📦 Luồng Xuất/Trả Vật Tư (Supply Distribution Flow)

```
Coordinator tạo phiếu xuất (vật tư + số lượng + đội nhận)
      ↓
Warehouse Manager xác nhận bàn giao (có mã phiếu VT-XXXXXX)
      ↓
Đội xác nhận đã nhận
      ↓  [khi kết thúc nhiệm vụ]
Đội khai số lượng trả → request-return
      ↓
Warehouse Manager đếm thực tế → xác nhận số lượng thực nhận
      ↓
status = returned (ghi nhận số lượng thực tế nếu khác khai báo)
```

---

## 📊 Database Schema Summary

- **25 bảng**, **40+ indexes**
- Geographic: `regions`, `provinces`, `districts`, `wards`
- Users: `users` (6 roles), `coordinator_regions`
- Categories: `incident_types`, `urgency_levels`
- Core: `rescue_requests`, `rescue_request_images`
- Teams: `rescue_teams`, `rescue_team_members`
- Missions: `missions`, `mission_logs`, `mission_assignments` (multi-member)
- Tasks: `task_groups`, `task_members`, `task_reports`
- Resources: `vehicles`, `warehouses`, `relief_items`, `relief_inventory`
- Distributions: `relief_distributions`, `vehicle_dispatches` (+ incident columns), `supply_transfers`, `vehicle_transfers`, `vehicle_requests`
- System: `weather_alerts`, `notifications`, `system_config`, `audit_logs`

### Các trạng thái xe (vehicles.status)

| Status        | Mô tả                    |
| ------------- | ------------------------ |
| `available`   | Sẵn sàng sử dụng         |
| `in_use`      | Đang được điều động      |
| `maintenance` | Đang sửa chữa / hư hỏng  |
| `lost`        | Mất / không thu hồi được |
| `retired`     | Đã ngừng sử dụng         |

### Các trạng thái lệnh điều xe (vehicle_dispatches.status)

| Status             | Mô tả                              |
| ------------------ | ---------------------------------- |
| `dispatched`       | Chờ kho bàn giao                   |
| `confirmed`        | Đội đã nhận xe                     |
| `returned`         | Đội đã trả xe — chờ kho xác nhận   |
| `incident_pending` | 🚨 Sự cố — chờ kho xác nhận tình trạng |
| `cancelled`        | Đã hủy / đã xử lý xong             |

---

## 📄 License

MIT — Dự án học tập
