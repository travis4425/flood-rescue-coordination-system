-- ============================================================
-- Migration 003: Multi-Hazard Expansion
-- Mở rộng hệ thống hỗ trợ 8 loại thiên tai Việt Nam
-- Run: psql -U postgres -d flood_rescue_db -f 003_multi_hazard.sql
-- ============================================================

-- 1. DISASTER TYPES
CREATE TABLE IF NOT EXISTS disaster_types (
  id         SERIAL PRIMARY KEY,
  code       VARCHAR(30)  NOT NULL UNIQUE,
  name_vi    VARCHAR(100) NOT NULL,
  name_en    VARCHAR(100) NOT NULL,
  icon       VARCHAR(10),
  color      VARCHAR(20),
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO disaster_types (code, name_vi, name_en, icon, color) VALUES
  ('flood',      'Lũ lụt',          'Flood',               '🌊', '#3b82f6'),
  ('typhoon',    'Bão',             'Typhoon',             '🌀', '#8b5cf6'),
  ('landslide',  'Sạt lở đất',     'Landslide',           '⛰️', '#92400e'),
  ('drought',    'Hạn hán',        'Drought',             '☀️', '#f59e0b'),
  ('earthquake', 'Động đất',       'Earthquake',          '🔴', '#ef4444'),
  ('wildfire',   'Cháy rừng',      'Wildfire',            '🔥', '#f97316'),
  ('saltwater',  'Xâm nhập mặn',   'Saltwater Intrusion', '🧂', '#06b6d4'),
  ('tsunami',    'Sóng thần',      'Tsunami',             '🌊', '#1d4ed8')
ON CONFLICT (code) DO NOTHING;

-- 2. DISASTER EVENTS
CREATE TABLE IF NOT EXISTS disaster_events (
  id                  SERIAL PRIMARY KEY,
  disaster_type_id    INT          NOT NULL REFERENCES disaster_types(id),
  name                VARCHAR(200) NOT NULL,
  name_en             VARCHAR(200),
  description         TEXT,
  severity            INT          NOT NULL CHECK (severity BETWEEN 1 AND 5),
  status              VARCHAR(30)  NOT NULL DEFAULT 'monitoring'
                      CHECK (status IN ('monitoring','warning','active','recovery','closed')),
  affected_provinces  INT[],
  center_latitude     DOUBLE PRECISION,
  center_longitude    DOUBLE PRECISION,
  affected_radius_km  DOUBLE PRECISION,
  external_ref        VARCHAR(100),
  current_phase_id    INT,           -- FK added after workflow_phases table
  started_at          TIMESTAMPTZ,
  ended_at            TIMESTAMPTZ,
  created_by          INT REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_disaster_events_type   ON disaster_events(disaster_type_id);
CREATE INDEX IF NOT EXISTS idx_disaster_events_status ON disaster_events(status);
CREATE INDEX IF NOT EXISTS idx_disaster_events_active ON disaster_events(status, severity DESC) WHERE status IN ('warning','active','recovery');

-- 3. DISASTER WORKFLOW PHASES
CREATE TABLE IF NOT EXISTS disaster_workflow_phases (
  id               SERIAL PRIMARY KEY,
  disaster_type_id INT NOT NULL REFERENCES disaster_types(id),
  phase_order      INT NOT NULL,
  code             VARCHAR(50)  NOT NULL,
  name_vi          VARCHAR(100) NOT NULL,
  name_en          VARCHAR(100) NOT NULL,
  description_vi   TEXT,
  description_en   TEXT
);

-- Add FK now that phases table exists
ALTER TABLE disaster_events
  ADD CONSTRAINT IF NOT EXISTS fk_current_phase
  FOREIGN KEY (current_phase_id) REFERENCES disaster_workflow_phases(id);

-- Seed phases for flood / typhoon / tsunami
INSERT INTO disaster_workflow_phases (disaster_type_id, phase_order, code, name_vi, name_en)
SELECT dt.id, p.phase_order, p.code, p.name_vi, p.name_en
FROM disaster_types dt
CROSS JOIN (VALUES
  (1, 'prepare',  'Chuẩn bị',  'Preparation'),
  (2, 'evacuate', 'Sơ tán',    'Evacuation'),
  (3, 'respond',  'Ứng phó',   'Response'),
  (4, 'recover',  'Phục hồi',  'Recovery')
) AS p(phase_order, code, name_vi, name_en)
WHERE dt.code IN ('flood','typhoon','tsunami')
ON CONFLICT DO NOTHING;

-- Seed phases for earthquake / landslide
INSERT INTO disaster_workflow_phases (disaster_type_id, phase_order, code, name_vi, name_en)
SELECT dt.id, p.phase_order, p.code, p.name_vi, p.name_en
FROM disaster_types dt
CROSS JOIN (VALUES
  (1, 'alert',         'Cảnh báo',            'Alert'),
  (2, 'search_rescue', 'Tìm kiếm cứu nạn',   'Search & Rescue'),
  (3, 'medical',       'Y tế khẩn cấp',      'Emergency Medical'),
  (4, 'recover',       'Phục hồi',            'Recovery')
) AS p(phase_order, code, name_vi, name_en)
WHERE dt.code IN ('earthquake','landslide')
ON CONFLICT DO NOTHING;

-- Seed phases for wildfire
INSERT INTO disaster_workflow_phases (disaster_type_id, phase_order, code, name_vi, name_en)
SELECT dt.id, p.phase_order, p.code, p.name_vi, p.name_en
FROM disaster_types dt
CROSS JOIN (VALUES
  (1, 'detect',     'Phát hiện',     'Detection'),
  (2, 'contain',    'Khoanh vùng',   'Containment'),
  (3, 'extinguish', 'Dập lửa',       'Extinguishing'),
  (4, 'recover',    'Phục hồi',      'Recovery')
) AS p(phase_order, code, name_vi, name_en)
WHERE dt.code = 'wildfire'
ON CONFLICT DO NOTHING;

-- Seed phases for drought / saltwater
INSERT INTO disaster_workflow_phases (disaster_type_id, phase_order, code, name_vi, name_en)
SELECT dt.id, p.phase_order, p.code, p.name_vi, p.name_en
FROM disaster_types dt
CROSS JOIN (VALUES
  (1, 'monitor',   'Giám sát',        'Monitoring'),
  (2, 'restrict',  'Hạn chế dùng nước','Water Restriction'),
  (3, 'supply',    'Cấp nước khẩn cấp','Emergency Supply'),
  (4, 'recover',   'Phục hồi',         'Recovery')
) AS p(phase_order, code, name_vi, name_en)
WHERE dt.code IN ('drought','saltwater')
ON CONFLICT DO NOTHING;

-- 4. EXPAND rescue_requests
ALTER TABLE rescue_requests
  ADD COLUMN IF NOT EXISTS disaster_event_id INT REFERENCES disaster_events(id),
  ADD COLUMN IF NOT EXISTS disaster_type_id  INT REFERENCES disaster_types(id);

CREATE INDEX IF NOT EXISTS idx_rr_disaster_event ON rescue_requests(disaster_event_id);
CREATE INDEX IF NOT EXISTS idx_rr_disaster_type  ON rescue_requests(disaster_type_id);

-- Backfill existing requests as flood type
UPDATE rescue_requests
SET disaster_type_id = (SELECT id FROM disaster_types WHERE code = 'flood')
WHERE disaster_type_id IS NULL;

-- 5. RESPONSE UNIT TYPES
CREATE TABLE IF NOT EXISTS response_unit_types (
  id      SERIAL PRIMARY KEY,
  code    VARCHAR(30)  NOT NULL UNIQUE,
  name_vi VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  icon    VARCHAR(10)
);

INSERT INTO response_unit_types (code, name_vi, name_en, icon) VALUES
  ('rescue',    'Đội cứu hộ dân sự',     'Civil Rescue Team',  '🚒'),
  ('military',  'Lực lượng quân sự',     'Military Unit',      '🪖'),
  ('medical',   'Y tế',                  'Medical Team',       '🏥'),
  ('firefight', 'Phòng cháy chữa cháy', 'Firefighting',       '🔥'),
  ('ngo',       'Tổ chức phi lợi nhuận', 'NGO',                '🤝'),
  ('utility',   'Điện, nước, viễn thông','Utility Services',   '⚡')
ON CONFLICT (code) DO NOTHING;

-- Expand rescue_teams
ALTER TABLE rescue_teams
  ADD COLUMN IF NOT EXISTS unit_type_id      INT REFERENCES response_unit_types(id),
  ADD COLUMN IF NOT EXISTS disaster_type_ids INT[];

-- Backfill rescue_teams as civil rescue
UPDATE rescue_teams
SET unit_type_id = (SELECT id FROM response_unit_types WHERE code = 'rescue')
WHERE unit_type_id IS NULL;

-- 6. EXTERNAL ALERT LOGS
CREATE TABLE IF NOT EXISTS external_alert_logs (
  id                SERIAL PRIMARY KEY,
  source            VARCHAR(50)  NOT NULL,
  alert_type        VARCHAR(50),
  raw_data          JSONB,
  processed         BOOLEAN DEFAULT false,
  disaster_event_id INT REFERENCES disaster_events(id),
  received_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ext_alerts_source    ON external_alert_logs(source);
CREATE INDEX IF NOT EXISTS idx_ext_alerts_processed ON external_alert_logs(processed) WHERE processed = false;

-- 7. DISASTER EVENT LOGS (timeline)
CREATE TABLE IF NOT EXISTS disaster_event_logs (
  id                SERIAL PRIMARY KEY,
  disaster_event_id INT  NOT NULL REFERENCES disaster_events(id) ON DELETE CASCADE,
  user_id           INT  REFERENCES users(id),
  action            VARCHAR(100) NOT NULL,
  description       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_logs_disaster ON disaster_event_logs(disaster_event_id);

-- Done
DO $$ BEGIN
  RAISE NOTICE 'Migration 003_multi_hazard completed successfully.';
END $$;
