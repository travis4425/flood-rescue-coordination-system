-- ============================================================
-- PostgreSQL Schema for Flood Rescue System
-- Converted from SQL Server schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. GEOGRAPHIC HIERARCHY

CREATE TABLE regions (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(20)  NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE provinces (
    id        SERIAL PRIMARY KEY,
    region_id INT          NOT NULL REFERENCES regions(id),
    name      VARCHAR(100) NOT NULL,
    code      VARCHAR(20)  NOT NULL UNIQUE,
    latitude  DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_provinces_region ON provinces(region_id);

CREATE TABLE districts (
    id          SERIAL PRIMARY KEY,
    province_id INT          NOT NULL REFERENCES provinces(id),
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(20),
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX idx_districts_province ON districts(province_id);

CREATE TABLE wards (
    id          SERIAL PRIMARY KEY,
    district_id INT          NOT NULL REFERENCES districts(id),
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(20),
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX idx_wards_district ON wards(district_id);

-- 2. USERS & AUTHENTICATION

CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(100) NOT NULL,
    phone         VARCHAR(20),
    role          VARCHAR(30)  NOT NULL CHECK (role IN (
                      'admin', 'manager', 'warehouse_manager',
                      'coordinator', 'rescue_team'
                  )),
    province_id   INT REFERENCES provinces(id),
    region_id     INT REFERENCES regions(id),
    is_active     BOOLEAN     DEFAULT true,
    last_login    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_role     ON users(role);
CREATE INDEX idx_users_province ON users(province_id);
CREATE INDEX idx_users_active   ON users(is_active);

CREATE TABLE refresh_tokens (
    id         SERIAL PRIMARY KEY,
    token      TEXT         NOT NULL UNIQUE,
    user_id    INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ  NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX idx_refresh_token  ON refresh_tokens(token);
CREATE INDEX idx_refresh_user   ON refresh_tokens(user_id);

-- 3. COORDINATOR REGION ASSIGNMENTS

CREATE TABLE coordinator_regions (
    id               SERIAL PRIMARY KEY,
    user_id          INT     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    province_id      INT     REFERENCES provinces(id),
    district_id      INT     REFERENCES districts(id),
    is_primary       BOOLEAN DEFAULT false,
    max_workload     INT     DEFAULT 20,
    current_workload INT     DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_coord_user     ON coordinator_regions(user_id);
CREATE INDEX idx_coord_province ON coordinator_regions(province_id);
CREATE INDEX idx_coord_district ON coordinator_regions(district_id);

-- 4. INCIDENT TYPES & URGENCY LEVELS

CREATE TABLE incident_types (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(30)  NOT NULL UNIQUE,
    icon            VARCHAR(50),
    color           VARCHAR(20),
    description     TEXT,
    rescue_category VARCHAR(20) NOT NULL DEFAULT 'cuu_nan'
                    CHECK (rescue_category IN ('cuu_nan', 'cuu_tro', 'cuu_ho')),
    is_active       BOOLEAN     DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE urgency_levels (
    id                   SERIAL PRIMARY KEY,
    name                 VARCHAR(100) NOT NULL,
    code                 VARCHAR(30)  NOT NULL UNIQUE,
    priority_score       INT          NOT NULL,
    color                VARCHAR(20),
    max_response_minutes INT,
    description          TEXT,
    created_at           TIMESTAMPTZ  DEFAULT NOW()
);

-- 5. RESCUE TEAMS

CREATE TABLE rescue_teams (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(100) NOT NULL,
    code              VARCHAR(30)  NOT NULL UNIQUE,
    leader_id         INT          REFERENCES users(id),
    province_id       INT          NOT NULL REFERENCES provinces(id),
    district_id       INT          REFERENCES districts(id),
    phone             VARCHAR(20),
    capacity          INT          DEFAULT 5,
    specialization    TEXT,
    status            VARCHAR(20)  DEFAULT 'available' CHECK (status IN (
                          'available', 'on_mission', 'standby', 'off_duty'
                      )),
    current_latitude  DOUBLE PRECISION,
    current_longitude DOUBLE PRECISION,
    created_at        TIMESTAMPTZ  DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX idx_teams_status   ON rescue_teams(status);
CREATE INDEX idx_teams_province ON rescue_teams(province_id);

-- 6. RESCUE TEAM MEMBERS

CREATE TABLE rescue_team_members (
    id           SERIAL PRIMARY KEY,
    team_id      INT         NOT NULL REFERENCES rescue_teams(id) ON DELETE CASCADE,
    user_id      INT         NOT NULL REFERENCES users(id),
    role_in_team VARCHAR(30) DEFAULT 'member',
    joined_at    TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_team_user UNIQUE (team_id, user_id)
);
CREATE INDEX idx_team_members_team ON rescue_team_members(team_id);
CREATE INDEX idx_team_members_user ON rescue_team_members(user_id);

-- 7. RESCUE REQUESTS

CREATE TABLE rescue_requests (
    id              SERIAL PRIMARY KEY,
    tracking_code   VARCHAR(20)  NOT NULL UNIQUE,

    citizen_name    VARCHAR(200),
    citizen_phone   VARCHAR(20),
    citizen_address TEXT,

    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    address         TEXT,
    province_id     INT REFERENCES provinces(id),
    district_id     INT REFERENCES districts(id),
    ward_id         INT REFERENCES wards(id),

    incident_type_id   INT REFERENCES incident_types(id),
    urgency_level_id   INT REFERENCES urgency_levels(id),
    description        TEXT,
    victim_count       INT     DEFAULT 1,
    support_type       TEXT,
    flood_severity     INT     DEFAULT 1 CHECK (flood_severity BETWEEN 1 AND 5),

    priority_score     INT     DEFAULT 0,

    status             VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
                           'pending', 'verified', 'assigned', 'in_progress',
                           'completed', 'cancelled', 'rejected'
                       )),

    coordinator_id     INT REFERENCES users(id),
    assigned_team_id   INT REFERENCES rescue_teams(id),

    citizen_confirmed              BOOLEAN     DEFAULT false,
    citizen_confirmed_at           TIMESTAMPTZ,
    rescue_team_confirmed          BOOLEAN     NOT NULL DEFAULT false,
    citizen_rescued_by_other_count SMALLINT    NOT NULL DEFAULT 0,

    geo_province_name  VARCHAR(255),
    geo_district_name  VARCHAR(255),

    tracking_status    VARCHAR(30) NOT NULL DEFAULT 'submitted'
                       CHECK (tracking_status IN (
                           'submitted', 'received', 'assigned', 'team_ready',
                           'en_route', 'completed', 'incident_reported'
                       )),
    incident_report_note TEXT,
    incident_team_info   TEXT,

    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW(),
    verified_at        TIMESTAMPTZ,
    assigned_at        TIMESTAMPTZ,
    started_at         TIMESTAMPTZ,
    completed_at       TIMESTAMPTZ,

    rescued_count          INT  DEFAULT 0,
    result_notes           TEXT,
    reject_reason          TEXT,
    response_time_minutes  INT
);
CREATE INDEX idx_requests_tracking        ON rescue_requests(tracking_code);
CREATE INDEX idx_requests_status          ON rescue_requests(status);
CREATE INDEX idx_requests_priority        ON rescue_requests(priority_score DESC);
CREATE INDEX idx_requests_province        ON rescue_requests(province_id);
CREATE INDEX idx_requests_district        ON rescue_requests(district_id);
CREATE INDEX idx_requests_coordinator     ON rescue_requests(coordinator_id);
CREATE INDEX idx_requests_team            ON rescue_requests(assigned_team_id);
CREATE INDEX idx_requests_created         ON rescue_requests(created_at DESC);
CREATE INDEX idx_requests_tracking_status ON rescue_requests(tracking_status);

-- 8. RESCUE REQUEST IMAGES

CREATE TABLE rescue_request_images (
    id         SERIAL PRIMARY KEY,
    request_id INT         NOT NULL REFERENCES rescue_requests(id) ON DELETE CASCADE,
    image_url  VARCHAR(500) NOT NULL,
    image_type VARCHAR(20) DEFAULT 'request' CHECK (image_type IN ('request', 'result')),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_images_request ON rescue_request_images(request_id);

-- 9. WAREHOUSES (before vehicles due to FK)

CREATE TABLE warehouses (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    address        TEXT,
    province_id    INT REFERENCES provinces(id),
    district_id    INT REFERENCES districts(id),
    latitude       DOUBLE PRECISION,
    longitude      DOUBLE PRECISION,
    capacity_tons  DOUBLE PRECISION,
    manager_id     INT REFERENCES users(id),
    coordinator_id INT REFERENCES users(id),
    phone          VARCHAR(20),
    warehouse_type VARCHAR(20) DEFAULT 'central' CHECK (warehouse_type IN ('central','satellite')),
    status         VARCHAR(20) DEFAULT 'active',
    created_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- 10. VEHICLES

CREATE TABLE vehicles (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    plate_number VARCHAR(20),
    type         VARCHAR(50),
    capacity     INT,
    province_id  INT REFERENCES provinces(id),
    team_id      INT REFERENCES rescue_teams(id),
    warehouse_id INT REFERENCES warehouses(id),
    status       VARCHAR(20) DEFAULT 'available' CHECK (status IN (
                     'available', 'in_use', 'in_transit', 'maintenance', 'retired', 'lost'
                 )),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_vehicles_province ON vehicles(province_id);
CREATE INDEX idx_vehicles_status   ON vehicles(status);
CREATE INDEX idx_vehicles_team     ON vehicles(team_id);

-- 11. TASK GROUPS (before missions due to FK)

CREATE TABLE task_groups (
    id                 SERIAL PRIMARY KEY,
    name               VARCHAR(200) NOT NULL,
    coordinator_id     INT          NOT NULL REFERENCES users(id),
    team_id            INT          NOT NULL REFERENCES rescue_teams(id),
    province_id        INT          REFERENCES provinces(id),
    status             VARCHAR(20)  NOT NULL DEFAULT 'in_progress'
                       CHECK (status IN ('in_progress','completed','partial','cancelled')),
    scheduled_date     DATE,
    estimated_completion TIMESTAMPTZ,
    stalled_alerted_at TIMESTAMPTZ,
    notes              TEXT,
    created_at         TIMESTAMPTZ  DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX idx_task_groups_team   ON task_groups(team_id);
CREATE INDEX idx_task_groups_coord  ON task_groups(coordinator_id);
CREATE INDEX idx_task_groups_status ON task_groups(status);

-- 12. MISSIONS

CREATE TABLE missions (
    id                  SERIAL PRIMARY KEY,
    request_id          INT         NOT NULL REFERENCES rescue_requests(id),
    team_id             INT         NOT NULL REFERENCES rescue_teams(id),
    vehicle_id          INT         REFERENCES vehicles(id),
    task_group_id       INT         REFERENCES task_groups(id),
    assigned_to_user_id INT         REFERENCES users(id),
    status              VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
                            'pending', 'assigned', 'accepted', 'en_route',
                            'on_scene', 'completed', 'aborted', 'failed'
                        )),
    notes               TEXT,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_missions_request    ON missions(request_id);
CREATE INDEX idx_missions_team       ON missions(team_id);
CREATE INDEX idx_missions_status     ON missions(status);
CREATE INDEX idx_missions_task_group ON missions(task_group_id);

-- 13. MISSION LOGS

CREATE TABLE mission_logs (
    id          SERIAL PRIMARY KEY,
    mission_id  INT         NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    user_id     INT         REFERENCES users(id),
    action      VARCHAR(50) NOT NULL,
    description TEXT,
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_mlogs_mission ON mission_logs(mission_id);

-- 14. MISSION ASSIGNMENTS

CREATE TABLE mission_assignments (
    id          SERIAL PRIMARY KEY,
    mission_id  INT         NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    user_id     INT         NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_mission_user UNIQUE (mission_id, user_id)
);
CREATE INDEX idx_massign_mission ON mission_assignments(mission_id);
CREATE INDEX idx_massign_user    ON mission_assignments(user_id);

-- 15. TASK GROUP TEAMS

CREATE TABLE task_group_teams (
    id            SERIAL PRIMARY KEY,
    task_group_id INT     NOT NULL REFERENCES task_groups(id) ON DELETE CASCADE,
    team_id       INT     NOT NULL REFERENCES rescue_teams(id),
    is_primary    BOOLEAN NOT NULL DEFAULT false,
    added_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_task_team UNIQUE (task_group_id, team_id)
);
CREATE INDEX idx_task_group_teams_task ON task_group_teams(task_group_id);
CREATE INDEX idx_task_group_teams_team ON task_group_teams(team_id);

-- 16. TASK INCIDENT REPORTS

CREATE TABLE task_incident_reports (
    id              SERIAL PRIMARY KEY,
    task_group_id   INT         NOT NULL REFERENCES task_groups(id),
    mission_id      INT         NOT NULL REFERENCES missions(id),
    reporter_id     INT         NOT NULL REFERENCES users(id),
    report_type     VARCHAR(30) NOT NULL CHECK (report_type IN ('stalled','unrescuable','need_support')),
    urgency         VARCHAR(20) NOT NULL DEFAULT 'medium'
                    CHECK (urgency IN ('low','medium','high','critical')),
    support_type    VARCHAR(50),
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','acknowledged','resolved')),
    resolved_by     INT REFERENCES users(id),
    resolved_at     TIMESTAMPTZ,
    resolution_note VARCHAR(500),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_incident_task    ON task_incident_reports(task_group_id);
CREATE INDEX idx_incident_mission ON task_incident_reports(mission_id);
CREATE INDEX idx_incident_status  ON task_incident_reports(status);

-- 17. RELIEF ITEMS & INVENTORY

CREATE TABLE relief_items (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    category        VARCHAR(50),
    unit            VARCHAR(20),
    description     TEXT,
    rescue_category VARCHAR(20) NOT NULL DEFAULT 'all'
                    CHECK (rescue_category IN ('cuu_nan', 'cuu_tro', 'cuu_ho', 'all')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE relief_inventory (
    id            SERIAL PRIMARY KEY,
    warehouse_id  INT              NOT NULL REFERENCES warehouses(id),
    item_id       INT              NOT NULL REFERENCES relief_items(id),
    quantity      DOUBLE PRECISION DEFAULT 0,
    unit          VARCHAR(20),
    min_threshold DOUBLE PRECISION DEFAULT 10,
    last_restocked TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ     DEFAULT NOW()
);
CREATE INDEX idx_inventory_warehouse ON relief_inventory(warehouse_id);

-- 18. DISTRIBUTION BATCHES

CREATE TABLE distribution_batches (
    id             SERIAL PRIMARY KEY,
    voucher_code   VARCHAR(20)  NOT NULL UNIQUE,
    team_id        INT          NOT NULL REFERENCES rescue_teams(id),
    warehouse_id   INT          NOT NULL REFERENCES warehouses(id),
    distributed_by INT          NOT NULL REFERENCES users(id),
    notes          TEXT,
    status         VARCHAR(20)  NOT NULL DEFAULT 'issued'
                   CHECK (status IN ('issued','confirmed','return_requested','returned')),
    task_id        INT          REFERENCES task_groups(id),
    created_at     TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX idx_dbatch_team    ON distribution_batches(team_id);
CREATE INDEX idx_dbatch_created ON distribution_batches(created_at DESC);

-- 19. RELIEF DISTRIBUTIONS

CREATE TABLE relief_distributions (
    id                    SERIAL PRIMARY KEY,
    distribution_type     VARCHAR(10)  NOT NULL DEFAULT 'issue'
                          CHECK (distribution_type IN ('issue','return')),
    request_id            INT          REFERENCES rescue_requests(id),
    team_id               INT          REFERENCES rescue_teams(id),
    warehouse_id          INT          NOT NULL REFERENCES warehouses(id),
    item_id               INT          NOT NULL REFERENCES relief_items(id),
    quantity              DOUBLE PRECISION NOT NULL,
    distributed_by        INT          NOT NULL REFERENCES users(id),
    notes                 TEXT,
    status                VARCHAR(20)  NOT NULL DEFAULT 'issued'
                          CHECK (status IN ('issued','confirmed','return_requested','partially_returned','returned','cancelled')),
    voucher_code          VARCHAR(20),
    batch_id              INT          REFERENCES distribution_batches(id),
    confirmed_at          TIMESTAMPTZ,
    returned_at           TIMESTAMPTZ,
    return_quantity       DOUBLE PRECISION,
    return_note           VARCHAR(300),
    return_requested_at   TIMESTAMPTZ,
    received_return_qty   DOUBLE PRECISION,
    return_confirmed_at   TIMESTAMPTZ,
    return_confirmed_by   INT          REFERENCES users(id),
    warehouse_confirmed   BOOLEAN      NOT NULL DEFAULT false,
    warehouse_confirmed_at TIMESTAMPTZ,
    warehouse_confirmed_by INT          REFERENCES users(id),
    created_at            TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX idx_distribution_request  ON relief_distributions(request_id);
CREATE INDEX idx_distribution_warehouse ON relief_distributions(warehouse_id);
CREATE INDEX idx_distribution_created  ON relief_distributions(created_at DESC);
CREATE INDEX idx_dist_batch            ON relief_distributions(batch_id);

-- 20. VEHICLE DISPATCHES

CREATE TABLE vehicle_dispatches (
    id                    SERIAL PRIMARY KEY,
    vehicle_id            INT         NOT NULL REFERENCES vehicles(id),
    team_id               INT         NOT NULL REFERENCES rescue_teams(id),
    dispatched_by         INT         NOT NULL REFERENCES users(id),
    mission_note          TEXT,
    status                VARCHAR(20) NOT NULL DEFAULT 'dispatched'
                          CHECK (status IN ('dispatched','confirmed','returned','cancelled','incident_pending')),
    task_id               INT         REFERENCES task_groups(id),
    dispatched_at         TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at          TIMESTAMPTZ,
    returned_at           TIMESTAMPTZ,
    return_confirmed_at   TIMESTAMPTZ,
    return_confirmed_by   INT         REFERENCES users(id),
    warehouse_confirmed   BOOLEAN     NOT NULL DEFAULT false,
    warehouse_confirmed_at TIMESTAMPTZ,
    warehouse_confirmed_by INT        REFERENCES users(id),
    incident_type         VARCHAR(20) CHECK (incident_type IN ('damaged','lost')),
    incident_note         TEXT,
    incident_reported_at  TIMESTAMPTZ,
    incident_reported_by  INT         REFERENCES users(id),
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_vdispatch_vehicle ON vehicle_dispatches(vehicle_id);
CREATE INDEX idx_vdispatch_team    ON vehicle_dispatches(team_id);
CREATE INDEX idx_vdispatch_status  ON vehicle_dispatches(status);

-- 21. VEHICLE REQUESTS

CREATE TABLE vehicle_requests (
    id                   SERIAL PRIMARY KEY,
    vehicle_type         VARCHAR(50) NOT NULL
                         CHECK (vehicle_type IN ('boat', 'truck', 'car', 'helicopter', 'ambulance', 'other')),
    quantity             INT         NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    destination_team_id  INT         NOT NULL REFERENCES rescue_teams(id),
    province_id          INT         REFERENCES provinces(id),
    source_type          VARCHAR(30) NOT NULL CHECK (source_type IN (
                             'purchase', 'borrow_local', 'borrow_external'
                         )),
    source_region        TEXT,
    expected_date        DATE,
    return_date          DATE,
    notes                TEXT,
    status               VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
                             'pending', 'approved', 'fulfilled', 'returned',
                             'rejected', 'cancelled'
                         )),
    requested_by         INT         NOT NULL REFERENCES users(id),
    approved_by          INT         REFERENCES users(id),
    fulfilled_by         INT         REFERENCES users(id),
    returned_by          INT         REFERENCES users(id),
    fulfilled_at         TIMESTAMPTZ,
    returned_confirmed_at TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_vreq_status    ON vehicle_requests(status);
CREATE INDEX idx_vreq_team      ON vehicle_requests(destination_team_id);
CREATE INDEX idx_vreq_province  ON vehicle_requests(province_id);
CREATE INDEX idx_vreq_requester ON vehicle_requests(requested_by);
CREATE INDEX idx_vreq_created   ON vehicle_requests(created_at DESC);

-- 22. SUPPLY TRANSFERS

CREATE TABLE supply_transfers (
    id                INT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    from_warehouse_id INT      NOT NULL REFERENCES warehouses(id),
    to_warehouse_id   INT      NOT NULL REFERENCES warehouses(id),
    item_id           INT      NOT NULL REFERENCES relief_items(id),
    quantity          DOUBLE PRECISION NOT NULL,
    transferred_by    INT      NOT NULL REFERENCES users(id),
    status            VARCHAR(20) NOT NULL DEFAULT 'in_transit'
                      CHECK (status IN ('in_transit','completed','cancelled')),
    notes             TEXT,
    confirmed_by      INT      REFERENCES users(id),
    confirmed_quantity DOUBLE PRECISION,
    confirmed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_stransfer_from   ON supply_transfers(from_warehouse_id);
CREATE INDEX idx_stransfer_to     ON supply_transfers(to_warehouse_id);
CREATE INDEX idx_stransfer_status ON supply_transfers(status);

-- 23. VEHICLE TRANSFERS

CREATE TABLE vehicle_transfers (
    id               SERIAL PRIMARY KEY,
    vehicle_id       INT         NOT NULL REFERENCES vehicles(id),
    from_province_id INT         NOT NULL REFERENCES provinces(id),
    to_province_id   INT         NOT NULL REFERENCES provinces(id),
    transferred_by   INT         NOT NULL REFERENCES users(id),
    status           VARCHAR(20) NOT NULL DEFAULT 'in_transit'
                     CHECK (status IN ('in_transit','completed','cancelled')),
    notes            TEXT,
    confirmed_by     INT         REFERENCES users(id),
    confirmed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_vtransfer_vehicle ON vehicle_transfers(vehicle_id);
CREATE INDEX idx_vtransfer_status  ON vehicle_transfers(status);

-- 24. SUPPLY REQUESTS (coordinator → warehouse manager)

CREATE TABLE supply_requests (
    id                 SERIAL PRIMARY KEY,
    requester_id       INT              NOT NULL REFERENCES users(id),
    warehouse_id       INT              NOT NULL REFERENCES warehouses(id),
    item_id            INT              NOT NULL REFERENCES relief_items(id),
    requested_quantity DOUBLE PRECISION NOT NULL,
    reason             TEXT,
    status             VARCHAR(30)      NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','manager_approved','approved','rejected')),
    reviewed_by        INT              REFERENCES users(id),
    review_note        TEXT,
    reviewed_at        TIMESTAMPTZ,
    created_at         TIMESTAMPTZ      DEFAULT NOW()
);

-- 25. WEATHER ALERTS

CREATE TABLE weather_alerts (
    id          SERIAL PRIMARY KEY,
    province_id INT         REFERENCES provinces(id),
    alert_type  VARCHAR(30) DEFAULT 'flood',
    severity    VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    starts_at   TIMESTAMPTZ  DEFAULT NOW(),
    expires_at  TIMESTAMPTZ,
    source      TEXT,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX idx_alerts_province ON weather_alerts(province_id);
CREATE INDEX idx_alerts_expires  ON weather_alerts(expires_at);

-- 26. NOTIFICATIONS

CREATE TABLE notifications (
    id            SERIAL PRIMARY KEY,
    user_id       INT         REFERENCES users(id),
    tracking_code VARCHAR(20),
    type          VARCHAR(50) NOT NULL,
    title         VARCHAR(200) NOT NULL,
    message       TEXT,
    metadata      TEXT,
    is_read       BOOLEAN     DEFAULT false,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notif_user     ON notifications(user_id, is_read);
CREATE INDEX idx_notif_tracking ON notifications(tracking_code);

-- 27. SYSTEM CONFIGURATION

CREATE TABLE system_config (
    id           SERIAL PRIMARY KEY,
    config_key   VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    description  TEXT,
    updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- 28. AUDIT LOGS

CREATE TABLE audit_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INT         REFERENCES users(id),
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   INT,
    old_values  TEXT,
    new_values  TEXT,
    ip_address  VARCHAR(50),
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX idx_audit_user    ON audit_logs(user_id);
CREATE INDEX idx_audit_action  ON audit_logs(action);
CREATE INDEX idx_audit_entity  ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
