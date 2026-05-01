import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import { authAPI } from '../services/api';

// SVG viewport & projection constants
// lon: 102→117 (include Trường Sa), lat: 8→23.5
const VW = 280, VH = 460;
const LON0 = 102, LON1 = 117, LAT0 = 8.0, LAT1 = 23.5;

function proj([lon, lat]) {
  const x = ((lon - LON0) / (LON1 - LON0)) * VW;
  const y = ((LAT1 - lat) / (LAT1 - LAT0)) * VH;
  return [+x.toFixed(1), +y.toFixed(1)];
}

function ringsToPath(rings) {
  return rings.map(ring =>
    ring.map(([lon, lat], i) => {
      const [x, y] = proj([lon, lat]);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ') + ' Z'
  ).join(' ');
}

function VietnamMapSVG() {
  const [paths, setPaths] = useState([]);

  useEffect(() => {
    fetch('/vietnam.json')
      .then(r => r.json())
      .then(data => {
        const ps = [];
        for (const feature of (data.features || [])) {
          const g = feature.geometry;
          if (!g) continue;
          if (g.type === 'Polygon') {
            ps.push(ringsToPath(g.coordinates));
          } else if (g.type === 'MultiPolygon') {
            for (const poly of g.coordinates) ps.push(ringsToPath(poly));
          }
        }
        setPaths(ps);
      })
      .catch(() => {});
  }, []);

  // Island positions in SVG space
  const hoangSa  = proj([112.0, 16.5]);
  const truongSa = proj([114.2,  8.6]);

  const islandStyle = { fill: 'var(--eoc-accent)', opacity: 0.8 };

  return (
    <svg
      viewBox={`-8 -8 ${VW + 16} ${VH + 16}`}
      style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Mainland + islands from GeoJSON */}
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="rgba(6,182,212,0.15)"
          stroke="rgba(6,182,212,0.75)"
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
      ))}

      {/* Dashed connectors to islands */}
      <line x1={proj([109.5, 16.5])[0]} y1={hoangSa[1]}
            x2={hoangSa[0] - 6}         y2={hoangSa[1]}
            stroke="rgba(6,182,212,0.4)" strokeWidth="0.8" strokeDasharray="3,3" />
      <line x1={proj([109.0,  8.6])[0]} y1={truongSa[1]}
            x2={truongSa[0] - 6}        y2={truongSa[1]}
            stroke="rgba(6,182,212,0.4)" strokeWidth="0.8" strokeDasharray="3,3" />

      {/* === Hoàng Sa === */}
      <g>
        <circle cx={hoangSa[0]} cy={hoangSa[1]} r="6" fill="rgba(6,182,212,0.2)">
          <animate attributeName="r" values="6;13;6" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0;0.4" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx={hoangSa[0]}   cy={hoangSa[1]}   r="4.5" style={islandStyle} />
        <circle cx={hoangSa[0]+8} cy={hoangSa[1]+6} r="2.5" fill="rgba(6,182,212,0.6)" />
        <circle cx={hoangSa[0]-6} cy={hoangSa[1]+5} r="2"   fill="rgba(6,182,212,0.5)" />
        <circle cx={hoangSa[0]+4} cy={hoangSa[1]+12} r="2"  fill="rgba(6,182,212,0.5)" />
        {/* Flag */}
        <rect x={hoangSa[0]+6} y={hoangSa[1]-16} width={16} height={10} rx="1.5" fill="#da251d" opacity="0.92" />
        <text x={hoangSa[0]+14} y={hoangSa[1]-9} textAnchor="middle" fontSize="8" fill="#ffcd00" fontWeight="bold">★</text>
        <line x1={hoangSa[0]+6} y1={hoangSa[1]-16} x2={hoangSa[0]+6} y2={hoangSa[1]-2} stroke="rgba(6,182,212,0.6)" strokeWidth="0.8" />
        <text x={hoangSa[0]+24} y={hoangSa[1]-8} fontSize="7.5" fill="var(--eoc-accent)" fontWeight="bold" fontFamily="sans-serif">Hoàng Sa</text>
      </g>

      {/* === Trường Sa === */}
      <g>
        <circle cx={truongSa[0]} cy={truongSa[1]} r="6" fill="rgba(6,182,212,0.2)">
          <animate attributeName="r" values="6;13;6" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx={truongSa[0]}   cy={truongSa[1]}    r="4.5" style={islandStyle} />
        <circle cx={truongSa[0]+9} cy={truongSa[1]+7}  r="2.5" fill="rgba(6,182,212,0.6)" />
        <circle cx={truongSa[0]-7} cy={truongSa[1]+6}  r="2"   fill="rgba(6,182,212,0.5)" />
        <circle cx={truongSa[0]+3} cy={truongSa[1]+13} r="2"   fill="rgba(6,182,212,0.5)" />
        <circle cx={truongSa[0]-4} cy={truongSa[1]+14} r="1.5" fill="rgba(6,182,212,0.4)" />
        <circle cx={truongSa[0]+12} cy={truongSa[1]+2} r="1.5" fill="rgba(6,182,212,0.4)" />
        {/* Flag */}
        <rect x={truongSa[0]+6} y={truongSa[1]-16} width={16} height={10} rx="1.5" fill="#da251d" opacity="0.92" />
        <text x={truongSa[0]+14} y={truongSa[1]-9} textAnchor="middle" fontSize="8" fill="#ffcd00" fontWeight="bold">★</text>
        <line x1={truongSa[0]+6} y1={truongSa[1]-16} x2={truongSa[0]+6} y2={truongSa[1]-2} stroke="rgba(6,182,212,0.6)" strokeWidth="0.8" />
        <text x={truongSa[0]+24} y={truongSa[1]-8} fontSize="7.5" fill="var(--eoc-accent)" fontWeight="bold" fontFamily="sans-serif">Trường Sa</text>
      </g>

      {/* Region dots */}
      {[
        { pos: proj([105.5, 21.0]), label: 'Miền Bắc' },
        { pos: proj([108.0, 15.5]), label: 'Miền Trung' },
        { pos: proj([105.5, 10.5]), label: 'Miền Nam' },
      ].map(({ pos, label }) => (
        <g key={label}>
          <circle cx={pos[0]} cy={pos[1]} r="3" fill="var(--eoc-accent)" opacity="0.85" />
          <circle cx={pos[0]} cy={pos[1]} r="3" fill="var(--eoc-accent)" opacity="0.2">
            <animate attributeName="r" values="3;7;3" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.2;0;0.2" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x={pos[0]+6} y={pos[1]+4} fontSize="7.5" fill="var(--eoc-text-muted)" fontFamily="sans-serif">{label}</text>
        </g>
      ))}
    </svg>
  );
}

// screen: 'login' | 'mfa_verify' | 'mfa_setup'
export default function LoginPage() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [screen, setScreen] = useState('login');
  const [mfaCode, setMfaCode] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [setupError, setSetupError] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const { login, loginWithMfa, loading, error } = useAuthStore();
  const navigate = useNavigate();

  // Khi chuyển sang màn setup, fetch QR code
  useEffect(() => {
    if (screen !== 'mfa_setup') return;
    authAPI.mfaSetup()
      .then(({ data }) => setOtpauthUrl(data.otpauthUrl))
      .catch(() => setSetupError('Không thể tải mã QR. Vui lòng thử lại.'));
  }, [screen]);

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const result = await login(username, password);
      if (result?.mfaRequired) { setScreen('mfa_verify'); return; }
      if (result?.mfaSetupRequired) { setScreen('mfa_setup'); return; }
      navigate('/dashboard');
    } catch { /* error set in store */ }
  }

  async function handleMfaVerify(e) {
    e.preventDefault();
    try {
      await loginWithMfa(mfaCode);
      navigate('/dashboard');
    } catch { /* error set in store */ }
  }

  async function handleMfaConfirmSetup(e) {
    e.preventDefault();
    setSetupLoading(true);
    setSetupError('');
    try {
      const { data } = await authAPI.mfaConfirmSetup(mfaCode);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/dashboard';
    } catch (err) {
      setSetupError(err.response?.data?.error || 'Mã xác thực không đúng. Vui lòng thử lại.');
      setSetupLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--eoc-bg-primary)' }}>

      {/* ── Left panel: map + brand ── */}
      <div className="hidden lg:flex flex-col w-[420px] shrink-0 relative overflow-hidden border-r"
        style={{ borderColor: 'var(--eoc-border)', background: 'var(--eoc-bg-secondary)' }}>

        {/* Brand header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--eoc-accent)', boxShadow: '0 0 12px var(--eoc-accent)' }}>
              <Shield size={16} color="#fff" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-wider" style={{ color: 'var(--eoc-accent)' }}>VDRCS</p>
              <p className="text-[9px] tracking-widest uppercase" style={{ color: 'var(--eoc-text-muted)' }}>EOC · Vietnam</p>
            </div>
          </div>
          <h2 className="text-lg font-bold mt-4 leading-snug" style={{ color: 'var(--eoc-text-primary)' }}>
            Hệ thống Điều phối<br />
            <span style={{ color: 'var(--eoc-accent)' }}>Ứng phó Thiên tai</span>
          </h2>
          <p className="text-xs mt-1.5" style={{ color: 'var(--eoc-text-muted)' }}>
            National multi-hazard disaster response coordination
          </p>
        </div>

        {/* Map */}
        <div className="flex-1 flex items-center justify-center px-4 py-4 relative">
          <div className="w-full h-full max-h-[420px]">
            <VietnamMapSVG />
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="px-8 pb-6">
          <p className="text-[9px] uppercase tracking-widest font-semibold text-center" style={{ color: 'var(--eoc-text-muted)' }}>
            Bao gồm Hoàng Sa · Trường Sa · 63 tỉnh/thành
          </p>
        </div>
      </div>

      {/* ── Right panel: login form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Mobile brand */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--eoc-accent)' }}>
            <Shield size={16} color="#fff" />
          </div>
          <p className="font-bold" style={{ color: 'var(--eoc-text-primary)' }}>VDRCS EOC</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--eoc-text-primary)' }}>
              {screen === 'mfa_verify' ? t('login.mfa_verify_title') : screen === 'mfa_setup' ? t('login.mfa_setup_title') : t('login.title')}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--eoc-text-muted)' }}>
              {screen === 'mfa_verify'
                ? t('login.mfa_verify_desc')
                : screen === 'mfa_setup'
                ? t('login.mfa_setup_desc')
                : t('login.subtitle')}
            </p>
          </div>

          {/* Error banner */}
          {(error || setupError) && (
            <div className="mb-5 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              <AlertCircle size={15} className="shrink-0" /> {error || setupError}
            </div>
          )}

          {/* ── Screen: login ── */}
          {screen === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                  style={{ color: 'var(--eoc-text-muted)' }}>
                  {t('login.username_label')}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border outline-none transition text-sm"
                  style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)', color: 'var(--eoc-text-primary)' }}
                  placeholder="admin"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                  style={{ color: 'var(--eoc-text-muted)' }}>
                  {t('login.password_label')}
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-11 rounded-xl border outline-none transition text-sm"
                    style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)', color: 'var(--eoc-text-primary)' }}
                    placeholder="••••••••"
                    required
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition hover:opacity-70"
                    style={{ color: 'var(--eoc-text-muted)' }}>
                    {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition disabled:opacity-50 mt-2"
                style={{ background: 'var(--eoc-accent)', color: '#fff' }}>
                {loading ? <Loader2 size={17} className="animate-spin" /> : <><span>{t('login.submit')}</span><ChevronRight size={16} /></>}
              </button>
            </form>
          )}

          {/* ── Screen: mfa_verify ── */}
          {screen === 'mfa_verify' && (
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                  style={{ color: 'var(--eoc-text-muted)' }}>
                  {t('login.mfa_code_label')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 rounded-xl border outline-none text-center text-2xl tracking-[0.5em] font-bold"
                  style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)', color: 'var(--eoc-accent)' }}
                  placeholder="000000"
                  autoFocus
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition disabled:opacity-50"
                style={{ background: 'var(--eoc-accent)', color: '#fff' }}>
                {loading ? <Loader2 size={17} className="animate-spin" /> : <><span>{t('login.confirm_btn')}</span><ChevronRight size={16} /></>}
              </button>
              <button type="button" onClick={() => setScreen('login')}
                className="w-full text-xs text-center transition hover:opacity-70"
                style={{ color: 'var(--eoc-text-muted)' }}>
                {t('login.back_to_login')}
              </button>
            </form>
          )}

          {/* ── Screen: mfa_setup ── */}
          {screen === 'mfa_setup' && (
            <form onSubmit={handleMfaConfirmSetup} className="space-y-5">
              <div className="flex justify-center">
                {otpauthUrl
                  ? <div className="p-3 bg-white rounded-xl"><QRCodeSVG value={otpauthUrl} size={180} /></div>
                  : <div className="w-[206px] h-[206px] rounded-xl flex items-center justify-center"
                      style={{ background: 'var(--eoc-bg-elevated)', color: 'var(--eoc-text-muted)' }}>
                      <Loader2 size={24} className="animate-spin" />
                    </div>
                }
              </div>
              <p className="text-xs text-center" style={{ color: 'var(--eoc-text-muted)' }}>
                {t('login.mfa_setup_instruction')}
              </p>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                  style={{ color: 'var(--eoc-text-muted)' }}>
                  {t('login.mfa_confirm_label')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 rounded-xl border outline-none text-center text-2xl tracking-[0.5em] font-bold"
                  style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)', color: 'var(--eoc-accent)' }}
                  placeholder="000000"
                  autoFocus
                />
              </div>
              <button type="submit" disabled={setupLoading || !otpauthUrl}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition disabled:opacity-50"
                style={{ background: 'var(--eoc-accent)', color: '#fff' }}>
                {setupLoading ? <Loader2 size={17} className="animate-spin" /> : <><span>{t('login.activate_mfa')}</span><ChevronRight size={16} /></>}
              </button>
            </form>
          )}

          <div className="mt-5 text-center">
            <Link to="/" className="text-xs transition hover:opacity-70"
              style={{ color: 'var(--eoc-text-muted)' }}>
              {t('login.back_to_citizen')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
