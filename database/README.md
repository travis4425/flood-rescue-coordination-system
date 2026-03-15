# 🗄️ Database — Flood Rescue System

## SQL Server (MSSQL)

### Yêu cầu

- SQL Server 2019+ hoặc SQL Server Express
- Database name: `flood_rescue_db`

---

## Cài đặt

### Cách 1: SSMS (khuyến nghị)

1. Mở SSMS, kết nối SQL Server
2. Mở `schema.sql` → **Execute** (F5)
3. Mở `seed_data.sql` → **Execute** (F5)
4. Chạy migration nếu database đã tồn tại từ trước:
   - `migration_mission_assignments.sql`
   - `migration_warehouse_manager.sql`

### Cách 2: sqlcmd

```bash
sqlcmd -S localhost -U sa -P YourPassword -i schema.sql
sqlcmd -S localhost -U sa -P YourPassword -i seed_data.sql
```

---

## File structure

| File | Mô tả |
|------|-------|
| `schema.sql` | 25 bảng + 40+ indexes + constraints |
| `seed_data.sql` | Dữ liệu mẫu (users, teams, requests, kho, xe...) |
| `migration_mission_assignments.sql` | Tạo bảng `mission_assignments` (multi-member per mission) |
| `migration_warehouse_manager.sql` | Thêm role `warehouse_manager` vào CHECK constraint của `users` |

---

## Schema Overview (25 bảng)

```
Geographic:    regions → provinces → districts → wards

Users:         users (6 roles), coordinator_regions

Categories:    incident_types, urgency_levels

Teams:         rescue_teams, rescue_team_members

Core:          rescue_requests → rescue_request_images

Missions:      missions → mission_logs
               mission_assignments  ← multi-member assignment

Tasks:         task_groups, task_members, task_reports

Resources:     vehicles              ← status: available/in_use/maintenance/lost/retired
               warehouses
               relief_items
               relief_inventory
               relief_distributions  ← xuất vật tư, kèm voucher_code
               vehicle_dispatches    ← điều xe, kèm incident columns
               supply_transfers      ← điều vật tư liên tỉnh
               vehicle_transfers     ← điều xe liên tỉnh
               vehicle_requests      ← xin mượn/mua xe

System:        weather_alerts, notifications, system_config, audit_logs
```

---

## Roles (users.role)

| Giá trị | Mô tả |
|---------|-------|
| `admin` | Quản trị hệ thống |
| `manager` | Quản lý tài nguyên & thống kê |
| `warehouse_manager` | Quản lý kho tổng |
| `coordinator` | Điều phối viên theo tỉnh |
| `rescue_team` | Đội cứu hộ (leader + member) |

---

## Trạng thái quan trọng

### vehicles.status

| Status | Mô tả |
|--------|-------|
| `available` | Sẵn sàng |
| `in_use` | Đang điều động |
| `maintenance` | Đang sửa / hư hỏng |
| `lost` | Mất / không thu hồi được |
| `retired` | Ngừng sử dụng |

### vehicle_dispatches.status

| Status | Mô tả |
|--------|-------|
| `dispatched` | Chờ kho bàn giao |
| `confirmed` | Đội đã nhận xe |
| `returned` | Đội đã trả — chờ kho xác nhận |
| `incident_pending` | 🚨 Sự cố — chờ kho xác nhận tình trạng |
| `cancelled` | Đã hủy / đã xử lý xong |

### relief_distributions.status

| Status | Mô tả |
|--------|-------|
| `issued` | Đã xuất — chờ kho bàn giao |
| `confirmed` | Đội đã nhận vật tư |
| `return_requested` | Đội đã khai trả — chờ kho nhận |
| `partially_returned` | Trả 1 phần |
| `returned` | Đã trả đủ |

---

## Tài khoản mẫu (seed_data.sql)

| Username | Password | Role |
|----------|----------|------|
| admin | 123456 | Admin |
| warehouse_mgr | 123456 | Warehouse Manager |
| nm_hung | 123456 | Manager |
| coord_hcm | 123456 | Coordinator |
| leader_hcm1 | 123456 | Rescue Team |
| member1 | 123456 | Rescue Team |

---

## Migrations

### migration_mission_assignments.sql

Tạo bảng `mission_assignments` — junction table lưu tất cả thành viên được giao cho 1 mission (thay vì chỉ lưu 1 người trong `missions.assigned_to_user_id`).

```sql
CREATE TABLE mission_assignments (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    mission_id  INT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    user_id     INT NOT NULL REFERENCES users(id),
    assigned_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT uq_mission_user UNIQUE (mission_id, user_id)
);
```

### migration_warehouse_manager.sql

Thêm `warehouse_manager` vào CHECK constraint của `users.role`. Cần query tên constraint thực tế trước:

```sql
SELECT name FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('users');
-- Lấy tên constraint rồi chạy:
ALTER TABLE users DROP CONSTRAINT <tên_constraint>;
ALTER TABLE users ADD CONSTRAINT CK_users_role CHECK (role IN (
    'admin','manager','warehouse_manager','coordinator','rescue_team'
));
```

---

## Cột incident trong vehicle_dispatches

Được thêm vào để lưu thông tin sự cố do team báo cáo:

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `incident_type` | `VARCHAR(20)` | `'damaged'` hoặc `'lost'` |
| `incident_note` | `NVARCHAR(500)` | Mô tả của đội |
| `incident_reported_at` | `DATETIME2` | Thời điểm báo cáo |
| `incident_reported_by` | `INT` | FK → users.id |

Nếu chưa có các cột này, chạy:

```sql
USE flood_rescue_db;
ALTER TABLE vehicle_dispatches ADD incident_type VARCHAR(20) NULL
    CHECK (incident_type IN ('damaged','lost'));
ALTER TABLE vehicle_dispatches ADD incident_note NVARCHAR(500) NULL;
ALTER TABLE vehicle_dispatches ADD incident_reported_at DATETIME2 NULL;
ALTER TABLE vehicle_dispatches ADD incident_reported_by INT NULL REFERENCES users(id);
```
