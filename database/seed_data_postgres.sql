-- ============================================================
-- PostgreSQL Seed Data for Flood Rescue System
-- Converted from SQL Server seed_data.sql
-- Mật khẩu tất cả: 123456
-- ============================================================

-- 1. REGIONS
INSERT INTO regions (id, name, code, description) VALUES
  (1, 'Miền Nam', 'south', 'Khu vực TP.HCM và các tỉnh lân cận');

SELECT setval('regions_id_seq', (SELECT MAX(id) FROM regions));

-- 2. PROVINCES
INSERT INTO provinces (id, region_id, name, code, latitude, longitude) VALUES
  (1, 1, 'TP Hồ Chí Minh',   'hcm',       10.8231, 106.6297),
  (2, 1, 'Bình Dương',        'binhduong', 11.3254, 106.4770),
  (3, 1, 'Đồng Nai',          'dongnai',   11.0686, 107.1676),
  (4, 1, 'Long An',            'longan',    10.6956, 106.2431),
  (5, 1, 'Tây Ninh',           'tayninh',   11.3103, 106.0982),
  (6, 1, 'Bà Rịa-Vũng Tàu',  'brvt',      10.5417, 107.2431);

SELECT setval('provinces_id_seq', (SELECT MAX(id) FROM provinces));

-- 3. DISTRICTS
INSERT INTO districts (id, province_id, name, code, latitude, longitude) VALUES
  -- TP.HCM (province_id=1)
  (1,  1, 'Quận Bình Thạnh',  'binh-thanh',   10.8069, 106.7143),
  (2,  1, 'Quận 1',           'quan-1',        10.7769, 106.7009),
  (3,  1, 'Quận 7',           'quan-7',        10.7369, 106.7185),
  (4,  1, 'Huyện Bình Chánh', 'binh-chanh',    10.6886, 106.5735),
  (5,  1, 'Huyện Nhà Bè',     'nha-be',        10.6877, 106.7345),
  (24, 1, 'Quận 2',           'quan-2',        10.7870, 106.7518),
  (25, 1, 'Quận 3',           'quan-3',        10.7797, 106.6863),
  (26, 1, 'Quận 4',           'quan-4',        10.7577, 106.7025),
  (27, 1, 'Quận 5',           'quan-5',        10.7551, 106.6626),
  (28, 1, 'Quận 6',           'quan-6',        10.7465, 106.6354),
  (29, 1, 'Quận 8',           'quan-8',        10.7230, 106.6284),
  (30, 1, 'Quận 9',           'quan-9',        10.8418, 106.7924),
  (31, 1, 'Quận 10',          'quan-10',       10.7727, 106.6680),
  (32, 1, 'Quận 11',          'quan-11',       10.7627, 106.6502),
  (33, 1, 'Quận 12',          'quan-12',       10.8680, 106.6605),
  (34, 1, 'Quận Gò Vấp',      'go-vap',        10.8384, 106.6655),
  (35, 1, 'Quận Phú Nhuận',   'phu-nhuan',     10.7994, 106.6844),
  (36, 1, 'Quận Tân Bình',    'tan-binh',      10.8018, 106.6524),
  (37, 1, 'Quận Tân Phú',     'tan-phu',       10.7937, 106.6268),
  (38, 1, 'Quận Thủ Đức',     'thu-duc',       10.8548, 106.7570),
  (39, 1, 'Huyện Cần Giờ',    'can-gio',       10.4117, 106.9524),
  (40, 1, 'Huyện Củ Chi',     'cu-chi',        11.0048, 106.4892),
  (41, 1, 'Huyện Hóc Môn',    'hoc-mon',       10.8905, 106.5957),
  -- Bình Dương (province_id=2)
  (6,  2, 'TP Thủ Dầu Một',   'thu-dau-mot',  11.1353, 106.6583),
  (7,  2, 'TX Thuận An',      'thuan-an',     10.9982, 106.6944),
  (8,  2, 'TX Dĩ An',         'di-an',        10.9070, 106.7660),
  (9,  2, 'Huyện Bến Cát',    'ben-cat',      11.2200, 106.5700),
  -- Đồng Nai (province_id=3)
  (10, 3, 'TP Biên Hòa',      'bien-hoa',     10.9596, 106.8431),
  (11, 3, 'Huyện Nhơn Trạch', 'nhon-trach',   10.7800, 106.9600),
  (12, 3, 'Huyện Long Thành', 'long-thanh',   10.8600, 107.0400),
  -- Long An (province_id=4)
  (13, 4, 'TP Tân An',        'tan-an',       10.5325, 106.4131),
  (14, 4, 'Huyện Đức Hòa',   'duc-hoa',      10.8800, 106.2800),
  (15, 4, 'Huyện Bến Lức',   'ben-luc',      10.6500, 106.4900),
  (16, 4, 'Huyện Cần Giuộc', 'can-giuoc',    10.5500, 106.6300),
  -- Tây Ninh (province_id=5)
  (17, 5, 'TP Tây Ninh',      'tp-tay-ninh',  11.3103, 106.0982),
  (18, 5, 'Huyện Gò Dầu',    'go-dau',       11.0800, 106.2600),
  (19, 5, 'Huyện Trảng Bàng','trang-bang',   11.0200, 106.3500),
  -- Bà Rịa-Vũng Tàu (province_id=6)
  (20, 6, 'TP Bà Rịa',        'tp-ba-ria',    10.4993, 107.1745),
  (21, 6, 'TP Vũng Tàu',      'tp-vung-tau',  10.4114, 107.1362),
  (22, 6, 'Huyện Long Điền', 'long-dien',    10.4600, 107.2300),
  (23, 6, 'Huyện Xuyên Mộc', 'xuyen-moc',    10.5700, 107.4100);

SELECT setval('districts_id_seq', (SELECT MAX(id) FROM districts));

-- 4. WARDS
INSERT INTO wards (id, district_id, name, code, latitude, longitude) VALUES
  (1, 1, 'Phường 25',        'p25-bt',    10.8100, 106.7200),
  (2, 1, 'Phường 26',        'p26-bt',    10.8050, 106.7100),
  (3, 2, 'Phường Bến Nghé',  'ben-nghe',  10.7730, 106.7030),
  (4, 2, 'Phường Bến Thành', 'ben-thanh', 10.7720, 106.6980),
  (5, 3, 'Phường Tân Phú',   'tan-phu-q7',10.7400, 106.7210),
  (6, 3, 'Phường Tân Quy',   'tan-quy',   10.7350, 106.7150),
  (7, 4, 'Xã Bình Hưng',     'binh-hung', 10.6700, 106.6100),
  (8, 5, 'Xã Phú Xuân',      'phu-xuan',  10.6900, 106.7400);

SELECT setval('wards_id_seq', (SELECT MAX(id) FROM wards));

-- 5. INCIDENT TYPES
INSERT INTO incident_types (id, name, code, icon, color, description, rescue_category) VALUES
  (1, 'Ngập lụt',        'flood',     'water',          '#2196F3', 'Nước dâng gây ngập, người bị mắc kẹt',          'cuu_nan'),
  (2, 'Sạt lở đất',      'landslide', 'mountain',       '#795548', 'Sạt lở do mưa lớn, người/tài sản bị vùi lấp',   'cuu_nan'),
  (3, 'Mắc kẹt',         'trapped',   'alert-triangle', '#FF5722', 'Người bị mắc kẹt, cần giải cứu trực tiếp',      'cuu_nan'),
  (4, 'Y tế khẩn cấp',   'medical',   'heart',          '#F44336', 'Người bị thương/bệnh nặng cần sơ cứu tại chỗ',  'cuu_nan'),
  (5, 'Thiếu lương thực','supplies',  'package',        '#FF9800', 'Cần lương thực, nước uống, nhu yếu phẩm',        'cuu_tro'),
  (6, 'Sơ tán',          'evacuation','move',           '#9C27B0', 'Cần di dời người dân ra khỏi vùng nguy hiểm',    'cuu_ho');

SELECT setval('incident_types_id_seq', (SELECT MAX(id) FROM incident_types));

-- 6. URGENCY LEVELS
INSERT INTO urgency_levels (id, name, code, priority_score, color, max_response_minutes, description) VALUES
  (1, 'Khẩn cấp',  'critical',  100, '#F44336', 30,   'Tính mạng đang bị đe dọa'),
  (2, 'Rất cao',   'very_high',  80, '#FF5722', 60,   'Cần cứu hộ trong 1 giờ'),
  (3, 'Cao',       'high',       60, '#FF9800', 120,  'Cần hỗ trợ trong 2 giờ'),
  (4, 'Trung bình','medium',     40, '#FFC107', 360,  'Cần hỗ trợ trong 6 giờ'),
  (5, 'Thấp',      'low',        20, '#4CAF50', 1440, 'Hỗ trợ trong 24 giờ');

SELECT setval('urgency_levels_id_seq', (SELECT MAX(id) FROM urgency_levels));

-- 7. USERS (mật khẩu: 123456)
DO $$
DECLARE hash TEXT := crypt('123456', gen_salt('bf', 10));
BEGIN
  INSERT INTO users (id, username, email, password_hash, full_name, phone, role, province_id) VALUES
    (1,  'admin',      'admin@cuuho.vn',       hash, 'Nguyễn Văn Admin',   '0900000001', 'admin',             NULL),
    (2,  'wm_hcm',     'wm@cuuho.vn',          hash, 'Lê Minh Kho',        '0900000002', 'warehouse_manager', 1),
    (3,  'mgr_hcm',    'mgr.hcm@cuuho.vn',     hash, 'Trần Quốc Hùng',    '0900000003', 'manager',           1),
    (4,  'coord_hcm',  'coord.hcm@cuuho.vn',   hash, 'Trần Văn Hùng',     '0900000004', 'coordinator',       1),
    (5,  'coord_bd',   'coord.bd@cuuho.vn',     hash, 'Lý Thị Bình',       '0900000005', 'coordinator',       2),
    (6,  'coord_dn',   'coord.dn@cuuho.vn',     hash, 'Ngô Văn Đồng',      '0900000006', 'coordinator',       3),
    (7,  'coord_la',   'coord.la@cuuho.vn',     hash, 'Cao Thị Long',      '0900000007', 'coordinator',       4),
    (8,  'coord_tn',   'coord.tn@cuuho.vn',     hash, 'Đinh Văn Tây',      '0900000008', 'coordinator',       5),
    (9,  'coord_brvt', 'coord.brvt@cuuho.vn',   hash, 'Phan Thị Vũng',     '0900000009', 'coordinator',       6),
    (10, 'leader_binhthanh','leader.binhthanh@cuuho.vn', hash, 'Trần Minh Hiếu',    '0911000001', 'rescue_team', 1),
    (11, 'leader_q7',       'leader.q7@cuuho.vn',        hash, 'Nguyễn Lan Anh',    '0911000002', 'rescue_team', 1),
    (12, 'leader_thuanan',  'leader.thuanan@cuuho.vn',   hash, 'Phạm Văn Cường',    '0911000003', 'rescue_team', 2),
    (13, 'leader_benluc',   'leader.benluc@cuuho.vn',    hash, 'Lê Thị Thu Hương',  '0911000004', 'rescue_team', 4),
    (14, 'mem_hcm_01', 'mhcm01@cuuho.vn',  hash, 'Cao Thị Lan',        '0912000001', 'rescue_team', 1),
    (15, 'mem_hcm_02', 'mhcm02@cuuho.vn',  hash, 'Đinh Văn Khoa',      '0912000002', 'rescue_team', 1),
    (16, 'mem_hcm_07', 'mhcm07@cuuho.vn',  hash, 'Võ Văn Nam',         '0912000003', 'rescue_team', 1),
    (17, 'mem_hcm_08', 'mhcm08@cuuho.vn',  hash, 'Huỳnh Văn Bảo',      '0912000004', 'rescue_team', 1),
    (18, 'mem_bd_01',  'mbd01@cuuho.vn',    hash, 'Nguyễn Văn Hải',     '0912000005', 'rescue_team', 2),
    (19, 'mem_bd_02',  'mbd02@cuuho.vn',    hash, 'Trần Thị Hoa',       '0912000006', 'rescue_team', 2),
    (20, 'mem_la_01',  'mla01@cuuho.vn',    hash, 'Lê Văn Quân',        '0912000007', 'rescue_team', 4),
    (21, 'mem_la_02',  'mla02@cuuho.vn',    hash, 'Nguyễn Thị Trang',   '0912000008', 'rescue_team', 4),
    (22, 'mem_hcm_03', 'mhcm03@cuuho.vn',  hash, 'Trần Văn Bảo',       '0912000009', 'rescue_team', 1),
    (23, 'mem_hcm_04', 'mhcm04@cuuho.vn',  hash, 'Nguyễn Thị Cúc',     '0912000010', 'rescue_team', 1),
    (24, 'mem_hcm_05', 'mhcm05@cuuho.vn',  hash, 'Lê Văn Đức',         '0912000011', 'rescue_team', 1),
    (25, 'mem_hcm_06', 'mhcm06@cuuho.vn',  hash, 'Phạm Văn Hải',       '0912000012', 'rescue_team', 1),
    (26, 'mem_hcm_09', 'mhcm09@cuuho.vn',  hash, 'Võ Thị Mai',         '0912000013', 'rescue_team', 1),
    (27, 'mem_hcm_10', 'mhcm10@cuuho.vn',  hash, 'Đặng Văn Minh',      '0912000014', 'rescue_team', 1),
    (28, 'mem_hcm_11', 'mhcm11@cuuho.vn',  hash, 'Huỳnh Thị Ngọc',     '0912000015', 'rescue_team', 1),
    (29, 'mem_hcm_12', 'mhcm12@cuuho.vn',  hash, 'Trịnh Văn Phong',    '0912000016', 'rescue_team', 1),
    (30, 'mem_bd_03',  'mbd03@cuuho.vn',    hash, 'Lý Văn Quang',       '0912000017', 'rescue_team', 2),
    (31, 'mem_bd_04',  'mbd04@cuuho.vn',    hash, 'Cao Thị Ry',         '0912000018', 'rescue_team', 2),
    (32, 'mem_bd_05',  'mbd05@cuuho.vn',    hash, 'Đinh Văn Sơn',       '0912000019', 'rescue_team', 2),
    (33, 'mem_bd_06',  'mbd06@cuuho.vn',    hash, 'Ngô Thị Thanh',      '0912000020', 'rescue_team', 2),
    (34, 'mem_la_03',  'mla03@cuuho.vn',    hash, 'Phan Văn Tùng',      '0912000021', 'rescue_team', 4),
    (35, 'mem_la_04',  'mla04@cuuho.vn',    hash, 'Bùi Thị Uyên',       '0912000022', 'rescue_team', 4),
    (36, 'mem_la_05',  'mla05@cuuho.vn',    hash, 'Hồ Văn Vũ',          '0912000023', 'rescue_team', 4),
    (37, 'mem_la_06',  'mla06@cuuho.vn',    hash, 'Trần Thị Xinh',      '0912000024', 'rescue_team', 4);
END $$;

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- 8. COORDINATOR REGIONS
INSERT INTO coordinator_regions (user_id, province_id, is_primary, max_workload) VALUES
  (4, 1, true, 30),
  (5, 2, true, 20),
  (6, 3, true, 20),
  (7, 4, true, 20),
  (8, 5, true, 15),
  (9, 6, true, 15);

-- 9. RESCUE TEAMS
INSERT INTO rescue_teams (id, name, code, leader_id, province_id, district_id, phone, capacity, specialization, status, current_latitude, current_longitude) VALUES
  (1, 'Đội Cứu Hộ Bình Thạnh', 'HCM-01', 10, 1, 1, '0900100001', 10, 'water_rescue,evacuation',  'available',  10.8069, 106.7143),
  (2, 'Đội Cứu Hộ Quận 7',     'HCM-02', 11, 1, 3, '0900100002', 10, 'medical,water_rescue',     'on_mission', 10.7369, 106.7185),
  (3, 'Đội Cứu Hộ Bình Dương', 'BD-01',  12, 2, 7, '0900100003', 10, 'water_rescue,search_rescue','available',  10.9982, 106.6944),
  (4, 'Đội Cứu Hộ Long An',    'LA-01',  13, 4, 15,'0900100004', 10, 'evacuation,water_rescue',  'available',  10.6500, 106.4900);

SELECT setval('rescue_teams_id_seq', (SELECT MAX(id) FROM rescue_teams));

-- 10. RESCUE TEAM MEMBERS
INSERT INTO rescue_team_members (team_id, user_id, role_in_team) VALUES
  (1, 10, 'leader'), (1, 14, 'member'), (1, 15, 'medic'),
  (1, 22, 'member'), (1, 23, 'medic'),  (1, 24, 'member'), (1, 25, 'driver'),
  (2, 11, 'leader'), (2, 16, 'member'), (2, 17, 'medic'),
  (2, 26, 'member'), (2, 27, 'medic'),  (2, 28, 'member'), (2, 29, 'driver'),
  (3, 12, 'leader'), (3, 18, 'member'), (3, 19, 'medic'),
  (3, 30, 'member'), (3, 31, 'medic'),  (3, 32, 'member'), (3, 33, 'driver'),
  (4, 13, 'leader'), (4, 20, 'member'), (4, 21, 'medic'),
  (4, 34, 'member'), (4, 35, 'medic'),  (4, 36, 'member'), (4, 37, 'driver');

-- 11. VEHICLES
INSERT INTO vehicles (id, name, plate_number, type, capacity, province_id, team_id, status) VALUES
  (1, 'Xuồng BT-X01',       '79A-00001', 'boat',      8, 1, 1,    'available'),
  (2, 'Xuồng BT-X02',       '79A-00002', 'boat',      6, 1, 1,    'available'),
  (3, 'Xe cứu thương Q7-A01','79A-10001', 'ambulance', 4, 1, 2,    'in_use'),
  (4, 'Xuồng Q7-X01',       '79A-00003', 'boat',      8, 1, 2,    'available'),
  (5, 'Xuồng BD-X01',       '74B-00001', 'boat',      8, 2, 3,    'available'),
  (6, 'Xe tải BD-T01',      '74B-20001', 'truck',    15, 2, NULL, 'available'),
  (7, 'Xuồng LA-X01',       '62A-00001', 'boat',      8, 4, 4,    'available'),
  (8, 'Xe cứu thương LA-A01','62A-10001', 'ambulance', 4, 4, NULL, 'available');

SELECT setval('vehicles_id_seq', (SELECT MAX(id) FROM vehicles));

-- 12. WAREHOUSES
INSERT INTO warehouses (id, name, address, province_id, district_id, latitude, longitude, capacity_tons, manager_id, coordinator_id, phone, warehouse_type, status) VALUES
  (1, 'Kho Tổng TP.HCM',        '200 Đinh Tiên Hoàng, Bình Thạnh, TP.HCM', 1, 1,  10.8014, 106.7177, 300.0, 2,  NULL, '0900200001', 'central',   'active'),
  (2, 'Kho Vệ Tinh Bình Dương', '50 Đại lộ Bình Dương, TP Thủ Dầu Một',    2, 6,  11.1353, 106.6583,  80.0, NULL, 5,  '0900200002', 'satellite', 'active'),
  (3, 'Kho Vệ Tinh Đồng Nai',   '100 Phạm Văn Thuận, TP Biên Hòa',         3, 10, 10.9596, 106.8431,  80.0, NULL, 6,  '0900200003', 'satellite', 'active'),
  (4, 'Kho Vệ Tinh Long An',    '45 Hùng Vương, TP Tân An',                 4, 13, 10.5325, 106.4131,  60.0, NULL, 7,  '0900200004', 'satellite', 'active'),
  (5, 'Kho Vệ Tinh Tây Ninh',   '30 Đường 30/4, TP Tây Ninh',               5, 17, 11.3103, 106.0982,  50.0, NULL, 8,  '0900200005', 'satellite', 'active'),
  (6, 'Kho Vệ Tinh Bà Rịa-VT',  '20 Trương Công Định, TP Bà Rịa',           6, 20, 10.4993, 107.1745,  50.0, NULL, 9,  '0900200006', 'satellite', 'active');

SELECT setval('warehouses_id_seq', (SELECT MAX(id) FROM warehouses));

-- 13. RELIEF ITEMS
INSERT INTO relief_items (id, name, category, unit, description, rescue_category) VALUES
  (1,  'Gạo',               'food',      'kg',    'Gạo tẻ đóng bao 50kg',                       'cuu_tro'),
  (2,  'Mì tôm',            'food',      'box',   'Mì ăn liền (30 gói/thùng)',                   'cuu_tro'),
  (3,  'Nước uống',         'water',     'thùng', 'Nước đóng chai 500ml',                        'cuu_tro'),
  (4,  'Thuốc sát trùng',   'medical',   'box',   'Kit thuốc y tế cơ bản',                       'cuu_nan'),
  (5,  'Chăn mền',          'shelter',   'piece', 'Chăn ấm cứu trợ',                             'cuu_tro'),
  (6,  'Áo phao',           'equipment', 'piece', 'Áo phao cứu sinh',                            'all'),
  (7,  'Bạt che mưa',       'shelter',   'piece', 'Bạt nhựa che mưa 4x6m',                      'cuu_tro'),
  (8,  'Xăng dầu',          'fuel',      'liter', 'Xăng cho xuồng cứu hộ',                      'all'),
  (9,  'Đồ hộp thực phẩm', 'food',      'box',   'Thực phẩm đóng hộp dự trữ',                   'cuu_tro'),
  (10, 'Quần áo khô',       'shelter',   'set',   'Bộ quần áo khô thay thế',                     'cuu_tro'),
  (11, 'Bông băng y tế',    'medical',   'set',   'Bộ bông băng cứu thương',                     'cuu_nan'),
  (12, 'Túi y tế khẩn cấp', 'medical',   'bag',   'Túi sơ cứu khẩn cấp đầy đủ dụng cụ',         'cuu_nan'),
  (13, 'Cáng cứu thương',   'equipment', 'piece', 'Cáng gấp vải di chuyển nạn nhân',             'cuu_nan'),
  (14, 'Dây cứu sinh',      'equipment', 'piece', 'Dây thừng cứu sinh 20m',                      'cuu_nan'),
  (15, 'Xe lăn',            'medical',   'piece', 'Xe lăn hỗ trợ người già / thương tích',       'cuu_ho'),
  (16, 'Máy bơm nước',      'equipment', 'piece', 'Máy bơm xử lý ngập nước',                    'all');

SELECT setval('relief_items_id_seq', (SELECT MAX(id) FROM relief_items));

-- 14. RELIEF INVENTORY
INSERT INTO relief_inventory (warehouse_id, item_id, quantity, unit, min_threshold) VALUES
  -- Kho tổng HCM
  (1,1,10000,'kg',2000),  (1,2,500,'box',100),   (1,3,8000,'thùng',1000),
  (1,4,200,'box',30),     (1,5,800,'piece',100),  (1,6,400,'piece',50),
  (1,7,300,'piece',40),   (1,8,2000,'liter',500),
  (1,9,300,'box',40),     (1,10,400,'set',50),
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
  -- Kho VS Long An
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

-- 15. WEATHER ALERTS
INSERT INTO weather_alerts (province_id, alert_type, severity, title, description, starts_at, expires_at, source) VALUES
  (1, 'flood', 'high',     'Cảnh báo ngập cục bộ TP.HCM',
   'Triều cường kết hợp mưa lớn gây ngập nhiều tuyến đường. Bình Thạnh, Nhà Bè ảnh hưởng nặng.',
   NOW(), NOW() + INTERVAL '2 days', 'nchmf.gov.vn'),
  (4, 'flood', 'critical', 'Lũ khẩn cấp tỉnh Long An',
   'Mực nước sông Vàm Cỏ Đông vượt báo động 3. Đức Hòa, Bến Lức bị ngập sâu, nhiều khu dân cư bị cô lập.',
   NOW() - INTERVAL '4 hours', NOW() + INTERVAL '3 days', 'nchmf.gov.vn'),
  (1, 'rain',  'medium',   'Mưa lớn TP.HCM',
   'Dự báo mưa 80-150mm trong 24h tới, nguy cơ ngập các vùng trũng thấp.',
   NOW() - INTERVAL '2 hours', NOW() + INTERVAL '1 day', 'nchmf.gov.vn');

-- 16. RESCUE REQUESTS
INSERT INTO rescue_requests (
  id, tracking_code, citizen_name, citizen_phone, citizen_address,
  latitude, longitude, address, province_id, district_id, ward_id,
  incident_type_id, urgency_level_id, description, victim_count,
  support_type, flood_severity, priority_score, coordinator_id,
  status, created_at, verified_at, assigned_team_id, assigned_at,
  started_at, completed_at, rescued_count, result_notes, reject_reason, response_time_minutes,
  citizen_confirmed, rescue_team_confirmed, tracking_status
) VALUES
(1,'RQ-2026-HCM001','Nguyễn Văn An',   '0901111001','123 Đinh Tiên Hoàng, Bình Thạnh',
 10.8069,106.7143,'123 Đinh Tiên Hoàng, P.26, Bình Thạnh, TP.HCM',1,1,2,
 1,1,'Nhà ngập nước 1.5m, 5 người mắc kẹt trên tầng 2. Có trẻ em và người già.',5,
 'Xuồng cứu hộ, sơ tán',4,95,4,
 'completed',NOW()-INTERVAL '10 hours',NOW()-INTERVAL '9 hours',
 1,NOW()-INTERVAL '9 hours',NOW()-INTERVAL '8 hours',NOW()-INTERVAL '6 hours',
 5,'Đã cứu thành công 5 người, chuyển đến điểm tập kết.',NULL,240,
 true,true,'completed'),

(2,'RQ-2026-HCM002','Trần Thị Bình',   '0901111002','45 Lê Lợi, Quận 1',
 10.7754,106.7001,'45 Lê Lợi, P.Bến Nghé, Q.1, TP.HCM',1,2,3,
 3,2,'Người cao tuổi bị mắc kẹt, cần sơ tán khẩn cấp.',2,
 'Sơ tán',3,80,4,
 'assigned',NOW()-INTERVAL '3 hours',NOW()-INTERVAL '2 hours',
 2,NOW()-INTERVAL '1 hour',NULL,NULL,
 0,NULL,NULL,NULL,
 false,false,'assigned'),

(3,'RQ-2026-HCM003','Lê Văn Cường',    '0901111003','78 Phan Văn Trị, Bình Thạnh',
 10.8100,106.7200,'78 Phan Văn Trị, P.25, Bình Thạnh, TP.HCM',1,1,1,
 1,2,'Khu nhà trọ ngập 80cm, 12 người cần di dời gấp.',12,
 'Sơ tán, lương thực',3,80,4,
 'in_progress',NOW()-INTERVAL '5 hours',NOW()-INTERVAL '4 hours',
 1,NOW()-INTERVAL '4 hours',NOW()-INTERVAL '3 hours',NULL,
 0,NULL,NULL,NULL,
 false,false,'en_route'),

(4,'RQ-2026-HCM004','Phạm Thị Dung',   '0901111004','15 Nguyễn Hữu Thọ, Quận 7',
 10.7369,106.7185,'15 Nguyễn Hữu Thọ, P.Tân Phú, Q.7, TP.HCM',1,3,5,
 4,1,'Bệnh nhân tiểu đường nặng, nhà ngập không thể ra ngoài.',1,
 'Y tế khẩn cấp, sơ tán',3,100,4,
 'pending',NOW()-INTERVAL '45 minutes',NULL,NULL,NULL,NULL,NULL,
 0,NULL,NULL,NULL,
 false,false,'submitted'),

(5,'RQ-2026-HCM005','Hoàng Minh Em',   '0901111005','56 An Dương Vương, Bình Chánh',
 10.6886,106.5735,'56 An Dương Vương, Xã Bình Hưng, Bình Chánh, TP.HCM',1,4,7,
 6,2,'Trường tiểu học bị ngập, cần sơ tán 80 học sinh.',80,
 'Sơ tán khẩn',4,80,4,
 'verified',NOW()-INTERVAL '2 hours',NOW()-INTERVAL '1 hour',
 NULL,NULL,NULL,NULL,
 0,NULL,NULL,NULL,
 false,false,'received'),

(6,'RQ-2026-HCM006','Vũ Thị Phượng',   '0901111006','101 Hàn Mặc Tử, Nhà Bè',
 10.6877,106.7345,'101 Hàn Mặc Tử, Xã Phú Xuân, Nhà Bè, TP.HCM',1,5,8,
 6,2,'Gia đình 7 người cần sơ tán, có trẻ em và người già.',7,
 'Sơ tán',4,80,4,
 'pending',NOW()-INTERVAL '1 hour',NULL,NULL,NULL,NULL,NULL,
 0,NULL,NULL,NULL,
 false,false,'submitted'),

(7,'RQ-2026-HCM007','Đặng Văn Giang',  '0901111007','23 Lý Chính Thắng, Quận 7',
 10.7400,106.7210,'23 Lý Chính Thắng, P.Tân Quy, Q.7, TP.HCM',1,3,6,
 3,1,'3 người bị mắc kẹt trên mái nhà, nước dâng rất nhanh.',3,
 'Xuồng cứu hộ khẩn cấp',5,100,4,
 'verified',NOW()-INTERVAL '30 minutes',NOW()-INTERVAL '15 minutes',
 NULL,NULL,NULL,NULL,
 0,NULL,NULL,NULL,
 false,false,'received'),

(8,'RQ-2026-LA001','Trịnh Văn Sơn',    '0901111008','45 Quốc lộ 22, Đức Hòa, Long An',
 10.8800,106.2800,'45 QL22, Đức Hòa, Long An',4,14,NULL,
 1,1,'Nhà ngập 1.2m, 4 người kẹt không thoát ra được.',4,
 'Xuồng cứu hộ',4,95,7,
 'pending',NOW()-INTERVAL '60 minutes',NULL,NULL,NULL,NULL,NULL,
 0,NULL,NULL,NULL,
 false,false,'submitted'),

(9,'RQ-2026-LA002','Ngô Thị Kim',      '0901111009','12 Nguyễn Văn Cừ, Bến Lức',
 10.6500,106.4900,'12 Nguyễn Văn Cừ, Bến Lức, Long An',4,15,NULL,
 5,3,'Cụm 20 hộ bị cô lập 2 ngày, thiếu nước uống và lương thực.',60,
 'Lương thực, nước uống',2,60,7,
 'verified',NOW()-INTERVAL '4 hours',NOW()-INTERVAL '3 hours',
 NULL,NULL,NULL,NULL,
 0,NULL,NULL,NULL,
 false,false,'received'),

(10,'RQ-2026-LA003','Mai Văn Long',    '0901111010','78 ĐT818, Cần Giuộc',
 10.5500,106.6300,'78 ĐT818, Cần Giuộc, Long An',4,16,NULL,
 2,2,'Sạt lở bờ sông, 2 nhà có nguy cơ đổ sập.',8,
 'Sơ tán khẩn',3,80,7,
 'assigned',NOW()-INTERVAL '2 hours',NOW()-INTERVAL '1 hour',
 4,NOW()-INTERVAL '30 minutes',NULL,NULL,
 0,NULL,NULL,NULL,
 false,false,'assigned'),

(11,'RQ-2026-LA004','Lý Thị Hoa',     '0901111011','20 Hùng Vương, Tân An',
 10.5325,106.4131,'20 Hùng Vương, TP Tân An, Long An',4,13,NULL,
 6,2,'Cần sơ tán 10 hộ dân, nước ngập đến mái nhà.',35,
 'Sơ tán',4,80,7,
 'completed',NOW()-INTERVAL '12 hours',NOW()-INTERVAL '11 hours',
 4,NOW()-INTERVAL '11 hours',NOW()-INTERVAL '10 hours',NOW()-INTERVAL '7 hours',
 33,'Đã sơ tán 33/35 người. 2 người không muốn rời nhà.',NULL,300,
 true,true,'completed'),

(12,'RQ-2026-HCM008','Test User',      '0901111012','Không rõ địa chỉ',
 10.7769,106.7009,'Địa chỉ không xác thực',1,2,NULL,
 1,5,'Test request',0,'none',1,10,4,
 'rejected',NOW()-INTERVAL '6 hours',NULL,
 NULL,NULL,NULL,NULL,
 0,NULL,'Địa chỉ không xác thực, không liên lạc được.',NULL,
 false,false,'submitted'),

(13,'RQ-2026-BD001','Trần Minh Khoa',  '0912345601','45 Đại lộ Bình Dương, Thuận An',
 10.9982,106.6944,'45 Đại lộ Bình Dương, TX Thuận An, Bình Dương',2,7,NULL,
 1,2,'Nhà xưởng bị ngập 1.2m, 8 công nhân mắc kẹt không thoát ra được.',8,
 'Xuồng cứu hộ, sơ tán',4,90,5,
 'pending',NOW()-INTERVAL '50 minutes',NULL,NULL,NULL,NULL,NULL,
 0,NULL,NULL,NULL,
 false,false,'submitted'),

(14,'RQ-2026-BD002','Nguyễn Thị Lan',  '0912345602','12 Võ Thị Sáu, Dĩ An',
 10.9070,106.7660,'12 Võ Thị Sáu, TX Dĩ An, Bình Dương',2,8,NULL,
 4,1,'Bệnh nhân nặng kẹt trong nhà ngập, cần y tế khẩn cấp và sơ tán.',2,
 'Y tế khẩn cấp, sơ tán',3,95,5,
 'pending',NOW()-INTERVAL '30 minutes',NULL,NULL,NULL,NULL,NULL,
 0,NULL,NULL,NULL,
 false,false,'submitted'),

(15,'RQ-2026-BD003','Lê Văn Phúc',     '0912345603','78 Cách Mạng Tháng 8, Thủ Dầu Một',
 11.1353,106.6583,'78 Cách Mạng Tháng 8, TP Thủ Dầu Một, Bình Dương',2,6,NULL,
 6,2,'Khu dân cư 25 hộ bị ngập, thiếu lương thực và nước uống 2 ngày qua.',70,
 'Lương thực, nước uống',3,75,5,
 'verified',NOW()-INTERVAL '3 hours',NOW()-INTERVAL '2 hours',
 NULL,NULL,NULL,NULL,
 0,NULL,NULL,NULL,
 false,false,'received'),

(16,'RQ-2026-BD004','Phạm Thị Hương',  '0912345604','33 QL13, Thuận An',
 10.9900,106.6850,'33 Quốc lộ 13, TX Thuận An, Bình Dương',2,7,NULL,
 3,2,'Sạt lở bờ kênh, 3 căn nhà có nguy cơ đổ sập, 12 người cần sơ tán gấp.',12,
 'Sơ tán khẩn, sơ cứu',4,85,5,
 'assigned',NOW()-INTERVAL '2 hours',NOW()-INTERVAL '1 hour',
 3,NOW()-INTERVAL '40 minutes',NULL,NULL,
 0,NULL,NULL,NULL,
 false,false,'assigned'),

(17,'RQ-2026-BD005','Hoàng Văn Tùng',  '0912345605','56 ĐT741, Bến Cát',
 11.2200,106.5700,'56 Đường tỉnh 741, Huyện Bến Cát, Bình Dương',2,9,NULL,
 1,2,'10 hộ dân bị cô lập do ngập lũ, đã được sơ tán an toàn.',30,
 'Sơ tán',3,70,5,
 'completed',NOW()-INTERVAL '14 hours',NOW()-INTERVAL '13 hours',
 3,NOW()-INTERVAL '13 hours',NOW()-INTERVAL '12 hours',NOW()-INTERVAL '9 hours',
 28,'Sơ tán 28/30 người. 2 người từ chối rời nhà.',NULL,240,
 false,true,'completed');

SELECT setval('rescue_requests_id_seq', (SELECT MAX(id) FROM rescue_requests));

-- 17. MISSIONS
INSERT INTO missions (id, request_id, team_id, vehicle_id, status, started_at, completed_at, notes, created_at) VALUES
  (1, 1,  1, 1, 'completed', NOW()-INTERVAL '8 hours', NOW()-INTERVAL '6 hours',
   'Cứu hộ thành công bằng xuồng. 5 nạn nhân an toàn.', NOW()-INTERVAL '9 hours'),
  (2, 3,  1, 2, 'on_scene',  NOW()-INTERVAL '3 hours', NULL,
   NULL, NOW()-INTERVAL '4 hours'),
  (3, 11, 4, 7, 'completed', NOW()-INTERVAL '10 hours', NOW()-INTERVAL '7 hours',
   'Sơ tán 33 người thành công.', NOW()-INTERVAL '11 hours');

SELECT setval('missions_id_seq', (SELECT MAX(id) FROM missions));

-- 18. MISSION LOGS
INSERT INTO mission_logs (mission_id, user_id, action, description, latitude, longitude) VALUES
  (1, 10, 'assigned',  'Nhiệm vụ được giao bởi điều phối viên',      10.8069, 106.7143),
  (1, 10, 'accepted',  'Đội trưởng xác nhận nhận nhiệm vụ',          10.8069, 106.7143),
  (1, 10, 'en_route',  'Đang di chuyển bằng xuồng đến hiện trường',  10.8050, 106.7100),
  (1, 10, 'on_scene',  'Đã đến hiện trường, bắt đầu cứu hộ',        10.8069, 106.7143),
  (1, 10, 'completed', 'Cứu hộ hoàn tất. 5 người an toàn.',          10.8069, 106.7143),
  (2, 10, 'assigned',  'Nhiệm vụ được giao',                          10.8100, 106.7200),
  (2, 10, 'accepted',  'Đội trưởng xác nhận',                        10.8100, 106.7200),
  (3, 13, 'completed', 'Sơ tán xong, trở về đơn vị',                 10.5325, 106.4131);

-- 19. NOTIFICATIONS
INSERT INTO notifications (user_id, tracking_code, type, title, message, metadata, is_read) VALUES
  (4,  'RQ-2026-HCM001', 'new_request',      'Yêu cầu cứu hộ mới',  '5 nạn nhân mắc kẹt tại Bình Thạnh, TP.HCM.', NULL, true),
  (4,  'RQ-2026-HCM002', 'new_request',      'Yêu cầu cứu hộ mới',  'Người cao tuổi mắc kẹt tại Quận 1.', NULL, false),
  (4,  'RQ-2026-HCM004', 'new_request',      'Yêu cầu cứu hộ mới',  'Bệnh nhân tiểu đường tại Q.7, cần y tế khẩn.', NULL, false),
  (7,  'RQ-2026-LA001',  'new_request',      'Yêu cầu cứu hộ mới',  '4 người mắc kẹt tại Đức Hòa, Long An.', NULL, false),
  (7,  'RQ-2026-LA002',  'new_request',      'Yêu cầu cứu hộ mới',  '60 người cô lập tại Bến Lức thiếu lương thực.', NULL, false),
  (10, NULL,             'mission_assigned',  'Nhiệm vụ mới',         'Cứu hộ tại 78 Phan Văn Trị, Bình Thạnh.', '{"mission_id":2}', false),
  (10, NULL,             'mission_completed', 'Nhiệm vụ hoàn thành',  'Cứu hộ tại Bình Thạnh hoàn thành.', '{"mission_id":1}', true),
  (NULL,'RQ-2026-HCM001','request_completed', 'Cứu hộ hoàn tất',     'Yêu cầu RQ-2026-HCM001 đã giải quyết.', NULL, false);

-- 20. SYSTEM CONFIG
INSERT INTO system_config (config_key, config_value, description) VALUES
  ('coordinator_max_workload_default', '30',      'Số yêu cầu tối đa mặc định cho coordinator'),
  ('workload_alert_threshold',         '80',       'Ngưỡng % cảnh báo workload'),
  ('response_time_escalation_minutes', '120',      'Thời gian escalate nếu chưa phản hồi'),
  ('auto_assign_enabled',              'false',    'Tự động assign team gần nhất'),
  ('citizen_request_rate_limit',       '10',       'Số yêu cầu tối đa/giờ'),
  ('map_default_center_lat',           '10.8231',  'Map center latitude (HCM)'),
  ('map_default_center_lng',           '106.6297', 'Map center longitude (HCM)'),
  ('map_default_zoom',                 '10',       'Map zoom mặc định'),
  ('system_name', 'Hệ thống Điều phối Cứu hộ Lũ lụt – Vùng TP.HCM', 'Tên hệ thống'),
  ('maintenance_mode',                 'false',    'Chế độ bảo trì'),
  ('priority_weight_urgency',          '10',       'Hệ số priority cho urgency'),
  ('priority_weight_victims',          '2',        'Hệ số priority cho victim_count');

-- 21. AUDIT LOGS
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address) VALUES
  (1,  'update_config',  'system_config',  1, '{"value":"20"}', '{"value":"30"}',            '127.0.0.1'),
  (4,  'verify_request', 'rescue_request', 2, '{"status":"pending"}', '{"status":"verified"}','192.168.1.10'),
  (4,  'assign_team',    'rescue_request', 2, '{"assigned_team_id":null}', '{"assigned_team_id":2}', '192.168.1.10');

-- 22. RELIEF DISTRIBUTIONS
INSERT INTO relief_distributions (distribution_type, request_id, team_id, warehouse_id, item_id, quantity, distributed_by, voucher_code, warehouse_confirmed, notes, status) VALUES
  ('issue', 1, 1, 1, 1, 200, 2, 'VT-A1B2C3D4', true,  'Cấp phát gạo cho vùng ngập Bình Thạnh', 'confirmed'),
  ('issue', 1, 2, 1, 6,  30, 2, 'VT-E5F6G7H8', false, 'Cấp áo phao cho đội cứu hộ', 'issued'),
  ('issue', 9, 4, 4, 1, 500, 7, 'VT-I9J0K1L2', true,  'Cấp gạo cho 60 hộ dân Bến Lức bị cô lập', 'confirmed');

-- 23. UPDATE COORDINATOR WORKLOADS
UPDATE coordinator_regions SET current_workload = 6 WHERE user_id = 4;
UPDATE coordinator_regions SET current_workload = 4 WHERE user_id = 5;
UPDATE coordinator_regions SET current_workload = 4 WHERE user_id = 7;
