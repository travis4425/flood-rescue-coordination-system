
USE flood_rescue_db;
GO

-- 1. REGIONS (3)
SET IDENTITY_INSERT regions ON;
INSERT INTO regions (id, name, code, description) VALUES
  (1, N'Miền Bắc', 'north', N'Các tỉnh phía Bắc'),
  (2, N'Miền Trung', 'central', N'Các tỉnh miền Trung - vùng thường xuyên bị lũ'),
  (3, N'Miền Nam', 'south', N'Các tỉnh phía Nam');
SET IDENTITY_INSERT regions OFF;

-- 2. PROVINCES (63 - đầy đủ 63 tỉnh/thành phố Việt Nam)
SET IDENTITY_INSERT provinces ON;
INSERT INTO provinces (id, region_id, name, code, latitude, longitude) VALUES
  -- Miền Bắc (region_id=1) - 25 tỉnh/thành
  (1,  1, N'Hà Nội',           'hanoi',      21.0285, 105.8542),
  (11, 1, N'Hải Phòng',        'haiphong',   20.8449, 106.6881),
  (12, 1, N'Quảng Ninh',       'quangninh',  21.0064, 107.2925),
  (13, 1, N'Hải Dương',        'haiduong',   20.9374, 106.3145),
  (14, 1, N'Hưng Yên',         'hungyen',    20.6463, 106.0511),
  (15, 1, N'Bắc Ninh',         'bacninh',    21.1862, 106.0763),
  (16, 1, N'Vĩnh Phúc',        'vinhphuc',   21.3609, 105.5474),
  (17, 1, N'Hà Nam',           'hanam',      20.5398, 105.9230),
  (18, 1, N'Nam Định',         'namdinh',    20.4388, 106.1621),
  (19, 1, N'Thái Bình',        'thaibinh',   20.4502, 106.3365),
  (20, 1, N'Ninh Bình',        'ninhbinh',   20.2506, 105.9745),
  (21, 1, N'Bắc Giang',        'bacgiang',   21.2731, 106.1946),
  (22, 1, N'Phú Thọ',          'phutho',     21.3954, 105.2272),
  (23, 1, N'Thái Nguyên',      'thainguyen', 21.5943, 105.8480),
  (24, 1, N'Tuyên Quang',      'tuyenquang', 21.8237, 105.2144),
  (25, 1, N'Hà Giang',         'hagiang',    22.8026, 104.9784),
  (26, 1, N'Cao Bằng',         'caobang',    22.6666, 106.2639),
  (27, 1, N'Bắc Kạn',          'backan',     22.1471, 105.8344),
  (28, 1, N'Lạng Sơn',         'langson',    21.8537, 106.7615),
  (29, 1, N'Lào Cai',          'laocai',     22.4809, 103.9755),
  (30, 1, N'Yên Bái',          'yenbai',     21.7051, 104.8997),
  (31, 1, N'Sơn La',           'sonla',      21.3272, 103.9144),
  (32, 1, N'Điện Biên',        'dienbien',   21.3860, 103.0230),
  (33, 1, N'Lai Châu',         'laichau',    22.3962, 103.4531),
  (34, 1, N'Hòa Bình',         'hoabinh',    20.8133, 105.3383),
  -- Miền Trung (region_id=2) - 19 tỉnh/thành
  (2,  2, N'Thừa Thiên Huế',   'hue',        16.4637, 107.5909),
  (3,  2, N'Quảng Nam',        'quangnam',   15.5394, 108.0191),
  (4,  2, N'Quảng Bình',       'quangbinh',  17.4690, 106.6222),
  (5,  2, N'Đà Nẵng',          'danang',     16.0544, 108.2022),
  (6,  2, N'Quảng Trị',        'quangtri',   16.7500, 107.1854),
  (7,  2, N'Hà Tĩnh',          'hatinh',     18.3560, 105.8877),
  (8,  2, N'Nghệ An',          'nghean',     18.6789, 105.6813),
  (35, 2, N'Thanh Hóa',        'thanhhoa',   19.8077, 105.7764),
  (36, 2, N'Quảng Ngãi',       'quangngai',  15.1200, 108.8044),
  (37, 2, N'Bình Định',        'binhdinh',   13.7820, 109.2197),
  (38, 2, N'Phú Yên',          'phuyen',     13.0882, 109.0929),
  (39, 2, N'Khánh Hòa',        'khanhhoa',   12.2388, 109.1967),
  (40, 2, N'Ninh Thuận',       'ninhthuan',  11.5654, 108.9881),
  (41, 2, N'Bình Thuận',       'binhthuan',  11.0904, 108.0721),
  (42, 2, N'Kon Tum',          'kontum',     14.3524, 107.9917),
  (43, 2, N'Gia Lai',          'gialai',     13.9810, 108.0003),
  (44, 2, N'Đắk Lắk',          'daklak',     12.6667, 108.0503),
  (45, 2, N'Đắk Nông',         'daknong',    12.0040, 107.6978),
  (46, 2, N'Lâm Đồng',         'lamdong',    11.9405, 108.4583),
  -- Miền Nam (region_id=3) - 19 tỉnh/thành
  (9,  3, N'TP Hồ Chí Minh',   'hcm',        10.8231, 106.6297),
  (10, 3, N'Cần Thơ',          'cantho',     10.0452, 105.7469),
  (47, 3, N'Bình Phước',       'binhphuoc',  11.7512, 106.7235),
  (48, 3, N'Tây Ninh',         'tayninh',    11.3103, 106.0982),
  (49, 3, N'Bình Dương',       'binhduong',  11.3254, 106.4770),
  (50, 3, N'Đồng Nai',         'dongnai',    11.0686, 107.1676),
  (51, 3, N'Bà Rịa-Vũng Tàu', 'brvt',       10.5417, 107.2431),
  (52, 3, N'Long An',          'longan',     10.6956, 106.2431),
  (53, 3, N'Tiền Giang',       'tiengiang',  10.3600, 106.3650),
  (54, 3, N'Bến Tre',          'bentre',     10.2420, 106.3751),
  (55, 3, N'Trà Vinh',         'travinh',    9.9477,  106.3416),
  (56, 3, N'Vĩnh Long',        'vinhlong',   10.2538, 105.9722),
  (57, 3, N'Đồng Tháp',        'dongthap',   10.4938, 105.6882),
  (58, 3, N'An Giang',         'angiang',    10.5221, 105.1260),
  (59, 3, N'Kiên Giang',       'kiengiang',  9.8249,  105.1259),
  (60, 3, N'Hậu Giang',        'haugiang',   9.7574,  105.6413),
  (61, 3, N'Sóc Trăng',        'soctrang',   9.6025,  105.9739),
  (62, 3, N'Bạc Liêu',         'baclieu',    9.2941,  105.7277),
  (63, 3, N'Cà Mau',           'camau',      9.1769,  105.1500);
SET IDENTITY_INSERT provinces OFF;

-- 3. DISTRICTS (21)
SET IDENTITY_INSERT districts ON;
INSERT INTO districts (id, province_id, name, code, latitude, longitude) VALUES
  -- Thừa Thiên Huế (province_id=2)
  (1, 2, N'TP Huế', 'tp-hue', 16.4637, 107.5909),
  (2, 2, N'Phú Vang', 'phu-vang', 16.4545, 107.6650),
  (3, 2, N'Phong Điền', 'phong-dien', 16.5348, 107.3483),
  (4, 2, N'Quảng Điền', 'quang-dien', 16.5290, 107.5180),
  -- Quảng Nam (province_id=3)
  (5, 3, N'Hội An', 'hoi-an', 15.8801, 108.3380),
  (6, 3, N'Đại Lộc', 'dai-loc', 15.8548, 108.0590),
  (7, 3, N'Điện Bàn', 'dien-ban', 15.8912, 108.2041),
  (8, 3, N'Duy Xuyên', 'duy-xuyen', 15.7800, 108.1700),
  -- Quảng Bình (province_id=4)
  (9, 4, N'Đồng Hới', 'dong-hoi', 17.4690, 106.6222),
  (10, 4, N'Lệ Thủy', 'le-thuy', 17.1397, 106.7380),
  (11, 4, N'Quảng Ninh', 'quang-ninh-qb', 17.2500, 106.5200),
  -- Đà Nẵng (province_id=5)
  (12, 5, N'Hải Châu', 'hai-chau', 16.0471, 108.2196),
  (13, 5, N'Thanh Khê', 'thanh-khe', 16.0676, 108.1890),
  (14, 5, N'Liên Chiểu', 'lien-chieu', 16.0740, 108.1490),
  (15, 5, N'Cẩm Lệ', 'cam-le', 16.0150, 108.2060),
  -- Quảng Trị (province_id=6)
  (16, 6, N'Đông Hà', 'dong-ha', 16.8166, 107.0985),
  (17, 6, N'Hải Lăng', 'hai-lang', 16.6680, 107.1850),
  -- Hà Tĩnh (province_id=7)
  (18, 7, N'TP Hà Tĩnh', 'tp-ha-tinh', 18.3420, 105.9070),
  (19, 7, N'Hương Khê', 'huong-khe', 18.1790, 105.7120),
  -- Nghệ An (province_id=8)
  (20, 8, N'TP Vinh', 'tp-vinh', 18.6730, 105.6810),
  (21, 8, N'Hưng Nguyên', 'hung-nguyen', 18.6420, 105.6250);
SET IDENTITY_INSERT districts OFF;

-- 4. WARDS (12)
SET IDENTITY_INSERT wards ON;
INSERT INTO wards (id, district_id, name, code, latitude, longitude) VALUES
  (1, 1, N'Phú Hội', 'phu-hoi', 16.4620, 107.5890),
  (2, 1, N'Vĩnh Ninh', 'vinh-ninh', 16.4580, 107.5850),
  (3, 1, N'Phú Hậu', 'phu-hau', 16.4700, 107.5930),
  (4, 1, N'Kim Long', 'kim-long', 16.4750, 107.5700),
  (5, 2, N'Phú Đa', 'phu-da', 16.4400, 107.6500),
  (6, 2, N'Phú Lương', 'phu-luong', 16.4500, 107.6700),
  (7, 5, N'Minh An', 'minh-an', 15.8780, 108.3350),
  (8, 5, N'Cẩm Phô', 'cam-pho', 15.8820, 108.3400),
  (9, 9, N'Đồng Phú', 'dong-phu', 17.4710, 106.6180),
  (10, 9, N'Hải Đình', 'hai-dinh', 17.4650, 106.6250),
  (11, 16, N'Phường 1', 'phuong-1-dh', 16.8180, 107.1000),
  (12, 16, N'Phường 2', 'phuong-2-dh', 16.8150, 107.0970);
SET IDENTITY_INSERT wards OFF;

-- 5. INCIDENT TYPES (6)
SET IDENTITY_INSERT incident_types ON;
INSERT INTO incident_types (id, name, code, icon, color, description) VALUES
  (1, N'Ngập lụt', 'flood', 'water', '#2196F3', N'Nước dâng gây ngập'),
  (2, N'Sạt lở đất', 'landslide', 'mountain', '#795548', N'Sạt lở do mưa lớn'),
  (3, N'Mắc kẹt', 'trapped', 'alert-triangle', '#FF5722', N'Người bị mắc kẹt'),
  (4, N'Y tế khẩn cấp', 'medical', 'heart', '#F44336', N'Cần hỗ trợ y tế'),
  (5, N'Thiếu lương thực', 'supplies', 'package', '#FF9800', N'Cần lương thực, nước'),
  (6, N'Sơ tán', 'evacuation', 'move', '#9C27B0', N'Cần di dời khẩn cấp');
SET IDENTITY_INSERT incident_types OFF;

-- 6. URGENCY LEVELS (5)
SET IDENTITY_INSERT urgency_levels ON;
INSERT INTO urgency_levels (id, name, code, priority_score, color, max_response_minutes, description) VALUES
  (1, N'Khẩn cấp', 'critical', 100, '#F44336', 30, N'Tính mạng đang bị đe dọa'),
  (2, N'Rất cao', 'very_high', 80, '#FF5722', 60, N'Cần cứu hộ trong 1 giờ'),
  (3, N'Cao', 'high', 60, '#FF9800', 120, N'Cần hỗ trợ trong 2 giờ'),
  (4, N'Trung bình', 'medium', 40, '#FFC107', 360, N'Cần hỗ trợ trong 6 giờ'),
  (5, N'Thấp', 'low', 20, '#4CAF50', 1440, N'Hỗ trợ trong 24 giờ');
SET IDENTITY_INSERT urgency_levels OFF;

-- 7. USERS (17, password: 123456)
DECLARE @hash VARCHAR(255) = '$2a$10$OS0HPBGhR6NtXxQ/QAWmP.CzeOr947.Q04EIqjt1VrYuwIXLGKH7C';

SET IDENTITY_INSERT users ON;
INSERT INTO users (id, username, email, password_hash, full_name, phone, role, region_id, province_id) VALUES
  (1, 'admin', 'admin@cuuho.vn', @hash, N'Nguyễn Văn Admin', '0900000001', 'admin', NULL, NULL),
  (2, 'nm_hung', 'hung@cuuho.vn', @hash, N'Trần Đại Hùng', '0900000002', 'manager', NULL, NULL),
  (3, 'rm_trung', 'trung.rm@cuuho.vn', @hash, N'Lê Văn Trung', '0900000003', 'manager', 2, NULL),
  (4, 'rm_nam', 'nam.rm@cuuho.vn', @hash, N'Phạm Thị Nam', '0900000004', 'manager', 3, NULL),
  (5, 'rm_bac', 'bac.rm@cuuho.vn', @hash, N'Hoàng Minh Bắc', '0900000005', 'manager', 1, NULL),
  (6, 'coord_hue', 'hue.coord@cuuho.vn', @hash, N'Ngô Thanh Hòa', '0900000006', 'coordinator', 2, 2),
  (7, 'coord_qnam', 'qnam.coord@cuuho.vn', @hash, N'Võ Thị Mai', '0900000007', 'coordinator', 2, 3),
  (8, 'coord_danang', 'dn.coord@cuuho.vn', @hash, N'Huỳnh Minh Đức', '0900000008', 'coordinator', 2, 5),
  (9, 'coord_qbinh', 'qbinh.coord@cuuho.vn', @hash, N'Trần Văn Sơn', '0900000009', 'coordinator', 2, 4),
  (10, 'coord_qtri', 'qtri.coord@cuuho.vn', @hash, N'Nguyễn Thị Lan', '0900000010', 'coordinator', 2, 6),
  (11, 'leader_hue1', 'leader1@cuuho.vn', @hash, N'Bùi Quang Vinh', '0900000011', 'rescue_team', 2, 2),
  (12, 'leader_hue2', 'leader2@cuuho.vn', @hash, N'Đặng Văn Tâm', '0900000012', 'rescue_team', 2, 2),
  (13, 'leader_qnam1', 'leader3@cuuho.vn', @hash, N'Trương Hoàng Nam', '0900000013', 'rescue_team', 2, 3),
  (14, 'leader_dn1', 'leader4@cuuho.vn', @hash, N'Lê Hoàng Phúc', '0900000014', 'rescue_team', 2, 5),
  (15, 'member1', 'member1@cuuho.vn', @hash, N'Lý Anh Tuấn', '0900000015', 'rescue_team', 2, 2),
  (16, 'member2', 'member2@cuuho.vn', @hash, N'Cao Đình Khoa', '0900000016', 'rescue_team', 2, 2),
  (17, 'member3', 'member3@cuuho.vn', @hash, N'Phan Minh Trí', '0900000017', 'rescue_team', 2, 3);
SET IDENTITY_INSERT users OFF;

-- 8. COORDINATOR REGIONS (5)
INSERT INTO coordinator_regions (user_id, province_id, district_id, is_primary, max_workload) VALUES
  (6, 2, NULL, 1, 20),
  (7, 3, NULL, 1, 15),
  (8, 5, NULL, 1, 15),
  (9, 4, NULL, 1, 15),
  (10, 6, NULL, 1, 15);

-- 9. RESCUE TEAMS (5)
SET IDENTITY_INSERT rescue_teams ON;
INSERT INTO rescue_teams (id, name, code, leader_id, province_id, district_id, phone, capacity, specialization, status, current_latitude, current_longitude) VALUES
  (1, N'Đội Cứu Hộ Huế 1', 'HUE-01', 11, 2, 1, '0900100001', 8, N'water_rescue', 'available', 16.4637, 107.5909),
  (2, N'Đội Cứu Hộ Huế 2', 'HUE-02', 12, 2, 2, '0900100002', 6, N'search_rescue', 'available', 16.4545, 107.6650),
  (3, N'Đội Cứu Hộ Quảng Nam', 'QNAM-01', 13, 3, 5, '0900100003', 10, N'water_rescue,medical', 'on_mission', 15.8801, 108.3380),
  (4, N'Đội Cứu Hộ Đà Nẵng', 'DN-01', 14, 5, 12, '0900100004', 8, N'water_rescue,evacuation', 'available', 16.0471, 108.2196),
  (5, N'Đội Cứu Hộ Huế 3', 'HUE-03', NULL, 2, 3, '0900100005', 6, N'landslide_rescue', 'standby', 16.5348, 107.3483);
SET IDENTITY_INSERT rescue_teams OFF;

-- 10. RESCUE TEAM MEMBERS (8)
INSERT INTO rescue_team_members (team_id, user_id, role_in_team) VALUES
  (1, 11, 'leader'), (1, 15, 'member'), (1, 16, 'medic'),
  (2, 12, 'leader'),
  (3, 13, 'leader'), (3, 17, 'member'),
  (4, 14, 'leader'),
  (5, 16, 'driver');

-- 11. VEHICLES (8)
SET IDENTITY_INSERT vehicles ON;
INSERT INTO vehicles (id, name, plate_number, type, capacity, province_id, team_id, status) VALUES
  (1, N'Xuồng cứu hộ HUE-X01', '75A-00001', 'boat', 8, 2, 1, 'available'),
  (2, N'Xuồng cứu hộ HUE-X02', '75A-00002', 'boat', 6, 2, 2, 'available'),
  (3, N'Xe cứu thương HUE-A01', '75A-10001', 'ambulance', 4, 2, NULL, 'available'),
  (4, N'Xe tải QN-T01', '92A-00001', 'truck', 20, 3, NULL, 'available'),
  (5, N'Xuồng cứu hộ QN-X01', '92A-00002', 'boat', 10, 3, 3, 'in_use'),
  (6, N'Xuồng cứu hộ DN-X01', '43A-00001', 'boat', 8, 5, 4, 'available'),
  (7, N'Xe cứu thương DN-A01', '43A-10001', 'ambulance', 4, 5, NULL, 'available'),
  (8, N'Xe tải HUE-T01', '75A-20001', 'truck', 15, 2, NULL, 'maintenance');
SET IDENTITY_INSERT vehicles OFF;

-- 12. WAREHOUSES (35 = 17 kho trung tâm + 18 kho vệ tinh, phủ toàn quốc)
SET IDENTITY_INSERT warehouses ON;
INSERT INTO warehouses (id, name, address, province_id, district_id, latitude, longitude, capacity_tons, manager_id, phone, warehouse_type) VALUES

  -- ====== KHO TRUNG TÂM (1 kho/tỉnh trọng điểm) ======
  -- Miền Bắc
  (1,  N'Kho TT Hà Nội',        N'15 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',           1,  NULL, 21.0285, 105.8542, 150.0, 3,    '0900100001', 'central'),
  (2,  N'Kho TT Hải Phòng',     N'45 Lê Lợi, Hồng Bàng, Hải Phòng',               11, NULL, 20.8449, 106.6881, 100.0, NULL, '0900100002', 'central'),
  (3,  N'Kho TT Thanh Hóa',     N'30 Quang Trung, TP Thanh Hóa',                    35, NULL, 19.8077, 105.7764,  80.0, NULL, '0900100003', 'central'),
  (4,  N'Kho TT Nghệ An',       N'88 Lê Lợi, TP Vinh, Nghệ An',                    8,  NULL, 18.6789, 105.6813,  90.0, NULL, '0900100004', 'central'),
  (5,  N'Kho TT Hà Tĩnh',       N'30 Phan Đình Phùng, TP Hà Tĩnh',                 7,  NULL, 18.3560, 105.8877,  60.0, NULL, '0900100005', 'central'),
  (6,  N'Kho TT Quảng Bình',    N'25 Lý Thường Kiệt, TP Đồng Hới',                 4,  NULL, 17.4690, 106.6222,  70.0, NULL, '0900100006', 'central'),
  (7,  N'Kho TT Quảng Trị',     N'12 Hùng Vương, TP Đông Hà, Quảng Trị',           6,  NULL, 16.8167, 107.0963,  55.0, NULL, '0900100007', 'central'),
  -- Miền Trung
  (8,  N'Kho TT Thừa Thiên Huế',N'123 Lê Lợi, TP Huế',                             2,  1,    16.4637, 107.5909,  80.0, 3,    '0900200001', 'central'),
  (9,  N'Kho TT Đà Nẵng',       N'78 Nguyễn Văn Linh, Hải Châu, Đà Nẵng',          5,  12,   16.0471, 108.2196,  90.0, NULL, '0900200003', 'central'),
  (10, N'Kho TT Quảng Nam',      N'15 Trần Phú, TP Tam Kỳ, Quảng Nam',              3,  NULL, 15.5692, 108.4720,  60.0, NULL, '0900200002', 'central'),
  (11, N'Kho TT Quảng Ngãi',    N'20 Hùng Vương, TP Quảng Ngãi',                   36, NULL, 15.1200, 108.8044,  50.0, NULL, '0900100008', 'central'),
  (12, N'Kho TT Bình Định',     N'50 Tây Sơn, TP Quy Nhơn, Bình Định',             37, NULL, 13.7820, 109.2197,  60.0, NULL, '0900100009', 'central'),
  (13, N'Kho TT Khánh Hòa',     N'100 Trần Phú, TP Nha Trang, Khánh Hòa',          39, NULL, 12.2388, 109.1967,  55.0, NULL, '0900100010', 'central'),
  -- Miền Nam
  (14, N'Kho TT TP.HCM',        N'200 Đinh Tiên Hoàng, Bình Thạnh, TP.HCM',        9,  NULL, 10.8014, 106.7177, 200.0, NULL, '0900100011', 'central'),
  (15, N'Kho TT Cần Thơ',       N'55 Hoà Bình, Ninh Kiều, Cần Thơ',                10, NULL, 10.0452, 105.7469, 120.0, NULL, '0900100012', 'central'),
  (16, N'Kho TT An Giang',       N'30 Ngô Gia Tự, TP Long Xuyên, An Giang',         58, NULL, 10.3785, 105.4386,  80.0, NULL, '0900100013', 'central'),
  (17, N'Kho TT Kiên Giang',    N'5 Lý Tự Trọng, TP Rạch Giá, Kiên Giang',         59, NULL,  9.9804, 105.0900,  70.0, NULL, '0900100014', 'central'),

  -- ====== KHO VỆ TINH (rải rác gần vùng nguy hiểm) ======
  -- Vệ tinh miền Bắc
  (18, N'Kho VS Nam Định',       N'Khu CN Nam Định, TP Nam Định',                   18, NULL, 20.4388, 106.1621,  25.0, NULL, '0900300001', 'satellite'),
  (19, N'Kho VS Thái Bình',      N'Xã Thái Thụy, Thái Bình',                        19, NULL, 20.5400, 106.5500,  20.0, NULL, '0900300002', 'satellite'),
  (20, N'Kho VS Ninh Bình',      N'Huyện Kim Sơn, Ninh Bình',                       20, NULL, 20.0830, 106.1370,  20.0, NULL, '0900300003', 'satellite'),
  -- Vệ tinh miền Trung Bắc
  (21, N'Kho VS Quỳnh Lưu',     N'Huyện Quỳnh Lưu, Nghệ An',                       8,  NULL, 19.1100, 105.6300,  18.0, NULL, '0900300004', 'satellite'),
  (22, N'Kho VS Nghi Xuân',      N'Huyện Nghi Xuân, Hà Tĩnh',                       7,  NULL, 18.5000, 105.7500,  15.0, NULL, '0900300005', 'satellite'),
  (23, N'Kho VS Bố Trạch',       N'Huyện Bố Trạch, Quảng Bình',                     4,  NULL, 17.6200, 106.5300,  18.0, NULL, '0900300006', 'satellite'),
  (24, N'Kho VS Gio Linh',       N'Huyện Gio Linh, Quảng Trị',                      6,  NULL, 16.9600, 107.0500,  15.0, NULL, '0900300007', 'satellite'),
  -- Vệ tinh Huế - Đà Nẵng
  (25, N'Kho VS Phong Điền',     N'Huyện Phong Điền, Thừa Thiên Huế',               2,  3,    16.5348, 107.3483,  20.0, NULL, '0900300008', 'satellite'),
  (26, N'Kho VS Hương Thủy',     N'Thị xã Hương Thủy, Thừa Thiên Huế',              2,  NULL, 16.3800, 107.6500,  18.0, NULL, '0900300009', 'satellite'),
  (27, N'Kho VS Liên Chiểu',     N'Quận Liên Chiểu, Đà Nẵng',                       5,  NULL, 16.0900, 108.1400,  22.0, NULL, '0900300010', 'satellite'),
  (28, N'Kho VS Hội An',         N'45 Trần Phú, TP Hội An, Quảng Nam',              3,  5,    15.8801, 108.3380,  20.0, NULL, '0900300011', 'satellite'),
  (29, N'Kho VS Đại Lộc',        N'Huyện Đại Lộc, Quảng Nam',                       3,  6,    15.8548, 108.0590,  15.0, NULL, '0900300012', 'satellite'),
  -- Vệ tinh miền Nam Trung Bộ
  (30, N'Kho VS Đức Phổ',        N'Huyện Đức Phổ, Quảng Ngãi',                      36, NULL, 14.8800, 108.9500,  15.0, NULL, '0900300013', 'satellite'),
  (31, N'Kho VS Tuy Phước',      N'Huyện Tuy Phước, Bình Định',                     37, NULL, 13.6800, 109.1800,  18.0, NULL, '0900300014', 'satellite'),
  -- Vệ tinh Đồng bằng sông Cửu Long
  (32, N'Kho VS Long An',        N'Huyện Tân An, Long An',                           52, NULL, 10.5353, 106.3986,  22.0, NULL, '0900300015', 'satellite'),
  (33, N'Kho VS Đồng Tháp',      N'TP Cao Lãnh, Đồng Tháp',                         57, NULL, 10.4595, 105.6384,  25.0, NULL, '0900300016', 'satellite'),
  (34, N'Kho VS Vĩnh Long',      N'TP Vĩnh Long, Vĩnh Long',                        56, NULL, 10.2538, 105.9722,  20.0, NULL, '0900300017', 'satellite'),
  (35, N'Kho VS Hậu Giang',      N'TP Vị Thanh, Hậu Giang',                         60, NULL,  9.7883, 105.4660,  18.0, NULL, '0900300018', 'satellite');

SET IDENTITY_INSERT warehouses OFF;

-- Gán manager cho kho trung tâm theo vùng
-- Vùng Bắc (region 1) → manager id=5 (rm_bac): HN, Hải Phòng, Thanh Hóa
UPDATE warehouses SET manager_id = 5 WHERE id IN (1, 2, 3);
-- Vùng Trung (region 2) → manager id=3 (rm_trung): Nghệ An→Khánh Hòa
UPDATE warehouses SET manager_id = 3 WHERE id IN (4, 5, 6, 7, 8, 9, 10, 11, 12, 13);
-- Vùng Nam (region 3) → manager id=4 (rm_nam): HCM, Cần Thơ, An Giang, Kiên Giang
UPDATE warehouses SET manager_id = 4 WHERE id IN (14, 15, 16, 17);

-- 13. RELIEF ITEMS (8)
SET IDENTITY_INSERT relief_items ON;
INSERT INTO relief_items (id, name, category, unit, description) VALUES
  (1, N'Gạo', 'food', 'kg', N'Gạo tẻ đóng bao 50kg'),
  (2, N'Mì tôm', 'food', 'box', N'Mì ăn liền (30 gói/thùng)'),
  (3, N'Nước uống', 'water', 'liter', N'Nước đóng chai 500ml'),
  (4, N'Thuốc sát trùng', 'medical', 'box', N'Kit y tế cơ bản'),
  (5, N'Chăn mền', 'shelter', 'piece', N'Chăn ấm cứu trợ'),
  (6, N'Áo phao', 'equipment', 'piece', N'Áo phao cứu sinh'),
  (7, N'Bạt che mưa', 'shelter', 'piece', N'Bạt nhựa che mưa 4x6m'),
  (8, N'Xăng dầu', 'fuel', 'liter', N'Xăng cho xuồng cứu hộ');
SET IDENTITY_INSERT relief_items OFF;

-- 14. RELIEF INVENTORY (21 - some below threshold for alerts)
INSERT INTO relief_inventory (warehouse_id, item_id, quantity, unit, min_threshold) VALUES
  (1, 1, 5000, 'kg', 1000), (1, 2, 200, 'box', 50), (1, 3, 3000, 'liter', 500),
  (1, 4, 50, 'box', 10), (1, 5, 300, 'piece', 50), (1, 6, 100, 'piece', 20),
  (1, 7, 80, 'piece', 15), (1, 8, 500, 'liter', 100),
  (2, 1, 3000, 'kg', 500), (2, 2, 150, 'box', 30), (2, 3, 2000, 'liter', 300),
  (2, 4, 8, 'box', 10),      -- near threshold
  (2, 5, 100, 'piece', 30), (2, 6, 40, 'piece', 15),
  (3, 1, 4000, 'kg', 800), (3, 2, 100, 'box', 40), (3, 3, 1500, 'liter', 400),
  (3, 4, 5, 'box', 10),      -- BELOW threshold
  (3, 5, 200, 'piece', 40), (3, 6, 60, 'piece', 20),
  (3, 7, 10, 'piece', 15);   -- BELOW threshold

-- 15. WEATHER ALERTS (4)
INSERT INTO weather_alerts (province_id, alert_type, severity, title, description, starts_at, expires_at, source) VALUES
  (2, 'flood', 'high', N'Cảnh báo lũ sông Hương',
   N'Mực nước sông Hương vượt báo động 2. Dự báo tiếp tục dâng cao trong 24h tới.',
   GETDATE(), DATEADD(DAY, 2, GETDATE()), 'nchmf.gov.vn'),
  (3, 'rain', 'medium', N'Mưa lớn Quảng Nam',
   N'Dự báo mưa 100-200mm trong 24h tới, nguy cơ ngập lụt vùng trũng.',
   GETDATE(), DATEADD(DAY, 1, GETDATE()), 'nchmf.gov.vn'),
  (4, 'flood', 'critical', N'Lũ lịch sử Quảng Bình',
   N'Mực nước sông Nhật Lệ vượt báo động 3. Nhiều xã bị cô lập.',
   DATEADD(HOUR, -6, GETDATE()), DATEADD(DAY, 3, GETDATE()), 'nchmf.gov.vn'),
  (6, 'rain', 'low', N'Mưa vừa Quảng Trị',
   N'Dự báo mưa 50-100mm, chú ý đề phòng.',
   DATEADD(DAY, -2, GETDATE()), DATEADD(DAY, -1, GETDATE()), 'nchmf.gov.vn');

-- 16. RESCUE REQUESTS (10 - all statuses for testing)
SET IDENTITY_INSERT rescue_requests ON;
INSERT INTO rescue_requests (
  id, tracking_code, citizen_name, citizen_phone, citizen_address,
  latitude, longitude, address, province_id, district_id, ward_id,
  incident_type_id, urgency_level_id, description, victim_count,
  support_type, flood_severity, priority_score, coordinator_id,
  status, created_at, verified_at, assigned_team_id, assigned_at,
  started_at, completed_at, rescued_count, result_notes, reject_reason, response_time_minutes
) VALUES
  -- RQ1: COMPLETED
  (1, 'RQ-2026-100001', N'Nguyễn Văn A', '0901111111', N'123 Lê Lợi, TP Huế',
   16.4637, 107.5909, N'123 Lê Lợi, Phú Hội, TP Huế', 2, 1, 1,
   1, 1, N'Nước ngập 1.5m, 5 người mắc kẹt tầng 2. Có trẻ em và người già.', 5,
   N'evacuation,medical', 4, 95, 6,
   'completed', DATEADD(HOUR, -10, GETDATE()), DATEADD(HOUR, -9, GETDATE()),
   1, DATEADD(HOUR, -9, GETDATE()), DATEADD(HOUR, -8, GETDATE()), DATEADD(HOUR, -6, GETDATE()),
   5, N'Đã cứu thành công 5 người, chuyển đến điểm tập kết Kim Long.', NULL, 240),

  -- RQ2: VERIFIED, chờ assign
  (2, 'RQ-2026-100002', N'Trần Thị B', '0902222222', N'45 Nguyễn Huệ, Phú Vang',
   16.4545, 107.6650, N'45 Nguyễn Huệ, Phú Vang, Huế', 2, 2, 5,
   3, 2, N'Gia đình 3 người bị kẹt, nước đang dâng nhanh.', 3,
   N'evacuation', 3, 76, 6,
   'verified', DATEADD(HOUR, -3, GETDATE()), DATEADD(HOUR, -2, GETDATE()),
   NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),

  -- RQ3: IN_PROGRESS - đội đang cứu
  (3, 'RQ-2026-100003', N'Lê Văn C', '0903333333', N'78 Trần Phú, Hội An',
   15.8801, 108.3380, N'78 Trần Phú, Phố cổ Hội An', 3, 5, 7,
   1, 3, N'Khu phố cổ ngập nặng, nhiều hộ dân cần di dời.', 20,
   N'evacuation,supplies', 3, 65, 7,
   'in_progress', DATEADD(HOUR, -5, GETDATE()), DATEADD(HOUR, -4, GETDATE()),
   3, DATEADD(HOUR, -4, GETDATE()), DATEADD(HOUR, -3, GETDATE()), NULL,
   0, NULL, NULL, NULL),

  -- RQ4: PENDING - chưa verify
  (4, 'RQ-2026-100004', N'Phạm Thị D', '0904444444', N'Thôn 3, Phong Điền',
   16.5348, 107.3483, N'Thôn 3, xã Phong Bình, Phong Điền', 2, 3, NULL,
   2, 2, N'Sạt lở đất sau nhà, 2 người bị vùi lấp. Rất nguy hiểm!', 2,
   N'search_rescue', 4, 82, 6,
   'pending', DATEADD(HOUR, -1, GETDATE()), NULL,
   NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),

  -- RQ5: PENDING - thiếu lương thực
  (5, 'RQ-2026-100005', N'Hoàng Văn E', '0905555555', N'12 Phan Bội Châu, Đại Lộc',
   15.8548, 108.0590, N'12 Phan Bội Châu, TT Ái Nghĩa, Đại Lộc', 3, 6, NULL,
   5, 4, N'Khu vực bị cô lập 2 ngày, thiếu nước uống và lương thực.', 15,
   N'supplies,water', 2, 48, 7,
   'pending', DATEADD(MINUTE, -45, GETDATE()), NULL,
   NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),

  -- RQ6: ASSIGNED - chờ đội xuất phát
  (6, 'RQ-2026-100006', N'Trương Thị F', '0906666666', N'56 Trần Cao Vân, Hải Châu',
   16.0471, 108.2196, N'56 Trần Cao Vân, Thanh Bình, Hải Châu, ĐN', 5, 12, NULL,
   4, 3, N'Bà cụ 80 tuổi bị ngất, nước ngập không thể đi viện.', 1,
   N'medical', 3, 70, 8,
   'assigned', DATEADD(HOUR, -2, GETDATE()), DATEADD(HOUR, -1.5, GETDATE()),
   4, DATEADD(HOUR, -1, GETDATE()), NULL, NULL,
   0, NULL, NULL, NULL),

  -- RQ7: REJECTED
  (7, 'RQ-2026-100007', N'Test User', '0907777777', N'Không rõ',
   16.4637, 107.5909, N'Địa chỉ không xác thực', 2, 1, NULL,
   1, 5, N'Test request', 0,
   N'none', 1, 10, 6,
   'rejected', DATEADD(HOUR, -8, GETDATE()), NULL,
   NULL, NULL, NULL, NULL, 0, NULL, N'Địa chỉ không xác thực, không liên lạc được.', NULL),

  -- RQ8: COMPLETED - sơ tán thành công
  (8, 'RQ-2026-100008', N'Đỗ Văn G', '0908888888', N'Thôn 2, Quảng Điền',
   16.5290, 107.5180, N'Thôn 2, xã Quảng Phú, Quảng Điền', 2, 4, NULL,
   6, 2, N'Cần sơ tán 8 hộ dân, nước ngập đến mái nhà.', 32,
   N'evacuation', 5, 90, 6,
   'completed', DATEADD(HOUR, -12, GETDATE()), DATEADD(HOUR, -11, GETDATE()),
   2, DATEADD(HOUR, -11, GETDATE()), DATEADD(HOUR, -10, GETDATE()), DATEADD(HOUR, -7, GETDATE()),
   30, N'Đã sơ tán 30/32 người. 2 người không muốn rời nhà.', NULL, 300),

  -- RQ9: VERIFIED - khẩn cấp Quảng Bình
  (9, 'RQ-2026-100009', N'Lý Thị H', '0909999999', N'18 Quang Trung, Đồng Hới',
   17.4690, 106.6222, N'18 Quang Trung, Đồng Phú, Đồng Hới', 4, 9, 9,
   1, 1, N'Lũ quét bất ngờ, 10 người mắc kẹt trên nóc nhà. KHẨN CẤP!', 10,
   N'evacuation,medical', 5, 100, 9,
   'verified', DATEADD(MINUTE, -30, GETDATE()), DATEADD(MINUTE, -20, GETDATE()),
   NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),

  -- RQ10: CANCELLED
  (10, 'RQ-2026-100010', N'Bùi Văn I', '0901010101', N'99 Hùng Vương, Điện Bàn',
   15.8912, 108.2041, N'99 Hùng Vương, TT Vĩnh Điện, Điện Bàn', 3, 7, NULL,
   3, 4, N'2 người mắc kẹt tầng 2, nước ngập tầng 1.', 2,
   N'evacuation', 2, 45, 7,
   'cancelled', DATEADD(HOUR, -6, GETDATE()), DATEADD(HOUR, -5, GETDATE()),
   NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL);
SET IDENTITY_INSERT rescue_requests OFF;

-- 17. MISSIONS (3)
SET IDENTITY_INSERT missions ON;
INSERT INTO missions (id, request_id, team_id, vehicle_id, status, started_at, completed_at, notes, created_at) VALUES
  (1, 1, 1, 1, 'completed', DATEADD(HOUR, -8, GETDATE()), DATEADD(HOUR, -6, GETDATE()),
   N'Cứu hộ thành công bằng xuồng. 5 nạn nhân an toàn.', DATEADD(HOUR, -9, GETDATE())),
  (2, 3, 3, 5, 'on_scene', DATEADD(HOUR, -3, GETDATE()), NULL,
   NULL, DATEADD(HOUR, -4, GETDATE())),
  (3, 8, 2, 2, 'completed', DATEADD(HOUR, -10, GETDATE()), DATEADD(HOUR, -7, GETDATE()),
   N'Sơ tán thành công 30 người. 2 hộ kiên quyết ở lại.', DATEADD(HOUR, -11, GETDATE()));
SET IDENTITY_INSERT missions OFF;

-- 18. MISSION LOGS (10)
INSERT INTO mission_logs (mission_id, user_id, action, description, latitude, longitude) VALUES
  (1, 11, 'assigned', N'Nhiệm vụ được giao bởi điều phối viên', 16.4637, 107.5909),
  (1, 11, 'accepted', N'Đội trưởng xác nhận nhận nhiệm vụ', 16.4637, 107.5909),
  (1, 11, 'en_route', N'Đang di chuyển bằng xuồng đến hiện trường', 16.4630, 107.5900),
  (1, 11, 'on_scene', N'Đã đến hiện trường, bắt đầu cứu hộ', 16.4637, 107.5909),
  (1, 11, 'completed', N'Cứu hộ hoàn tất. 5 người an toàn.', 16.4637, 107.5909),
  (2, 13, 'assigned', N'Nhiệm vụ được giao', 15.8801, 108.3380),
  (2, 13, 'accepted', N'Đội trưởng xác nhận', 15.8801, 108.3380),
  (2, 13, 'en_route', N'Đang di chuyển đến phố cổ Hội An', 15.8780, 108.3350),
  (2, 13, 'on_scene', N'Đã đến hiện trường, đang phối hợp sơ tán', 15.8801, 108.3380),
  (3, 12, 'completed', N'Sơ tán xong, trở về đơn vị', 16.5290, 107.5180);

-- 19. RESCUE REQUEST IMAGES (7)
INSERT INTO rescue_request_images (request_id, image_url, image_type) VALUES
  (1, '/uploads/rq1_scene_01.jpg', 'request'),
  (1, '/uploads/rq1_scene_02.jpg', 'request'),
  (1, '/uploads/rq1_result_01.jpg', 'result'),
  (3, '/uploads/rq3_scene_01.jpg', 'request'),
  (8, '/uploads/rq8_scene_01.jpg', 'request'),
  (8, '/uploads/rq8_result_01.jpg', 'result'),
  (8, '/uploads/rq8_result_02.jpg', 'result');

-- 20. NOTIFICATIONS (10)
INSERT INTO notifications (user_id, tracking_code, type, title, message, metadata, is_read) VALUES
  (6, 'RQ-2026-100001', 'new_request', N'Yêu cầu cứu hộ mới', N'5 nạn nhân mắc kẹt tại 123 Lê Lợi, TP Huế.', NULL, 1),
  (6, 'RQ-2026-100002', 'new_request', N'Yêu cầu cứu hộ mới', N'3 nạn nhân mắc kẹt tại Phú Vang, Huế.', NULL, 0),
  (6, 'RQ-2026-100004', 'new_request', N'Yêu cầu cứu hộ mới', N'Sạt lở đất tại Phong Điền. 2 người bị vùi lấp.', NULL, 0),
  (7, 'RQ-2026-100003', 'new_request', N'Yêu cầu cứu hộ mới', N'Ngập nặng phố cổ Hội An, 20 nạn nhân.', NULL, 1),
  (7, 'RQ-2026-100005', 'new_request', N'Yêu cầu cứu hộ mới', N'Đại Lộc bị cô lập, 15 người thiếu lương thực.', NULL, 0),
  (8, 'RQ-2026-100006', 'new_request', N'Yêu cầu cứu hộ mới', N'Bà cụ cần hỗ trợ y tế tại Hải Châu.', NULL, 0),
  (13, NULL, 'mission_assigned', N'Nhiệm vụ mới', N'Cứu hộ tại Hội An. 20 nạn nhân.', '{"mission_id":2}', 1),
  (11, NULL, 'mission_completed', N'Nhiệm vụ hoàn thành', N'Cứu hộ tại TP Huế hoàn thành.', '{"mission_id":1}', 1),
  (NULL, 'RQ-2026-100001', 'request_completed', N'Cứu hộ hoàn tất', N'Yêu cầu RQ-2026-100001 đã giải quyết.', NULL, 0),
  (NULL, 'RQ-2026-100007', 'request_rejected', N'Yêu cầu bị từ chối', N'Lý do: Địa chỉ không xác thực.', NULL, 0);

-- 21. SYSTEM CONFIG (12)
INSERT INTO system_config (config_key, config_value, description) VALUES
  ('coordinator_max_workload_default', '20', N'Số yêu cầu tối đa mặc định cho coordinator'),
  ('workload_alert_threshold', '80', N'Ngưỡng % cảnh báo workload'),
  ('response_time_escalation_minutes', '120', N'Thời gian escalate nếu chưa phản hồi'),
  ('auto_assign_enabled', 'false', N'Tự động assign team gần nhất'),
  ('citizen_request_rate_limit', '10', N'Số yêu cầu tối đa/giờ'),
  ('map_default_center_lat', '16.0544', N'Map center latitude'),
  ('map_default_center_lng', '108.2022', N'Map center longitude'),
  ('map_default_zoom', '6', N'Map zoom mặc định'),
  ('system_name', N'Hệ thống Điều phối Cứu hộ Lũ lụt', N'Tên hệ thống'),
  ('maintenance_mode', 'false', N'Chế độ bảo trì'),
  ('priority_weight_urgency', '10', N'Hệ số priority cho urgency'),
  ('priority_weight_victims', '2', N'Hệ số priority cho victim_count');

-- 22. AUDIT LOGS (4)
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address) VALUES
  (1, 'update_config', 'system_config', 1, '{"value":"15"}', '{"value":"20"}', '127.0.0.1'),
  (6, 'verify_request', 'rescue_request', 1, '{"status":"pending"}', '{"status":"verified"}', '192.168.1.10'),
  (6, 'assign_team', 'rescue_request', 1, '{"assigned_team_id":null}', '{"assigned_team_id":1}', '192.168.1.10'),
  (6, 'reject_request', 'rescue_request', 7, '{"status":"pending"}', '{"status":"rejected"}', '192.168.1.10');

-- Update coordinator workloads
UPDATE coordinator_regions SET current_workload = 4 WHERE user_id = 6;  -- coord_hue: RQ1,2,4,8
UPDATE coordinator_regions SET current_workload = 3 WHERE user_id = 7;  -- coord_qnam: RQ3,5,10
UPDATE coordinator_regions SET current_workload = 1 WHERE user_id = 8;  -- coord_danang: RQ6
UPDATE coordinator_regions SET current_workload = 1 WHERE user_id = 9;  -- coord_qbinh: RQ9

-- ============================================================
-- SEED DATA SUMMARY
-- ============================================================
-- Regions:       3   | Provinces:    63  | Districts:    21
-- Wards:         12  | Users:        17  | Coord Regions: 5
-- Incident Types: 6  | Urgency:      5   | Teams:         5
-- Team Members:  8   | Vehicles:     8   | Warehouses:    3
-- Relief Items:  8   | Inventory:    21  | Weather:       4
-- Requests:      10  | Missions:     3   | Mission Logs:  10
-- Images:        7   | Notifications:10  | System Config: 12
-- Audit Logs:    4
-- TOTAL: ~175 rows across 22 tables
--
-- Request status coverage:
--   completed(2), in_progress(1), assigned(1), verified(2),
--   pending(2), rejected(1), cancelled(1)
--
-- All passwords: 123456

-- 13. RELIEF DISTRIBUTIONS (7 records)
INSERT INTO relief_distributions (distribution_type, request_id, warehouse_id, item_id, quantity, distributed_by, notes) VALUES
  ('issue', 1, 8, 1, 100, 3, N'Cấp phát gạo cho vùng ngập Hương Thủy'),
  ('issue', 1, 8, 2,  50, 3, N'Cấp phát mì gói cho hộ dân'),
  ('issue', 2, 8, 3,  30, 3, N'Phát chăn cho 30 hộ dân'),
  ('issue', 5, 28, 1, 200, 7, N'Cấp gạo cho khu vực Hội An sau lũ'),
  ('issue', 5, 28, 4,  20, 7, N'Phát bộ sơ cứu cho 20 hộ'),
  ('return', NULL, 8, 1,  15, 3, N'Gạo dư sau đợt cứu trợ tháng trước'),
  ('return', NULL, 28, 2,  10, 7, N'Mì gói đội Đại Lộc trả về');

-- Update citizen_confirmed for completed requests
UPDATE rescue_requests SET citizen_confirmed = 1, citizen_confirmed_at = GETDATE() WHERE id = 1;

-- ============================================================

PRINT N'✅ Seed data inserted - 183 rows across 23 tables';
GO

-- ============================================================
-- PHẦN BỔ SUNG: DỮ LIỆU TP.HCM
-- ============================================================

DECLARE @hash VARCHAR(255) = '$2a$10$OS0HPBGhR6NtXxQ/QAWmP.CzeOr947.Q04EIqjt1VrYuwIXLGKH7C';

-- Coordinator HCM (ID 96)
SET IDENTITY_INSERT users ON;
INSERT INTO users (id, username, email, password_hash, full_name, phone, role, region_id, province_id) VALUES
  (96, 'coord_hcm', 'hcm.coord@cuuho.vn', @hash, N'Trần Văn Hùng', '0900000096', 'coordinator', 3, 9),
  -- Team leaders (200-209)
  (200, 'leader_hcm4',  'leader_hcm4@cuuho.vn',  @hash, N'Phạm Văn Cường',       '0911000001', 'rescue_team', 3, 9),
  (201, 'leader_hcm5',  'leader_hcm5@cuuho.vn',  @hash, N'Nguyễn Thị Lan Anh',   '0911000002', 'rescue_team', 3, 9),
  (202, 'leader_hcm6',  'leader_hcm6@cuuho.vn',  @hash, N'Trần Minh Hiếu',       '0911000003', 'rescue_team', 3, 9),
  (203, 'leader_hcm7',  'leader_hcm7@cuuho.vn',  @hash, N'Lê Thị Thu Hương',     '0911000004', 'rescue_team', 3, 9),
  (204, 'leader_hcm8',  'leader_hcm8@cuuho.vn',  @hash, N'Võ Văn Đức',           '0911000005', 'rescue_team', 3, 9),
  (205, 'leader_hcm9',  'leader_hcm9@cuuho.vn',  @hash, N'Huỳnh Thị Ngọc Bích', '0911000006', 'rescue_team', 3, 9),
  (206, 'leader_hcm10', 'leader_hcm10@cuuho.vn', @hash, N'Đỗ Văn Thịnh',         '0911000007', 'rescue_team', 3, 9),
  (207, 'leader_hcm11', 'leader_hcm11@cuuho.vn', @hash, N'Bùi Thị Cẩm Nhung',   '0911000008', 'rescue_team', 3, 9),
  (208, 'leader_hcm12', 'leader_hcm12@cuuho.vn', @hash, N'Đinh Văn Sơn',         '0911000009', 'rescue_team', 3, 9),
  (209, 'leader_hcm13', 'leader_hcm13@cuuho.vn', @hash, N'Cao Thị Mỹ Linh',     '0911000010', 'rescue_team', 3, 9),
  -- Members (210-229)
  (210, 'mem_hcm_01', 'mhcm_01@cuuho.vn', @hash, N'Nguyễn Văn Hải',   '0912000001', 'rescue_team', 3, 9),
  (211, 'mem_hcm_02', 'mhcm_02@cuuho.vn', @hash, N'Trần Thị Hoa',     '0912000002', 'rescue_team', 3, 9),
  (212, 'mem_hcm_03', 'mhcm_03@cuuho.vn', @hash, N'Lê Văn Tú',        '0912000003', 'rescue_team', 3, 9),
  (213, 'mem_hcm_04', 'mhcm_04@cuuho.vn', @hash, N'Phạm Thị Linh',    '0912000004', 'rescue_team', 3, 9),
  (214, 'mem_hcm_05', 'mhcm_05@cuuho.vn', @hash, N'Võ Văn Nam',       '0912000005', 'rescue_team', 3, 9),
  (215, 'mem_hcm_06', 'mhcm_06@cuuho.vn', @hash, N'Huỳnh Văn Bảo',    '0912000006', 'rescue_team', 3, 9),
  (216, 'mem_hcm_07', 'mhcm_07@cuuho.vn', @hash, N'Đặng Thị Thu',     '0912000007', 'rescue_team', 3, 9),
  (217, 'mem_hcm_08', 'mhcm_08@cuuho.vn', @hash, N'Bùi Văn Hùng',     '0912000008', 'rescue_team', 3, 9),
  (218, 'mem_hcm_09', 'mhcm_09@cuuho.vn', @hash, N'Ngô Thị Kim',      '0912000009', 'rescue_team', 3, 9),
  (219, 'mem_hcm_10', 'mhcm_10@cuuho.vn', @hash, N'Lý Văn Dũng',      '0912000010', 'rescue_team', 3, 9),
  (220, 'mem_hcm_11', 'mhcm_11@cuuho.vn', @hash, N'Trương Thị Nhung', '0912000011', 'rescue_team', 3, 9),
  (221, 'mem_hcm_12', 'mhcm_12@cuuho.vn', @hash, N'Đỗ Văn Khoa',      '0912000012', 'rescue_team', 3, 9),
  (222, 'mem_hcm_13', 'mhcm_13@cuuho.vn', @hash, N'Phan Thị Thảo',    '0912000013', 'rescue_team', 3, 9),
  (223, 'mem_hcm_14', 'mhcm_14@cuuho.vn', @hash, N'Lê Văn Quân',      '0912000014', 'rescue_team', 3, 9),
  (224, 'mem_hcm_15', 'mhcm_15@cuuho.vn', @hash, N'Nguyễn Thị Trang', '0912000015', 'rescue_team', 3, 9),
  (225, 'mem_hcm_16', 'mhcm_16@cuuho.vn', @hash, N'Trần Văn Cường',   '0912000016', 'rescue_team', 3, 9),
  (226, 'mem_hcm_17', 'mhcm_17@cuuho.vn', @hash, N'Võ Thị Lan',       '0912000017', 'rescue_team', 3, 9),
  (227, 'mem_hcm_18', 'mhcm_18@cuuho.vn', @hash, N'Hoàng Văn Minh',   '0912000018', 'rescue_team', 3, 9),
  (228, 'mem_hcm_19', 'mhcm_19@cuuho.vn', @hash, N'Đinh Thị Mai',     '0912000019', 'rescue_team', 3, 9),
  (229, 'mem_hcm_20', 'mhcm_20@cuuho.vn', @hash, N'Cao Văn Tuấn',     '0912000020', 'rescue_team', 3, 9),
  -- Members (230-269) — 4 người thêm/đội
  (230, 'mem_hcm_21', 'mhcm_21@cuuho.vn', @hash, N'Nguyễn Văn Bình',   '0913000001', 'rescue_team', 3, 9),
  (231, 'mem_hcm_22', 'mhcm_22@cuuho.vn', @hash, N'Trần Thị Cúc',     '0913000002', 'rescue_team', 3, 9),
  (232, 'mem_hcm_23', 'mhcm_23@cuuho.vn', @hash, N'Lê Văn Dương',     '0913000003', 'rescue_team', 3, 9),
  (233, 'mem_hcm_24', 'mhcm_24@cuuho.vn', @hash, N'Phạm Thị Em',      '0913000004', 'rescue_team', 3, 9),
  (234, 'mem_hcm_25', 'mhcm_25@cuuho.vn', @hash, N'Võ Văn Phong',     '0913000005', 'rescue_team', 3, 9),
  (235, 'mem_hcm_26', 'mhcm_26@cuuho.vn', @hash, N'Huỳnh Thị Giang',  '0913000006', 'rescue_team', 3, 9),
  (236, 'mem_hcm_27', 'mhcm_27@cuuho.vn', @hash, N'Đỗ Văn Hải',      '0913000007', 'rescue_team', 3, 9),
  (237, 'mem_hcm_28', 'mhcm_28@cuuho.vn', @hash, N'Bùi Thị Ích',     '0913000008', 'rescue_team', 3, 9),
  (238, 'mem_hcm_29', 'mhcm_29@cuuho.vn', @hash, N'Đinh Văn Khoa',   '0913000009', 'rescue_team', 3, 9),
  (239, 'mem_hcm_30', 'mhcm_30@cuuho.vn', @hash, N'Cao Thị Lan',     '0913000010', 'rescue_team', 3, 9),
  (240, 'mem_hcm_31', 'mhcm_31@cuuho.vn', @hash, N'Trương Văn Minh', '0913000011', 'rescue_team', 3, 9),
  (241, 'mem_hcm_32', 'mhcm_32@cuuho.vn', @hash, N'Phan Thị Nga',    '0913000012', 'rescue_team', 3, 9),
  (242, 'mem_hcm_33', 'mhcm_33@cuuho.vn', @hash, N'Lý Văn Oanh',    '0913000013', 'rescue_team', 3, 9),
  (243, 'mem_hcm_34', 'mhcm_34@cuuho.vn', @hash, N'Dương Thị Phúc', '0913000014', 'rescue_team', 3, 9),
  (244, 'mem_hcm_35', 'mhcm_35@cuuho.vn', @hash, N'Hồ Văn Quân',    '0913000015', 'rescue_team', 3, 9),
  (245, 'mem_hcm_36', 'mhcm_36@cuuho.vn', @hash, N'Mai Thị Rồng',   '0913000016', 'rescue_team', 3, 9),
  (246, 'mem_hcm_37', 'mhcm_37@cuuho.vn', @hash, N'Tô Văn Sơn',     '0913000017', 'rescue_team', 3, 9),
  (247, 'mem_hcm_38', 'mhcm_38@cuuho.vn', @hash, N'Lưu Thị Thùy',   '0913000018', 'rescue_team', 3, 9),
  (248, 'mem_hcm_39', 'mhcm_39@cuuho.vn', @hash, N'Châu Văn Ước',   '0913000019', 'rescue_team', 3, 9),
  (249, 'mem_hcm_40', 'mhcm_40@cuuho.vn', @hash, N'Kiều Thị Vân',   '0913000020', 'rescue_team', 3, 9),
  (250, 'mem_hcm_41', 'mhcm_41@cuuho.vn', @hash, N'Ngô Văn Xuân',   '0913000021', 'rescue_team', 3, 9),
  (251, 'mem_hcm_42', 'mhcm_42@cuuho.vn', @hash, N'Đinh Thị Yến',   '0913000022', 'rescue_team', 3, 9),
  (252, 'mem_hcm_43', 'mhcm_43@cuuho.vn', @hash, N'Bùi Văn Zung',   '0913000023', 'rescue_team', 3, 9),
  (253, 'mem_hcm_44', 'mhcm_44@cuuho.vn', @hash, N'Vũ Thị Anh Thư', '0913000024', 'rescue_team', 3, 9),
  (254, 'mem_hcm_45', 'mhcm_45@cuuho.vn', @hash, N'Trần Văn Bảo',   '0913000025', 'rescue_team', 3, 9),
  (255, 'mem_hcm_46', 'mhcm_46@cuuho.vn', @hash, N'Lê Thị Châu',    '0913000026', 'rescue_team', 3, 9),
  (256, 'mem_hcm_47', 'mhcm_47@cuuho.vn', @hash, N'Phạm Văn Dần',   '0913000027', 'rescue_team', 3, 9),
  (257, 'mem_hcm_48', 'mhcm_48@cuuho.vn', @hash, N'Hoàng Thị Én',   '0913000028', 'rescue_team', 3, 9),
  (258, 'mem_hcm_49', 'mhcm_49@cuuho.vn', @hash, N'Võ Văn Gấm',     '0913000029', 'rescue_team', 3, 9),
  (259, 'mem_hcm_50', 'mhcm_50@cuuho.vn', @hash, N'Nguyễn Thị Hồng','0913000030', 'rescue_team', 3, 9),
  (260, 'mem_hcm_51', 'mhcm_51@cuuho.vn', @hash, N'Trần Văn In',    '0913000031', 'rescue_team', 3, 9),
  (261, 'mem_hcm_52', 'mhcm_52@cuuho.vn', @hash, N'Lê Thị Khanh',   '0913000032', 'rescue_team', 3, 9),
  (262, 'mem_hcm_53', 'mhcm_53@cuuho.vn', @hash, N'Huỳnh Văn Lợi',  '0913000033', 'rescue_team', 3, 9),
  (263, 'mem_hcm_54', 'mhcm_54@cuuho.vn', @hash, N'Đặng Thị My',    '0913000034', 'rescue_team', 3, 9),
  (264, 'mem_hcm_55', 'mhcm_55@cuuho.vn', @hash, N'Bùi Văn Nam',    '0913000035', 'rescue_team', 3, 9),
  (265, 'mem_hcm_56', 'mhcm_56@cuuho.vn', @hash, N'Cao Thị Oanh',   '0913000036', 'rescue_team', 3, 9),
  (266, 'mem_hcm_57', 'mhcm_57@cuuho.vn', @hash, N'Đinh Văn Phát',  '0913000037', 'rescue_team', 3, 9),
  (267, 'mem_hcm_58', 'mhcm_58@cuuho.vn', @hash, N'Trương Thị Quý', '0913000038', 'rescue_team', 3, 9),
  (268, 'mem_hcm_59', 'mhcm_59@cuuho.vn', @hash, N'Hồ Văn Rin',     '0913000039', 'rescue_team', 3, 9),
  (269, 'mem_hcm_60', 'mhcm_60@cuuho.vn', @hash, N'Phan Thị Sen',   '0913000040', 'rescue_team', 3, 9);
SET IDENTITY_INSERT users OFF;
GO

-- Coordinator region cho coord_hcm (user 96)
IF NOT EXISTS (SELECT 1 FROM coordinator_regions WHERE user_id = 96 AND province_id = 9)
  INSERT INTO coordinator_regions (user_id, province_id, is_primary, max_workload)
  VALUES (96, 9, 1, 30);
GO

-- 10 đội cứu hộ tại TP.HCM (IDs 50-59)
SET IDENTITY_INSERT rescue_teams ON;
INSERT INTO rescue_teams (id, name, code, leader_id, province_id, phone, capacity, specialization, status, current_latitude, current_longitude) VALUES
  (50, N'Đội Cứu Hộ Quận 1',    'HCM-04', 200, 9, '0911100001', 8,  N'water_rescue,evacuation',       'available', 10.7769, 106.7009),
  (51, N'Đội Cứu Hộ Quận 7',    'HCM-05', 201, 9, '0911100002', 8,  N'medical,water_rescue',          'available', 10.7369, 106.7185),
  (52, N'Đội Cứu Hộ Bình Thạnh','HCM-06', 202, 9, '0911100003', 10, N'search_rescue,evacuation',      'available', 10.8069, 106.7143),
  (53, N'Đội Cứu Hộ Gò Vấp',    'HCM-07', 203, 9, '0911100004', 8,  N'water_rescue',                  'available', 10.8394, 106.6649),
  (54, N'Đội Cứu Hộ Tân Bình',  'HCM-08', 204, 9, '0911100005', 8,  N'search_rescue,medical',         'standby',   10.8013, 106.6525),
  (55, N'Đội Cứu Hộ Thủ Đức',   'HCM-09', 205, 9, '0911100006', 10, N'water_rescue,evacuation',       'available', 10.8547, 106.7746),
  (56, N'Đội Cứu Hộ Bình Chánh','HCM-10', 206, 9, '0911100007', 12, N'evacuation,water_rescue',       'available', 10.6886, 106.5735),
  (57, N'Đội Cứu Hộ Hóc Môn',   'HCM-11', 207, 9, '0911100008', 8,  N'water_rescue,landslide_rescue', 'available', 10.8915, 106.5921),
  (58, N'Đội Cứu Hộ Nhà Bè',    'HCM-12', 208, 9, '0911100009', 8,  N'water_rescue,medical',          'standby',   10.6877, 106.7345),
  (59, N'Đội Cứu Hộ Củ Chi',    'HCM-13', 209, 9, '0911100010', 10, N'evacuation,search_rescue',      'available', 11.0060, 106.5030);
SET IDENTITY_INSERT rescue_teams OFF;
GO

-- Thành viên các đội HCM (leader + 6 member = 7/đội)
INSERT INTO rescue_team_members (team_id, user_id, role_in_team) VALUES
  (50, 200, 'leader'), (50, 210, 'member'), (50, 211, 'medic'),
  (50, 230, 'member'), (50, 231, 'medic'), (50, 232, 'member'), (50, 233, 'member'),
  (51, 201, 'leader'), (51, 212, 'member'), (51, 213, 'medic'),
  (51, 234, 'member'), (51, 235, 'medic'), (51, 236, 'member'), (51, 237, 'member'),
  (52, 202, 'leader'), (52, 214, 'member'), (52, 215, 'member'),
  (52, 238, 'member'), (52, 239, 'medic'), (52, 240, 'member'), (52, 241, 'member'),
  (53, 203, 'leader'), (53, 216, 'member'), (53, 217, 'medic'),
  (53, 242, 'member'), (53, 243, 'medic'), (53, 244, 'member'), (53, 245, 'member'),
  (54, 204, 'leader'), (54, 218, 'member'), (54, 219, 'member'),
  (54, 246, 'member'), (54, 247, 'medic'), (54, 248, 'member'), (54, 249, 'member'),
  (55, 205, 'leader'), (55, 220, 'member'), (55, 221, 'medic'),
  (55, 250, 'member'), (55, 251, 'medic'), (55, 252, 'member'), (55, 253, 'member'),
  (56, 206, 'leader'), (56, 222, 'member'), (56, 223, 'member'),
  (56, 254, 'member'), (56, 255, 'medic'), (56, 256, 'member'), (56, 257, 'member'),
  (57, 207, 'leader'), (57, 224, 'member'), (57, 225, 'medic'),
  (57, 258, 'member'), (57, 259, 'medic'), (57, 260, 'member'), (57, 261, 'member'),
  (58, 208, 'leader'), (58, 226, 'member'), (58, 227, 'member'),
  (58, 262, 'member'), (58, 263, 'medic'), (58, 264, 'member'), (58, 265, 'member'),
  (59, 209, 'leader'), (59, 228, 'member'), (59, 229, 'medic'),
  (59, 266, 'member'), (59, 267, 'medic'), (59, 268, 'member'), (59, 269, 'member');
GO

-- 20 rescue requests tại TP.HCM (coordinator_id=96)
INSERT INTO rescue_requests
  (tracking_code, citizen_name, citizen_phone, citizen_address,
   latitude, longitude, address, province_id,
   incident_type_id, urgency_level_id, description, victim_count,
   support_type, flood_severity, status, coordinator_id, priority_score)
VALUES
  ('RQ-2026-HCM001', N'Nguyễn Văn An',      '0901111001', N'123 Nguyễn Huệ, Q.1',
   10.7769, 106.7009, N'123 Nguyễn Huệ, Quận 1, TP.HCM',        9, 1, 1, N'Nhà ngập nước 1.5m, 5 người mắc kẹt trên tầng 2', 5,   N'Xuồng cứu hộ', 4, 'pending',  96, 100),
  ('RQ-2026-HCM002', N'Trần Thị Bình',      '0901111002', N'45 Lê Lợi, Q.1',
   10.7754, 106.7001, N'45 Lê Lợi, Quận 1, TP.HCM',              9, 3, 2, N'Người cao tuổi bị mắc kẹt, cần sơ tán khẩn cấp', 2,  N'Sơ tán', 3, 'pending',  96, 80),
  ('RQ-2026-HCM003', N'Lê Văn Cường',       '0901111003', N'78 Phan Văn Trị, Bình Thạnh',
   10.8069, 106.7143, N'78 Phan Văn Trị, Bình Thạnh, TP.HCM',   9, 1, 2, N'Khu nhà trọ ngập 80cm, 12 người cần di dời gấp', 12, N'Sơ tán, lương thực', 3, 'pending',  96, 80),
  ('RQ-2026-HCM004', N'Phạm Thị Dung',      '0901111004', N'15 Quang Trung, Gò Vấp',
   10.8394, 106.6649, N'15 Quang Trung, Gò Vấp, TP.HCM',         9, 4, 1, N'Bệnh nhân tiểu đường nặng, nhà ngập không thể ra ngoài', 1, N'Y tế khẩn cấp, sơ tán', 3, 'verified', 96, 100),
  ('RQ-2026-HCM005', N'Hoàng Minh Em',      '0901111005', N'32 CMT8, Tân Bình',
   10.8013, 106.6525, N'32 Cách Mạng Tháng 8, Tân Bình, TP.HCM', 9, 1, 3, N'Hẻm nhỏ ngập sâu, 8 hộ dân cần hỗ trợ lương thực', 25, N'Lương thực, nước uống', 3, 'pending',  96, 60),
  ('RQ-2026-HCM006', N'Vũ Thị Phượng',      '0901111006', N'101 Hàn Mặc Tử, Bình Thạnh',
   10.8120, 106.7200, N'101 Hàn Mặc Tử, Bình Thạnh, TP.HCM',    9, 6, 2, N'Gia đình 7 người cần sơ tán, có trẻ em và người già', 7, N'Sơ tán', 4, 'pending',  96, 80),
  ('RQ-2026-HCM007', N'Đặng Văn Giang',     '0901111007', N'56 Đinh Tiên Hoàng, Bình Thạnh',
   10.8050, 106.7100, N'56 Đinh Tiên Hoàng, Bình Thạnh, TP.HCM', 9, 1, 3, N'Nhà cấp 4 bị ngập 1m, có nguy cơ sập', 4,            N'Sơ tán khẩn', 4, 'verified', 96, 60),
  ('RQ-2026-HCM008', N'Bùi Thị Hạnh',       '0901111008', N'88 Nguyễn Thị Định, Q.2',
   10.7900, 106.7400, N'88 Nguyễn Thị Định, Quận 2, TP.HCM',    9, 5, 4, N'Nhóm 30 người thiếu nước sạch và thực phẩm', 30,      N'Nước sạch, lương thực', 2, 'pending',  96, 40),
  ('RQ-2026-HCM009', N'Trịnh Văn Inh',      '0901111009', N'23 Lý Chính Thắng, Q.3',
   10.7830, 106.6890, N'23 Lý Chính Thắng, Quận 3, TP.HCM',     9, 3, 1, N'3 người bị mắc kẹt trên mái nhà, nước dâng rất nhanh', 3, N'Xuồng cứu hộ khẩn cấp', 5, 'pending', 96, 100),
  ('RQ-2026-HCM010', N'Ngô Thị Kim Oanh',   '0901111010', N'12 Hoàng Diệu, Q.4',
   10.7600, 106.7000, N'12 Hoàng Diệu, Quận 4, TP.HCM',          9, 1, 2, N'Phụ nữ mang thai 8 tháng kẹt trong nhà ngập, cần sơ tán gấp', 2, N'Y tế, sơ tán', 3, 'verified', 96, 80),
  ('RQ-2026-HCM011', N'Lý Văn Long',        '0901111011', N'67 Nguyễn Văn Linh, Q.7',
   10.7369, 106.7185, N'67 Nguyễn Văn Linh, Quận 7, TP.HCM',    9, 1, 3, N'Khu dân cư ngập 60cm, nhiều hộ cần di dời', 20,       N'Sơ tán, lương thực', 3, 'pending',  96, 60),
  ('RQ-2026-HCM012', N'Dương Thị Mận',      '0901111012', N'45 Huỳnh Tấn Phát, Nhà Bè',
   10.6877, 106.7345, N'45 Huỳnh Tấn Phát, Nhà Bè, TP.HCM',     9, 2, 2, N'Sạt lở bờ sông, 2 nhà có nguy cơ đổ sập', 8,         N'Sơ tán khẩn, gia cố bờ', 3, 'pending',  96, 80),
  ('RQ-2026-HCM013', N'Cao Văn Nghĩa',      '0901111013', N'34 Lê Văn Lương, Nhà Bè',
   10.6820, 106.7380, N'34 Lê Văn Lương, Nhà Bè, TP.HCM',        9, 5, 4, N'Cụm 15 hộ bị cô lập, cần thực phẩm và nước uống', 45, N'Lương thực, nước uống, thuốc men', 2, 'pending', 96, 40),
  ('RQ-2026-HCM014', N'Phan Thị Oanh',      '0901111014', N'78 Tân Hương, Tân Phú',
   10.7950, 106.6200, N'78 Tân Hương, Tân Phú, TP.HCM',          9, 4, 1, N'Trẻ sơ sinh sốt cao, nhà ngập không thể đi bệnh viện', 1, N'Y tế khẩn, sơ tán', 2, 'verified', 96, 100),
  ('RQ-2026-HCM015', N'Hồ Văn Phú',         '0901111015', N'112 Hồ Học Lãm, Bình Tân',
   10.7600, 106.6050, N'112 Hồ Học Lãm, Bình Tân, TP.HCM',       9, 1, 3, N'Nhà trọ công nhân ngập 70cm, 40 người cần hỗ trợ', 40, N'Sơ tán, lương thực', 3, 'pending',  96, 60),
  ('RQ-2026-HCM016', N'Đinh Thị Quỳnh',     '0901111016', N'56 An Dương Vương, Bình Chánh',
   10.6886, 106.5735, N'56 An Dương Vương, Bình Chánh, TP.HCM',  9, 6, 2, N'Trường tiểu học bị ngập, cần sơ tán 80 học sinh', 80, N'Sơ tán khẩn', 4, 'pending',  96, 80),
  ('RQ-2026-HCM017', N'Lưu Văn Rộng',       '0901111017', N'23 Tô Ký, Hóc Môn',
   10.8915, 106.5921, N'23 Tô Ký, Hóc Môn, TP.HCM',              9, 1, 4, N'Đường ngập nặng, 5 hộ dân vùng sâu cần tiếp tế', 15,  N'Lương thực, nước uống', 2, 'pending',  96, 40),
  ('RQ-2026-HCM018', N'Mai Thị Sim',         '0901111018', N'89 Nguyễn Ảnh Thủ, Hóc Môn',
   10.8850, 106.5980, N'89 Nguyễn Ảnh Thủ, Hóc Môn, TP.HCM',    9, 3, 1, N'Người đàn ông 70 tuổi sống một mình, nhà ngập sâu 1.2m', 1, N'Sơ tán khẩn cấp', 4, 'verified', 96, 100),
  ('RQ-2026-HCM019', N'Tô Văn Thành',       '0901111019', N'45 Hà Huy Giáp, Q.12',
   10.8700, 106.6600, N'45 Hà Huy Giáp, Quận 12, TP.HCM',        9, 1, 3, N'Khu dân cư mới ngập 50cm, người dân chưa biết cách sơ tán', 30, N'Hỗ trợ sơ tán, lương thực', 2, 'pending', 96, 60),
  ('RQ-2026-HCM020', N'Nguyễn Thị Uyên',    '0901111020', N'12 Thạnh Lộc, Q.12',
   10.8630, 106.6450, N'12 Thạnh Lộc, Quận 12, TP.HCM',          9, 4, 2, N'Bệnh nhân lọc thận không thể rời nhà do ngập, cần hỗ trợ y tế khẩn', 1, N'Y tế khẩn cấp, sơ tán', 3, 'verified', 96, 80);
GO

PRINT N'✅ HCM data inserted: 1 coordinator + 10 leaders + 60 members + 10 teams + 20 requests';
GO
