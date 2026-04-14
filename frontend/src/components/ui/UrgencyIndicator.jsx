import React from 'react';

const LEVELS = {
  5: { label: 'Cực kỳ khẩn cấp', color: '#ef4444', bg: 'bg-red-500/20',    text: 'text-red-300',    pulse: true },
  4: { label: 'Rất khẩn cấp',    color: '#f97316', bg: 'bg-orange-500/20', text: 'text-orange-300', pulse: false },
  3: { label: 'Khẩn cấp',        color: '#f59e0b', bg: 'bg-amber-500/20',  text: 'text-amber-300',  pulse: false },
  2: { label: 'Trung bình',       color: '#3b82f6', bg: 'bg-blue-500/20',   text: 'text-blue-300',   pulse: false },
  1: { label: 'Thấp',            color: '#22c55e', bg: 'bg-green-500/20',  text: 'text-green-300',  pulse: false },
};

export default function UrgencyIndicator({ level = 1, showLabel = true, size = 'md' }) {
  const cfg = LEVELS[level] || LEVELS[1];
  const dotSize = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`${dotSize} rounded-full ${cfg.pulse ? 'eoc-pulse' : ''}`} style={{ background: cfg.color }} />
      {showLabel && cfg.label}
      {!showLabel && `Mức ${level}`}
    </span>
  );
}
