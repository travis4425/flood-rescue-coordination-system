import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const VARIANTS = {
  danger:  { icon: AlertTriangle, iconColor: 'text-red-400',    btnClass: 'bg-red-600 hover:bg-red-700',    title: 'Xác nhận xóa' },
  warning: { icon: AlertCircle,   iconColor: 'text-amber-400',  btnClass: 'bg-amber-600 hover:bg-amber-700', title: 'Xác nhận' },
  info:    { icon: Info,          iconColor: 'text-blue-400',   btnClass: 'bg-blue-600 hover:bg-blue-700',  title: 'Xác nhận' },
};

export default function ConfirmDialog({
  open, onClose, onConfirm,
  title, message,
  variant = 'danger',
  confirmLabel = 'Xác nhận',
  cancelLabel  = 'Hủy',
  countdown = variant === 'danger' ? 5 : 0,
}) {
  const [seconds, setSeconds] = useState(countdown);
  const cfg = VARIANTS[variant] || VARIANTS.info;
  const Icon = cfg.icon;

  useEffect(() => {
    if (!open) { setSeconds(countdown); return; }
    if (countdown <= 0) return;
    setSeconds(countdown);
    const id = setInterval(() => setSeconds(s => { if (s <= 1) { clearInterval(id); return 0; } return s - 1; }), 1000);
    return () => clearInterval(id);
  }, [open, countdown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border shadow-2xl p-6"
        style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-300">
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl bg-white/5 ${cfg.iconColor}`}>
            <Icon size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-base">{title || cfg.title}</h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--eoc-text-secondary)' }}>{message}</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition"
            style={{ background: 'var(--eoc-bg-tertiary)', color: 'var(--eoc-text-secondary)' }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            disabled={seconds > 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-50 ${cfg.btnClass}`}
          >
            {seconds > 0 ? `${confirmLabel} (${seconds}s)` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
