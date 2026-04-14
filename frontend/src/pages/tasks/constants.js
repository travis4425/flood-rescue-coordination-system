export const RESCUE_CATEGORY = {
  cuu_nan: { label: 'Cứu Nạn', cls: 'bg-red-100 text-red-700 border border-red-200' },
  cuu_tro: { label: 'Cứu Trợ', cls: 'bg-green-100 text-green-700 border border-green-200' },
  cuu_ho:  { label: 'Cứu Hộ',  cls: 'bg-purple-100 text-purple-700 border border-purple-200' },
};

export const TASK_STATUS = {
  in_progress: { label: 'Đang thực hiện', cls: 'bg-blue-100 text-blue-700' },
  completed:   { label: 'Hoàn thành', cls: 'bg-green-100 text-green-700' },
  partial:     { label: 'Hoàn thành một phần', cls: 'bg-yellow-100 text-yellow-700' },
  cancelled:   { label: 'Đã hủy', cls: 'bg-red-100 text-red-600' },
};

export const URGENCY_CLS = {
  low:      'bg-gray-100 text-gray-600',
  medium:   'bg-yellow-100 text-yellow-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export const REPORT_TYPE_LABEL = {
  stalled:       'Bị chậm trễ',
  unrescuable:   'Không thể cứu hộ',
  need_support:  'Cần hỗ trợ thêm',
};
