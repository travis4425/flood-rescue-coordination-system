import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, Users, Truck, CheckCircle, Clock, Activity,
  TrendingUp, MapPin, CloudRain, Package, ArrowUp, ArrowDown,
  Thermometer, Droplets, Wind, RefreshCw, CloudLightning, Archive,
  Download, Loader2, Zap, Shield
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { dashboardAPI, regionAPI, disasterEventAPI } from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import DisasterTypeBadge from '../components/ui/DisasterTypeBadge';
import LiveTimer from '../components/ui/LiveTimer';

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, accent = false, trend, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-4 text-left w-full transition ${onClick ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
      style={{
        background: accent ? 'var(--eoc-accent-glow)' : 'var(--eoc-bg-elevated)',
        borderColor: accent ? 'var(--eoc-accent)' : 'var(--eoc-border)',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <Icon size={16} style={{ color: accent ? 'var(--eoc-accent)' : 'var(--eoc-text-muted)' }} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-[10px] font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tabular-nums" style={{ color: accent ? 'var(--eoc-accent)' : 'var(--eoc-text-primary)' }}>
        {value ?? '—'}
      </p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--eoc-text-muted)' }}>{label}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: 'var(--eoc-text-muted)', opacity: 0.7 }}>{sub}</p>}
    </button>
  );
}

// ── Mini bar chart (no deps) ───────────────────────────────────────────────────
function MiniBar({ items, colorFn }) {
  if (!items || items.length === 0) return null;
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="flex items-end gap-1 h-16">
      {items.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
            {item.label}: {item.value}
          </div>
          <div
            className="w-full rounded-t transition-all"
            style={{
              height: `${Math.max((item.value / max) * 56, 3)}px`,
              background: colorFn ? colorFn(item, i) : 'var(--eoc-accent)',
              opacity: 0.85,
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ── Active disaster card ───────────────────────────────────────────────────────
function ActiveEventCard({ ev, lang, onClick }) {
  const sevColors = { 1: '#22c55e', 2: '#84cc16', 3: '#f59e0b', 4: '#f97316', 5: '#ef4444' };
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg border transition hover:opacity-80"
      style={{ background: 'var(--eoc-bg-primary)', borderColor: 'var(--eoc-border)', borderLeftColor: sevColors[ev.severity] || 'var(--eoc-accent)', borderLeftWidth: 3 }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <DisasterTypeBadge code={ev.type_code} lang={lang} size="sm" />
          <StatusBadge status={ev.status} pulse={ev.status === 'active'} />
        </div>
        <p className="text-xs font-medium truncate" style={{ color: 'var(--eoc-text-primary)' }}>
          {lang === 'en' && ev.name_en ? ev.name_en : ev.name}
        </p>
        {ev.started_at && (
          <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--eoc-text-muted)' }}>
            <Clock size={9} /> <LiveTimer startTime={ev.started_at} warnAfterMinutes={60} />
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--eoc-accent)' }}>{ev.request_count || 0}</p>
        <p className="text-[9px]" style={{ color: 'var(--eoc-text-muted)' }}>yêu cầu</p>
      </div>
    </button>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const lang = i18n.language;

  const [overview, setOverview] = useState(null);
  const [byProvince, setByProvince] = useState([]);
  const [teamStats, setTeamStats] = useState(null);
  const [resourceOverview, setResourceOverview] = useState(null);
  const [weatherAlerts, setWeatherAlerts] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [weatherConfigured, setWeatherConfigured] = useState(false);
  const [weatherProvince, setWeatherProvince] = useState('');
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [activeDisasters, setActiveDisasters] = useState([]);
  const [disasterStats, setDisasterStats] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [ov, bp, ts, ro, wa, provs, ws, ad, ds] = await Promise.allSettled([
          dashboardAPI.getOverview(),
          dashboardAPI.getRequestsByProvince(),
          dashboardAPI.getTeamStats(),
          dashboardAPI.getResourceOverview(),
          regionAPI.getWeatherAlerts({ active: true }),
          regionAPI.getProvinces(),
          regionAPI.getWeatherStatus(),
          disasterEventAPI.getActive(),
          disasterEventAPI.getStats(),
        ]);
        if (ov.status === 'fulfilled') setOverview(ov.value.data?.requests || ov.value.data);
        if (bp.status === 'fulfilled') setByProvince(bp.value.data || []);
        if (ts.status === 'fulfilled') setTeamStats(ts.value.data?.status_summary || ts.value.data);
        if (ro.status === 'fulfilled') setResourceOverview(ro.value.data);
        if (wa.status === 'fulfilled') setWeatherAlerts(wa.value.data || []);
        if (provs.status === 'fulfilled') setProvinces(provs.value.data || []);
        if (ad.status === 'fulfilled') setActiveDisasters(ad.value.data || []);
        if (ds.status === 'fulfilled') setDisasterStats(ds.value.data);
        const configured = ws.status === 'fulfilled' ? (ws.value.data?.configured || false) : false;
        if (ws.status === 'fulfilled') setWeatherConfigured(configured);
        if (configured) {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                try {
                  const { latitude, longitude } = pos.coords;
                  const provRes = await regionAPI.getProvinces();
                  const allProvs = provRes.data || [];
                  let nearest = null, minDist = Infinity;
                  for (const p of allProvs) {
                    if (!p.latitude || !p.longitude) continue;
                    const d = Math.hypot(p.latitude - latitude, p.longitude - longitude);
                    if (d < minDist) { minDist = d; nearest = p; }
                  }
                  const [curr, fore] = await Promise.allSettled([
                    regionAPI.getWeatherByCoords(latitude, longitude),
                    nearest ? regionAPI.getWeatherForecast(nearest.id) : Promise.reject(),
                  ]);
                  setWeatherData({
                    current: curr.status === 'fulfilled' ? curr.value.data : null,
                    forecast: fore.status === 'fulfilled' ? fore.value.data : null,
                  });
                  setWeatherProvince('__geo__');
                } catch { /* fallback */ }
              },
              () => {
                if (user?.province_id && ['coordinator', 'manager'].includes(user?.role)) {
                  setWeatherProvince(String(user.province_id));
                  loadWeather(user.province_id, true);
                }
              },
              { timeout: 5000 }
            );
          } else if (user?.province_id) {
            setWeatherProvince(String(user.province_id));
            loadWeather(user.province_id, true);
          }
        }
      } catch { /* silent */ }
      setLoading(false);
    }
    load();
  }, []);

  async function loadWeather(provinceId, forceLoad = false) {
    if (!provinceId || (!weatherConfigured && !forceLoad)) return;
    setWeatherLoading(true);
    try {
      const [current, forecast] = await Promise.all([
        regionAPI.getWeatherCurrent(provinceId),
        regionAPI.getWeatherForecast(provinceId),
      ]);
      setWeatherData({ current: current.data, forecast: forecast.data });
    } catch { setWeatherData(null); }
    setWeatherLoading(false);
  }

  async function handleAutoSync() {
    setSyncing(true);
    try {
      const res = await regionAPI.autoSyncWeatherAlerts({});
      alert(`✅ Đã kiểm tra ${res.data.provinces_checked} tỉnh, tạo ${res.data.alerts_created} cảnh báo mới`);
      const wa = await regionAPI.getWeatherAlerts({ active: true });
      setWeatherAlerts(wa.data || []);
    } catch (err) {
      alert('❌ Lỗi: ' + (err.response?.data?.error || err.message));
    }
    setSyncing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--eoc-accent)' }} />
      </div>
    );
  }

  const o = overview || {};
  const displayWeatherAlerts = user?.role === 'coordinator'
    ? weatherAlerts.filter(a => !a.province_id || a.province_id === user.province_id)
    : weatherAlerts;

  // Province bar data
  const provinceBarData = byProvince.slice(0, 8).map(p => ({
    label: p.province_name || p.name || 'N/A',
    value: Number(p.count || p.total || 0),
  }));

  // Disaster type breakdown
  const typeBreakdown = disasterStats?.by_type || [];

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--eoc-text-primary)' }}>
            {t('dashboard.title')}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--eoc-text-muted)' }}>
            Xin chào, <span style={{ color: 'var(--eoc-accent)' }}>{user?.full_name}</span>
          </p>
        </div>
        {['coordinator', 'manager', 'admin'].includes(user?.role) && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium" style={{ color: 'var(--eoc-text-muted)' }}>Xuất báo cáo:</span>
            {[
              { label: 'Yêu cầu', path: 'requests', color: 'var(--eoc-accent)' },
              { label: 'Nhiệm vụ', path: 'missions', color: '#a78bfa' },
              { label: 'Tài nguyên', path: 'resources', color: '#34d399' },
            ].map(r => (
              <a key={r.path}
                href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/${r.path}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg font-medium transition hover:opacity-80"
                style={{ background: 'var(--eoc-bg-elevated)', border: '1px solid var(--eoc-border)', color: r.color }}
              >
                <Download size={12} /> {r.label}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ── Weather widget ── */}
      {weatherConfigured && !(user?.role === 'rescue_team' && !user?.is_team_leader) && (
        <div className="rounded-xl border overflow-hidden"
          style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--eoc-border)' }}>
            <div className="flex items-center gap-2">
              <CloudLightning size={15} style={{ color: '#60a5fa' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--eoc-text-primary)' }}>Thời tiết thực tế</h3>
            </div>
            <div className="flex items-center gap-2">
              {['coordinator', 'rescue_team'].includes(user?.role) ? (
                <span className="text-xs px-3 py-1.5 rounded-lg border"
                  style={{ color: 'var(--eoc-text-secondary)', borderColor: 'var(--eoc-border)', background: 'var(--eoc-bg-primary)' }}>
                  {provinces.find(p => p.id === parseInt(weatherProvince))?.name || ''}
                </span>
              ) : (
                <select
                  className="text-xs border rounded-lg px-3 py-1.5 outline-none"
                  style={{ background: 'var(--eoc-bg-primary)', borderColor: 'var(--eoc-border)', color: 'var(--eoc-text-secondary)' }}
                  value={weatherProvince}
                  onChange={e => { setWeatherProvince(e.target.value); loadWeather(e.target.value); }}
                >
                  <option value="">— Chọn tỉnh —</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              {user?.role === 'admin' && (
                <button onClick={handleAutoSync} disabled={syncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition disabled:opacity-50"
                  style={{ color: '#fdba74', borderColor: 'rgba(249,115,22,0.4)', background: 'rgba(249,115,22,0.08)' }}>
                  <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Đang sync...' : 'Auto-sync'}
                </button>
              )}
            </div>
          </div>

          {weatherLoading && (
            <div className="py-8 flex items-center justify-center gap-2" style={{ color: 'var(--eoc-text-muted)' }}>
              <Loader2 size={18} className="animate-spin" /> Đang lấy dữ liệu...
            </div>
          )}

          {!weatherLoading && weatherData?.current && (
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-3">
                  {weatherData.current.icon_url && (
                    <img src={weatherData.current.icon_url} alt="" className="w-14 h-14" />
                  )}
                  <div>
                    <p className="text-3xl font-bold" style={{ color: 'var(--eoc-text-primary)' }}>
                      {weatherData.current.temperature}°C
                    </p>
                    <p className="text-xs capitalize" style={{ color: 'var(--eoc-text-muted)' }}>
                      {weatherData.current.weather}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--eoc-text-muted)' }}>
                      {weatherData.current.province_name}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--eoc-text-secondary)' }}>
                  <span className="flex items-center gap-1"><Thermometer size={12} className="text-red-400" /> {weatherData.current.feels_like}°C</span>
                  <span className="flex items-center gap-1"><Droplets size={12} className="text-blue-400" /> {weatherData.current.humidity}%</span>
                  <span className="flex items-center gap-1"><Wind size={12} style={{ color: 'var(--eoc-text-muted)' }} /> {weatherData.current.wind_speed} m/s</span>
                  <span className="flex items-center gap-1"><CloudRain size={12} className="text-cyan-400" /> {weatherData.current.rain_1h || 0} mm</span>
                </div>
              </div>

              {weatherData.forecast?.daily && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--eoc-text-muted)' }}>Dự báo 5 ngày</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {weatherData.forecast.daily.slice(0, 5).map((day, i) => (
                      <div key={i} className="text-center p-2.5 rounded-lg border"
                        style={{
                          background: day.total_rain_mm >= 50 ? 'rgba(239,68,68,0.08)' : 'var(--eoc-bg-primary)',
                          borderColor: day.total_rain_mm >= 50 ? 'rgba(239,68,68,0.3)' : 'var(--eoc-border)',
                        }}>
                        <p className="text-[10px]" style={{ color: 'var(--eoc-text-muted)' }}>
                          {new Date(day.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </p>
                        {day.icon_url && <img src={day.icon_url} alt="" className="w-8 h-8 mx-auto" />}
                        <p className="text-xs font-bold" style={{ color: 'var(--eoc-text-primary)' }}>{day.temp_min}°–{day.temp_max}°</p>
                        {day.total_rain_mm > 0 && (
                          <p className="text-[9px] font-medium" style={{ color: day.total_rain_mm >= 50 ? '#fca5a5' : '#60a5fa' }}>
                            🌧 {day.total_rain_mm}mm
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!weatherLoading && !weatherData && !weatherProvince && (
            <p className="py-6 text-center text-xs" style={{ color: 'var(--eoc-text-muted)' }}>
              Chọn tỉnh/thành để xem thời tiết
            </p>
          )}
        </div>
      )}

      {/* ── Active disaster alerts ── */}
      {displayWeatherAlerts.length > 0 && (
        <div className="space-y-1.5">
          {displayWeatherAlerts.slice(0, 2).map(alert => (
            <div key={alert.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm"
              style={{
                background: alert.severity === 'critical' ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.1)',
                borderColor: alert.severity === 'critical' ? 'rgba(239,68,68,0.4)' : 'rgba(249,115,22,0.4)',
                color: alert.severity === 'critical' ? '#fca5a5' : '#fdba74',
              }}>
              <AlertTriangle size={16} className="shrink-0" />
              <span className="font-medium">{alert.title}</span>
              <span className="text-xs opacity-70 truncate">— {alert.description?.substring(0, 80)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Manager resource view ── */}
      {user?.role === 'manager' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={Truck} label="Tổng phương tiện" value={resourceOverview?.vehicles?.total} />
          <KpiCard icon={Truck} label="Đang sử dụng" value={resourceOverview?.vehicles?.in_use} accent />
          <KpiCard icon={Archive} label="Kho hàng" value={resourceOverview?.warehouses?.total} />
          <KpiCard icon={Package} label="Loại hàng tồn kho" value={resourceOverview?.inventory?.total_items} />
        </div>
      )}

      {/* ── Main KPI grid ── */}
      {user?.role !== 'manager' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard icon={AlertTriangle} label={t('dashboard.pendingSOS')} value={o.pending}
            accent sub="Cần xác minh" onClick={() => navigate('/dashboard/requests')} />
          <KpiCard icon={Activity} label="Đang cứu hộ" value={o.in_progress}
            onClick={() => navigate('/dashboard/missions')} />
          <KpiCard icon={CheckCircle} label="Hoàn thành" value={o.completed} />
          <KpiCard icon={Users} label="Nạn nhân" value={o.total_victims} />
          <KpiCard icon={Users} label="Đã cứu" value={o.total_rescued} />
          <KpiCard icon={AlertTriangle} label="Tổng yêu cầu" value={o.total_requests} />
        </div>
      )}

      {/* ── Two column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* LEFT: Active disasters */}
        <div className="lg:col-span-1 rounded-xl border overflow-hidden"
          style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--eoc-border)' }}>
            <div className="flex items-center gap-2">
              <Zap size={15} style={{ color: 'var(--eoc-accent)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--eoc-text-primary)' }}>
                {t('dashboard.activeDisasters')}
              </h3>
            </div>
            <button onClick={() => navigate('/dashboard/disasters')}
              className="text-[10px] px-2 py-1 rounded-md transition hover:opacity-70"
              style={{ color: 'var(--eoc-accent)', background: 'var(--eoc-accent-glow)', border: '1px solid var(--eoc-accent)' }}>
              Xem tất cả
            </button>
          </div>
          <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
            {activeDisasters.length === 0 ? (
              <div className="py-8 text-center">
                <Shield size={24} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--eoc-text-muted)' }} />
                <p className="text-xs" style={{ color: 'var(--eoc-text-muted)' }}>Không có sự kiện đang hoạt động</p>
              </div>
            ) : activeDisasters.map(ev => (
              <ActiveEventCard key={ev.id} ev={ev} lang={lang}
                onClick={() => navigate(`/dashboard/disasters/${ev.id}`)} />
            ))}
          </div>
        </div>

        {/* RIGHT: Charts */}
        <div className="lg:col-span-2 space-y-4">
          {/* Province requests */}
          <div className="rounded-xl border p-4"
            style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={14} style={{ color: 'var(--eoc-accent)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--eoc-text-primary)' }}>
                {t('dashboard.topProvinces')}
              </h3>
            </div>
            {provinceBarData.length > 0 ? (
              <div className="space-y-2">
                {provinceBarData.slice(0, 6).map((p, i) => {
                  const max = provinceBarData[0]?.value || 1;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] w-24 truncate text-right" style={{ color: 'var(--eoc-text-muted)' }}>{p.label}</span>
                      <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${(p.value / max) * 100}%`, background: 'var(--eoc-accent)', opacity: 0.8 - i * 0.08 }} />
                      </div>
                      <span className="text-[10px] w-6 tabular-nums text-right" style={{ color: 'var(--eoc-text-secondary)' }}>{p.value}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs py-4 text-center" style={{ color: 'var(--eoc-text-muted)' }}>Chưa có dữ liệu</p>
            )}
          </div>

          {/* Disaster type breakdown */}
          {typeBreakdown.length > 0 && (
            <div className="rounded-xl border p-4"
              style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} style={{ color: 'var(--eoc-accent)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--eoc-text-primary)' }}>
                  {t('dashboard.disasterBreakdown')}
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {typeBreakdown.slice(0, 8).map((ty, i) => (
                  <div key={i} className="rounded-lg p-2.5 text-center border"
                    style={{ background: 'var(--eoc-bg-primary)', borderColor: 'var(--eoc-border)' }}>
                    <DisasterTypeBadge code={ty.type_code} lang={lang} size="sm" />
                    <p className="text-sm font-bold mt-1" style={{ color: 'var(--eoc-text-primary)' }}>{ty.count || 0}</p>
                    <p className="text-[9px]" style={{ color: 'var(--eoc-text-muted)' }}>sự kiện</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team stats */}
          {teamStats && (
            <div className="rounded-xl border p-4"
              style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} style={{ color: 'var(--eoc-accent)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--eoc-text-primary)' }}>
                  Đội cứu hộ
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t('dashboard.availableTeams'), value: teamStats.available || 0, color: '#22c55e' },
                  { label: 'Đang hoạt động', value: teamStats.active || teamStats.on_mission || 0, color: 'var(--eoc-accent)' },
                  { label: 'Không sẵn sàng', value: teamStats.unavailable || teamStats.standby || 0, color: '#6b7280' },
                ].map((s, i) => (
                  <div key={i} className="text-center">
                    <p className="text-xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--eoc-text-muted)' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Resource overview ── */}
      {resourceOverview && user?.role !== 'manager' && (
        <div className="rounded-xl border p-4"
          style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Package size={14} style={{ color: 'var(--eoc-accent)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--eoc-text-primary)' }}>Tổng quan tài nguyên</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Phương tiện', value: resourceOverview.vehicles?.total || 0, sub: `${resourceOverview.vehicles?.available || 0} sẵn sàng` },
              { label: 'Đang dùng', value: resourceOverview.vehicles?.in_use || 0, accent: true },
              { label: 'Kho hàng', value: resourceOverview.warehouses?.total || 0 },
              { label: 'Loại vật phẩm', value: resourceOverview.inventory?.total_items || 0 },
            ].map((s, i) => (
              <div key={i} className="rounded-lg p-3 text-center border"
                style={{
                  background: s.accent ? 'var(--eoc-accent-glow)' : 'var(--eoc-bg-primary)',
                  borderColor: s.accent ? 'var(--eoc-accent)' : 'var(--eoc-border)',
                }}>
                <p className="text-xl font-bold tabular-nums" style={{ color: s.accent ? 'var(--eoc-accent)' : 'var(--eoc-text-primary)' }}>{s.value}</p>
                <p className="text-[10px]" style={{ color: 'var(--eoc-text-muted)' }}>{s.label}</p>
                {s.sub && <p className="text-[9px] opacity-60" style={{ color: 'var(--eoc-text-muted)' }}>{s.sub}</p>}
              </div>
            ))}
          </div>
          {resourceOverview.inventory?.low_stock_count > 0 && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs"
              style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              <AlertTriangle size={14} />
              {resourceOverview.inventory.low_stock_count} loại vật phẩm sắp hết hàng
            </div>
          )}
        </div>
      )}

    </div>
  );
}
