
USE master; 
GO

-- Create database if not exists
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'flood_rescue_db')
BEGIN
    CREATE DATABASE flood_rescue_db
    COLLATE Vietnamese_CI_AS;
END
GO

USE flood_rescue_db;
GO

-- *1. GEOGRAPHIC HIERARCHY

CREATE TABLE regions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    description NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE provinces (
    id INT IDENTITY(1,1) PRIMARY KEY,
    region_id INT NOT NULL REFERENCES regions(id),
    name NVARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    latitude FLOAT,
    longitude FLOAT,
    created_at DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_provinces_region ON provinces(region_id);

CREATE TABLE districts (
    id INT IDENTITY(1,1) PRIMARY KEY,
    province_id INT NOT NULL REFERENCES provinces(id),
    name NVARCHAR(100) NOT NULL,
    code VARCHAR(20),
    latitude FLOAT,
    longitude FLOAT,
    created_at DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_districts_province ON districts(province_id);

CREATE TABLE wards (
    id INT IDENTITY(1,1) PRIMARY KEY,
    district_id INT NOT NULL REFERENCES districts(id),
    name NVARCHAR(100) NOT NULL,
    code VARCHAR(20),
    latitude FLOAT,
    longitude FLOAT,
    created_at DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_wards_district ON wards(district_id);

-- *2. USERS & AUTHENTICATION

CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name NVARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    role VARCHAR(30) NOT NULL CHECK (role IN (
        'admin', 'manager', 'warehouse_manager',
        'coordinator', 'rescue_team'
    )),
    region_id INT REFERENCES regions(id),
    province_id INT REFERENCES provinces(id),
    is_active BIT DEFAULT 1,
    last_login DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_province ON users(province_id);
CREATE INDEX idx_users_active ON users(is_active);

-- *3. COORDINATOR REGION ASSIGNMENTS

CREATE TABLE coordinator_regions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    province_id INT REFERENCES provinces(id),
    district_id INT REFERENCES districts(id),
    is_primary BIT DEFAULT 0,
    max_workload INT DEFAULT 20,
    current_workload INT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_coord_user ON coordinator_regions(user_id);
CREATE INDEX idx_coord_province ON coordinator_regions(province_id);
CREATE INDEX idx_coord_district ON coordinator_regions(district_id);

-- *4. INCIDENT TYPES & URGENCY LEVELS (Admin-managed categories)

CREATE TABLE incident_types (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    code VARCHAR(30) NOT NULL UNIQUE,
    icon VARCHAR(50),
    color VARCHAR(20),
    description NVARCHAR(500),
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE urgency_levels (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    code VARCHAR(30) NOT NULL UNIQUE,
    priority_score INT NOT NULL,
    color VARCHAR(20),
    max_response_minutes INT,
    description NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE()
);

-- *5. RESCUE TEAMS


CREATE TABLE rescue_teams (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    code VARCHAR(30) NOT NULL UNIQUE,
    leader_id INT REFERENCES users(id),
    province_id INT NOT NULL REFERENCES provinces(id),
    district_id INT REFERENCES districts(id),
    phone VARCHAR(20),
    capacity INT DEFAULT 5,
    specialization NVARCHAR(200),
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN (
        'available', 'on_mission', 'standby', 'off_duty'
    )),
    current_latitude FLOAT,
    current_longitude FLOAT,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_teams_status ON rescue_teams(status);
CREATE INDEX idx_teams_province ON rescue_teams(province_id);

--* 6. RESCUE TEAM MEMBERS

CREATE TABLE rescue_team_members (
    id INT IDENTITY(1,1) PRIMARY KEY,
    team_id INT NOT NULL REFERENCES rescue_teams(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id),
    role_in_team VARCHAR(30) DEFAULT 'member',
    joined_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT uq_team_user UNIQUE (team_id, user_id)
);
CREATE INDEX idx_team_members_team ON rescue_team_members(team_id);
CREATE INDEX idx_team_members_user ON rescue_team_members(user_id);

-- *7. RESCUE REQUESTS 

CREATE TABLE rescue_requests (
    id INT IDENTITY(1,1) PRIMARY KEY,
    tracking_code VARCHAR(20) NOT NULL UNIQUE,

    citizen_name NVARCHAR(200),
    citizen_phone VARCHAR(20),
    citizen_address NVARCHAR(500),

    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    address NVARCHAR(500),
    province_id INT REFERENCES provinces(id),
    district_id INT REFERENCES districts(id),
    ward_id INT REFERENCES wards(id),

    incident_type_id INT REFERENCES incident_types(id),
    urgency_level_id INT REFERENCES urgency_levels(id),
    description NVARCHAR(MAX),
    victim_count INT DEFAULT 1,
    support_type NVARCHAR(200),
    flood_severity INT DEFAULT 1 CHECK (flood_severity BETWEEN 1 AND 5),

    priority_score INT DEFAULT 0,

    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'verified', 'assigned', 'in_progress',
        'completed', 'cancelled', 'rejected'
    )),

    coordinator_id INT REFERENCES users(id),
    assigned_team_id INT REFERENCES rescue_teams(id),

    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    verified_at DATETIME2,
    assigned_at DATETIME2,
    started_at DATETIME2,
    completed_at DATETIME2,

    rescued_count INT DEFAULT 0,
    result_notes NVARCHAR(MAX),
    reject_reason NVARCHAR(MAX),
    response_time_minutes INT
);
CREATE INDEX idx_requests_tracking ON rescue_requests(tracking_code);
CREATE INDEX idx_requests_status ON rescue_requests(status);
CREATE INDEX idx_requests_priority ON rescue_requests(priority_score DESC);
CREATE INDEX idx_requests_province ON rescue_requests(province_id);
CREATE INDEX idx_requests_district ON rescue_requests(district_id);
CREATE INDEX idx_requests_coordinator ON rescue_requests(coordinator_id);
CREATE INDEX idx_requests_team ON rescue_requests(assigned_team_id);
CREATE INDEX idx_requests_created ON rescue_requests(created_at DESC);

-- *8. RESCUE REQUEST IMAGES

CREATE TABLE rescue_request_images (
    id INT IDENTITY(1,1) PRIMARY KEY,
    request_id INT NOT NULL REFERENCES rescue_requests(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    image_type VARCHAR(20) DEFAULT 'request' CHECK (image_type IN ('request', 'result')),
    uploaded_at DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_images_request ON rescue_request_images(request_id);

-- *9. MISSIONS (Links request → team assignment)

CREATE TABLE missions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    request_id INT NOT NULL REFERENCES rescue_requests(id),
    team_id INT NOT NULL REFERENCES rescue_teams(id),
    vehicle_id INT,
    task_group_id INT,                              -- thuoc task nao (NULL = mission don le)
    assigned_to_user_id INT REFERENCES users(id),   -- leader giao cho member nao
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'assigned', 'accepted', 'en_route',
        'on_scene', 'completed', 'aborted', 'failed'
    )),
    notes NVARCHAR(MAX),
    started_at DATETIME2,
    completed_at DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_missions_request ON missions(request_id);
CREATE INDEX idx_missions_team ON missions(team_id);
CREATE INDEX idx_missions_status ON missions(status);

-- *10. MISSION LOGS (Activity timeline per mission)

CREATE TABLE mission_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    mission_id INT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    description NVARCHAR(MAX),
    latitude FLOAT,
    longitude FLOAT,
    created_at DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_mlogs_mission ON mission_logs(mission_id);

-- *11. VEHICLES

CREATE TABLE vehicles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    plate_number VARCHAR(20),
    type VARCHAR(50),
    capacity INT,
    province_id INT REFERENCES provinces(id),
    team_id INT REFERENCES rescue_teams(id),
    warehouse_id INT,                               -- kho quản lý xe này
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN (
        'available', 'in_use', 'maintenance', 'retired'
    )),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_vehicles_province ON vehicles(province_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_team ON vehicles(team_id);

ALTER TABLE missions ADD CONSTRAINT fk_missions_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id);

-- *12. WAREHOUSES

CREATE TABLE warehouses (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    address NVARCHAR(500),
    province_id INT REFERENCES provinces(id),
    district_id INT REFERENCES districts(id),
    latitude FLOAT,
    longitude FLOAT,
    capacity_tons FLOAT,
    manager_id INT REFERENCES users(id),            -- manager tỉnh (kho trung tâm)
    coordinator_id INT REFERENCES users(id),        -- coordinator phụ trách (kho vệ tinh)
    phone VARCHAR(20),
    warehouse_type VARCHAR(20) DEFAULT 'central' CHECK (warehouse_type IN ('central','satellite')),
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME2 DEFAULT GETDATE()
);

ALTER TABLE vehicles ADD CONSTRAINT fk_vehicles_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id);

-- *13. RELIEF ITEMS & INVENTORY

CREATE TABLE relief_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    category VARCHAR(50),
    unit VARCHAR(20),
    description NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE relief_inventory (
    id INT IDENTITY(1,1) PRIMARY KEY,
    warehouse_id INT NOT NULL REFERENCES warehouses(id),
    item_id INT NOT NULL REFERENCES relief_items(id),
    quantity FLOAT DEFAULT 0,
    unit VARCHAR(20),
    min_threshold FLOAT DEFAULT 10,
    last_restocked DATETIME2,
    updated_at DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_inventory_warehouse ON relief_inventory(warehouse_id);

-- *14. WEATHER ALERTS

CREATE TABLE weather_alerts (
    id INT IDENTITY(1,1) PRIMARY KEY,
    province_id INT REFERENCES provinces(id),
    alert_type VARCHAR(30) DEFAULT 'flood',
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX),
    starts_at DATETIME2 DEFAULT GETDATE(),
    expires_at DATETIME2,
    source NVARCHAR(200),
    created_at DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_alerts_province ON weather_alerts(province_id);
CREATE INDEX idx_alerts_expires ON weather_alerts(expires_at);

-- *15. NOTIFICATIONS

CREATE TABLE notifications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT REFERENCES users(id),
    tracking_code VARCHAR(20),
    type VARCHAR(50) NOT NULL,
    title NVARCHAR(200) NOT NULL,
    message NVARCHAR(MAX),
    metadata NVARCHAR(MAX),
    is_read BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_notif_user ON notifications(user_id, is_read);
CREATE INDEX idx_notif_tracking ON notifications(tracking_code);

-- *16. SYSTEM CONFIGURATION

CREATE TABLE system_config (
    id INT IDENTITY(1,1) PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value NVARCHAR(MAX),
    description NVARCHAR(500),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- *17. AUDIT LOGS

CREATE TABLE audit_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    old_values NVARCHAR(MAX),
    new_values NVARCHAR(MAX),
    ip_address VARCHAR(50),
    created_at DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ADD citizen_confirmed to rescue_requests
ALTER TABLE rescue_requests ADD citizen_confirmed BIT DEFAULT 0;
ALTER TABLE rescue_requests ADD citizen_confirmed_at DATETIME2 NULL;

-- ADD geo names from Nominatim (fallback display when district/province not in DB)
ALTER TABLE rescue_requests ADD geo_province_name NVARCHAR(255) NULL;
ALTER TABLE rescue_requests ADD geo_district_name NVARCHAR(255) NULL;

-- ADD rescue flow columns
ALTER TABLE rescue_requests ADD rescue_team_confirmed BIT NOT NULL DEFAULT 0;
ALTER TABLE rescue_requests ADD citizen_rescued_by_other_count TINYINT NOT NULL DEFAULT 0;

-- *19. TASK GROUPS (Coordinator gom nhieu request thanh 1 task)

CREATE TABLE task_groups (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    name                NVARCHAR(200) NOT NULL,
    coordinator_id      INT NOT NULL REFERENCES users(id),
    team_id             INT NOT NULL REFERENCES rescue_teams(id),
    province_id         INT REFERENCES provinces(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'in_progress'
                        CHECK (status IN ('in_progress','completed','partial','cancelled')),
    stalled_alerted_at  DATETIME2 NULL,
    notes               NVARCHAR(MAX),
    created_at          DATETIME2 DEFAULT GETDATE(),
    updated_at          DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_task_groups_team   ON task_groups(team_id);
CREATE INDEX idx_task_groups_coord  ON task_groups(coordinator_id);
CREATE INDEX idx_task_groups_status ON task_groups(status);

-- Add FK from missions.task_group_id -> task_groups
ALTER TABLE missions ADD CONSTRAINT fk_missions_task_group
    FOREIGN KEY (task_group_id) REFERENCES task_groups(id);

-- *20. TASK INCIDENT REPORTS (Bao cao su co tu member/leader)

CREATE TABLE task_incident_reports (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    task_group_id   INT NOT NULL REFERENCES task_groups(id),
    mission_id      INT NOT NULL REFERENCES missions(id),
    reporter_id     INT NOT NULL REFERENCES users(id),
    report_type     VARCHAR(30) NOT NULL
                    CHECK (report_type IN ('stalled','unrescuable','need_support')),
    urgency         VARCHAR(20) NOT NULL DEFAULT 'medium'
                    CHECK (urgency IN ('low','medium','high','critical')),
    support_type    VARCHAR(50),
    description     NVARCHAR(MAX),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','acknowledged','resolved')),
    resolved_by     INT REFERENCES users(id),
    resolved_at     DATETIME2,
    resolution_note NVARCHAR(500),
    created_at      DATETIME2 DEFAULT GETDATE(),
    updated_at      DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_incident_task    ON task_incident_reports(task_group_id);
CREATE INDEX idx_incident_mission ON task_incident_reports(mission_id);
CREATE INDEX idx_incident_status  ON task_incident_reports(status);

-- RELIEF DISTRIBUTIONS (Phân phối cứu trợ)
CREATE TABLE relief_distributions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    distribution_type VARCHAR(10) NOT NULL DEFAULT 'issue' CHECK (distribution_type IN ('issue','return')),
                                                        -- issue = xuất kho, return = nhập lại hàng dư
    request_id INT NULL REFERENCES rescue_requests(id),
    team_id INT NULL REFERENCES rescue_teams(id),       -- đội nhận/trả hàng
    warehouse_id INT NOT NULL REFERENCES warehouses(id),
    item_id INT NOT NULL REFERENCES relief_items(id),
    quantity FLOAT NOT NULL,
    distributed_by INT NOT NULL REFERENCES users(id),
    notes NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_distribution_request ON relief_distributions(request_id);
CREATE INDEX idx_distribution_warehouse ON relief_distributions(warehouse_id);
CREATE INDEX idx_distribution_created ON relief_distributions(created_at DESC);

-- *18. VEHICLE REQUESTS (Coordinator/Manager xin mượn xe ngoài)
--     Dùng khi đội cứu hộ thiếu phương tiện và cần:
--       - Mượn xe trong tỉnh
--       - Mượn xe từ tỉnh/khu vực khác
--       - Mua xe mới


CREATE TABLE vehicle_requests (
    id                   INT IDENTITY(1,1) PRIMARY KEY,

    vehicle_type         VARCHAR(50) NOT NULL
                             CHECK (vehicle_type IN ('boat', 'truck', 'car', 'helicopter', 'ambulance', 'other')),
    quantity             INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),

    destination_team_id  INT NOT NULL REFERENCES rescue_teams(id),
    province_id          INT REFERENCES provinces(id),

    source_type          VARCHAR(30) NOT NULL CHECK (source_type IN (
                             'purchase',         -- Mua mới
                             'borrow_local',     -- Mượn trong tỉnh
                             'borrow_external'   -- Mượn từ tỉnh/khu vực khác
                         )),
    source_region        NVARCHAR(200),          
    expected_date        DATE,                   -- Ngày cần có xe
    return_date          DATE,                   -- Ngày trả (chỉ áp dụng khi mượn)

    -- Ghi chú / lý do xin xe
    notes                NVARCHAR(MAX),

    status               VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
                             'pending',    -- Chờ duyệt
                             'approved',   -- Manager đã duyệt
                             'fulfilled',  -- Xe đã được cấp/giao cho đội
                             'returned',   -- Đội đã trả xe
                             'rejected',   -- Bị từ chối
                             'cancelled'   -- Đã hủy
                         )),

    -- Audit
    requested_by         INT NOT NULL REFERENCES users(id),   -- Coordinator/Manager tạo yêu cầu
    approved_by          INT REFERENCES users(id),             -- Manager duyệt
    fulfilled_by         INT REFERENCES users(id),             -- Team leader xác nhận đã nhận xe
    returned_by          INT REFERENCES users(id),             -- Team leader xác nhận đã trả xe
    fulfilled_at         DATETIME2,
    returned_confirmed_at DATETIME2,

    created_at           DATETIME2 DEFAULT GETDATE(),
    updated_at           DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_vreq_status   ON vehicle_requests(status);
CREATE INDEX idx_vreq_team     ON vehicle_requests(destination_team_id);
CREATE INDEX idx_vreq_province ON vehicle_requests(province_id);
CREATE INDEX idx_vreq_requester ON vehicle_requests(requested_by);
CREATE INDEX idx_vreq_created  ON vehicle_requests(created_at DESC);

-- returned_at: đánh dấu thời điểm team trả lại vật tư đã nhận (trên bản ghi distribution_type='issue')
ALTER TABLE relief_distributions ADD returned_at DATETIME2 NULL;

-- === PHASE 2: Supply & Vehicle Coordination Flow ===

-- Thêm luồng xác nhận vào relief_distributions
ALTER TABLE relief_distributions ADD status VARCHAR(20) NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued','confirmed','return_requested','partially_returned','returned'));
ALTER TABLE relief_distributions ADD confirmed_at         DATETIME2 NULL; -- team xác nhận nhận
ALTER TABLE relief_distributions ADD return_quantity      FLOAT     NULL; -- team khai số lượng muốn trả
ALTER TABLE relief_distributions ADD return_note          NVARCHAR(300) NULL;
ALTER TABLE relief_distributions ADD return_requested_at  DATETIME2 NULL;
ALTER TABLE relief_distributions ADD received_return_qty  FLOAT     NULL; -- coordinator xác nhận nhận lại (số thực)
ALTER TABLE relief_distributions ADD return_confirmed_at  DATETIME2 NULL;
ALTER TABLE relief_distributions ADD return_confirmed_by  INT       NULL REFERENCES users(id);

-- *19. VEHICLE DISPATCHES (Coordinator điều xe cho team)
CREATE TABLE vehicle_dispatches (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    vehicle_id      INT NOT NULL REFERENCES vehicles(id),
    team_id         INT NOT NULL REFERENCES rescue_teams(id),
    dispatched_by   INT NOT NULL REFERENCES users(id),   -- coordinator
    mission_note    NVARCHAR(300) NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'dispatched'
                    CHECK (status IN ('dispatched','confirmed','returned','cancelled')),
    dispatched_at   DATETIME2 DEFAULT GETDATE(),
    confirmed_at    DATETIME2 NULL,                      -- team xác nhận nhận xe
    returned_at     DATETIME2 NULL,                      -- team trả xe
    return_confirmed_at DATETIME2 NULL,                  -- coordinator xác nhận nhận lại
    return_confirmed_by INT NULL REFERENCES users(id),
    created_at      DATETIME2 DEFAULT GETDATE(),
    updated_at      DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_vdispatch_vehicle ON vehicle_dispatches(vehicle_id);
CREATE INDEX idx_vdispatch_team    ON vehicle_dispatches(team_id);
CREATE INDEX idx_vdispatch_status  ON vehicle_dispatches(status);

-- *20. SUPPLY TRANSFERS (Manager điều vật tư liên tỉnh)
CREATE TABLE supply_transfers (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    from_warehouse_id   INT NOT NULL REFERENCES warehouses(id),
    to_warehouse_id     INT NOT NULL REFERENCES warehouses(id),
    item_id             INT NOT NULL REFERENCES relief_items(id),
    quantity            FLOAT NOT NULL,
    transferred_by      INT NOT NULL REFERENCES users(id),  -- manager
    status              VARCHAR(20) NOT NULL DEFAULT 'in_transit'
                        CHECK (status IN ('in_transit','completed','cancelled')),
    notes               NVARCHAR(300) NULL,
    confirmed_by        INT NULL REFERENCES users(id),      -- coordinator tỉnh B
    confirmed_quantity  FLOAT NULL,                         -- số thực nhận được
    confirmed_at        DATETIME2 NULL,
    created_at          DATETIME2 DEFAULT GETDATE(),
    updated_at          DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_stransfer_from   ON supply_transfers(from_warehouse_id);
CREATE INDEX idx_stransfer_to     ON supply_transfers(to_warehouse_id);
CREATE INDEX idx_stransfer_status ON supply_transfers(status);

-- *21. VEHICLE TRANSFERS (Manager điều xe liên tỉnh)
CREATE TABLE vehicle_transfers (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    vehicle_id      INT NOT NULL REFERENCES vehicles(id),
    from_province_id INT NOT NULL REFERENCES provinces(id),
    to_province_id  INT NOT NULL REFERENCES provinces(id),
    transferred_by  INT NOT NULL REFERENCES users(id),      -- manager
    status          VARCHAR(20) NOT NULL DEFAULT 'in_transit'
                    CHECK (status IN ('in_transit','completed','cancelled')),
    notes           NVARCHAR(300) NULL,
    confirmed_by    INT NULL REFERENCES users(id),          -- coordinator tỉnh B
    confirmed_at    DATETIME2 NULL,
    created_at      DATETIME2 DEFAULT GETDATE(),
    updated_at      DATETIME2 DEFAULT GETDATE()
);
CREATE INDEX idx_vtransfer_vehicle ON vehicle_transfers(vehicle_id);
CREATE INDEX idx_vtransfer_status  ON vehicle_transfers(status);

-- *22. MISSION ASSIGNMENTS (Junction table: nhiều thành viên cho 1 nhiệm vụ)

CREATE TABLE mission_assignments (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    mission_id   INT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    user_id      INT NOT NULL REFERENCES users(id),
    assigned_at  DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT uq_mission_user UNIQUE (mission_id, user_id)
);
CREATE INDEX idx_massign_mission ON mission_assignments(mission_id);
CREATE INDEX idx_massign_user    ON mission_assignments(user_id);

GO
