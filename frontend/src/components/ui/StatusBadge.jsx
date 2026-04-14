import React from 'react';

const CONFIG = {
  // Request statuses
  pending:     { label: 'Chờ xử lý',    bg: 'bg-yellow-500/20', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  verified:    { label: 'Đã xác minh',  bg: 'bg-blue-500/20',   text: 'text-blue-300',   dot: 'bg-blue-400' },
  assigned:    { label: 'Đã phân công', bg: 'bg-purple-500/20', text: 'text-purple-300', dot: 'bg-purple-400' },
  in_progress: { label: 'Đang xử lý',  bg: 'bg-orange-500/20', text: 'text-orange-300', dot: 'bg-orange-400' },
  completed:   { label: 'Hoàn thành',   bg: 'bg-green-500/20',  text: 'text-green-300',  dot: 'bg-green-400' },
  cancelled:   { label: 'Đã hủy',       bg: 'bg-gray-500/20',   text: 'text-gray-400',   dot: 'bg-gray-500' },
  rejected:    { label: 'Từ chối',      bg: 'bg-red-500/20',    text: 'text-red-300',    dot: 'bg-red-400' },
  // Mission statuses
  active:      { label: 'Đang hoạt động', bg: 'bg-green-500/20',  text: 'text-green-300',  dot: 'bg-green-400' },
  aborted:     { label: 'Bị hủy',         bg: 'bg-red-500/20',    text: 'text-red-300',    dot: 'bg-red-400' },
  failed:      { label: 'Thất bại',       bg: 'bg-red-500/20',    text: 'text-red-300',    dot: 'bg-red-400' },
  // Disaster event statuses
  monitoring:  { label: 'Theo dõi',    bg: 'bg-cyan-500/20',   text: 'text-cyan-300',   dot: 'bg-cyan-400' },
  warning:     { label: 'Cảnh báo',    bg: 'bg-amber-500/20',  text: 'text-amber-300',  dot: 'bg-amber-400' },
  recovery:    { label: 'Phục hồi',    bg: 'bg-teal-500/20',   text: 'text-teal-300',   dot: 'bg-teal-400' },
  closed:      { label: 'Đã đóng',     bg: 'bg-gray-500/20',   text: 'text-gray-400',   dot: 'bg-gray-500' },
};

export default function StatusBadge({ status, pulse = false, className = '' }) {
  const cfg = CONFIG[status] || { label: status, bg: 'bg-gray-500/20', text: 'text-gray-400', dot: 'bg-gray-500' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${pulse ? 'eoc-pulse' : ''}`} />
      {cfg.label}
    </span>
  );
}
