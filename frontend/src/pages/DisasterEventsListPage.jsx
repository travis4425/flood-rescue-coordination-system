import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus, RefreshCw, Search, Filter, AlertTriangle,
  Loader2, ChevronRight, MapPin, Clock, Users
} from 'lucide-react';
import { disasterEventAPI } from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import DisasterTypeBadge from '../components/ui/DisasterTypeBadge';
import LiveTimer from '../components/ui/LiveTimer';
import useAuthStore from '../store/authStore';

const STATUS_OPTIONS = ['', 'monitoring', 'warning', 'active', 'recovery', 'closed'];
const SEVERITY_LABELS = { 1:'Nhẹ', 2:'Trung bình', 3:'Nghiêm trọng', 4:'Rất nghiêm trọng', 5:'Thảm họa' };
const SEVERITY_COLORS = { 1:'#22c55e', 2:'#84cc16', 3:'#f59e0b', 4:'#f97316', 5:'#ef4444' };

function SeverityDot({ level }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium"
      style={{ color: SEVERITY_COLORS[level] }}>
      <span className="w-2 h-2 rounded-full inline-block" style={{ background: SEVERITY_COLORS[level] }} />
      {SEVERITY_LABELS[level]}
    </span>
  );
}

export default function DisasterEventsListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const lang = i18n.language;

  const [events, setEvents] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 15;

  const canCreate = ['admin', 'manager'].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [evRes, tyRes] = await Promise.allSettled([
        disasterEventAPI.getAll({
          status: filterStatus || undefined,
          type_code: filterType || undefined,
          page,
          limit: PAGE_SIZE,
        }),
        disasterEventAPI.getTypes(),
      ]);
      if (evRes.status === 'fulfilled') {
        const d = evRes.value.data;
        setEvents(Array.isArray(d) ? d : (d?.events || []));
        setTotal(d?.total || (Array.isArray(d) ? d.length : 0));
      }
      if (tyRes.status === 'fulfilled') setTypes(tyRes.value.data || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [filterStatus, filterType, page]);

  useEffect(() => { load(); }, [load]);

  const filtered = search.trim()
    ? events.filter(e =>
        e.name?.toLowerCase().includes(search.toLowerCase()) ||
        e.name_en?.toLowerCase().includes(search.toLowerCase()) ||
        e.type_name_vi?.toLowerCase().includes(search.toLowerCase())
      )
    : events;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--eoc-text-primary)' }}>
            {t('disaster_page.title')}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--eoc-text-muted)' }}>
            {total} {t('disaster_page.count')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg transition hover:opacity-70"
            style={{ color: 'var(--eoc-text-muted)', background: 'var(--eoc-bg-elevated)', border: '1px solid var(--eoc-border)' }}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          {canCreate && (
            <button
              onClick={() => navigate('/dashboard/disasters/new')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition"
              style={{ background: 'var(--eoc-accent)', color: '#fff' }}
            >
              <Plus size={15} /> {t('disaster_page.create')}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border"
        style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)' }}>
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border"
          style={{ borderColor: 'var(--eoc-border)', background: 'var(--eoc-bg-primary)' }}>
          <Search size={14} style={{ color: 'var(--eoc-text-muted)' }} />
          <input
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--eoc-text-primary)' }}
            placeholder={t('disaster_page.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-lg border text-sm outline-none"
          style={{ background: 'var(--eoc-bg-primary)', borderColor: 'var(--eoc-border)', color: 'var(--eoc-text-secondary)' }}
        >
          <option value="">{t('disaster_page.all_status')}</option>
          {STATUS_OPTIONS.filter(Boolean).map(s => (
            <option key={s} value={s}>{t(`status.${s}`)}</option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={e => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-lg border text-sm outline-none"
          style={{ background: 'var(--eoc-bg-primary)', borderColor: 'var(--eoc-border)', color: 'var(--eoc-text-secondary)' }}
        >
          <option value="">{t('disaster_page.all_type')}</option>
          {types.map(ty => (
            <option key={ty.code} value={ty.code}>
              {lang === 'en' ? ty.name_en : ty.name_vi}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--eoc-accent)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--eoc-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--eoc-text-muted)' }}>
              {search ? 'Không tìm thấy sự kiện phù hợp' : 'Chưa có sự kiện thiên tai nào'}
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2.5 text-xs font-semibold border-b"
              style={{ color: 'var(--eoc-text-muted)', borderColor: 'var(--eoc-border)', background: 'var(--eoc-bg-primary)' }}>
              <span>{t('disaster_page.event')}</span>
              <span>{t('disaster_page.severity')}</span>
              <span>{t('disaster_page.status_col')}</span>
              <span>{t('disaster_page.stats')}</span>
              <span />
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--eoc-border)' }}>
              {filtered.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => navigate(`/dashboard/disasters/${ev.id}`)}
                  className="w-full grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3.5 items-center text-left transition hover:opacity-80"
                  style={{ background: 'transparent' }}
                >
                  {/* Name + type */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <DisasterTypeBadge code={ev.type_code} lang={lang} size="sm" />
                    </div>
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--eoc-text-primary)' }}>
                      {lang === 'en' && ev.name_en ? ev.name_en : ev.name}
                    </p>
                    {ev.center_latitude && (
                      <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--eoc-text-muted)' }}>
                        <MapPin size={10} />
                        {ev.center_latitude.toFixed(3)}, {ev.center_longitude.toFixed(3)}
                      </p>
                    )}
                  </div>

                  {/* Severity */}
                  <div>
                    <SeverityDot level={ev.severity} />
                  </div>

                  {/* Status */}
                  <div>
                    <StatusBadge status={ev.status} pulse={ev.status === 'active'} />
                    {ev.started_at && (
                      <div className="mt-1 flex items-center gap-1 text-[10px]" style={{ color: 'var(--eoc-text-muted)' }}>
                        <Clock size={9} />
                        <LiveTimer startTime={ev.started_at} warnAfterMinutes={120} />
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px]" style={{ color: 'var(--eoc-text-muted)' }}>
                      <span className="font-semibold" style={{ color: 'var(--eoc-accent)' }}>{ev.request_count || 0}</span> {t('disaster_page.requests')}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--eoc-text-muted)' }}>
                      <span className="font-semibold" style={{ color: 'var(--eoc-text-primary)' }}>{ev.active_missions || 0}</span> {t('disaster_page.missions')}
                    </span>
                  </div>

                  {/* Arrow */}
                  <ChevronRight size={16} style={{ color: 'var(--eoc-text-muted)' }} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm" style={{ color: 'var(--eoc-text-muted)' }}>
          <span>Trang {page} / {Math.ceil(total / PAGE_SIZE)}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg border transition disabled:opacity-40"
              style={{ borderColor: 'var(--eoc-border)', background: 'var(--eoc-bg-elevated)', color: 'var(--eoc-text-secondary)' }}
            >
              Trước
            </button>
            <button
              disabled={page >= Math.ceil(total / PAGE_SIZE)}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg border transition disabled:opacity-40"
              style={{ borderColor: 'var(--eoc-border)', background: 'var(--eoc-bg-elevated)', color: 'var(--eoc-text-secondary)' }}
            >
              Tiếp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
