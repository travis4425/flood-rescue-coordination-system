/**
 * seed_all_provinces.js
 * Script chạy 1 lần: Lấy 63 tỉnh từ provinces.open-api.vn → insert vào DB
 * Idempotent: dùng ON CONFLICT DO NOTHING / kiểm tra trước khi insert
 *
 * Cách chạy (từ thư mục backend/):
 *   node ../database/seed_all_provinces.js
 * Hoặc với Railway URL:
 *   DATABASE_URL="postgresql://..." node ../database/seed_all_provinces.js
 */

const path = require('path');
const backendDir = path.join(__dirname, '../backend');

// Load .env từ backend
require(path.join(backendDir, 'node_modules/dotenv')).config({ path: path.join(backendDir, '.env') });

// Dùng node_modules của backend (script nằm ngoài backend/)
const { Pool } = require(path.join(backendDir, 'node_modules/pg'));
const bcrypt    = require(path.join(backendDir, 'node_modules/bcryptjs'));
const https     = require('https');

// ─── DB Connection ──────────────────────────────────────────────────────────
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT) || 5432,
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME     || 'flood_rescue_db',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

// ─── Region mapping ──────────────────────────────────────────────────────────
// Dựa theo mã tỉnh của Tổng Cục Thống Kê (provinces.open-api.vn .code)
// Miền Bắc: 01–40 | Miền Trung: 40–59 | Miền Nam: 60–96
function getRegionCode(provinceCode) {
  const code = parseInt(provinceCode);
  if (code <= 40) return 'north';
  if (code <= 59) return 'central';
  return 'south';
}

function getRegionName(code) {
  if (code === 'north')   return 'Miền Bắc';
  if (code === 'central') return 'Miền Trung';
  return 'Miền Nam';
}

// ─── Fetch helper ────────────────────────────────────────────────────────────
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error: ' + e.message)); }
      });
    }).on('error', reject);
  });
}

// ─── Vietnamese name → ASCII slug ────────────────────────────────────────────
function toSlug(str) {
  return str
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Phone generator (fake but unique) ───────────────────────────────────────
let phoneCounter = 500;
function nextPhone() {
  phoneCounter++;
  return `09${String(phoneCounter).padStart(8, '0')}`;
}

// ─── Vietnamese last names pool ──────────────────────────────────────────────
const lastNames  = ['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Võ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý'];
const midNames   = ['Văn','Thị','Minh','Quốc','Anh','Thu','Hải','Đức','Bảo','Lan','Huy','Linh','Phúc','Thanh','Khoa'];
const firstNames = ['An','Bình','Châu','Dũng','Em','Giang','Hà','Khánh','Long','Mạnh','Nam','Phong','Quân','Sơn','Tâm','Tuấn','Uyên','Vinh'];

function randomName(seed) {
  const s = seed % lastNames.length;
  return `${lastNames[s]} ${midNames[(seed+3) % midNames.length]} ${firstNames[(seed+7) % firstNames.length]}`;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const client = await pool.connect();
  try {
    console.log('🔌 Đã kết nối DB');

    // ── Bước 0: Hash mật khẩu 123456 ──
    console.log('🔐 Đang tạo password hash...');
    const passwordHash = await bcrypt.hash('123456', 10);
    console.log('✅ Hash xong');

    // ── Bước 1: Dữ liệu 63 tỉnh hardcode (không cần gọi API ngoài) ──
    const apiProvinces = ALL_63_PROVINCES;
    console.log(`✅ Loaded ${apiProvinces.length} tỉnh/thành`);

    // ── Bước 2: Upsert 3 regions ──
    const regionCodes = ['north', 'central', 'south'];
    const regionIds = {};
    for (const code of regionCodes) {
      const name = getRegionName(code);
      const desc = code === 'north' ? 'Các tỉnh thành Miền Bắc' :
                   code === 'central' ? 'Các tỉnh thành Miền Trung' : 'Các tỉnh thành Miền Nam';
      const res = await client.query(
        `INSERT INTO regions (name, code, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [name, code, desc]
      );
      regionIds[code] = res.rows[0].id;
    }
    console.log('✅ Regions:', regionIds);

    // ── Bước 3: Lấy user IDs lớn nhất hiện tại ──
    const maxUserRes = await client.query('SELECT COALESCE(MAX(id), 100) as max_id FROM users');
    let nextUserId = parseInt(maxUserRes.rows[0].max_id) + 1;

    const maxTeamRes = await client.query('SELECT COALESCE(MAX(id), 10) as max_id FROM rescue_teams');
    let nextTeamId = parseInt(maxTeamRes.rows[0].max_id) + 1;

    const maxWhRes = await client.query('SELECT COALESCE(MAX(id), 10) as max_id FROM warehouses');
    let nextWhId = parseInt(maxWhRes.rows[0].max_id) + 1;

    // ── Bước 4: Lấy provinces đã có trong DB ──
    const existingProvRes = await client.query('SELECT code FROM provinces');
    const existingCodes = new Set(existingProvRes.rows.map(r => r.code));
    console.log(`ℹ️  Đã có ${existingCodes.size} tỉnh trong DB, bỏ qua các tỉnh trùng`);

    // ── Bước 5: Với mỗi tỉnh mới → insert province + users + team + warehouse ──
    let insertedCount = 0;
    let skippedCount  = 0;

    for (let i = 0; i < apiProvinces.length; i++) {
      const prov = apiProvinces[i];
      const regionCode = getRegionCode(prov.code);
      const regionId   = regionIds[regionCode];
      const slug       = toSlug(prov.name);

      // Bỏ qua nếu đã có
      if (existingCodes.has(slug)) {
        skippedCount++;
        continue;
      }

      // Tọa độ mẫu từ API (provinces.open-api.vn không trả coords)
      // Dùng bảng tọa độ hardcode cho 63 tỉnh
      const coords = PROVINCE_COORDS[prov.code] || { lat: 16.0 + (i * 0.1), lon: 108.0 };

      // Insert province
      const provRes = await client.query(
        `INSERT INTO provinces (region_id, name, code, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (code) DO NOTHING
         RETURNING id`,
        [regionId, prov.name, slug, coords.lat, coords.lon]
      );
      if (provRes.rows.length === 0) { skippedCount++; continue; }
      const provinceId = provRes.rows[0].id;

      // Tạo manager user
      const mgrIdx = nextUserId++;
      const mgrUsername = `mgr_${slug.replace(/-/g,'').slice(0, 10)}`;
      const mgrEmail    = `mgr.${slug.replace(/-/g,'').slice(0, 10)}@cuuho.vn`;
      const mgrName     = randomName(mgrIdx);
      await client.query(
        `INSERT INTO users (id, username, email, password_hash, full_name, phone, role, province_id)
         VALUES ($1, $2, $3, $4, $5, $6, 'manager', $7)
         ON CONFLICT (username) DO NOTHING`,
        [mgrIdx, mgrUsername, mgrEmail, passwordHash, mgrName, nextPhone(), provinceId]
      );

      // Tạo coordinator user
      const coordIdx = nextUserId++;
      const coordUsername = `coord_${slug.replace(/-/g,'').slice(0, 8)}`;
      const coordEmail    = `coord.${slug.replace(/-/g,'').slice(0, 8)}@cuuho.vn`;
      const coordName     = randomName(coordIdx);
      const coordInsert = await client.query(
        `INSERT INTO users (id, username, email, password_hash, full_name, phone, role, province_id)
         VALUES ($1, $2, $3, $4, $5, $6, 'coordinator', $7)
         ON CONFLICT (username) DO NOTHING
         RETURNING id`,
        [coordIdx, coordUsername, coordEmail, passwordHash, coordName, nextPhone(), provinceId]
      );
      const coordId = coordInsert.rows[0]?.id || coordIdx;

      // coordinator_regions
      await client.query(
        `INSERT INTO coordinator_regions (user_id, province_id, is_primary, max_workload)
         SELECT $1, $2, true, 20
         WHERE NOT EXISTS (
           SELECT 1 FROM coordinator_regions WHERE user_id = $1 AND province_id = $2
         )`,
        [coordId, provinceId]
      );

      // Tạo rescue team leader
      const leaderIdx = nextUserId++;
      const leaderUsername = `leader_${slug.replace(/-/g,'').slice(0, 8)}`;
      const leaderEmail    = `leader.${slug.replace(/-/g,'').slice(0, 8)}@cuuho.vn`;
      const leaderName     = randomName(leaderIdx);
      const leaderInsert = await client.query(
        `INSERT INTO users (id, username, email, password_hash, full_name, phone, role, province_id)
         VALUES ($1, $2, $3, $4, $5, $6, 'rescue_team', $7)
         ON CONFLICT (username) DO NOTHING
         RETURNING id`,
        [leaderIdx, leaderUsername, leaderEmail, passwordHash, leaderName, nextPhone(), provinceId]
      );
      const leaderId = leaderInsert.rows[0]?.id || leaderIdx;

      // Tạo rescue team
      const teamCode = (regionCode === 'north' ? 'B' : regionCode === 'central' ? 'T' : 'N') +
                       '-' + slug.toUpperCase().slice(0, 6).replace(/-/g, '');
      let teamId;
      const existingTeam = await client.query(`SELECT id FROM rescue_teams WHERE code = $1`, [teamCode]);
      if (existingTeam.rows.length > 0) {
        teamId = existingTeam.rows[0].id;
      } else {
        const teamInsert = await client.query(
          `INSERT INTO rescue_teams (id, name, code, leader_id, province_id, phone, capacity, specialization, status, current_latitude, current_longitude)
           VALUES ($1, $2, $3, $4, $5, $6, 8, 'water_rescue,evacuation', 'available', $7, $8)
           RETURNING id`,
          [nextTeamId, `Đội Cứu Hộ ${prov.name}`, teamCode, leaderId, provinceId,
           nextPhone(), coords.lat, coords.lon]
        );
        teamId = teamInsert.rows[0].id;
        nextTeamId++;
      }

      // rescue_team_members (leader)
      await client.query(
        `INSERT INTO rescue_team_members (team_id, user_id, role_in_team)
         SELECT $1, $2, 'leader'
         WHERE NOT EXISTS (
           SELECT 1 FROM rescue_team_members WHERE team_id = $1 AND user_id = $2
         )`,
        [teamId, leaderId]
      );

      // Tạo warehouse vệ tinh
      const whName = `Kho Vệ Tinh ${prov.name}`;
      await client.query(
        `INSERT INTO warehouses (id, name, address, province_id, latitude, longitude,
          capacity_tons, coordinator_id, phone, warehouse_type, status)
         VALUES ($1, $2, $3, $4, $5, $6, 60.0, $7, $8, 'satellite', 'active')
         ON CONFLICT DO NOTHING`,
        [nextWhId, whName, `Trung tâm ${prov.name}`, provinceId,
         coords.lat, coords.lon, coordId, nextPhone()]
      );
      nextWhId++;

      insertedCount++;
      process.stdout.write(`\r✅ [${i+1}/${apiProvinces.length}] ${prov.name.padEnd(30)}`);
    }

    // ── Bước 6: Update sequences ──
    await client.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))`);
    await client.query(`SELECT setval('rescue_teams_id_seq', (SELECT MAX(id) FROM rescue_teams))`);
    await client.query(`SELECT setval('warehouses_id_seq', (SELECT MAX(id) FROM warehouses))`);
    await client.query(`SELECT setval('provinces_id_seq', (SELECT MAX(id) FROM provinces))`);
    await client.query(`SELECT setval('regions_id_seq', (SELECT MAX(id) FROM regions))`);

    console.log(`\n\n🎉 Hoàn tất!`);
    console.log(`   ✅ Đã thêm: ${insertedCount} tỉnh mới`);
    console.log(`   ⏭️  Bỏ qua:  ${skippedCount} tỉnh đã có`);
    console.log(`\n📋 Tài khoản mặc định (mật khẩu: 123456):`);
    console.log(`   admin / admin@cuuho.vn`);
    console.log(`   mgr_<slug> / mgr.<slug>@cuuho.vn (1 tài khoản mỗi tỉnh)`);
    console.log(`   coord_<slug> / coord.<slug>@cuuho.vn`);
    console.log(`   leader_<slug> / leader.<slug>@cuuho.vn`);
  } finally {
    client.release();
    await pool.end();
  }
}

// ─── 63 tỉnh/thành hardcode (code = mã GSO, name = tên đầy đủ) ──────────────
const ALL_63_PROVINCES = [
  { code: '01', name: 'Hà Nội' },
  { code: '02', name: 'Hà Giang' },
  { code: '04', name: 'Cao Bằng' },
  { code: '06', name: 'Bắc Kạn' },
  { code: '08', name: 'Tuyên Quang' },
  { code: '10', name: 'Lào Cai' },
  { code: '11', name: 'Điện Biên' },
  { code: '12', name: 'Lai Châu' },
  { code: '14', name: 'Sơn La' },
  { code: '15', name: 'Yên Bái' },
  { code: '17', name: 'Hòa Bình' },
  { code: '19', name: 'Thái Nguyên' },
  { code: '20', name: 'Lạng Sơn' },
  { code: '22', name: 'Quảng Ninh' },
  { code: '24', name: 'Bắc Giang' },
  { code: '25', name: 'Phú Thọ' },
  { code: '26', name: 'Vĩnh Phúc' },
  { code: '27', name: 'Bắc Ninh' },
  { code: '30', name: 'Hải Dương' },
  { code: '31', name: 'Hải Phòng' },
  { code: '33', name: 'Hưng Yên' },
  { code: '34', name: 'Thái Bình' },
  { code: '35', name: 'Hà Nam' },
  { code: '36', name: 'Nam Định' },
  { code: '37', name: 'Ninh Bình' },
  { code: '38', name: 'Thanh Hóa' },
  { code: '40', name: 'Nghệ An' },
  { code: '42', name: 'Hà Tĩnh' },
  { code: '44', name: 'Quảng Bình' },
  { code: '45', name: 'Quảng Trị' },
  { code: '46', name: 'Thừa Thiên Huế' },
  { code: '48', name: 'Đà Nẵng' },
  { code: '49', name: 'Quảng Nam' },
  { code: '51', name: 'Quảng Ngãi' },
  { code: '52', name: 'Bình Định' },
  { code: '54', name: 'Phú Yên' },
  { code: '56', name: 'Khánh Hòa' },
  { code: '58', name: 'Ninh Thuận' },
  { code: '60', name: 'Bình Thuận' },
  { code: '62', name: 'Kon Tum' },
  { code: '64', name: 'Gia Lai' },
  { code: '66', name: 'Đắk Lắk' },
  { code: '67', name: 'Đắk Nông' },
  { code: '68', name: 'Lâm Đồng' },
  { code: '70', name: 'Bình Phước' },
  { code: '72', name: 'Tây Ninh' },
  { code: '74', name: 'Bình Dương' },
  { code: '75', name: 'Đồng Nai' },
  { code: '77', name: 'Bà Rịa - Vũng Tàu' },
  { code: '79', name: 'TP Hồ Chí Minh' },
  { code: '80', name: 'Long An' },
  { code: '82', name: 'Tiền Giang' },
  { code: '83', name: 'Bến Tre' },
  { code: '84', name: 'Trà Vinh' },
  { code: '86', name: 'Vĩnh Long' },
  { code: '87', name: 'Đồng Tháp' },
  { code: '89', name: 'An Giang' },
  { code: '91', name: 'Kiên Giang' },
  { code: '92', name: 'Cần Thơ' },
  { code: '93', name: 'Hậu Giang' },
  { code: '94', name: 'Sóc Trăng' },
  { code: '95', name: 'Bạc Liêu' },
  { code: '96', name: 'Cà Mau' },
];

// ─── Tọa độ 63 tỉnh/thành (theo mã tỉnh GSO) ────────────────────────────────
const PROVINCE_COORDS = {
  '01': { lat: 21.0245,  lon: 105.8412 }, // Hà Nội
  '02': { lat: 22.6663,  lon: 106.2522 }, // Hà Giang
  '04': { lat: 22.6650,  lon: 105.7916 }, // Cao Bằng
  '06': { lat: 22.1478,  lon: 106.7696 }, // Bắc Kạn
  '08': { lat: 21.8261,  lon: 107.0831 }, // Tuyên Quang
  '10': { lat: 22.3056,  lon: 104.0050 }, // Lào Cai
  '11': { lat: 21.7168,  lon: 104.9057 }, // Điện Biên
  '12': { lat: 22.1112,  lon: 103.7289 }, // Lai Châu
  '14': { lat: 21.3270,  lon: 103.9188 }, // Sơn La
  '15': { lat: 20.8135,  lon: 104.6559 }, // Yên Bái → hoán đổi code 15
  '17': { lat: 21.5944,  lon: 105.3462 }, // Hòa Bình → hoán đổi code 17
  '19': { lat: 21.5645,  lon: 105.8412 }, // Thái Nguyên
  '20': { lat: 21.7861,  lon: 106.4546 }, // Lạng Sơn
  '22': { lat: 21.2681,  lon: 105.9748 }, // Quảng Ninh
  '24': { lat: 21.2812,  lon: 105.4680 }, // Bắc Giang
  '25': { lat: 21.3482,  lon: 106.1482 }, // Phú Thọ
  '26': { lat: 21.3979,  lon: 105.4209 }, // Vĩnh Phúc
  '27': { lat: 21.1800,  lon: 106.0679 }, // Bắc Ninh
  '30': { lat: 20.9373,  lon: 106.5272 }, // Hải Dương
  '31': { lat: 20.8449,  lon: 106.6881 }, // Hải Phòng
  '33': { lat: 20.5388,  lon: 106.0005 }, // Hưng Yên
  '34': { lat: 20.4341,  lon: 105.9801 }, // Thái Bình
  '35': { lat: 20.2636,  lon: 105.9757 }, // Hà Nam
  '36': { lat: 20.2506,  lon: 105.9745 }, // Nam Định
  '37': { lat: 20.2114,  lon: 106.1620 }, // Ninh Bình
  '38': { lat: 19.8068,  lon: 105.7852 }, // Thanh Hóa
  '40': { lat: 18.6735,  lon: 105.6924 }, // Nghệ An
  '42': { lat: 18.3441,  lon: 105.9056 }, // Hà Tĩnh
  '44': { lat: 17.4691,  lon: 106.5974 }, // Quảng Bình
  '45': { lat: 16.8163,  lon: 107.0998 }, // Quảng Trị
  '46': { lat: 16.4637,  lon: 107.5909 }, // Thừa Thiên Huế
  '48': { lat: 16.0544,  lon: 108.2022 }, // Đà Nẵng
  '49': { lat: 15.5394,  lon: 108.0191 }, // Quảng Nam
  '51': { lat: 15.1214,  lon: 108.8047 }, // Quảng Ngãi
  '52': { lat: 14.1660,  lon: 108.9026 }, // Bình Định
  '54': { lat: 13.0881,  lon: 109.0929 }, // Phú Yên
  '56': { lat: 12.2388,  lon: 109.1967 }, // Khánh Hòa
  '58': { lat: 11.9205,  lon: 108.4420 }, // Ninh Thuận
  '60': { lat: 11.0946,  lon: 108.0720 }, // Bình Thuận
  '62': { lat: 14.3545,  lon: 108.0005 }, // Kon Tum
  '64': { lat: 13.8079,  lon: 108.1094 }, // Gia Lai
  '66': { lat: 12.6700,  lon: 108.0380 }, // Đắk Lắk
  '67': { lat: 12.0046,  lon: 107.6970 }, // Đắk Nông
  '68': { lat: 11.5753,  lon: 108.1429 }, // Lâm Đồng
  '70': { lat: 11.5647,  lon: 107.0151 }, // Bình Phước
  '72': { lat: 11.3254,  lon: 106.4770 }, // Tây Ninh
  '74': { lat: 11.3254,  lon: 106.4770 }, // Bình Dương
  '75': { lat: 11.0686,  lon: 107.1676 }, // Đồng Nai
  '77': { lat: 10.5417,  lon: 107.2431 }, // Bà Rịa - Vũng Tàu
  '79': { lat: 10.8231,  lon: 106.6297 }, // TP Hồ Chí Minh
  '80': { lat: 10.6956,  lon: 106.2431 }, // Long An
  '82': { lat: 10.3534,  lon: 105.8902 }, // Tiền Giang
  '83': { lat: 10.2431,  lon: 106.3752 }, // Bến Tre
  '84': { lat: 9.9340,   lon: 105.9747 }, // Trà Vinh
  '86': { lat: 9.9523,   lon: 106.3421 }, // Vĩnh Long
  '87': { lat: 10.0286,  lon: 105.7658 }, // Đồng Tháp
  '89': { lat: 10.3759,  lon: 105.4347 }, // An Giang
  '91': { lat: 10.0452,  lon: 105.0809 }, // Kiên Giang
  '92': { lat: 10.0452,  lon: 105.7469 }, // Cần Thơ
  '93': { lat: 9.9353,   lon: 105.6861 }, // Hậu Giang
  '94': { lat: 9.6026,   lon: 105.9739 }, // Sóc Trăng
  '95': { lat: 9.2941,   lon: 105.7215 }, // Bạc Liêu
  '96': { lat: 9.1768,   lon: 105.1500 }, // Cà Mau
};

main().catch(err => {
  console.error('\n❌ Lỗi:', err.message);
  process.exit(1);
});
