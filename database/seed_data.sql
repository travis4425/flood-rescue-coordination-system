
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
SET IDENTITY_INSERT incident_types ON;
INSERT INTO incident_types (id, name, code, icon, color, description) VALUES
  (1, N'Ngập lụt',        'flood',     'water',          '#2196F3', N'Nước dâng gây ngập'),
  (2, N'Sạt lở đất',      'landslide', 'mountain',       '#795548', N'Sạt lở do mưa lớn'),
  (3, N'Mắc kẹt',         'trapped',   'alert-triangle', '#FF5722', N'Người bị mắc kẹt'),
  (4, N'Y tế khẩn cấp',   'medical',   'heart',          '#F44336', N'Cần hỗ trợ y tế'),
  (5, N'Thiếu lương thực','supplies',  'package',        '#FF9800', N'Cần lương thực, nước'),
  (6, N'Sơ tán',          'evacuation','move',           '#9C27B0', N'Cần di dời khẩn cấp');
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
INSERT INTO users (id, username, email, password_hash, full_name, phone, role, region_id, province_id) VALUES
  -- Hệ thống
  (1,  'admin',      'admin@cuuho.vn',       @hash, N'Nguyễn Văn Admin',   '0900000001', 'admin',             NULL, NULL),
  (2,  'wm_hcm',     'wm@cuuho.vn',          @hash, N'Lê Minh Kho',        '0900000002', 'warehouse_manager', 1,    1),
  -- Manager (1 người quản lý chung vùng HCM)
  (3,  'mgr_hcm',    'mgr.hcm@cuuho.vn',     @hash, N'Trần Quốc Hùng',    '0900000003', 'manager',           1,    1),
  -- Coordinators (1 per tỉnh)
  (4,  'coord_hcm',  'coord.hcm@cuuho.vn',   @hash, N'Trần Văn Hùng',     '0900000004', 'coordinator',       1,    1),
  (5,  'coord_bd',   'coord.bd@cuuho.vn',     @hash, N'Lý Thị Bình',       '0900000005', 'coordinator',       1,    2),
  (6,  'coord_dn',   'coord.dn@cuuho.vn',     @hash, N'Ngô Văn Đồng',      '0900000006', 'coordinator',       1,    3),
  (7,  'coord_la',   'coord.la@cuuho.vn',     @hash, N'Cao Thị Long',      '0900000007', 'coordinator',       1,    4),
  (8,  'coord_tn',   'coord.tn@cuuho.vn',     @hash, N'Đinh Văn Tây',      '0900000008', 'coordinator',       1,    5),
  (9,  'coord_brvt', 'coord.brvt@cuuho.vn',   @hash, N'Phan Thị Vũng',     '0900000009', 'coordinator',       1,    6),
  -- Team leaders
  (10, 'leader_hcm1','leader.hcm1@cuuho.vn', @hash, N'Trần Minh Hiếu',    '0911000001', 'rescue_team',       1,    1),
  (11, 'leader_hcm2','leader.hcm2@cuuho.vn', @hash, N'Nguyễn Lan Anh',    '0911000002', 'rescue_team',       1,    1),
  (12, 'leader_bd1', 'leader.bd1@cuuho.vn',   @hash, N'Phạm Văn Cường',    '0911000003', 'rescue_team',       1,    2),
  (13, 'leader_la1', 'leader.la1@cuuho.vn',   @hash, N'Lê Thị Thu Hương',  '0911000004', 'rescue_team',       1,    4),
  -- Members HCM đội 1 (6 người)
  (14, 'mem_hcm_01', 'mhcm01@cuuho.vn',  @hash, N'Cao Thị Lan',        '0912000001', 'rescue_team', 1, 1),
  (15, 'mem_hcm_02', 'mhcm02@cuuho.vn',  @hash, N'Đinh Văn Khoa',      '0912000002', 'rescue_team', 1, 1),
  (22, 'mem_hcm_03', 'mhcm03@cuuho.vn',  @hash, N'Trần Văn Bảo',       '0912000009', 'rescue_team', 1, 1),
  (23, 'mem_hcm_04', 'mhcm04@cuuho.vn',  @hash, N'Nguyễn Thị Cúc',     '0912000010', 'rescue_team', 1, 1),
  (24, 'mem_hcm_05', 'mhcm05@cuuho.vn',  @hash, N'Lê Văn Đức',         '0912000011', 'rescue_team', 1, 1),
  (25, 'mem_hcm_06', 'mhcm06@cuuho.vn',  @hash, N'Phạm Văn Hải',       '0912000012', 'rescue_team', 1, 1),
  -- Members HCM đội 2 (6 người)
  (16, 'mem_hcm_07', 'mhcm07@cuuho.vn',  @hash, N'Võ Văn Nam',         '0912000003', 'rescue_team', 1, 1),
  (17, 'mem_hcm_08', 'mhcm08@cuuho.vn',  @hash, N'Huỳnh Văn Bảo',      '0912000004', 'rescue_team', 1, 1),
  (26, 'mem_hcm_09', 'mhcm09@cuuho.vn',  @hash, N'Võ Thị Mai',         '0912000013', 'rescue_team', 1, 1),
  (27, 'mem_hcm_10', 'mhcm10@cuuho.vn',  @hash, N'Đặng Văn Minh',      '0912000014', 'rescue_team', 1, 1),
  (28, 'mem_hcm_11', 'mhcm11@cuuho.vn',  @hash, N'Huỳnh Thị Ngọc',     '0912000015', 'rescue_team', 1, 1),
  (29, 'mem_hcm_12', 'mhcm12@cuuho.vn',  @hash, N'Trịnh Văn Phong',    '0912000016', 'rescue_team', 1, 1),
  -- Members BD (6 người)
  (18, 'mem_bd_01',  'mbd01@cuuho.vn',    @hash, N'Nguyễn Văn Hải',     '0912000005', 'rescue_team', 1, 2),
  (19, 'mem_bd_02',  'mbd02@cuuho.vn',    @hash, N'Trần Thị Hoa',       '0912000006', 'rescue_team', 1, 2),
  (30, 'mem_bd_03',  'mbd03@cuuho.vn',    @hash, N'Lý Văn Quang',       '0912000017', 'rescue_team', 1, 2),
  (31, 'mem_bd_04',  'mbd04@cuuho.vn',    @hash, N'Cao Thị Ry',         '0912000018', 'rescue_team', 1, 2),
  (32, 'mem_bd_05',  'mbd05@cuuho.vn',    @hash, N'Đinh Văn Sơn',       '0912000019', 'rescue_team', 1, 2),
  (33, 'mem_bd_06',  'mbd06@cuuho.vn',    @hash, N'Ngô Thị Thanh',      '0912000020', 'rescue_team', 1, 2),
  -- Members LA (6 người)
  (20, 'mem_la_01',  'mla01@cuuho.vn',    @hash, N'Lê Văn Quân',        '0912000007', 'rescue_team', 1, 4),
  (21, 'mem_la_02',  'mla02@cuuho.vn',    @hash, N'Nguyễn Thị Trang',   '0912000008', 'rescue_team', 1, 4),
  (34, 'mem_la_03',  'mla03@cuuho.vn',    @hash, N'Phan Văn Tùng',      '0912000021', 'rescue_team', 1, 4),
  (35, 'mem_la_04',  'mla04@cuuho.vn',    @hash, N'Bùi Thị Uyên',       '0912000022', 'rescue_team', 1, 4),
  (36, 'mem_la_05',  'mla05@cuuho.vn',    @hash, N'Hồ Văn Vũ',          '0912000023', 'rescue_team', 1, 4),
  (37, 'mem_la_06',  'mla06@cuuho.vn',    @hash, N'Trần Thị Xinh',      '0912000024', 'rescue_team', 1, 4);
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

-- 13. RELIEF ITEMS (8)
SET IDENTITY_INSERT relief_items ON;
INSERT INTO relief_items (id, name, category, unit, description) VALUES
  (1, N'Gạo',            'food',      'kg',    N'Gạo tẻ đóng bao 50kg'),
  (2, N'Mì tôm',         'food',      'box',   N'Mì ăn liền (30 gói/thùng)'),
  (3, N'Nước uống',      'water',     'liter', N'Nước đóng chai 500ml'),
  (4, N'Thuốc sát trùng','medical',   'box',   N'Kit y tế cơ bản'),
  (5, N'Chăn mền',       'shelter',   'piece', N'Chăn ấm cứu trợ'),
  (6, N'Áo phao',        'equipment', 'piece', N'Áo phao cứu sinh'),
  (7, N'Bạt che mưa',    'shelter',   'piece', N'Bạt nhựa che mưa 4x6m'),
  (8, N'Xăng dầu',       'fuel',      'liter', N'Xăng cho xuồng cứu hộ');
SET IDENTITY_INSERT relief_items OFF;

-- 14. RELIEF INVENTORY
INSERT INTO relief_inventory (warehouse_id, item_id, quantity, unit, min_threshold) VALUES
  -- Kho tổng HCM (đủ hàng)
  (1,1,10000,'kg',2000), (1,2,500,'box',100), (1,3,8000,'liter',1000),
  (1,4,200,'box',30),    (1,5,800,'piece',100),(1,6,400,'piece',50),
  (1,7,300,'piece',40),  (1,8,2000,'liter',500),
  -- Kho VS Bình Dương
  (2,1,2000,'kg',400),   (2,2,100,'box',20),  (2,3,1500,'liter',300),
  (2,4,40,'box',10),     (2,6,80,'piece',20), (2,8,500,'liter',100),
  -- Kho VS Đồng Nai
  (3,1,2000,'kg',400),   (3,2,80,'box',20),   (3,3,1200,'liter',300),
  (3,6,60,'piece',20),   (3,8,400,'liter',100),
  -- Kho VS Long An (vùng ngập nên tồn kho cao hơn)
  (4,1,3000,'kg',500),   (4,2,120,'box',30),  (4,3,2000,'liter',400),
  (4,4,50,'box',10),     (4,6,100,'piece',30),(4,8,600,'liter',150),
  -- Kho VS Tây Ninh
  (5,1,1500,'kg',300),   (5,3,800,'liter',200),(5,6,40,'piece',15),
  (5,8,300,'liter',80),
  -- Kho VS Bà Rịa-VT
  (6,1,1500,'kg',300),   (6,3,1000,'liter',200),(6,6,50,'piece',15),
  (6,8,400,'liter',100);

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

-- 22. RELIEF DISTRIBUTIONS (3)
INSERT INTO relief_distributions (distribution_type, request_id, warehouse_id, item_id, quantity, distributed_by, notes) VALUES
  ('issue', 1,  1, 1, 200, 2,  N'Cấp phát gạo cho vùng ngập Bình Thạnh'),
  ('issue', 1,  1, 6,  30, 2,  N'Cấp áo phao cho đội cứu hộ'),
  ('issue', 9,  4, 1, 500, 7,  N'Cấp gạo cho 60 hộ dân Bến Lức bị cô lập');

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
