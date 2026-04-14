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

### Cách 2: sqlcmd

```bash
sqlcmd -S localhost -U sa -P YourPassword -i schema.sql
sqlcmd -S localhost -U sa -P YourPassword -i seed_data.sql
```

> **Lưu ý:** Không còn file migration riêng lẻ. Tất cả schema đã được gộp vào `schema.sql`.

---

## File structure

| File | Mô tả |
|------|-------|
| `schema.sql` | 28 mục (bảng + columns + indexes + constraints). Chạy từ đầu để tạo fresh DB |
| `seed_data.sql` | Dữ liệu mẫu (users, teams, requests, kho, xe...) |

---

## Schema Overview

```
Geographic:    regions → provinces → districts → wards

Users:         users (5 roles), coordinator_regions

Categories:    incident_types, urgency_levels

Teams:         rescue_teams, rescue_team_members

Core:          rescue_requests (+ tracking_status, incident_report_note)
               rescue_request_images

Missions:      missions → mission_logs
               mission_assignments  ← multi-member assignment
               task_incident_reports

Tasks:         task_groups

Resources:     vehicles              ← status: available/in_use/maintenance/lost/retired
               warehouses
               relief_items
               relief_inventory
               relief_distributions  ← xuất vật tư, voucher_code, batch_id
               distribution_batches  ← nhóm nhiều vật tư thành 1 phiếu, task_id
               vehicle_dispatches    ← điều xe, task_id, incident columns
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

### rescue_requests.tracking_status (citizen-facing)

Tách biệt với `status` (dùng cho coordinator workflow). Cho phép citizen theo dõi tiến trình chi tiết.

| Status | Mô tả | Trigger |
|--------|-------|---------|
| `submitted` | Vừa gửi yêu cầu | Mặc định khi tạo |
| `received` | Coordinator đã tiếp nhận | Coordinator verify |
| `assigned` | Đã phân vào task | Coordinator tạo task/gán request |
| `team_ready` | Đội đã nhận vật tư | Team leader confirm nhận đủ vật tư |
| `en_route` | Đang trên đường | Leader bấm nhận nhiệm vụ (mission accepted) |
| `completed` | Hoàn thành | Leader hoàn thành nhiệm vụ |
| `incident_reported` | Có sự cố | Leader báo cáo không cứu được |

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
| `dispatched` | Coordinator đã điều — chờ kho bàn giao |
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
| leader_hcm1 | 123456 | Rescue Team (Leader) |
| member1 | 123456 | Rescue Team (Member) |
