import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { notificationAPI } from '../services/api';
import { formatDate } from '../utils/helpers';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data } = await notificationAPI.getMine({ limit: 50 });
      setNotifications(data?.data || []);
    } catch { /* silent */ }
    setLoading(false);
  }

  async function markAllRead() {
    try {
      await notificationAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* silent */ }
  }

  async function handleDelete(id) {
    try {
      await notificationAPI.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch { /* silent */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--eoc-text-primary)' }}>
          <Bell size={22} style={{ color: 'var(--eoc-text-muted)' }} /> {t('notifications_page.title')}
        </h1>
        <div className="flex gap-2">
          <button onClick={markAllRead} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition" style={{ background: 'var(--eoc-accent)', color: '#fff' }}>
            <CheckCheck size={14} /> {t('notifications_page.mark_all')}
          </button>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition" style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)', color: 'var(--eoc-text-muted)' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="rounded-xl border divide-y" style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)' }}>
        {loading ? (
          <div className="p-10 text-center" style={{ color: 'var(--eoc-text-muted)' }}>{t('notifications_page.loading')}</div>
        ) : notifications.length === 0 ? (
          <div className="p-10 text-center" style={{ color: 'var(--eoc-text-muted)' }}>{t('notifications_page.empty')}</div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className="px-6 py-4 flex items-start gap-4 transition hover:opacity-90"
              style={{ background: !n.is_read ? 'rgba(14,165,233,0.05)' : 'transparent' }}>
              <div className="mt-1 w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: !n.is_read ? 'var(--eoc-accent)' : 'var(--eoc-border)' }} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm" style={{ color: 'var(--eoc-text-primary)' }}>{n.title}</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--eoc-text-secondary)' }}>{n.message}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--eoc-text-muted)' }}>{formatDate(n.created_at)}</p>
              </div>
              <button onClick={() => handleDelete(n.id)} className="p-1.5 transition shrink-0 hover:text-red-500"
                style={{ color: 'var(--eoc-text-muted)' }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
