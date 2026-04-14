import React, { useState, useCallback, createContext, useContext } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = {
  success: { Icon: CheckCircle,   color: 'text-green-400',  bar: 'bg-green-500' },
  error:   { Icon: AlertCircle,   color: 'text-red-400',    bar: 'bg-red-500' },
  warning: { Icon: AlertTriangle, color: 'text-amber-400',  bar: 'bg-amber-500' },
  info:    { Icon: Info,          color: 'text-blue-400',   bar: 'bg-blue-500' },
};

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(t => {
          const cfg = ICONS[t.type] || ICONS.info;
          const { Icon } = cfg;
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl border"
              style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)' }}
            >
              <div className={`shrink-0 mt-0.5 ${cfg.color}`}><Icon size={18} /></div>
              <p className="flex-1 text-sm" style={{ color: 'var(--eoc-text-primary)' }}>{t.message}</p>
              <button onClick={() => removeToast(t.id)} className="shrink-0 text-gray-500 hover:text-gray-300">
                <X size={14} />
              </button>
              <div className={`absolute bottom-0 left-0 h-0.5 ${cfg.bar} rounded-b-xl`} style={{ width: '100%', animation: 'shrink 5s linear forwards' }} />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}
