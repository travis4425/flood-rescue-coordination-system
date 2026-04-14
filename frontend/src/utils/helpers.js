// Status labels in Vietnamese
export const STATUS_LABELS = {
  pending: 'Chờ xử lý',
  verified: 'Đã xác minh',
  assigned: 'Đã phân công',
  in_progress: 'Đang xử lý',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  rejected: 'Từ chối'
};

export const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-blue-100 text-blue-800',
  assigned: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  rejected: 'bg-red-100 text-red-800'
};

// Tracking-status labels (more granular, citizen-facing)
export const TRACKING_STATUS_LABELS = {
  submitted:         'Chờ xử lý',
  received:          'Đã tiếp nhận',
  assigned:          'Đã phân công',
  team_ready:        'Đội sẵn sàng',
  en_route:          'Đang trên đường',
  completed:         'Hoàn thành',
  incident_reported: 'Báo cáo sự cố',
};

export const TRACKING_STATUS_COLORS = {
  submitted:         'bg-yellow-100 text-yellow-800',
  received:          'bg-blue-100 text-blue-800',
  assigned:          'bg-purple-100 text-purple-800',
  team_ready:        'bg-indigo-100 text-indigo-800',
  en_route:          'bg-orange-100 text-orange-800',
  completed:         'bg-green-100 text-green-800',
  incident_reported: 'bg-red-100 text-red-700',
};

export const TRACKING_MARKER_COLORS = {
  submitted:         '#eab308',
  received:          '#3b82f6',
  assigned:          '#8b5cf6',
  team_ready:        '#6366f1',
  en_route:          '#f97316',
  completed:         '#22c55e',
  incident_reported: '#ef4444',
};

// Returns the display label using tracking_status when available, falls back to status
export function getRequestStatusLabel(req) {
  if (!req) return '';
  if (['cancelled', 'rejected'].includes(req.status)) return STATUS_LABELS[req.status] || req.status;
  const ts = req.tracking_status;
  return (ts && TRACKING_STATUS_LABELS[ts]) || STATUS_LABELS[req.status] || req.status;
}

// Returns the badge CSS class for a request
export function getRequestBadgeClass(req) {
  if (!req) return 'bg-gray-100 text-gray-800';
  if (['cancelled', 'rejected'].includes(req.status)) return STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-800';
  const ts = req.tracking_status;
  return (ts && TRACKING_STATUS_COLORS[ts]) || STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-800';
}

// Returns the map marker color for a request
export function getRequestMarkerColor(req) {
  if (!req) return '#3b82f6';
  if (['cancelled', 'rejected'].includes(req.status)) return '#6b7280';
  const ts = req.tracking_status;
  return (ts && TRACKING_MARKER_COLORS[ts]) || '#3b82f6';
}

export const TEAM_STATUS_LABELS = {
  available: 'Sẵn sàng',
  on_mission: 'Đang nhiệm vụ',
  standby: 'Chờ',
  off_duty: 'Nghỉ'
};

export const VEHICLE_TYPES = {
  boat: 'Xuồng/Tàu',
  truck: 'Xe tải',
  car: 'Xe con',
  ambulance: 'Xe cứu thương',
  helicopter: 'Trực thăng',
  other: 'Khác'
};

export const ROLE_LABELS = {
  admin: 'Quản trị viên',
  manager: 'Quản lý',
  warehouse_manager: 'Quản lý kho',
  coordinator: 'Điều phối viên',
  rescue_team: 'Đội cứu hộ'
};

// mssql driver returns datetime as UTC-interpreted Date → strip Z to treat as local time
function parseLocal(dateStr) {
  if (!dateStr) return null;
  return new Date(typeof dateStr === 'string' ? dateStr.replace(/Z$/, '') : dateStr);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = parseLocal(dateStr);
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = parseLocal(dateStr);
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
}

export function getStatusBadgeClass(status) {
  return STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
}
