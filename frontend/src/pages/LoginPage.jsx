import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import useAuthStore from '../store/authStore';

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

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [mfaCode, setMfaCode]   = useState('');
  const [needMfa, setNeedMfa]   = useState(false);
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const result = await login(username, password, needMfa ? mfaCode : undefined);
      if (result?.requiresMFA) {
        setNeedMfa(true);
        return;
      }
      navigate('/dashboard');
    } catch { /* error set in store */ }
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
              {needMfa ? 'Xác thực 2 bước' : 'Đăng nhập'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--eoc-text-muted)' }}>
              {needMfa
                ? 'Nhập mã 6 chữ số từ ứng dụng xác thực của bạn'
                : 'Truy cập hệ thống quản lý thiên tai quốc gia'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              <AlertCircle size={15} className="shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!needMfa ? (
              <>
                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                    style={{ color: 'var(--eoc-text-muted)' }}>
                    Tên đăng nhập
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border outline-none transition text-sm"
                    style={{
                      background: 'var(--eoc-bg-elevated)',
                      borderColor: 'var(--eoc-border)',
                      color: 'var(--eoc-text-primary)',
                    }}
                    placeholder="admin"
                    required
                    autoFocus
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                    style={{ color: 'var(--eoc-text-muted)' }}>
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-11 rounded-xl border outline-none transition text-sm"
                      style={{
                        background: 'var(--eoc-bg-elevated)',
                        borderColor: 'var(--eoc-border)',
                        color: 'var(--eoc-text-primary)',
                      }}
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
              </>
            ) : (
              /* MFA code input */
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                  style={{ color: 'var(--eoc-text-muted)' }}>
                  Mã xác thực (TOTP)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 rounded-xl border outline-none text-center text-2xl tracking-[0.5em] font-bold"
                  style={{
                    background: 'var(--eoc-bg-elevated)',
                    borderColor: 'var(--eoc-border)',
                    color: 'var(--eoc-accent)',
                  }}
                  placeholder="000000"
                  autoFocus
                />
                <button type="button" onClick={() => setNeedMfa(false)}
                  className="mt-2 text-xs transition hover:opacity-70"
                  style={{ color: 'var(--eoc-text-muted)' }}>
                  ← Quay lại đăng nhập
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition disabled:opacity-50 mt-2"
              style={{ background: 'var(--eoc-accent)', color: '#fff', boxShadow: '0 0 20px rgba(var(--eoc-accent-rgb, 6,182,212),0.3)' }}
            >
              {loading ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <>
                  {needMfa ? 'Xác nhận' : 'Đăng nhập'}
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link to="/" className="text-xs transition hover:opacity-70"
              style={{ color: 'var(--eoc-text-muted)' }}>
              ← Về trang chủ công dân
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
