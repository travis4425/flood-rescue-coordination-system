
USE flood_rescue_db;
GO

-- ============================================================
-- SEED DATA: TP.HCM & các tỉnh lân cận
-- Scope: HCM (kho tổng) + Bình Dương, Đồng Nai, Long An, Tây Ninh, Bà Rịa-VT
-- Mật khẩu tất cả: 123456
-- ============================================================

-- 1. REGIONS (1 vùng: Miền Nam)
SET IDENTITY_INSERT regions ON;
INSERT INTO regions (id, name, code, description) VALUES
  (1, N'Miền Nam', 'south', N'Khu vực TP.HCM và các tỉnh lân cận');
SET IDENTITY_INSERT regions OFF;

-- 2. PROVINCES (6 tỉnh/thành)
SET IDENTITY_INSERT provinces ON;
INSERT INTO provinces (id, region_id, name, code, latitude, longitude) VALUES
  (1, 1, N'TP Hồ Chí Minh',   'hcm',       10.8231, 106.6297),
  (2, 1, N'Bình Dương',        'binhduong', 11.3254, 106.4770),
  (3, 1, N'Đồng Nai',          'dongnai',   11.0686, 107.1676),
  (4, 1, N'Long An',            'longan',    10.6956, 106.2431),
  (5, 1, N'Tây Ninh',           'tayninh',   11.3103, 106.0982),
  (6, 1, N'Bà Rịa-Vũng Tàu',  'brvt',      10.5417, 107.2431);
SET IDENTITY_INSERT provinces OFF;

-- 3. DISTRICTS (23 quận/huyện)
SET IDENTITY_INSERT districts ON;
INSERT INTO districts (id, province_id, name, code, latitude, longitude) VALUES
  -- TP.HCM (province_id=1)
  (1,  1, N'Quận Bình Thạnh',  'binh-thanh',  10.8069, 106.7143),
  (2,  1, N'Quận 1',           'quan-1',       10.7769, 106.7009),
  (3,  1, N'Quận 7',           'quan-7',       10.7369, 106.7185),
  (4,  1, N'Huyện Bình Chánh', 'binh-chanh',   10.6886, 106.5735),
  (5,  1, N'Huyện Nhà Bè',     'nha-be',       10.6877, 106.7345),
  -- Bình Dương (province_id=2)
  (6,  2, N'TP Thủ Dầu Một',   'thu-dau-mot',  11.1353, 106.6583),
  (7,  2, N'TX Thuận An',      'thuan-an',     10.9982, 106.6944),
  (8,  2, N'TX Dĩ An',         'di-an',        10.9070, 106.7660),
  (9,  2, N'Huyện Bến Cát',    'ben-cat',      11.2200, 106.5700),
  -- Đồng Nai (province_id=3)
  (10, 3, N'TP Biên Hòa',      'bien-hoa',     10.9596, 106.8431),
  (11, 3, N'Huyện Nhơn Trạch', 'nhon-trach',   10.7800, 106.9600),
  (12, 3, N'Huyện Long Thành', 'long-thanh',   10.8600, 107.0400),
  -- Long An (province_id=4)
  (13, 4, N'TP Tân An',        'tan-an',       10.5325, 106.4131),
  (14, 4, N'Huyện Đức Hòa',   'duc-hoa',      10.8800, 106.2800),
  (15, 4, N'Huyện Bến Lức',   'ben-luc',      10.6500, 106.4900),
  (16, 4, N'Huyện Cần Giuộc', 'can-giuoc',    10.5500, 106.6300),
  -- Tây Ninh (province_id=5)
  (17, 5, N'TP Tây Ninh',      'tp-tay-ninh',  11.3103, 106.0982),
  (18, 5, N'Huyện Gò Dầu',    'go-dau',       11.0800, 106.2600),
  (19, 5, N'Huyện Trảng Bàng','trang-bang',   11.0200, 106.3500),
  -- Bà Rịa-Vũng Tàu (province_id=6)
  (20, 6, N'TP Bà Rịa',        'tp-ba-ria',    10.4993, 107.1745),
  (21, 6, N'TP Vũng Tàu',      'tp-vung-tau',  10.4114, 107.1362),
  (22, 6, N'Huyện Long Điền', 'long-dien',    10.4600, 107.2300),
  (23, 6, N'Huyện Xuyên Mộc', 'xuyen-moc',    10.5700, 107.4100);
SET IDENTITY_INSERT districts OFF;

-- 4. WARDS (8 phường tại HCM)
SET IDENTITY_INSERT wards ON;
INSERT INTO wards (id, district_id, name, code, latitude, longitude) VALUES
  (1, 1, N'Phường 25',        'p25-bt',    10.8100, 106.7200),
  (2, 1, N'Phường 26',        'p26-bt',    10.8050, 106.7100),
  (3, 2, N'Phường Bến Nghé',  'ben-nghe',  10.7730, 106.7030),
  (4, 2, N'Phường Bến Thành', 'ben-thanh', 10.7720, 106.6980),
  (5, 3, N'Phường Tân Phú',   'tan-phu-q7',10.7400, 106.7210),
  (6, 3, N'Phường Tân Quy',   'tan-quy',   10.7350, 106.7150),
  (7, 4, N'Xã Bình Hưng',     'binh-hung', 10.6700, 106.6100),
  (8, 5, N'Xã Phú Xuân',      'phu-xuan',  10.6900, 106.7400);
SET IDENTITY_INSERT wards OFF;

-- 5. INCIDENT TYPES (6)
-- rescue_category:
--   cuu_nan = Cứu nạn (trực tiếp cứu người bị kẹt/nguy hiểm) → cần phương tiện + vật tư y tế
--   cuu_tro = Cứu trợ (cung cấp nhu yếu phẩm)                → cần lương thực, nước
--   cuu_ho  = Cứu hộ  (sơ tán / y tế khẩn cấp di chuyển)    → cần xe cứu thương + đội y tế
SET IDENTITY_INSERT incident_types ON;
INSERT INTO incident_types (id, name, code, icon, color, description, rescue_category) VALUES
  (1, N'Ngập lụt',        'flood',     'water',          '#2196F3', N'Nước dâng gây ngập, người bị mắc kẹt',          'cuu_nan'),
  (2, N'Sạt lở đất',      'landslide', 'mountain',       '#795548', N'Sạt lở do mưa lớn, người/tài sản bị vùi lấp',   'cuu_nan'),
  (3, N'Mắc kẹt',         'trapped',   'alert-triangle', '#FF5722', N'Người bị mắc kẹt, cần giải cứu trực tiếp',      'cuu_nan'),
  (4, N'Y tế khẩn cấp',   'medical',   'heart',          '#F44336', N'Người bị thương/bệnh nặng cần sơ cứu tại chỗ',  'cuu_nan'),
  (5, N'Thiếu lương thực','supplies',  'package',        '#FF9800', N'Cần lương thực, nước uống, nhu yếu phẩm',        'cuu_tro'),
  (6, N'Sơ tán',          'evacuation','move',           '#9C27B0', N'Cần di dời người dân ra khỏi vùng nguy hiểm',    'cuu_ho');
SET IDENTITY_INSERT incident_types OFF;

-- 6. URGENCY LEVELS (5)
SET IDENTITY_INSERT urgency_levels ON;
INSERT INTO urgency_levels (id, name, code, priority_score, color, max_response_minutes, description) VALUES
  (1, N'Khẩn cấp',  'critical', 100, '#F44336', 30,   N'Tính mạng đang bị đe dọa'),
  (2, N'Rất cao',   'very_high', 80, '#FF5722', 60,   N'Cần cứu hộ trong 1 giờ'),
  (3, N'Cao',       'high',      60, '#FF9800', 120,  N'Cần hỗ trợ trong 2 giờ'),
  (4, N'Trung bình','medium',    40, '#FFC107', 360,  N'Cần hỗ trợ trong 6 giờ'),
  (5, N'Thấp',      'low',       20, '#4CAF50', 1440, N'Hỗ trợ trong 24 giờ');
SET IDENTITY_INSERT urgency_levels OFF;

-- 7. USERS (37 người, mật khẩu: 123456)
-- id 1     = admin
-- id 2     = warehouse_manager (kho tổng HCM)
-- id 3     = manager (quản lý chung vùng HCM)
-- id 4-9   = coordinator (1 per tỉnh)
-- id 10-13 = team leader (HCM×2, BD, LA)
-- id 14-37 = team member (6 per đội)

DECLARE @hash VARCHAR(255) = '$2a$10$OS0HPBGhR6NtXxQ/QAWmP.CzeOr947.Q04EIqjt1VrYuwIXLGKH7C';

SET IDENTITY_INSERT users ON;
INSERT INTO users (id, username, email, password_hash, full_name, phone, role, province_id) VALUES
  -- Hệ thống
  (1,  'admin',      'admin@cuuho.vn',       @hash, N'Nguyễn Văn Admin',   '0900000001', 'admin',             NULL),
  (2,  'wm_hcm',     'wm@cuuho.vn',          @hash, N'Lê Minh Kho',        '0900000002', 'warehouse_manager', 1),
  -- Manager (1 người quản lý chung vùng HCM)
  (3,  'mgr_hcm',    'mgr.hcm@cuuho.vn',     @hash, N'Trần Quốc Hùng',    '0900000003', 'manager',           1),
  -- Coordinators (1 per tỉnh)
  (4,  'coord_hcm',  'coord.hcm@cuuho.vn',   @hash, N'Trần Văn Hùng',     '0900000004', 'coordinator',       1),
  (5,  'coord_bd',   'coord.bd@cuuho.vn',     @hash, N'Lý Thị Bình',       '0900000005', 'coordinator',       2),
  (6,  'coord_dn',   'coord.dn@cuuho.vn',     @hash, N'Ngô Văn Đồng',      '0900000006', 'coordinator',       3),
  (7,  'coord_la',   'coord.la@cuuho.vn',     @hash, N'Cao Thị Long',      '0900000007', 'coordinator',       4),
  (8,  'coord_tn',   'coord.tn@cuuho.vn',     @hash, N'Đinh Văn Tây',      '0900000008', 'coordinator',       5),
  (9,  'coord_brvt', 'coord.brvt@cuuho.vn',   @hash, N'Phan Thị Vũng',     '0900000009', 'coordinator',       6),
  -- Team leaders (named by district)
  (10, 'leader_binhthanh','leader.binhthanh@cuuho.vn', @hash, N'Trần Minh Hiếu',    '0911000001', 'rescue_team', 1),
  (11, 'leader_q7',       'leader.q7@cuuho.vn',        @hash, N'Nguyễn Lan Anh',    '0911000002', 'rescue_team', 1),
  (12, 'leader_thuanan',  'leader.thuanan@cuuho.vn',   @hash, N'Phạm Văn Cường',    '0911000003', 'rescue_team', 2),
  (13, 'leader_benluc',   'leader.benluc@cuuho.vn',    @hash, N'Lê Thị Thu Hương',  '0911000004', 'rescue_team', 4),
  -- Members HCM đội 1 (6 người)
  (14, 'mem_hcm_01', 'mhcm01@cuuho.vn',  @hash, N'Cao Thị Lan',        '0912000001', 'rescue_team', 1),
  (15, 'mem_hcm_02', 'mhcm02@cuuho.vn',  @hash, N'Đinh Văn Khoa',      '0912000002', 'rescue_team', 1),
  (22, 'mem_hcm_03', 'mhcm03@cuuho.vn',  @hash, N'Trần Văn Bảo',       '0912000009', 'rescue_team', 1),
  (23, 'mem_hcm_04', 'mhcm04@cuuho.vn',  @hash, N'Nguyễn Thị Cúc',     '0912000010', 'rescue_team', 1),
  (24, 'mem_hcm_05', 'mhcm05@cuuho.vn',  @hash, N'Lê Văn Đức',         '0912000011', 'rescue_team', 1),
  (25, 'mem_hcm_06', 'mhcm06@cuuho.vn',  @hash, N'Phạm Văn Hải',       '0912000012', 'rescue_team', 1),
  -- Members HCM đội 2 (6 người)
  (16, 'mem_hcm_07', 'mhcm07@cuuho.vn',  @hash, N'Võ Văn Nam',         '0912000003', 'rescue_team', 1),
  (17, 'mem_hcm_08', 'mhcm08@cuuho.vn',  @hash, N'Huỳnh Văn Bảo',      '0912000004', 'rescue_team', 1),
  (26, 'mem_hcm_09', 'mhcm09@cuuho.vn',  @hash, N'Võ Thị Mai',         '0912000013', 'rescue_team', 1),
  (27, 'mem_hcm_10', 'mhcm10@cuuho.vn',  @hash, N'Đặng Văn Minh',      '0912000014', 'rescue_team', 1),
  (28, 'mem_hcm_11', 'mhcm11@cuuho.vn',  @hash, N'Huỳnh Thị Ngọc',     '0912000015', 'rescue_team', 1),
  (29, 'mem_hcm_12', 'mhcm12@cuuho.vn',  @hash, N'Trịnh Văn Phong',    '0912000016', 'rescue_team', 1),
  -- Members BD (6 người)
  (18, 'mem_bd_01',  'mbd01@cuuho.vn',    @hash, N'Nguyễn Văn Hải',     '0912000005', 'rescue_team', 2),
  (19, 'mem_bd_02',  'mbd02@cuuho.vn',    @hash, N'Trần Thị Hoa',       '0912000006', 'rescue_team', 2),
  (30, 'mem_bd_03',  'mbd03@cuuho.vn',    @hash, N'Lý Văn Quang',       '0912000017', 'rescue_team', 2),
  (31, 'mem_bd_04',  'mbd04@cuuho.vn',    @hash, N'Cao Thị Ry',         '0912000018', 'rescue_team', 2),
  (32, 'mem_bd_05',  'mbd05@cuuho.vn',    @hash, N'Đinh Văn Sơn',       '0912000019', 'rescue_team', 2),
  (33, 'mem_bd_06',  'mbd06@cuuho.vn',    @hash, N'Ngô Thị Thanh',      '0912000020', 'rescue_team', 2),
  -- Members LA (6 người)
  (20, 'mem_la_01',  'mla01@cuuho.vn',    @hash, N'Lê Văn Quân',        '0912000007', 'rescue_team', 4),
  (21, 'mem_la_02',  'mla02@cuuho.vn',    @hash, N'Nguyễn Thị Trang',   '0912000008', 'rescue_team', 4),
  (34, 'mem_la_03',  'mla03@cuuho.vn',    @hash, N'Phan Văn Tùng',      '0912000021', 'rescue_team', 4),
  (35, 'mem_la_04',  'mla04@cuuho.vn',    @hash, N'Bùi Thị Uyên',       '0912000022', 'rescue_team', 4),
  (36, 'mem_la_05',  'mla05@cuuho.vn',    @hash, N'Hồ Văn Vũ',          '0912000023', 'rescue_team', 4),
  (37, 'mem_la_06',  'mla06@cuuho.vn',    @hash, N'Trần Thị Xinh',      '0912000024', 'rescue_team', 4);
SET IDENTITY_INSERT users OFF;

-- 8. COORDINATOR REGIONS
INSERT INTO coordinator_regions (user_id, province_id, is_primary, max_workload) VALUES
  (4, 1, 1, 30),   -- coord_hcm
  (5, 2, 1, 20),   -- coord_bd
  (6, 3, 1, 20),   -- coord_dn
  (7, 4, 1, 20),   -- coord_la
  (8, 5, 1, 15),   -- coord_tn
  (9, 6, 1, 15);   -- coord_brvt

-- 9. RESCUE TEAMS (4 đội)
SET IDENTITY_INSERT rescue_teams ON;
INSERT INTO rescue_teams (id, name, code, leader_id, province_id, district_id, phone, capacity, specialization, status, current_latitude, current_longitude) VALUES
  (1, N'Đội Cứu Hộ Bình Thạnh', 'HCM-01', 10, 1, 1, '0900100001', 10, N'water_rescue,evacuation',  'available',  10.8069, 106.7143),
  (2, N'Đội Cứu Hộ Quận 7',     'HCM-02', 11, 1, 3, '0900100002', 10, N'medical,water_rescue',     'on_mission', 10.7369, 106.7185),
  (3, N'Đội Cứu Hộ Bình Dương', 'BD-01',  12, 2, 7, '0900100003', 10, N'water_rescue,search_rescue','available',  10.9982, 106.6944),
  (4, N'Đội Cứu Hộ Long An',    'LA-01',  13, 4, 15,'0900100004', 10, N'evacuation,water_rescue',  'available',  10.6500, 106.4900);
SET IDENTITY_INSERT rescue_teams OFF;

-- 10. RESCUE TEAM MEMBERS (1 leader + 6 members mỗi đội)
INSERT INTO rescue_team_members (team_id, user_id, role_in_team) VALUES
  -- HCM-01
  (1, 10, 'leader'), (1, 14, 'member'), (1, 15, 'medic'),
  (1, 22, 'member'), (1, 23, 'medic'),  (1, 24, 'member'), (1, 25, 'driver'),
  -- HCM-02
  (2, 11, 'leader'), (2, 16, 'member'), (2, 17, 'medic'),
  (2, 26, 'member'), (2, 27, 'medic'),  (2, 28, 'member'), (2, 29, 'driver'),
  -- BD-01
  (3, 12, 'leader'), (3, 18, 'member'), (3, 19, 'medic'),
  (3, 30, 'member'), (3, 31, 'medic'),  (3, 32, 'member'), (3, 33, 'driver'),
  -- LA-01
  (4, 13, 'leader'), (4, 20, 'member'), (4, 21, 'medic'),
  (4, 34, 'member'), (4, 35, 'medic'),  (4, 36, 'member'), (4, 37, 'driver');

-- 11. VEHICLES (8)
SET IDENTITY_INSERT vehicles ON;
INSERT INTO vehicles (id, name, plate_number, type, capacity, province_id, team_id, status) VALUES
  (1, N'Xuồng BT-X01',       '79A-00001', 'boat',      8, 1, 1,    'available'),
  (2, N'Xuồng BT-X02',       '79A-00002', 'boat',      6, 1, 1,    'available'),
  (3, N'Xe cứu thương Q7-A01','79A-10001', 'ambulance', 4, 1, 2,    'in_use'),
  (4, N'Xuồng Q7-X01',       '79A-00003', 'boat',      8, 1, 2,    'available'),
  (5, N'Xuồng BD-X01',       '74B-00001', 'boat',      8, 2, 3,    'available'),
  (6, N'Xe tải BD-T01',      '74B-20001', 'truck',    15, 2, NULL, 'available'),
  (7, N'Xuồng LA-X01',       '62A-00001', 'boat',      8, 4, 4,    'available'),
  (8, N'Xe cứu thương LA-A01','62A-10001', 'ambulance', 4, 4, NULL, 'available');
SET IDENTITY_INSERT vehicles OFF;

-- 12. WAREHOUSES (1 kho tổng HCM + 5 kho vệ tinh)
SET IDENTITY_INSERT warehouses ON;
INSERT INTO warehouses (id, name, address, province_id, district_id, latitude, longitude, capacity_tons, manager_id, coordinator_id, phone, warehouse_type, status) VALUES
  (1, N'Kho Tổng TP.HCM',        N'200 Đinh Tiên Hoàng, Bình Thạnh, TP.HCM', 1, 1,  10.8014, 106.7177, 300.0, 2,  NULL, '0900200001', 'central',   'active'),
  (2, N'Kho Vệ Tinh Bình Dương', N'50 Đại lộ Bình Dương, TP Thủ Dầu Một',    2, 6,  11.1353, 106.6583,  80.0, NULL, 5,  '0900200002', 'satellite', 'active'),
  (3, N'Kho Vệ Tinh Đồng Nai',   N'100 Phạm Văn Thuận, TP Biên Hòa',         3, 10, 10.9596, 106.8431,  80.0, NULL, 6,  '0900200003', 'satellite', 'active'),
  (4, N'Kho Vệ Tinh Long An',    N'45 Hùng Vương, TP Tân An',                 4, 13, 10.5325, 106.4131,  60.0, NULL, 7,  '0900200004', 'satellite', 'active'),
  (5, N'Kho Vệ Tinh Tây Ninh',   N'30 Đường 30/4, TP Tây Ninh',               5, 17, 11.3103, 106.0982,  50.0, NULL, 8,  '0900200005', 'satellite', 'active'),
  (6, N'Kho Vệ Tinh Bà Rịa-VT',  N'20 Trương Công Định, TP Bà Rịa',           6, 20, 10.4993, 107.1745,  50.0, NULL, 9,  '0900200006', 'satellite', 'active');
SET IDENTITY_INSERT warehouses OFF;

-- 13. RELIEF ITEMS (16)
-- category  : nhóm vật chất (food, water, medical, equipment, shelter, fuel)
-- rescue_category: loại cứu hộ phù hợp để hệ thống tự gợi ý
--   cuu_nan = Cứu nạn  → vật tư y tế + thiết bị trực tiếp cứu người
--   cuu_tro = Cứu trợ  → lương thực, nước, nhu yếu phẩm
--   cuu_ho  = Cứu hộ   → sơ tán, di chuyển, y tế cơ bản
--   all     = Dùng được cho mọi loại (xăng, áo phao...)
SET IDENTITY_INSERT relief_items ON;
INSERT INTO relief_items (id, name, category, unit, description, rescue_category) VALUES
  -- ── CỨU TRỢ: lương thực / nhu yếu phẩm ──────────────────────────────────
  (1,  N'Gạo',               'food',      'kg',    N'Gạo tẻ đóng bao 50kg',                       'cuu_tro'),
  (2,  N'Mì tôm',            'food',      'box',   N'Mì ăn liền (30 gói/thùng)',                   'cuu_tro'),
  (3,  N'Nước uống',         'water',     'thùng', N'Nước đóng chai 500ml',                        'cuu_tro'),
  (5,  N'Chăn mền',          'shelter',   'piece', N'Chăn ấm cứu trợ',                             'cuu_tro'),
  (7,  N'Bạt che mưa',       'shelter',   'piece', N'Bạt nhựa che mưa 4x6m',                      'cuu_tro'),
  (9,  N'Đồ hộp thực phẩm', 'food',      'box',   N'Thực phẩm đóng hộp dự trữ',                   'cuu_tro'),
  (10, N'Quần áo khô',       'shelter',   'set',   N'Bộ quần áo khô thay thế',                     'cuu_tro'),
  -- ── CỨU NẠN: vật tư y tế + thiết bị ─────────────────────────────────────
  (4,  N'Thuốc sát trùng',   'medical',   'box',   N'Kit thuốc y tế cơ bản',                       'cuu_nan'),
  (11, N'Bông băng y tế',    'medical',   'set',   N'Bộ bông băng cứu thương',                     'cuu_nan'),
  (12, N'Túi y tế khẩn cấp', 'medical',   'bag',   N'Túi sơ cứu khẩn cấp đầy đủ dụng cụ',         'cuu_nan'),
  (13, N'Cáng cứu thương',   'equipment', 'piece', N'Cáng gấp vải di chuyển nạn nhân',             'cuu_nan'),
  (14, N'Dây cứu sinh',      'equipment', 'piece', N'Dây thừng cứu sinh 20m',                      'cuu_nan'),
  -- ── CỨU HỘ: sơ tán / di chuyển y tế ────────────────────────────────────
  (15, N'Xe lăn',            'medical',   'piece', N'Xe lăn hỗ trợ người già / thương tích',       'cuu_ho'),
  -- ── DÙNG CHUNG ──────────────────────────────────────────────────────────
  (6,  N'Áo phao',           'equipment', 'piece', N'Áo phao cứu sinh',                            'all'),
  (8,  N'Xăng dầu',          'fuel',      'liter', N'Xăng cho xuồng cứu hộ',                      'all'),
  (16, N'Máy bơm nước',      'equipment', 'piece', N'Máy bơm xử lý ngập nước',                    'all');
SET IDENTITY_INSERT relief_items OFF;

-- 14. RELIEF INVENTORY
INSERT INTO relief_inventory (warehouse_id, item_id, quantity, unit, min_threshold) VALUES
  -- Kho tổng HCM (đủ hàng - cả cứu trợ lẫn y tế)
  (1,1,10000,'kg',2000),  (1,2,500,'box',100),   (1,3,8000,'thùng',1000),
  (1,4,200,'box',30),     (1,5,800,'piece',100),  (1,6,400,'piece',50),
  (1,7,300,'piece',40),   (1,8,2000,'liter',500),
  (1,9,300,'box',40),     (1,10,400,'set',50),
  -- Vật tư y tế/cứu hộ tại kho tổng HCM
  (1,11,300,'set',30),    (1,12,150,'bag',20),    (1,13,50,'piece',10),
  (1,14,80,'piece',15),   (1,15,20,'piece',5),    (1,16,15,'piece',3),
  -- Kho VS Bình Dương
  (2,1,2000,'kg',400),    (2,2,100,'box',20),     (2,3,1500,'thùng',300),
  (2,4,40,'box',10),      (2,6,80,'piece',20),    (2,8,500,'liter',100),
  (2,11,60,'set',10),     (2,12,30,'bag',5),      (2,13,12,'piece',3),
  -- Kho VS Đồng Nai
  (3,1,2000,'kg',400),    (3,2,80,'box',20),      (3,3,1200,'thùng',300),
  (3,6,60,'piece',20),    (3,8,400,'liter',100),
  (3,11,50,'set',8),      (3,12,25,'bag',5),
  -- Kho VS Long An (vùng ngập nên tồn kho cao hơn)
  (4,1,3000,'kg',500),    (4,2,120,'box',30),     (4,3,2000,'thùng',400),
  (4,4,50,'box',10),      (4,6,100,'piece',30),   (4,8,600,'liter',150),
  (4,9,120,'box',20),     (4,10,100,'set',15),
  (4,11,80,'set',10),     (4,12,40,'bag',5),      (4,13,15,'piece',3),
  (4,14,20,'piece',5),
  -- Kho VS Tây Ninh
  (5,1,1500,'kg',300),    (5,3,800,'thùng',200),  (5,6,40,'piece',15),
  (5,8,300,'liter',80),   (5,11,30,'set',5),
  -- Kho VS Bà Rịa-VT
  (6,1,1500,'kg',300),    (6,3,1000,'thùng',200), (6,6,50,'piece',15),
  (6,8,400,'liter',100),  (6,11,30,'set',5),      (6,12,15,'bag',3);

-- 15. WEATHER ALERTS (3)
INSERT INTO weather_alerts (province_id, alert_type, severity, title, description, starts_at, expires_at, source) VALUES
  (1, 'flood', 'high',     N'Cảnh báo ngập cục bộ TP.HCM',
   N'Triều cường kết hợp mưa lớn gây ngập nhiều tuyến đường. Bình Thạnh, Nhà Bè ảnh hưởng nặng.',
   GETDATE(), DATEADD(DAY,2,GETDATE()), 'nchmf.gov.vn'),
  (4, 'flood', 'critical', N'Lũ khẩn cấp tỉnh Long An',
   N'Mực nước sông Vàm Cỏ Đông vượt báo động 3. Đức Hòa, Bến Lức bị ngập sâu, nhiều khu dân cư bị cô lập.',
   DATEADD(HOUR,-4,GETDATE()), DATEADD(DAY,3,GETDATE()), 'nchmf.gov.vn'),
  (1, 'rain',  'medium',   N'Mưa lớn TP.HCM',
   N'Dự báo mưa 80-150mm trong 24h tới, nguy cơ ngập các vùng trũng thấp.',
   DATEADD(HOUR,-2,GETDATE()), DATEADD(DAY,1,GETDATE()), 'nchmf.gov.vn');

-- 16. RESCUE REQUESTS (12)
SET IDENTITY_INSERT rescue_requests ON;
INSERT INTO rescue_requests (
  id, tracking_code, citizen_name, citizen_phone, citizen_address,
  latitude, longitude, address, province_id, district_id, ward_id,
  incident_type_id, urgency_level_id, description, victim_count,
  support_type, flood_severity, priority_score, coordinator_id,
  status, created_at, verified_at, assigned_team_id, assigned_at,
  started_at, completed_at, rescued_count, result_notes, reject_reason, response_time_minutes
) VALUES
-- RQ1: COMPLETED – Bình Thạnh
(1,'RQ-2026-HCM001',N'Nguyễn Văn An',   '0901111001',N'123 Đinh Tiên Hoàng, Bình Thạnh',
 10.8069,106.7143,N'123 Đinh Tiên Hoàng, P.26, Bình Thạnh, TP.HCM',1,1,2,
 1,1,N'Nhà ngập nước 1.5m, 5 người mắc kẹt trên tầng 2. Có trẻ em và người già.',5,
 N'Xuồng cứu hộ, sơ tán',4,95,4,
 'completed',DATEADD(HOUR,-10,GETDATE()),DATEADD(HOUR,-9,GETDATE()),
 1,DATEADD(HOUR,-9,GETDATE()),DATEADD(HOUR,-8,GETDATE()),DATEADD(HOUR,-6,GETDATE()),
 5,N'Đã cứu thành công 5 người, chuyển đến điểm tập kết.',NULL,240),

-- RQ2: ASSIGNED – Quận 1
(2,'RQ-2026-HCM002',N'Trần Thị Bình',   '0901111002',N'45 Lê Lợi, Quận 1',
 10.7754,106.7001,N'45 Lê Lợi, P.Bến Nghé, Q.1, TP.HCM',1,2,3,
 3,2,N'Người cao tuổi bị mắc kẹt, cần sơ tán khẩn cấp.',2,
 N'Sơ tán',3,80,4,
 'assigned',DATEADD(HOUR,-3,GETDATE()),DATEADD(HOUR,-2,GETDATE()),
 2,DATEADD(HOUR,-1,GETDATE()),NULL,NULL,0,NULL,NULL,NULL),

-- RQ3: IN_PROGRESS – Bình Thạnh
(3,'RQ-2026-HCM003',N'Lê Văn Cường',    '0901111003',N'78 Phan Văn Trị, Bình Thạnh',
 10.8100,106.7200,N'78 Phan Văn Trị, P.25, Bình Thạnh, TP.HCM',1,1,1,
 1,2,N'Khu nhà trọ ngập 80cm, 12 người cần di dời gấp.',12,
 N'Sơ tán, lương thực',3,80,4,
 'in_progress',DATEADD(HOUR,-5,GETDATE()),DATEADD(HOUR,-4,GETDATE()),
 1,DATEADD(HOUR,-4,GETDATE()),DATEADD(HOUR,-3,GETDATE()),NULL,0,NULL,NULL,NULL),

-- RQ4: PENDING – Quận 7
(4,'RQ-2026-HCM004',N'Phạm Thị Dung',   '0901111004',N'15 Nguyễn Hữu Thọ, Quận 7',
 10.7369,106.7185,N'15 Nguyễn Hữu Thọ, P.Tân Phú, Q.7, TP.HCM',1,3,5,
 4,1,N'Bệnh nhân tiểu đường nặng, nhà ngập không thể ra ngoài.',1,
 N'Y tế khẩn cấp, sơ tán',3,100,4,
 'pending',DATEADD(MINUTE,-45,GETDATE()),NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL),

-- RQ5: VERIFIED – Bình Chánh
(5,'RQ-2026-HCM005',N'Hoàng Minh Em',   '0901111005',N'56 An Dương Vương, Bình Chánh',
 10.6886,106.5735,N'56 An Dương Vương, Xã Bình Hưng, Bình Chánh, TP.HCM',1,4,7,
 6,2,N'Trường tiểu học bị ngập, cần sơ tán 80 học sinh.',80,
 N'Sơ tán khẩn',4,80,4,
 'verified',DATEADD(HOUR,-2,GETDATE()),DATEADD(HOUR,-1,GETDATE()),
 NULL,NULL,NULL,NULL,0,NULL,NULL,NULL),

-- RQ6: PENDING – Nhà Bè
(6,'RQ-2026-HCM006',N'Vũ Thị Phượng',   '0901111006',N'101 Hàn Mặc Tử, Nhà Bè',
 10.6877,106.7345,N'101 Hàn Mặc Tử, Xã Phú Xuân, Nhà Bè, TP.HCM',1,5,8,
 6,2,N'Gia đình 7 người cần sơ tán, có trẻ em và người già.',7,
 N'Sơ tán',4,80,4,
 'pending',DATEADD(HOUR,-1,GETDATE()),NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL),

-- RQ7: VERIFIED – Quận 7
(7,'RQ-2026-HCM007',N'Đặng Văn Giang',  '0901111007',N'23 Lý Chính Thắng, Quận 7',
 10.7400,106.7210,N'23 Lý Chính Thắng, P.Tân Quy, Q.7, TP.HCM',1,3,6,
 3,1,N'3 người bị mắc kẹt trên mái nhà, nước dâng rất nhanh.',3,
 N'Xuồng cứu hộ khẩn cấp',5,100,4,
 'verified',DATEADD(MINUTE,-30,GETDATE()),DATEADD(MINUTE,-15,GETDATE()),
 NULL,NULL,NULL,NULL,0,NULL,NULL,NULL),

-- RQ8: PENDING – Long An (Đức Hòa)
(8,'RQ-2026-LA001',N'Trịnh Văn Sơn',    '0901111008',N'45 Quốc lộ 22, Đức Hòa, Long An',
 10.8800,106.2800,N'45 QL22, Đức Hòa, Long An',4,14,NULL,
 1,1,N'Nhà ngập 1.2m, 4 người kẹt không thoát ra được.',4,
 N'Xuồng cứu hộ',4,95,7,
 'pending',DATEADD(MINUTE,-60,GETDATE()),NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL),

-- RQ9: VERIFIED – Long An (Bến Lức)
(9,'RQ-2026-LA002',N'Ngô Thị Kim',      '0901111009',N'12 Nguyễn Văn Cừ, Bến Lức',
 10.6500,106.4900,N'12 Nguyễn Văn Cừ, Bến Lức, Long An',4,15,NULL,
 5,3,N'Cụm 20 hộ bị cô lập 2 ngày, thiếu nước uống và lương thực.',60,
 N'Lương thực, nước uống',2,60,7,
 'verified',DATEADD(HOUR,-4,GETDATE()),DATEADD(HOUR,-3,GETDATE()),
 NULL,NULL,NULL,NULL,0,NULL,NULL,NULL),

-- RQ10: ASSIGNED – Long An (Cần Giuộc)
(10,'RQ-2026-LA003',N'Mai Văn Long',    '0901111010',N'78 ĐT818, Cần Giuộc',
 10.5500,106.6300,N'78 ĐT818, Cần Giuộc, Long An',4,16,NULL,
 2,2,N'Sạt lở bờ sông, 2 nhà có nguy cơ đổ sập.',8,
 N'Sơ tán khẩn',3,80,7,
 'assigned',DATEADD(HOUR,-2,GETDATE()),DATEADD(HOUR,-1,GETDATE()),
 4,DATEADD(MINUTE,-30,GETDATE()),NULL,NULL,0,NULL,NULL,NULL),

-- RQ11: COMPLETED – Long An (Tân An)
(11,'RQ-2026-LA004',N'Lý Thị Hoa',     '0901111011',N'20 Hùng Vương, Tân An',
 10.5325,106.4131,N'20 Hùng Vương, TP Tân An, Long An',4,13,NULL,
 6,2,N'Cần sơ tán 10 hộ dân, nước ngập đến mái nhà.',35,
 N'Sơ tán',4,80,7,
 'completed',DATEADD(HOUR,-12,GETDATE()),DATEADD(HOUR,-11,GETDATE()),
 4,DATEADD(HOUR,-11,GETDATE()),DATEADD(HOUR,-10,GETDATE()),DATEADD(HOUR,-7,GETDATE()),
 33,N'Đã sơ tán 33/35 người. 2 người không muốn rời nhà.',NULL,300),

-- RQ12: REJECTED – test
(12,'RQ-2026-HCM008',N'Test User',      '0901111012',N'Không rõ địa chỉ',
 10.7769,106.7009,N'Địa chỉ không xác thực',1,2,NULL,
 1,5,N'Test request',0,N'none',1,10,4,
 'rejected',DATEADD(HOUR,-6,GETDATE()),NULL,
 NULL,NULL,NULL,NULL,0,NULL,N'Địa chỉ không xác thực, không liên lạc được.',NULL);
SET IDENTITY_INSERT rescue_requests OFF;

-- 17. MISSIONS (3)
SET IDENTITY_INSERT missions ON;
INSERT INTO missions (id, request_id, team_id, vehicle_id, status, started_at, completed_at, notes, created_at) VALUES
  (1, 1,  1, 1, 'completed', DATEADD(HOUR,-8,GETDATE()), DATEADD(HOUR,-6,GETDATE()),
   N'Cứu hộ thành công bằng xuồng. 5 nạn nhân an toàn.', DATEADD(HOUR,-9,GETDATE())),
  (2, 3,  1, 2, 'on_scene',  DATEADD(HOUR,-3,GETDATE()), NULL,
   NULL, DATEADD(HOUR,-4,GETDATE())),
  (3, 11, 4, 7, 'completed', DATEADD(HOUR,-10,GETDATE()), DATEADD(HOUR,-7,GETDATE()),
   N'Sơ tán 33 người thành công.', DATEADD(HOUR,-11,GETDATE()));
SET IDENTITY_INSERT missions OFF;

-- 18. MISSION LOGS (8)
INSERT INTO mission_logs (mission_id, user_id, action, description, latitude, longitude) VALUES
  (1, 10, 'assigned',  N'Nhiệm vụ được giao bởi điều phối viên',      10.8069, 106.7143),
  (1, 10, 'accepted',  N'Đội trưởng xác nhận nhận nhiệm vụ',          10.8069, 106.7143),
  (1, 10, 'en_route',  N'Đang di chuyển bằng xuồng đến hiện trường',  10.8050, 106.7100),
  (1, 10, 'on_scene',  N'Đã đến hiện trường, bắt đầu cứu hộ',        10.8069, 106.7143),
  (1, 10, 'completed', N'Cứu hộ hoàn tất. 5 người an toàn.',          10.8069, 106.7143),
  (2, 10, 'assigned',  N'Nhiệm vụ được giao',                          10.8100, 106.7200),
  (2, 10, 'accepted',  N'Đội trưởng xác nhận',                        10.8100, 106.7200),
  (3, 13, 'completed', N'Sơ tán xong, trở về đơn vị',                 10.5325, 106.4131);

-- 19. NOTIFICATIONS (8)
INSERT INTO notifications (user_id, tracking_code, type, title, message, metadata, is_read) VALUES
  (4,  'RQ-2026-HCM001', 'new_request',      N'Yêu cầu cứu hộ mới',  N'5 nạn nhân mắc kẹt tại Bình Thạnh, TP.HCM.', NULL, 1),
  (4,  'RQ-2026-HCM002', 'new_request',      N'Yêu cầu cứu hộ mới',  N'Người cao tuổi mắc kẹt tại Quận 1.', NULL, 0),
  (4,  'RQ-2026-HCM004', 'new_request',      N'Yêu cầu cứu hộ mới',  N'Bệnh nhân tiểu đường tại Q.7, cần y tế khẩn.', NULL, 0),
  (7,  'RQ-2026-LA001',  'new_request',      N'Yêu cầu cứu hộ mới',  N'4 người mắc kẹt tại Đức Hòa, Long An.', NULL, 0),
  (7,  'RQ-2026-LA002',  'new_request',      N'Yêu cầu cứu hộ mới',  N'60 người cô lập tại Bến Lức thiếu lương thực.', NULL, 0),
  (10, NULL,             'mission_assigned',  N'Nhiệm vụ mới',         N'Cứu hộ tại 78 Phan Văn Trị, Bình Thạnh.', '{"mission_id":2}', 0),
  (10, NULL,             'mission_completed', N'Nhiệm vụ hoàn thành',  N'Cứu hộ tại Bình Thạnh hoàn thành.', '{"mission_id":1}', 1),
  (NULL,'RQ-2026-HCM001','request_completed', N'Cứu hộ hoàn tất',     N'Yêu cầu RQ-2026-HCM001 đã giải quyết.', NULL, 0);

-- 20. SYSTEM CONFIG
INSERT INTO system_config (config_key, config_value, description) VALUES
  ('coordinator_max_workload_default', '30',      N'Số yêu cầu tối đa mặc định cho coordinator'),
  ('workload_alert_threshold',         '80',       N'Ngưỡng % cảnh báo workload'),
  ('response_time_escalation_minutes', '120',      N'Thời gian escalate nếu chưa phản hồi'),
  ('auto_assign_enabled',              'false',    N'Tự động assign team gần nhất'),
  ('citizen_request_rate_limit',       '10',       N'Số yêu cầu tối đa/giờ'),
  ('map_default_center_lat',           '10.8231',  N'Map center latitude (HCM)'),
  ('map_default_center_lng',           '106.6297', N'Map center longitude (HCM)'),
  ('map_default_zoom',                 '10',       N'Map zoom mặc định'),
  ('system_name', N'Hệ thống Điều phối Cứu hộ Lũ lụt – Vùng TP.HCM', N'Tên hệ thống'),
  ('maintenance_mode',                 'false',    N'Chế độ bảo trì'),
  ('priority_weight_urgency',          '10',       N'Hệ số priority cho urgency'),
  ('priority_weight_victims',          '2',        N'Hệ số priority cho victim_count');

-- 21. AUDIT LOGS (3)
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address) VALUES
  (1,  'update_config',  'system_config',  1, '{"value":"20"}', '{"value":"30"}',            '127.0.0.1'),
  (4,  'verify_request', 'rescue_request', 2, '{"status":"pending"}', '{"status":"verified"}','192.168.1.10'),
  (4,  'assign_team',    'rescue_request', 2, '{"assigned_team_id":null}', '{"assigned_team_id":2}', '192.168.1.10');

-- 22. RELIEF DISTRIBUTIONS (3) — có team_id + voucher_code để demo
INSERT INTO relief_distributions (distribution_type, request_id, team_id, warehouse_id, item_id, quantity, distributed_by, voucher_code, warehouse_confirmed, notes) VALUES
  ('issue', 1, 1, 1, 1, 200, 2, 'VT-A1B2C3D4', 1, N'Cấp phát gạo cho vùng ngập Bình Thạnh'),
  ('issue', 1, 2, 1, 6,  30, 2, 'VT-E5F6G7H8', 0, N'Cấp áo phao cho đội cứu hộ'),
  ('issue', 9, 4, 4, 1, 500, 7, 'VT-I9J0K1L2', 1, N'Cấp gạo cho 60 hộ dân Bến Lức bị cô lập');

-- Update citizen_confirmed
UPDATE rescue_requests SET citizen_confirmed = 1, citizen_confirmed_at = GETDATE() WHERE id IN (1, 11);

-- Update coordinator workloads
UPDATE coordinator_regions SET current_workload = 6 WHERE user_id = 4;
UPDATE coordinator_regions SET current_workload = 4 WHERE user_id = 7;

-- ============================================================
-- SUMMARY
-- Regions: 1  | Provinces: 6  | Districts: 23 | Wards: 8
-- Users: 37   | CoordRegions: 6 | Teams: 4   | Members: 28 (7/đội)
-- Vehicles: 8 | Warehouses: 6 (1 central + 5 satellite)
-- Relief Items: 8 | Inventory: 30 rows
-- Requests: 12 (HCM×8, LA×4) | Missions: 3 | Logs: 8
-- Weather: 3  | Notifications: 8 | Config: 12 | Audit: 3
-- ============================================================
PRINT N'✅ Seed data HCM scope inserted successfully';
GO

-- ============================================================
-- ADDITIONAL: Thêm đội cứu hộ cho các tỉnh (teams 5-25)
-- 21 đội mới + 21 leader + 84 thành viên
-- ============================================================

USE flood_rescue_db;
GO

DECLARE @h2 VARCHAR(255) = '$2a$10$OS0HPBGhR6NtXxQ/QAWmP.CzeOr947.Q04EIqjt1VrYuwIXLGKH7C';

-- NEW USERS: Leaders (id 38-58) + Members (id 59-142)
SET IDENTITY_INSERT users ON;
INSERT INTO users (id, username, email, password_hash, full_name, phone, role, province_id) VALUES
  -- === LEADERS (named by district) ===
  (38,'leader_q1',       'leader.q1@cuuho.vn',       @h2, N'Nguyễn Văn Tân',    '0913100001', 'rescue_team', 1),
  (39,'leader_binhchanh','leader.binhchanh@cuuho.vn', @h2, N'Trần Thị Bích',    '0913100002', 'rescue_team', 1),
  (40,'leader_nhabe',    'leader.nhabe@cuuho.vn',     @h2, N'Lê Minh Đức',      '0913100003', 'rescue_team', 1),
  (41,'leader_tdm',      'leader.tdm@cuuho.vn',       @h2, N'Phạm Văn Lộc',     '0913100004', 'rescue_team', 2),
  (42,'leader_dian',     'leader.dian@cuuho.vn',      @h2, N'Võ Thị Nga',       '0913100005', 'rescue_team', 2),
  (43,'leader_bencat',   'leader.bencat@cuuho.vn',    @h2, N'Đinh Văn Phú',     '0913100006', 'rescue_team', 2),
  (44,'leader_bienhoa',  'leader.bienhoa@cuuho.vn',   @h2, N'Nguyễn Thị Quỳnh','0913100007', 'rescue_team', 3),
  (45,'leader_nhontach', 'leader.nhontach@cuuho.vn',  @h2, N'Trần Văn Rô',      '0913100008', 'rescue_team', 3),
  (46,'leader_longthanh','leader.longthanh@cuuho.vn', @h2, N'Lê Thị Sương',     '0913100009', 'rescue_team', 3),
  (47,'leader_bienhoa2', 'leader.bienhoa2@cuuho.vn',  @h2, N'Phạm Văn Thông',   '0913100010', 'rescue_team', 3),
  (48,'leader_tanan',    'leader.tanan@cuuho.vn',     @h2, N'Võ Văn Uy',        '0913100011', 'rescue_team', 4),
  (49,'leader_duchoa',   'leader.duchoa@cuuho.vn',    @h2, N'Nguyễn Thị Vân',   '0913100012', 'rescue_team', 4),
  (50,'leader_cangiuoc', 'leader.cangiuoc@cuuho.vn',  @h2, N'Trần Văn Xuân',    '0913100013', 'rescue_team', 4),
  (51,'leader_tayninh',  'leader.tayninh@cuuho.vn',   @h2, N'Lê Văn Yên',       '0913100014', 'rescue_team', 5),
  (52,'leader_godau',    'leader.godau@cuuho.vn',     @h2, N'Phạm Thị Ánh',     '0913100015', 'rescue_team', 5),
  (53,'leader_trangbang','leader.trangbang@cuuho.vn', @h2, N'Võ Văn Bắc',       '0913100016', 'rescue_team', 5),
  (54,'leader_dmchau',   'leader.dmchau@cuuho.vn',    @h2, N'Đinh Văn Cảnh',    '0913100017', 'rescue_team', 5),
  (55,'leader_baria',    'leader.baria@cuuho.vn',     @h2, N'Nguyễn Văn Dần',   '0913100018', 'rescue_team', 6),
  (56,'leader_vungtau',  'leader.vungtau@cuuho.vn',   @h2, N'Trần Thị Giang',   '0913100019', 'rescue_team', 6),
  (57,'leader_longdien', 'leader.longdien@cuuho.vn',  @h2, N'Lê Văn Hào',       '0913100020', 'rescue_team', 6),
  (58,'leader_xuyenmoc', 'leader.xuyenmoc@cuuho.vn',  @h2, N'Phạm Thị Hiền',    '0913100021', 'rescue_team', 6),
  -- === MEMBERS: HCM-03 (team 5) ===
  (59, 'mem_hcm3_01','mhcm3_01@cuuho.vn', @h2, N'Cao Văn Khoa',     '0914100001', 'rescue_team', 1),
  (60, 'mem_hcm3_02','mhcm3_02@cuuho.vn', @h2, N'Ngô Thị Linh',     '0914100002', 'rescue_team', 1),
  (61, 'mem_hcm3_03','mhcm3_03@cuuho.vn', @h2, N'Trịnh Văn Minh',   '0914100003', 'rescue_team', 1),
  (62, 'mem_hcm3_04','mhcm3_04@cuuho.vn', @h2, N'Hồ Thị Ngân',      '0914100004', 'rescue_team', 1),
  -- HCM-04 (team 6)
  (63, 'mem_hcm4_01','mhcm4_01@cuuho.vn', @h2, N'Lưu Văn Phong',    '0914100005', 'rescue_team', 1),
  (64, 'mem_hcm4_02','mhcm4_02@cuuho.vn', @h2, N'Đặng Thị Quyên',   '0914100006', 'rescue_team', 1),
  (65, 'mem_hcm4_03','mhcm4_03@cuuho.vn', @h2, N'Bùi Văn Sang',     '0914100007', 'rescue_team', 1),
  (66, 'mem_hcm4_04','mhcm4_04@cuuho.vn', @h2, N'Phan Thị Tâm',     '0914100008', 'rescue_team', 1),
  -- HCM-05 (team 7)
  (67, 'mem_hcm5_01','mhcm5_01@cuuho.vn', @h2, N'Vũ Văn Trung',     '0914100009', 'rescue_team', 1),
  (68, 'mem_hcm5_02','mhcm5_02@cuuho.vn', @h2, N'Hoàng Thị Uyên',   '0914100010', 'rescue_team', 1),
  (69, 'mem_hcm5_03','mhcm5_03@cuuho.vn', @h2, N'Chu Văn Vinh',     '0914100011', 'rescue_team', 1),
  (70, 'mem_hcm5_04','mhcm5_04@cuuho.vn', @h2, N'Lý Thị Xuân',      '0914100012', 'rescue_team', 1),
  -- BD-02 (team 8)
  (71, 'mem_bd2_01', 'mbd2_01@cuuho.vn',  @h2, N'Dương Văn An',     '0914100013', 'rescue_team', 2),
  (72, 'mem_bd2_02', 'mbd2_02@cuuho.vn',  @h2, N'Kiều Thị Bé',      '0914100014', 'rescue_team', 2),
  (73, 'mem_bd2_03', 'mbd2_03@cuuho.vn',  @h2, N'Mạc Văn Chung',    '0914100015', 'rescue_team', 2),
  (74, 'mem_bd2_04', 'mbd2_04@cuuho.vn',  @h2, N'Lý Thị Duyên',     '0914100016', 'rescue_team', 2),
  -- BD-03 (team 9)
  (75, 'mem_bd3_01', 'mbd3_01@cuuho.vn',  @h2, N'Tạ Văn Giàu',      '0914100017', 'rescue_team', 2),
  (76, 'mem_bd3_02', 'mbd3_02@cuuho.vn',  @h2, N'Đoàn Thị Hà',      '0914100018', 'rescue_team', 2),
  (77, 'mem_bd3_03', 'mbd3_03@cuuho.vn',  @h2, N'Thái Văn Khoa',    '0914100019', 'rescue_team', 2),
  (78, 'mem_bd3_04', 'mbd3_04@cuuho.vn',  @h2, N'Trương Thị Lan',   '0914100020', 'rescue_team', 2),
  -- BD-04 (team 10)
  (79, 'mem_bd4_01', 'mbd4_01@cuuho.vn',  @h2, N'Hà Văn Mẫn',       '0914100021', 'rescue_team', 2),
  (80, 'mem_bd4_02', 'mbd4_02@cuuho.vn',  @h2, N'Ngô Thị Nhung',    '0914100022', 'rescue_team', 2),
  (81, 'mem_bd4_03', 'mbd4_03@cuuho.vn',  @h2, N'Vương Văn Phước',  '0914100023', 'rescue_team', 2),
  (82, 'mem_bd4_04', 'mbd4_04@cuuho.vn',  @h2, N'Mai Thị Quế',      '0914100024', 'rescue_team', 2),
  -- DN-01 (team 11)
  (83, 'mem_dn1_01', 'mdn1_01@cuuho.vn',  @h2, N'Đỗ Văn Sáng',      '0914100025', 'rescue_team', 3),
  (84, 'mem_dn1_02', 'mdn1_02@cuuho.vn',  @h2, N'Hà Thị Tâm',       '0914100026', 'rescue_team', 3),
  (85, 'mem_dn1_03', 'mdn1_03@cuuho.vn',  @h2, N'Ngô Văn Thịnh',    '0914100027', 'rescue_team', 3),
  (86, 'mem_dn1_04', 'mdn1_04@cuuho.vn',  @h2, N'Lê Thị Uyên',      '0914100028', 'rescue_team', 3),
  -- DN-02 (team 12)
  (87, 'mem_dn2_01', 'mdn2_01@cuuho.vn',  @h2, N'Mai Văn Vinh',      '0914100029', 'rescue_team', 3),
  (88, 'mem_dn2_02', 'mdn2_02@cuuho.vn',  @h2, N'Tô Thị Xuân',      '0914100030', 'rescue_team', 3),
  (89, 'mem_dn2_03', 'mdn2_03@cuuho.vn',  @h2, N'Quách Văn Yên',    '0914100031', 'rescue_team', 3),
  (90, 'mem_dn2_04', 'mdn2_04@cuuho.vn',  @h2, N'Từ Thị Yến',       '0914100032', 'rescue_team', 3),
  -- DN-03 (team 13)
  (91, 'mem_dn3_01', 'mdn3_01@cuuho.vn',  @h2, N'Vương Văn An',      '0914100033', 'rescue_team', 3),
  (92, 'mem_dn3_02', 'mdn3_02@cuuho.vn',  @h2, N'Diệp Thị Bảo',     '0914100034', 'rescue_team', 3),
  (93, 'mem_dn3_03', 'mdn3_03@cuuho.vn',  @h2, N'Tôn Văn Cảnh',     '0914100035', 'rescue_team', 3),
  (94, 'mem_dn3_04', 'mdn3_04@cuuho.vn',  @h2, N'Hứa Thị Dung',     '0914100036', 'rescue_team', 3),
  -- DN-04 (team 14)
  (95, 'mem_dn4_01', 'mdn4_01@cuuho.vn',  @h2, N'Lưu Văn Đạt',      '0914100037', 'rescue_team', 3),
  (96, 'mem_dn4_02', 'mdn4_02@cuuho.vn',  @h2, N'Trần Thị Giao',    '0914100038', 'rescue_team', 3),
  (97, 'mem_dn4_03', 'mdn4_03@cuuho.vn',  @h2, N'Nguyễn Văn Hùng',  '0914100039', 'rescue_team', 3),
  (98, 'mem_dn4_04', 'mdn4_04@cuuho.vn',  @h2, N'Lê Thị Khanh',     '0914100040', 'rescue_team', 3),
  -- LA-02 (team 15)
  (99, 'mem_la2_01', 'mla2_01@cuuho.vn',  @h2, N'Phạm Văn Long',     '0914100041', 'rescue_team', 4),
  (100,'mem_la2_02', 'mla2_02@cuuho.vn',  @h2, N'Võ Thị Mai',        '0914100042', 'rescue_team', 4),
  (101,'mem_la2_03', 'mla2_03@cuuho.vn',  @h2, N'Đặng Văn Minh',     '0914100043', 'rescue_team', 4),
  (102,'mem_la2_04', 'mla2_04@cuuho.vn',  @h2, N'Bùi Thị Ngọc',     '0914100044', 'rescue_team', 4),
  -- LA-03 (team 16)
  (103,'mem_la3_01', 'mla3_01@cuuho.vn',  @h2, N'Hồ Văn Phong',      '0914100045', 'rescue_team', 4),
  (104,'mem_la3_02', 'mla3_02@cuuho.vn',  @h2, N'Huỳnh Thị Phương',  '0914100046', 'rescue_team', 4),
  (105,'mem_la3_03', 'mla3_03@cuuho.vn',  @h2, N'Dương Văn Quang',   '0914100047', 'rescue_team', 4),
  (106,'mem_la3_04', 'mla3_04@cuuho.vn',  @h2, N'Đinh Thị Tâm',      '0914100048', 'rescue_team', 4),
  -- LA-04 (team 17)
  (107,'mem_la4_01', 'mla4_01@cuuho.vn',  @h2, N'Phan Văn Thắng',    '0914100049', 'rescue_team', 4),
  (108,'mem_la4_02', 'mla4_02@cuuho.vn',  @h2, N'Vũ Thị Thu',        '0914100050', 'rescue_team', 4),
  (109,'mem_la4_03', 'mla4_03@cuuho.vn',  @h2, N'Hoàng Văn Toàn',    '0914100051', 'rescue_team', 4),
  (110,'mem_la4_04', 'mla4_04@cuuho.vn',  @h2, N'Lý Thị Trang',      '0914100052', 'rescue_team', 4),
  -- TN-01 (team 18)
  (111,'mem_tn1_01', 'mtn1_01@cuuho.vn',  @h2, N'Tô Văn Tú',         '0914100053', 'rescue_team', 5),
  (112,'mem_tn1_02', 'mtn1_02@cuuho.vn',  @h2, N'Ngô Thị Tuyết',     '0914100054', 'rescue_team', 5),
  (113,'mem_tn1_03', 'mtn1_03@cuuho.vn',  @h2, N'Trịnh Văn Vinh',    '0914100055', 'rescue_team', 5),
  (114,'mem_tn1_04', 'mtn1_04@cuuho.vn',  @h2, N'Cao Thị Vân',       '0914100056', 'rescue_team', 5),
  -- TN-02 (team 19)
  (115,'mem_tn2_01', 'mtn2_01@cuuho.vn',  @h2, N'Đỗ Văn Xuân',       '0914100057', 'rescue_team', 5),
  (116,'mem_tn2_02', 'mtn2_02@cuuho.vn',  @h2, N'Hà Thị Yến',        '0914100058', 'rescue_team', 5),
  (117,'mem_tn2_03', 'mtn2_03@cuuho.vn',  @h2, N'Mai Văn An',         '0914100059', 'rescue_team', 5),
  (118,'mem_tn2_04', 'mtn2_04@cuuho.vn',  @h2, N'Nguyễn Thị Bích',   '0914100060', 'rescue_team', 5),
  -- TN-03 (team 20)
  (119,'mem_tn3_01', 'mtn3_01@cuuho.vn',  @h2, N'Trần Văn Cường',    '0914100061', 'rescue_team', 5),
  (120,'mem_tn3_02', 'mtn3_02@cuuho.vn',  @h2, N'Lê Thị Châu',       '0914100062', 'rescue_team', 5),
  (121,'mem_tn3_03', 'mtn3_03@cuuho.vn',  @h2, N'Phạm Văn Dũng',     '0914100063', 'rescue_team', 5),
  (122,'mem_tn3_04', 'mtn3_04@cuuho.vn',  @h2, N'Võ Thị Dung',       '0914100064', 'rescue_team', 5),
  -- TN-04 (team 21)
  (123,'mem_tn4_01', 'mtn4_01@cuuho.vn',  @h2, N'Đặng Văn Đức',      '0914100065', 'rescue_team', 5),
  (124,'mem_tn4_02', 'mtn4_02@cuuho.vn',  @h2, N'Bùi Thị Giang',     '0914100066', 'rescue_team', 5),
  (125,'mem_tn4_03', 'mtn4_03@cuuho.vn',  @h2, N'Đinh Văn Hà',       '0914100067', 'rescue_team', 5),
  (126,'mem_tn4_04', 'mtn4_04@cuuho.vn',  @h2, N'Phan Thị Hương',    '0914100068', 'rescue_team', 5),
  -- BRVT-01 (team 22)
  (127,'mem_brvt1_01','mbrvt1_01@cuuho.vn',@h2, N'Vũ Văn Khoa',      '0914100069', 'rescue_team', 6),
  (128,'mem_brvt1_02','mbrvt1_02@cuuho.vn',@h2, N'Hoàng Thị Lan',    '0914100070', 'rescue_team', 6),
  (129,'mem_brvt1_03','mbrvt1_03@cuuho.vn',@h2, N'Lý Văn Long',      '0914100071', 'rescue_team', 6),
  (130,'mem_brvt1_04','mbrvt1_04@cuuho.vn',@h2, N'Tô Thị Mai',       '0914100072', 'rescue_team', 6),
  -- BRVT-02 (team 23)
  (131,'mem_brvt2_01','mbrvt2_01@cuuho.vn',@h2, N'Ngô Văn Minh',     '0914100073', 'rescue_team', 6),
  (132,'mem_brvt2_02','mbrvt2_02@cuuho.vn',@h2, N'Trịnh Thị Nga',    '0914100074', 'rescue_team', 6),
  (133,'mem_brvt2_03','mbrvt2_03@cuuho.vn',@h2, N'Hồ Văn Nam',       '0914100075', 'rescue_team', 6),
  (134,'mem_brvt2_04','mbrvt2_04@cuuho.vn',@h2, N'Huỳnh Thị Ngọc',  '0914100076', 'rescue_team', 6),
  -- BRVT-03 (team 24)
  (135,'mem_brvt3_01','mbrvt3_01@cuuho.vn',@h2, N'Dương Văn Phong',  '0914100077', 'rescue_team', 6),
  (136,'mem_brvt3_02','mbrvt3_02@cuuho.vn',@h2, N'Đinh Thị Phương',  '0914100078', 'rescue_team', 6),
  (137,'mem_brvt3_03','mbrvt3_03@cuuho.vn',@h2, N'Phan Văn Quân',    '0914100079', 'rescue_team', 6),
  (138,'mem_brvt3_04','mbrvt3_04@cuuho.vn',@h2, N'Vũ Thị Quỳnh',     '0914100080', 'rescue_team', 6),
  -- BRVT-04 (team 25)
  (139,'mem_brvt4_01','mbrvt4_01@cuuho.vn',@h2, N'Hoàng Văn Sơn',   '0914100081', 'rescue_team', 6),
  (140,'mem_brvt4_02','mbrvt4_02@cuuho.vn',@h2, N'Cao Thị Tâm',      '0914100082', 'rescue_team', 6),
  (141,'mem_brvt4_03','mbrvt4_03@cuuho.vn',@h2, N'Ngô Văn Thắng',    '0914100083', 'rescue_team', 6),
  (142,'mem_brvt4_04','mbrvt4_04@cuuho.vn',@h2, N'Lý Thị Thu',       '0914100084', 'rescue_team', 6);
SET IDENTITY_INSERT users OFF;

-- NEW RESCUE TEAMS (id 5-25)
SET IDENTITY_INSERT rescue_teams ON;
INSERT INTO rescue_teams (id, name, code, leader_id, province_id, district_id, phone, capacity, specialization, status, current_latitude, current_longitude) VALUES
  -- HCM (3 đội mới)
  (5,  N'Đội Cứu Hộ Quận 1',            'HCM-03', 38, 1, 2,  '0900100005', 8, N'medical,evacuation',         'available', 10.7769, 106.7009),
  (6,  N'Đội Cứu Hộ Bình Chánh',         'HCM-04', 39, 1, 4,  '0900100006', 8, N'water_rescue,evacuation',    'available', 10.6886, 106.5735),
  (7,  N'Đội Cứu Hộ Nhà Bè',             'HCM-05', 40, 1, 5,  '0900100007', 8, N'water_rescue,search_rescue', 'available', 10.6877, 106.7345),
  -- BD (3 đội mới)
  (8,  N'Đội Cứu Hộ Thủ Dầu Một',        'BD-02',  41, 2, 6,  '0900100008', 8, N'evacuation,water_rescue',    'available', 11.1353, 106.6583),
  (9,  N'Đội Cứu Hộ Dĩ An',              'BD-03',  42, 2, 8,  '0900100009', 8, N'water_rescue,evacuation',    'available', 10.9070, 106.7660),
  (10, N'Đội Cứu Hộ Bến Cát',             'BD-04',  43, 2, 9,  '0900100010', 8, N'search_rescue,evacuation',   'standby',   11.2200, 106.5700),
  -- DN (4 đội mới)
  (11, N'Đội Cứu Hộ Biên Hòa',            'DN-01',  44, 3, 10, '0900100011', 8, N'water_rescue,medical',       'available', 10.9596, 106.8431),
  (12, N'Đội Cứu Hộ Nhơn Trạch',          'DN-02',  45, 3, 11, '0900100012', 8, N'water_rescue,evacuation',    'available', 10.7800, 106.9600),
  (13, N'Đội Cứu Hộ Long Thành',           'DN-03',  46, 3, 12, '0900100013', 8, N'search_rescue,water_rescue', 'available', 10.8600, 107.0400),
  (14, N'Đội Cứu Hộ Đồng Nai 4',          'DN-04',  47, 3, 10, '0900100014', 8, N'evacuation,medical',         'standby',   10.9596, 106.8431),
  -- LA (3 đội mới)
  (15, N'Đội Cứu Hộ Tân An',              'LA-02',  48, 4, 13, '0900100015', 8, N'water_rescue,evacuation',    'available', 10.5325, 106.4131),
  (16, N'Đội Cứu Hộ Đức Hòa',             'LA-03',  49, 4, 14, '0900100016', 8, N'water_rescue,search_rescue', 'available', 10.8800, 106.2800),
  (17, N'Đội Cứu Hộ Cần Giuộc',           'LA-04',  50, 4, 16, '0900100017', 8, N'medical,evacuation',         'available', 10.5500, 106.6300),
  -- TN (4 đội mới)
  (18, N'Đội Cứu Hộ TP Tây Ninh',         'TN-01',  51, 5, 17, '0900100018', 8, N'evacuation,water_rescue',    'available', 11.3103, 106.0982),
  (19, N'Đội Cứu Hộ Gò Dầu',              'TN-02',  52, 5, 18, '0900100019', 8, N'water_rescue,evacuation',    'available', 11.0800, 106.2600),
  (20, N'Đội Cứu Hộ Trảng Bàng',          'TN-03',  53, 5, 19, '0900100020', 8, N'search_rescue,evacuation',   'standby',   11.0200, 106.3500),
  (21, N'Đội Cứu Hộ Dương Minh Châu',     'TN-04',  54, 5, 17, '0900100021', 8, N'medical,water_rescue',       'available', 11.2000, 106.1500),
  -- BRVT (4 đội mới)
  (22, N'Đội Cứu Hộ TP Bà Rịa',           'BRVT-01',55, 6, 20, '0900100022', 8, N'water_rescue,evacuation',    'available', 10.4993, 107.1745),
  (23, N'Đội Cứu Hộ Vũng Tàu',            'BRVT-02',56, 6, 21, '0900100023', 8, N'search_rescue,water_rescue', 'available', 10.4114, 107.1362),
  (24, N'Đội Cứu Hộ Long Điền',            'BRVT-03',57, 6, 22, '0900100024', 8, N'evacuation,medical',         'standby',   10.4600, 107.2300),
  (25, N'Đội Cứu Hộ Xuyên Mộc',           'BRVT-04',58, 6, 23, '0900100025', 8, N'water_rescue,evacuation',    'available', 10.5700, 107.4100);
SET IDENTITY_INSERT rescue_teams OFF;

-- NEW RESCUE TEAM MEMBERS (5 người/đội: 1 leader + 4 members)
INSERT INTO rescue_team_members (team_id, user_id, role_in_team) VALUES
  (5,  38,'leader'),(5,  59,'member'),(5,  60,'medic'), (5,  61,'member'),(5,  62,'driver'),
  (6,  39,'leader'),(6,  63,'member'),(6,  64,'medic'), (6,  65,'member'),(6,  66,'driver'),
  (7,  40,'leader'),(7,  67,'member'),(7,  68,'medic'), (7,  69,'member'),(7,  70,'driver'),
  (8,  41,'leader'),(8,  71,'member'),(8,  72,'medic'), (8,  73,'member'),(8,  74,'driver'),
  (9,  42,'leader'),(9,  75,'member'),(9,  76,'medic'), (9,  77,'member'),(9,  78,'driver'),
  (10, 43,'leader'),(10, 79,'member'),(10, 80,'medic'), (10, 81,'member'),(10, 82,'driver'),
  (11, 44,'leader'),(11, 83,'member'),(11, 84,'medic'), (11, 85,'member'),(11, 86,'driver'),
  (12, 45,'leader'),(12, 87,'member'),(12, 88,'medic'), (12, 89,'member'),(12, 90,'driver'),
  (13, 46,'leader'),(13, 91,'member'),(13, 92,'medic'), (13, 93,'member'),(13, 94,'driver'),
  (14, 47,'leader'),(14, 95,'member'),(14, 96,'medic'), (14, 97,'member'),(14, 98,'driver'),
  (15, 48,'leader'),(15, 99,'member'),(15,100,'medic'), (15,101,'member'),(15,102,'driver'),
  (16, 49,'leader'),(16,103,'member'),(16,104,'medic'), (16,105,'member'),(16,106,'driver'),
  (17, 50,'leader'),(17,107,'member'),(17,108,'medic'), (17,109,'member'),(17,110,'driver'),
  (18, 51,'leader'),(18,111,'member'),(18,112,'medic'), (18,113,'member'),(18,114,'driver'),
  (19, 52,'leader'),(19,115,'member'),(19,116,'medic'), (19,117,'member'),(19,118,'driver'),
  (20, 53,'leader'),(20,119,'member'),(20,120,'medic'), (20,121,'member'),(20,122,'driver'),
  (21, 54,'leader'),(21,123,'member'),(21,124,'medic'), (21,125,'member'),(21,126,'driver'),
  (22, 55,'leader'),(22,127,'member'),(22,128,'medic'), (22,129,'member'),(22,130,'driver'),
  (23, 56,'leader'),(23,131,'member'),(23,132,'medic'), (23,133,'member'),(23,134,'driver'),
  (24, 57,'leader'),(24,135,'member'),(24,136,'medic'), (24,137,'member'),(24,138,'driver'),
  (25, 58,'leader'),(25,139,'member'),(25,140,'medic'), (25,141,'member'),(25,142,'driver');

-- ============================================================
-- SUMMARY (updated)
-- Teams: 25 (HCM×5, BD×4, DN×4, LA×4, TN×4, BRVT×4)
-- Users: 142 (1 admin, 1 wm, 1 mgr, 6 coord, 25 leader, 108 member)
-- ============================================================
PRINT N'✅ Additional 21 teams inserted (total 25 teams, 142 users)';
GO
