import React from 'react';

const DISASTER_CONFIG = {
  flood:      { icon: '🌊', labelVi: 'Lũ lụt',          labelEn: 'Flood',                color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  typhoon:    { icon: '🌀', labelVi: 'Bão',              labelEn: 'Typhoon',              color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  landslide:  { icon: '⛰️', labelVi: 'Sạt lở đất',     labelEn: 'Landslide',            color: '#92400e', bg: 'rgba(146,64,14,0.2)' },
  drought:    { icon: '☀️', labelVi: 'Hạn hán',         labelEn: 'Drought',              color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  earthquake: { icon: '🔴', labelVi: 'Động đất',        labelEn: 'Earthquake',           color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  wildfire:   { icon: '🔥', labelVi: 'Cháy rừng',       labelEn: 'Wildfire',             color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  saltwater:  { icon: '🧂', labelVi: 'Xâm nhập mặn',   labelEn: 'Saltwater Intrusion',  color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  tsunami:    { icon: '🌊', labelVi: 'Sóng thần',       labelEn: 'Tsunami',              color: '#1d4ed8', bg: 'rgba(29,78,216,0.15)' },
};

export default function DisasterTypeBadge({ code, lang = 'vi', size = 'md', showLabel = true, className = '' }) {
  const cfg = DISASTER_CONFIG[code] || { icon: '⚠️', labelVi: code, labelEn: code, color: '#6b7280', bg: 'rgba(107,114,128,0.15)' };
  const label = lang === 'en' ? cfg.labelEn : cfg.labelVi;
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs';
  const iconSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${textSize} ${className}`}
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}
    >
      <span className={iconSize}>{cfg.icon}</span>
      {showLabel && label}
    </span>
  );
}

export { DISASTER_CONFIG };
