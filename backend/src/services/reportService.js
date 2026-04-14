const ExcelJS = require('exceljs');
const { query } = require('../config/database');

const HEADER_FILL = {
  type: 'pattern', pattern: 'solid',
  fgColor: { argb: 'FF0C1E3A' },
};
const HEADER_FONT = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
const ALT_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
const BORDER = {
  top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
};

function applyHeader(sheet, columns) {
  sheet.columns = columns;
  const headerRow = sheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = BORDER;
  });
  headerRow.height = 30;
}

function applyDataRows(sheet) {
  sheet.eachRow((row, rowIndex) => {
    if (rowIndex === 1) return;
    if (rowIndex % 2 === 0) {
      row.eachCell(cell => {
        cell.fill = ALT_FILL;
        cell.border = BORDER;
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
    } else {
      row.eachCell(cell => {
        cell.border = BORDER;
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
    }
  });
}

function autoWidth(sheet) {
  sheet.columns.forEach(col => {
    let max = col.header ? col.header.length : 10;
    col.eachCell({ includeEmpty: false }, cell => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 40);
  });
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

// ── Requests export ─────────────────────────────────────────────────────────

const STATUS_LABEL_REQ = {
  pending: 'Chờ xử lý', verified: 'Đã xác nhận', assigned: 'Đã phân công',
  in_progress: 'Đang xử lý', completed: 'Hoàn thành', rejected: 'Từ chối',
  cancelled: 'Đã hủy',
};

async function exportRequestsToExcel(filters = {}) {
  const { from, to, province_id, status } = filters;
  const params = [];
  const conditions = ['1=1'];

  if (from) { params.push(new Date(from)); conditions.push(`rr.created_at >= $${params.length}`); }
  if (to)   { params.push(new Date(to + 'T23:59:59')); conditions.push(`rr.created_at <= $${params.length}`); }
  if (province_id) { params.push(parseInt(province_id)); conditions.push(`rr.province_id = $${params.length}`); }
  if (status)      { params.push(status); conditions.push(`rr.status = $${params.length}`); }

  const where = 'WHERE ' + conditions.join(' AND ');

  const result = await query(`
    SELECT
      rr.tracking_code,
      rr.citizen_name,
      rr.citizen_phone,
      rr.address,
      COALESCE(p.name, rr.geo_province_name) as province_name,
      COALESCE(d.name, rr.geo_district_name) as district_name,
      it.name as incident_type,
      it.rescue_category,
      ul.name as urgency_level,
      rr.victim_count,
      rr.rescued_count,
      rr.status,
      rt.name as team_name,
      rr.created_at,
      rr.completed_at
    FROM rescue_requests rr
    LEFT JOIN incident_types it ON rr.incident_type_id = it.id
    LEFT JOIN urgency_levels ul ON rr.urgency_level_id = ul.id
    LEFT JOIN rescue_teams rt ON rr.assigned_team_id = rt.id
    LEFT JOIN provinces p ON rr.province_id = p.id
    LEFT JOIN districts d ON rr.district_id = d.id
    ${where}
    ORDER BY rr.created_at DESC
  `, params);

  const rows = result.rows;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hệ thống Cứu hộ Lũ lụt';
  wb.created = new Date();

  const sheet = wb.addWorksheet('Yêu cầu cứu hộ', { views: [{ state: 'frozen', ySplit: 1 }] });

  applyHeader(sheet, [
    { header: 'Mã theo dõi',     key: 'tracking_code',  width: 18 },
    { header: 'Họ tên',          key: 'citizen_name',   width: 20 },
    { header: 'Số điện thoại',   key: 'citizen_phone',  width: 16 },
    { header: 'Địa chỉ',         key: 'address',        width: 35 },
    { header: 'Tỉnh/Thành',      key: 'province_name',  width: 18 },
    { header: 'Quận/Huyện',      key: 'district_name',  width: 18 },
    { header: 'Loại sự cố',      key: 'incident_type',  width: 20 },
    { header: 'Danh mục',        key: 'rescue_category', width: 14 },
    { header: 'Mức độ khẩn',     key: 'urgency_level',  width: 14 },
    { header: 'Số nạn nhân',     key: 'victim_count',   width: 14 },
    { header: 'Đã cứu',          key: 'rescued_count',  width: 12 },
    { header: 'Trạng thái',      key: 'status',         width: 16 },
    { header: 'Đội phụ trách',   key: 'team_name',      width: 20 },
    { header: 'Ngày tạo',        key: 'created_at',     width: 18 },
    { header: 'Hoàn thành lúc',  key: 'completed_at',   width: 18 },
  ]);

  const CATEGORY_LABEL = { cuu_nan: 'Cứu Nạn', cuu_tro: 'Cứu Trợ', cuu_ho: 'Cứu Hộ' };

  rows.forEach(r => {
    sheet.addRow({
      ...r,
      status: STATUS_LABEL_REQ[r.status] || r.status,
      rescue_category: CATEGORY_LABEL[r.rescue_category] || r.rescue_category || '',
      created_at: fmtDate(r.created_at),
      completed_at: fmtDate(r.completed_at),
    });
  });

  applyDataRows(sheet);
  autoWidth(sheet);

  // Summary sheet
  const sumSheet = wb.addWorksheet('Tổng hợp');
  sumSheet.addRow(['Báo cáo danh sách yêu cầu cứu hộ']);
  sumSheet.addRow(['Xuất lúc:', fmtDate(new Date())]);
  sumSheet.addRow(['Tổng số:', rows.length]);
  sumSheet.addRow(['Hoàn thành:', rows.filter(r => r.status === 'completed').length]);
  if (from || to) sumSheet.addRow(['Khoảng thời gian:', `${from || '—'} → ${to || '—'}`]);
  sumSheet.getRow(1).getCell(1).font = { bold: true, size: 13, color: { argb: 'FF0C1E3A' } };

  return wb.xlsx.writeBuffer();
}

// ── Missions export ──────────────────────────────────────────────────────────

const STATUS_LABEL_MISSION = {
  assigned: 'Đã giao', accepted: 'Đã nhận', en_route: 'Đang đi',
  on_scene: 'Tại hiện trường', completed: 'Hoàn thành',
  aborted: 'Đã hủy', failed: 'Không thể cứu',
};

async function exportMissionsToExcel(filters = {}) {
  const { from, to, province_id, status, team_id } = filters;
  const params = [];
  const conditions = ['1=1'];

  if (from) { params.push(new Date(from)); conditions.push(`m.created_at >= $${params.length}`); }
  if (to)   { params.push(new Date(to + 'T23:59:59')); conditions.push(`m.created_at <= $${params.length}`); }
  if (status)  { params.push(status); conditions.push(`m.status = $${params.length}`); }
  if (team_id) { params.push(parseInt(team_id)); conditions.push(`m.team_id = $${params.length}`); }
  if (province_id) { params.push(parseInt(province_id)); conditions.push(`rr.province_id = $${params.length}`); }

  const where = 'WHERE ' + conditions.join(' AND ');

  const result = await query(`
    SELECT
      rr.tracking_code,
      COALESCE(p.name, rr.geo_province_name) as province_name,
      rr.address,
      rr.victim_count,
      rr.rescued_count,
      it.name as incident_type,
      rt.name as team_name,
      m.status,
      tg.name as task_name,
      m.created_at,
      m.completed_at,
      m.notes
    FROM missions m
    JOIN rescue_requests rr ON m.request_id = rr.id
    LEFT JOIN incident_types it ON rr.incident_type_id = it.id
    LEFT JOIN rescue_teams rt ON m.team_id = rt.id
    LEFT JOIN provinces p ON rr.province_id = p.id
    LEFT JOIN task_groups tg ON m.task_group_id = tg.id
    ${where}
    ORDER BY m.created_at DESC
  `, params);

  const rows = result.rows;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hệ thống Cứu hộ Lũ lụt';
  wb.created = new Date();

  const sheet = wb.addWorksheet('Nhiệm vụ cứu hộ', { views: [{ state: 'frozen', ySplit: 1 }] });

  applyHeader(sheet, [
    { header: 'Mã yêu cầu',      key: 'tracking_code',  width: 18 },
    { header: 'Tỉnh/Thành',      key: 'province_name',  width: 18 },
    { header: 'Địa chỉ',         key: 'address',        width: 35 },
    { header: 'Loại sự cố',      key: 'incident_type',  width: 20 },
    { header: 'Số nạn nhân',     key: 'victim_count',   width: 14 },
    { header: 'Đã cứu',          key: 'rescued_count',  width: 12 },
    { header: 'Đội thực hiện',   key: 'team_name',      width: 22 },
    { header: 'Thuộc Task',      key: 'task_name',      width: 25 },
    { header: 'Trạng thái',      key: 'status',         width: 18 },
    { header: 'Ngày giao',       key: 'created_at',     width: 18 },
    { header: 'Hoàn thành lúc',  key: 'completed_at',   width: 18 },
    { header: 'Ghi chú',         key: 'notes',          width: 30 },
  ]);

  rows.forEach(r => {
    sheet.addRow({
      ...r,
      status: STATUS_LABEL_MISSION[r.status] || r.status,
      created_at: fmtDate(r.created_at),
      completed_at: fmtDate(r.completed_at),
    });
  });

  applyDataRows(sheet);
  autoWidth(sheet);

  const sumSheet = wb.addWorksheet('Tổng hợp');
  sumSheet.addRow(['Báo cáo nhiệm vụ cứu hộ']);
  sumSheet.addRow(['Xuất lúc:', fmtDate(new Date())]);
  sumSheet.addRow(['Tổng số:', rows.length]);
  const completed = rows.filter(r => r.status === 'completed').length;
  sumSheet.addRow(['Hoàn thành:', completed]);
  sumSheet.addRow(['Tỉ lệ:', rows.length ? `${Math.round((completed / rows.length) * 100)}%` : '—']);
  sumSheet.getRow(1).getCell(1).font = { bold: true, size: 13, color: { argb: 'FF0C1E3A' } };

  return wb.xlsx.writeBuffer();
}

// ── Resources export ─────────────────────────────────────────────────────────

async function exportResourcesToExcel(filters = {}) {
  const { province_id, warehouse_id } = filters;
  const invParams = [];
  const invConds = ["w.status = 'active'"];

  if (province_id)  { invParams.push(parseInt(province_id)); invConds.push(`w.province_id = $${invParams.length}`); }
  if (warehouse_id) { invParams.push(parseInt(warehouse_id)); invConds.push(`w.id = $${invParams.length}`); }

  const invWhere = 'WHERE ' + invConds.join(' AND ');

  const [invResult, vehResult] = await Promise.all([
    query(`
      SELECT
        w.name as warehouse_name,
        p.name as province_name,
        ri.name as item_name,
        ri.unit,
        ri.category,
        inv.quantity,
        inv.updated_at as last_updated
      FROM relief_inventory inv
      JOIN warehouses w ON inv.warehouse_id = w.id
      JOIN relief_items ri ON inv.item_id = ri.id
      LEFT JOIN provinces p ON w.province_id = p.id
      ${invWhere}
      ORDER BY w.name, ri.name
    `, invParams),
    query(`
      SELECT
        v.name,
        v.plate_number,
        v.type,
        v.status,
        w.name as warehouse_name,
        p.name as province_name
      FROM vehicles v
      LEFT JOIN warehouses w ON v.warehouse_id = w.id
      LEFT JOIN provinces p ON v.province_id = p.id
      ORDER BY v.status, v.name
    `, []),
  ]);

  const invRows = invResult.rows;
  const vehRows = vehResult.rows;

  const VEHICLE_TYPE = { boat: 'Xuồng', truck: 'Xe tải', car: 'Xe con', ambulance: 'Xe cứu thương', helicopter: 'Trực thăng', other: 'Khác' };
  const VEH_STATUS   = { available: 'Sẵn sàng', in_use: 'Đang dùng', in_transit: 'Đang vận chuyển', maintenance: 'Bảo dưỡng', retired: 'Ngừng hoạt động', lost: 'Mất' };

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hệ thống Cứu hộ Lũ lụt';
  wb.created = new Date();

  // Sheet 1: Inventory
  const invSheet = wb.addWorksheet('Tồn kho vật tư', { views: [{ state: 'frozen', ySplit: 1 }] });
  applyHeader(invSheet, [
    { header: 'Kho',         key: 'warehouse_name', width: 25 },
    { header: 'Tỉnh/Thành', key: 'province_name',  width: 18 },
    { header: 'Vật phẩm',   key: 'item_name',      width: 25 },
    { header: 'Đơn vị',     key: 'unit',           width: 12 },
    { header: 'Danh mục',   key: 'category',       width: 15 },
    { header: 'Số lượng',   key: 'quantity',       width: 12 },
    { header: 'Cập nhật',   key: 'last_updated',   width: 18 },
  ]);
  invRows.forEach(r => invSheet.addRow({ ...r, last_updated: fmtDate(r.last_updated) }));
  applyDataRows(invSheet);
  autoWidth(invSheet);

  // Sheet 2: Vehicles
  const vehSheet = wb.addWorksheet('Phương tiện', { views: [{ state: 'frozen', ySplit: 1 }] });
  applyHeader(vehSheet, [
    { header: 'Tên xe',      key: 'name',           width: 22 },
    { header: 'Biển số',     key: 'plate_number',   width: 16 },
    { header: 'Loại',        key: 'type',           width: 18 },
    { header: 'Trạng thái',  key: 'status',         width: 18 },
    { header: 'Kho',         key: 'warehouse_name', width: 25 },
    { header: 'Tỉnh/Thành', key: 'province_name',  width: 18 },
  ]);
  vehRows.forEach(r => {
    vehSheet.addRow({
      ...r,
      type: VEHICLE_TYPE[r.type] || r.type,
      status: VEH_STATUS[r.status] || r.status,
    });
  });
  applyDataRows(vehSheet);
  autoWidth(vehSheet);

  // Summary sheet
  const sumSheet = wb.addWorksheet('Tổng hợp');
  sumSheet.addRow(['Báo cáo tài nguyên cứu hộ']);
  sumSheet.addRow(['Xuất lúc:', fmtDate(new Date())]);
  sumSheet.addRow(['Tổng vật phẩm (dòng):', invRows.length]);
  sumSheet.addRow(['Tổng phương tiện:', vehRows.length]);
  sumSheet.addRow(['Phương tiện sẵn sàng:', vehRows.filter(v => v.status === 'available').length]);
  sumSheet.getRow(1).getCell(1).font = { bold: true, size: 13, color: { argb: 'FF0C1E3A' } };

  return wb.xlsx.writeBuffer();
}

module.exports = { exportRequestsToExcel, exportMissionsToExcel, exportResourcesToExcel };
