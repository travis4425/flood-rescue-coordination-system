import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, MapPin, Clock, Users, Activity,
  ChevronLeft, RefreshCw, Edit2, CheckCircle, Loader2
} from 'lucide-react';
import { disasterEventAPI } from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import DisasterTypeBadge from '../components/ui/DisasterTypeBadge';
import LiveTimer from '../components/ui/LiveTimer';
import UrgencyIndicator from '../components/ui/UrgencyIndicator';

const STATUS_FLOW = ['monitoring','warning','active','recovery','closed'];

function SeverityBar({ level }) {
  const colors = { 1:'#22c55e', 2:'#84cc16', 3:'#f59e0b', 4:'#f97316', 5:'#ef4444' };
  const labels  = { 1:'Nhẹ', 2:'Trung bình', 3:'Nghiêm trọng', 4:'Rất nghiêm trọng', 5:'Thảm họa' };
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="w-5 h-2 rounded-sm transition-all"
            style={{ background: i <= level ? colors[level] : 'rgba(255,255,255,0.1)' }} />
        ))}
      </div>
      <span className="text-xs font-medium" style={{ color: colors[level] }}>
        {labels[level]}
      </span>
    </div>
  );
}

export default function DisasterEventPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const isNew = id === 'new';

  useEffect(() => {
    if (isNew) { setLoading(false); return; }
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [evRes, tlRes] = await Promise.all([
        disasterEventAPI.getById(id),
        disasterEventAPI.getTimeline(id),
      ]);
      setEvent(evRes.data);
      setTimeline(tlRes.data || []);
    } catch {
      navigate('/dashboard/disasters');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus) {
    if (!event || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await disasterEventAPI.updateStatus(event.id, newStatus);
      setEvent(prev => ({ ...prev, ...res.data }));
    } catch { /* silent */ }
    finally { setUpdatingStatus(false); load(); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--eoc-accent)' }} />
    </div>
  );

  if (!event && !isNew) return null;

  const lang = i18n.language;
  const typeName = lang === 'en' ? (event?.type_name_en || event?.type_name_vi) : event?.type_name_vi;
  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(event?.status) + 1];

  return (
    <div className="space-y-4">
      {/* Back */}
      <button onClick={() => navigate('/dashboard/disasters')} className="flex items-center gap-1.5 text-sm transition hover:opacity-70" style={{ color: 'var(--eoc-text-secondary)' }}>
        <ChevronLeft size={16} /> {t('disaster_page.back')}
      </button>

      {/* Event header card */}
      <div className="rounded-2xl border p-5" style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)' }}>
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-2">
              <DisasterTypeBadge code={event.type_code} lang={lang} size="lg" />
              <StatusBadge status={event.status} pulse={event.status === 'active'} />
            </div>
            <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--eoc-text-primary)' }}>
              {lang === 'en' && event.name_en ? event.name_en : event.name}
            </h1>
            {event.description && (
              <p className="text-sm" style={{ color: 'var(--eoc-text-secondary)' }}>{event.description}</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <SeverityBar level={event.severity} />
            {event.started_at && (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--eoc-text-muted)' }}>
                <Clock size={12} />
                <span>Bắt đầu:</span>
                <LiveTimer startTime={event.started_at} warnAfterMinutes={60} />
              </div>
            )}
            {nextStatus && event.status !== 'closed' && (
              <button
                onClick={() => handleStatusChange(nextStatus)}
                disabled={updatingStatus}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                style={{ background: 'var(--eoc-accent)', color: '#fff' }}
              >
                {updatingStatus ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                Chuyển: <StatusBadge status={nextStatus} />
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--eoc-border)' }}>
          {[
            { label: 'Yêu cầu cứu trợ', value: event.request_count || 0,          icon: AlertTriangle },
            { label: 'Đang chờ',         value: event.active_requests || 0,         icon: Activity },
            { label: 'Hoàn thành',       value: event.completed_requests || 0,      icon: CheckCircle },
            { label: 'Nhiệm vụ active',  value: event.active_missions || 0,         icon: Users },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--eoc-accent)' }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--eoc-text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--eoc-border)' }}>
        {[
          { key: 'overview', label: t('disaster_page.overview') },
          { key: 'phases',   label: t('disaster_page.phases') },
          { key: 'timeline', label: t('disaster_page.timeline') },
        ].map(tab_ => (
          <button
            key={tab_.key}
            onClick={() => setTab(tab_.key)}
            className="px-4 py-2 text-sm font-medium transition border-b-2 -mb-px"
            style={{
              borderColor: tab === tab_.key ? 'var(--eoc-accent)' : 'transparent',
              color: tab === tab_.key ? 'var(--eoc-accent)' : 'var(--eoc-text-muted)',
            }}
          >
            {tab_.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border p-4" style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--eoc-text-primary)' }}>{t('disaster_page.geo_info')}</h3>
            {event.center_latitude ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2" style={{ color: 'var(--eoc-text-secondary)' }}>
                  <MapPin size={14} style={{ color: 'var(--eoc-accent)' }} />
                  <span>Tọa độ: {event.center_latitude?.toFixed(4)}, {event.center_longitude?.toFixed(4)}</span>
                </div>
                {event.affected_radius_km && (
                  <p style={{ color: 'var(--eoc-text-secondary)' }}>Bán kính ảnh hưởng: {event.affected_radius_km} km</p>
                )}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--eoc-text-muted)' }}>Chưa có thông tin tọa độ</p>
            )}
          </div>

          <div className="rounded-xl border p-4" style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--eoc-text-primary)' }}>{t('disaster_page.extra_info')}</h3>
            <div className="space-y-2 text-sm" style={{ color: 'var(--eoc-text-secondary)' }}>
              {event.external_ref && <p>Mã tham chiếu: <span className="font-mono">{event.external_ref}</span></p>}
              {event.created_by_name && <p>Khởi tạo bởi: {event.created_by_name}</p>}
              {event.phase_name_vi && <p>Giai đoạn hiện tại: <span style={{ color: 'var(--eoc-accent)' }}>{lang === 'en' ? event.phase_name_en : event.phase_name_vi}</span></p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'phases' && (
        <div className="rounded-xl border p-4" style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--eoc-text-primary)' }}>{t('disaster_page.process')}</h3>
          <div className="flex flex-wrap gap-3">
            {(event.phases || []).map((phase, i) => {
              const isCurrent = event.current_phase_id === phase.id;
              return (
                <div key={phase.id} className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm ${isCurrent ? 'font-bold' : ''}`}
                    style={{
                      background: isCurrent ? 'var(--eoc-accent-glow)' : 'var(--eoc-bg-tertiary)',
                      borderColor: isCurrent ? 'var(--eoc-accent)' : 'var(--eoc-border)',
                      color: isCurrent ? 'var(--eoc-accent)' : 'var(--eoc-text-secondary)',
                    }}
                  >
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: isCurrent ? 'var(--eoc-accent)' : 'var(--eoc-border)', color: isCurrent ? '#fff' : 'var(--eoc-text-muted)' }}>
                      {phase.phase_order}
                    </span>
                    {lang === 'en' ? phase.name_en : phase.name_vi}
                  </div>
                  {i < (event.phases?.length || 0) - 1 && (
                    <span style={{ color: 'var(--eoc-text-muted)' }}>→</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'timeline' && (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--eoc-border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--eoc-text-primary)' }}>{t('disaster_page.activity_log')}</h3>
            <button onClick={load} className="p-1.5 rounded-lg transition hover:opacity-70" style={{ color: 'var(--eoc-text-muted)' }}>
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--eoc-border)' }}>
            {timeline.length === 0 ? (
              <p className="py-10 text-center text-sm" style={{ color: 'var(--eoc-text-muted)' }}>Chưa có nhật ký</p>
            ) : timeline.map(log => (
              <div key={log.id} className="px-4 py-3 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--eoc-accent)' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--eoc-text-primary)' }}>{log.action}</span>
                    <span className="text-[10px] shrink-0" style={{ color: 'var(--eoc-text-muted)' }}>
                      {new Date(log.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  {log.description && <p className="text-xs mt-0.5" style={{ color: 'var(--eoc-text-secondary)' }}>{log.description}</p>}
                  {log.user_name && <p className="text-[10px] mt-0.5" style={{ color: 'var(--eoc-text-muted)' }}>bởi {log.user_name}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
