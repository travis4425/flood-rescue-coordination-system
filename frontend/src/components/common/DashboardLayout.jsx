import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Navigation, Users, Truck,
  UserCog, LogOut, Menu, Bell, ChevronDown, Settings, X,
  CheckCheck, ClipboardList, ScrollText, ClipboardCheck,
  Zap, Shield, Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import { notificationAPI, requestAPI, disasterEventAPI } from '../../services/api';
import { ROLE_LABELS } from '../../utils/helpers';
import { getSocket } from '../../services/socket';
import OnlineStatus from './OnlineStatus';
import StatusBadge from '../ui/StatusBadge';
import DisasterTypeBadge from '../ui/DisasterTypeBadge';

const ROLE_COLORS = {
  admin:             'bg-red-100 text-red-700',
  manager:           'bg-purple-100 text-purple-700',
  coordinator:       'bg-blue-100 text-blue-700',
  rescue_team:       'bg-green-100 text-green-700',
  warehouse_manager: 'bg-amber-100 text-amber-700',
};

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hms = now.toLocaleTimeString('vi-VN', { hour12: false });
  const date = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return (
    <div className="text-right hidden md:block">
      <p className="font-mono text-sm font-bold tabular-nums" style={{ color: 'var(--eoc-accent)' }}>{hms}</p>
      <p className="text-[10px]" style={{ color: 'var(--eoc-text-muted)' }}>{date}</p>
    </div>
  );
}

function DisasterTicker({ events }) {
  if (!events?.length) return null;
  const items = [...events, ...events]; // duplicate for seamless loop
  return (
    <div className="flex-1 overflow-hidden mx-4 hidden lg:block">
      <div className="flex items-center gap-2 h-6">
        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'var(--eoc-critical)', color: '#fff' }}>
          LIVE
        </span>
        <div className="overflow-hidden flex-1">
          <div className="flex gap-8 eoc-ticker whitespace-nowrap">
            {items.map((e, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-xs" style={{ color: 'var(--eoc-text-secondary)' }}>
                <span>{e.type_icon || '⚠️'}</span>
                <span className="font-medium" style={{ color: 'var(--eoc-text-primary)' }}>{e.name}</span>
                <StatusBadge status={e.status} />
                <span style={{ color: 'var(--eoc-text-muted)' }}>•</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [activeDisasters, setActiveDisasters] = useState([]);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  const NAV_ITEMS = [
    { path: '/dashboard',             icon: LayoutDashboard, label: t('nav.dashboard'),
      roles: ['manager','coordinator','rescue_team'], leaderOnly: true },
    { path: '/dashboard/disasters',   icon: Zap,             label: t('nav.disasters'),
      roles: ['admin','manager','coordinator'] },
    { path: '/dashboard/missions',    icon: Navigation,      label: t('nav.missions'),
      roles: ['rescue_team'] },
    { path: '/dashboard/requests-management', icon: ScrollText, label: t('nav.requests'),
      roles: ['coordinator'] },
    { path: '/dashboard/teams',       icon: Users,           label: t('nav.teams'),
      roles: ['coordinator','rescue_team'], leaderOnly: true },
    { path: '/dashboard/tasks',       icon: ClipboardList,   label: t('nav.tasks'),
      roles: ['coordinator','rescue_team'], leaderOnly: true },
    { path: '/dashboard/resources',   icon: Truck,           label: t('nav.resources'),
      roles: ['manager','warehouse_manager','coordinator','rescue_team'], leaderOnly: true },
    { path: '/dashboard/inventory',   icon: ClipboardCheck,  label: t('nav.inventory'),
      roles: ['manager','warehouse_manager'] },
    { path: '/dashboard/users',       icon: UserCog,         label: t('nav.users'),
      roles: ['admin'] },
    { path: '/dashboard/config',      icon: Settings,        label: t('nav.config'),
      roles: ['admin'] },
    { path: '/dashboard/reports',     icon: FileText,        label: t('nav.reports'),
      roles: ['admin','manager','warehouse_manager'] },
  ];

  const filteredNav = NAV_ITEMS.filter(item => {
    if (!item.roles.includes(user?.role)) return false;
    if (item.leaderOnly && user?.role === 'rescue_team' && !user?.is_team_leader) return false;
    return true;
  });

  const currentPage = filteredNav.find(n => location.pathname === n.path)
    || filteredNav.find(n => location.pathname.startsWith(n.path) && n.path !== '/dashboard');

  useEffect(() => {
    async function fetchData() {
      try {
        const [notifRes, countRes] = await Promise.all([
          notificationAPI.getMine({ limit: 10 }),
          notificationAPI.getUnreadCount()
        ]);
        setNotifications(notifRes.data?.data || []);
        setUnreadCount(countRes.data?.count || 0);
      } catch { /* silent */ }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    const socket = getSocket();
    if (socket) socket.on('notification', fetchData);
    return () => { clearInterval(interval); if (socket) socket.off('notification', fetchData); };
  }, []);

  useEffect(() => {
    disasterEventAPI.getActive().then(res => setActiveDisasters(res.data || [])).catch(() => {});
    const socket = getSocket();
    if (socket) {
      const refresh = () => disasterEventAPI.getActive().then(r => setActiveDisasters(r.data || [])).catch(() => {});
      socket.on('disaster_event_created', refresh);
      socket.on('disaster_event_updated', refresh);
      return () => { socket.off('disaster_event_created', refresh); socket.off('disaster_event_updated', refresh); };
    }
  }, []);

  useEffect(() => {
    if (user?.role !== 'coordinator') return;
    const fetch = () => requestAPI.getAll({ status: 'pending', limit: 1 })
      .then(r => setPendingRequestsCount(r.data?.pagination?.total || 0)).catch(() => {});
    fetch();
    const interval = setInterval(fetch, 30000);
    const socket = getSocket();
    if (socket) { socket.on('new_request', fetch); socket.on('request_updated', fetch); }
    return () => { clearInterval(interval); if (socket) { socket.off('new_request', fetch); socket.off('request_updated', fetch); } };
  }, [user?.role]);

  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggleLang() {
    const next = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  }

  async function handleMarkAllRead() {
    try {
      await notificationAPI.markAllRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* silent */ }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--eoc-bg-primary)' }}>
      {/* ── Header ── */}
      <header className="shrink-0 flex items-center px-4 py-2 gap-3 border-b" style={{ background: 'var(--eoc-bg-secondary)', borderColor: 'var(--eoc-border)' }}>
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <Shield size={22} style={{ color: 'var(--eoc-accent)' }} />
          <div className="hidden sm:block">
            <p className="text-xs font-bold leading-none" style={{ color: 'var(--eoc-text-primary)' }}>VDRCS</p>
            <p className="text-[9px] leading-none mt-0.5" style={{ color: 'var(--eoc-text-muted)' }}>v2.0.0</p>
          </div>
        </div>

        {/* Disaster ticker */}
        <DisasterTicker events={activeDisasters} />

        {/* Right controls */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <LiveClock />

          {/* Lang toggle */}
          <button onClick={toggleLang} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition" style={{ background: 'var(--eoc-bg-tertiary)', color: 'var(--eoc-text-secondary)' }}>
            <Globe size={12} />
            {i18n.language.toUpperCase()}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button onClick={() => setShowNotif(!showNotif)} className="relative p-2 rounded-lg transition hover:opacity-80" style={{ background: 'var(--eoc-bg-tertiary)' }}>
              <Bell size={16} style={{ color: 'var(--eoc-text-secondary)' }} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: 'var(--eoc-critical)', color: '#fff' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotif && (
              <div className="absolute right-0 top-10 w-80 rounded-xl z-50 overflow-hidden border" style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)', boxShadow: '0 10px 40px rgba(0,0,0,0.12)' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--eoc-border)' }}>
                  <span className="text-sm font-semibold" style={{ color: 'var(--eoc-text-primary)' }}>{t('nav.notifications')}</span>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs" style={{ color: 'var(--eoc-accent)' }}>
                      <CheckCheck size={14} className="inline mr-1" />{t('notifications_page.mark_all')}
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y" style={{ borderColor: 'var(--eoc-border)' }}>
                  {notifications.length === 0 ? (
                    <p className="py-8 text-center text-sm" style={{ color: 'var(--eoc-text-muted)' }}>Không có thông báo</p>
                  ) : notifications.map(n => (
                    <div key={n.id} className="px-4 py-3" style={{ background: n.is_read ? '' : 'var(--eoc-accent-glow)' }}>
                      <p className="text-xs font-medium" style={{ color: 'var(--eoc-text-primary)' }}>{n.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--eoc-text-muted)' }}>{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 px-2 py-1 rounded-lg transition hover:opacity-80" style={{ background: 'var(--eoc-bg-tertiary)' }}>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium leading-none" style={{ color: 'var(--eoc-text-primary)' }}>{user?.full_name}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--eoc-text-muted)' }}>{ROLE_LABELS[user?.role]}</p>
              </div>
              <ChevronDown size={12} style={{ color: 'var(--eoc-text-muted)' }} />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-11 w-52 rounded-xl z-50 border overflow-hidden" style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)', boxShadow: '0 10px 40px rgba(0,0,0,0.12)' }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--eoc-border)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--eoc-text-primary)' }}>{user?.full_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--eoc-text-muted)' }}>{user?.email}</p>
                  <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user?.role] || 'bg-gray-500/20 text-gray-300'}`}>
                    {ROLE_LABELS[user?.role]}
                  </span>
                </div>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm transition hover:opacity-80"
                  style={{ color: 'var(--eoc-critical)' }}
                >
                  <LogOut size={14} /> {t('actions.logout', 'Đăng xuất')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-56' : 'w-14'} shrink-0 flex flex-col border-r transition-all duration-200`} style={{ background: 'var(--eoc-bg-secondary)', borderColor: 'var(--eoc-border)' }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-3 flex items-center justify-center transition hover:opacity-70" style={{ color: 'var(--eoc-text-muted)' }}>
            <Menu size={18} />
          </button>

          <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
            {filteredNav.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path
                || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={!sidebarOpen ? item.label : undefined}
                  className="relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all"
                  style={{
                    background: isActive ? 'var(--eoc-accent-glow)' : '',
                    color: isActive ? 'var(--eoc-accent)' : 'var(--eoc-text-secondary)',
                    borderLeft: isActive ? `2px solid var(--eoc-accent)` : '2px solid transparent',
                  }}
                >
                  <Icon size={16} className="shrink-0" />
                  {sidebarOpen && <span className="flex-1 font-medium">{item.label}</span>}
                  {sidebarOpen && ['/dashboard/requests-management', '/dashboard/tasks'].includes(item.path) && pendingRequestsCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center" style={{ background: 'var(--eoc-critical)', color: '#fff' }}>
                      {pendingRequestsCount > 99 ? '99+' : pendingRequestsCount}
                    </span>
                  )}
                  {!sidebarOpen && ['/dashboard/requests-management', '/dashboard/tasks'].includes(item.path) && pendingRequestsCount > 0 && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--eoc-critical)' }} />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="px-2 pb-3 border-t" style={{ borderColor: 'var(--eoc-border)' }}>
            <Link to="/" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition hover:opacity-70" style={{ color: 'var(--eoc-text-muted)' }}>
              <Globe size={16} className="shrink-0" />
              {sidebarOpen && <span>{t('nav.publicMap')}</span>}
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>

      {/* ── Footer status bar ── */}
      <footer className="shrink-0 flex items-center gap-4 px-4 py-1.5 border-t text-[10px]" style={{ background: 'var(--eoc-bg-secondary)', borderColor: 'var(--eoc-border)', color: 'var(--eoc-text-muted)' }}>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Database OK
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Socket.io
        </span>
        {activeDisasters.length > 0 && (
          <span className="flex items-center gap-1" style={{ color: 'var(--eoc-warning)' }}>
            ⚠️ {activeDisasters.length} sự kiện thiên tai đang theo dõi
          </span>
        )}
        <span className="ml-auto">VDRCS v2.0.0</span>
      </footer>

      <OnlineStatus />
    </div>
  );
}
