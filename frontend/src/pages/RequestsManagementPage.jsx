import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { requestAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { formatDate } from '../utils/helpers';
import {
  RefreshCw, ThumbsUp, ThumbsDown, Camera, Navigation,
  ExternalLink, X, Search, Filter, AlertTriangle, Download
} from 'lucide-react';

// Nhãn phân loại cứu hộ hiển thị cho coordinator
const RESCUE_CATEGORY = {
  cuu_nan: {
    label: 'Cứu Nạn',
    cls: 'bg-red-100 text-red-700 border border-red-200',
    desc: 'Người bị kẹt/nguy hiểm trực tiếp',
    resources: ['Áo phao', 'Bông băng y tế', 'Túi y tế khẩn cấp', 'Cáng cứu thương', 'Dây cứu sinh', 'Xuồng cứu hộ'],
  },
  cuu_tro: {
    label: 'Cứu Trợ',
    cls: 'bg-green-100 text-green-700 border border-green-200',
    desc: 'Cần lương thực, nước, nhu yếu phẩm',
    resources: ['Gạo', 'Mì tôm', 'Nước uống', 'Đồ hộp thực phẩm', 'Quần áo khô', 'Chăn mền'],
  },
  cuu_ho: {
    label: 'Cứu Hộ',
    cls: 'bg-purple-100 text-purple-700 border border-purple-200',
    desc: 'Sơ tán / y tế di chuyển khẩn cấp',
    resources: ['Xe cứu thương', 'Cáng cứu thương', 'Túi y tế khẩn cấp', 'Xe lăn', 'Bạt che mưa'],
  },
};

export default function RequestsManagementPage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const [verifyingAll, setVerifyingAll] = useState(false);
  const [expandedMapId, setExpandedMapId] = useState(null);
  const [expandedImagesId, setExpandedImagesId] = useState(null);
  const [requestImagesMap, setRequestImagesMap] = useState({});
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [filterCategory, setFilterCategory] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (filterStatus) params.status = filterStatus;
      const { data } = await requestAPI.getAll(params);
      setRequests(data?.data || data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Socket: refresh on request events
  useEffect(() => {
    const socket = getSocket();
    const refresh = () => fetchRequests();
    socket.on('request_created', refresh);
    socket.on('request_updated', refresh);
    return () => {
      socket.off('request_created', refresh);
      socket.off('request_updated', refresh);
    };
  }, [fetchRequests]);

  const loadRequestImages = async (id) => {
    if (expandedImagesId === id) { setExpandedImagesId(null); return; }
    if (requestImagesMap[id]) { setExpandedImagesId(id); return; }
    try {
      const { data } = await requestAPI.getById(id);
      setRequestImagesMap(prev => ({ ...prev, [id]: data.images || [] }));
      setExpandedImagesId(id);
    } catch (err) { console.error(err); }
  };

  const handleVerify = async (id) => {
    setVerifyingId(id);
    try {
      await requestAPI.verify(id, {});
      fetchRequests();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
    finally { setVerifyingId(null); }
  };

  const handleVerifyAll = async () => {
    const pending = requests.filter(r => r.status === 'pending');
    if (pending.length === 0) return;
    if (!window.confirm(`Duyệt tất cả ${pending.length} yêu cầu đang chờ?`)) return;
    setVerifyingAll(true);
    try {
      await Promise.all(pending.map(r => requestAPI.verify(r.id, {})));
      fetchRequests();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
    finally { setVerifyingAll(false); }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Lý do từ chối:');
    if (reason === null) return;
    setVerifyingId(id);
    try {
      await requestAPI.reject(id, { reason });
      fetchRequests();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
    finally { setVerifyingId(null); }
  };

  const filtered = requests.filter(r => {
    if (filterCategory && r.rescue_category !== filterCategory) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.tracking_code?.toLowerCase().includes(q) ||
      r.citizen_name?.toLowerCase().includes(q) ||
      r.citizen_phone?.includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.province_name?.toLowerCase().includes(q)
    );
  });

  const categoryCounts = {
    cuu_nan: requests.filter(r => r.rescue_category === 'cuu_nan').length,
    cuu_tro: requests.filter(r => r.rescue_category === 'cuu_tro').length,
    cuu_ho:  requests.filter(r => r.rescue_category === 'cuu_ho').length,
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const STATUS_OPTS = [
    { value: 'pending',  labelKey: 'status.pending' },
    { value: 'verified', labelKey: 'status.verified' },
    { value: '',         labelKey: 'common.all' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--eoc-text-primary)' }}>{t('requests_mgmt_page.title')}</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-orange-600 mt-0.5">
              <AlertTriangle className="inline w-4 h-4 mr-1" />
              {pendingCount} {t('requests_mgmt_page.pending_notice')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="pl-8 pr-3 py-2 text-sm border rounded-lg w-52"
              placeholder={t('requests_mgmt_page.search')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 border rounded-lg px-2 py-1.5">
            <Filter className="w-4 h-4 text-gray-400" />
            <select className="text-sm border-none outline-none bg-transparent"
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              {STATUS_OPTS.map(o => (
                <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
              ))}
            </select>
          </div>
          <button onClick={fetchRequests} className="p-2 border rounded-lg hover:bg-gray-50" title="Tải lại">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <a
            href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/requests${filterStatus ? `?status=${filterStatus}` : ''}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
            title="Xuất danh sách ra Excel"
          >
            <Download size={14} /> {t('actions.export')}
          </a>
          {pendingCount > 0 && (
            <button onClick={handleVerifyAll} disabled={verifyingAll}
              className="flex items-center gap-1.5 px-4 py-2 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              style={{ background: 'var(--eoc-accent)' }}>
              <ThumbsUp size={14} />
              {verifyingAll ? '...' : `${t('requests_mgmt_page.verify_all')} (${pendingCount})`}
            </button>
          )}
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCategory('')}
          className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${filterCategory === '' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          {t('common.all')} ({requests.length})
        </button>
        {Object.entries(RESCUE_CATEGORY).map(([key, cat]) => (
          <button key={key}
            onClick={() => setFilterCategory(filterCategory === key ? '' : key)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors flex items-center gap-1.5 ${filterCategory === key ? 'ring-2 ring-offset-1 ring-gray-400 ' + cat.cls : cat.cls + ' opacity-80 hover:opacity-100'}`}>
            {t(`requests_page.rescue_category.${key}`, cat.label)}
            <span className="text-xs font-bold">{categoryCounts[key]}</span>
          </button>
        ))}
      </div>


      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--eoc-text-muted)' }}>{t('requests_mgmt_page.empty')}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(req => (
            <div key={req.id} className="bg-white border rounded-xl overflow-hidden cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => req.latitude && req.longitude && setExpandedMapId(expandedMapId === req.id ? null : req.id)}>
              <div className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-blue-700 font-bold">{req.tracking_code}</span>
                    {req.rescue_category && RESCUE_CATEGORY[req.rescue_category] && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${RESCUE_CATEGORY[req.rescue_category].cls}`}
                        title={RESCUE_CATEGORY[req.rescue_category].desc}>
                        {RESCUE_CATEGORY[req.rescue_category].label}
                      </span>
                    )}
                    {req.status === 'pending' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">{t('status.pending')}</span>
                    )}
                    {req.status === 'verified' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{t('status.verified')}</span>
                    )}
                    {req.incident_type && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{req.incident_type}</span>
                    )}
                    {req.urgency_level && (
                      <span className="text-xs font-medium" style={{ color: req.urgency_color }}>
                        ⚠ {req.urgency_level}
                      </span>
                    )}
                    {req.flood_severity && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                        🌊 Cấp {req.flood_severity}/5
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800 mt-1 truncate">
                    {req.description || 'Không có mô tả'}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                    {req.citizen_name && <span>👤 {req.citizen_name}</span>}
                    {req.citizen_phone && <span>📞 {req.citizen_phone}</span>}
                    {req.address && <span className="truncate max-w-xs">📍 {req.address}</span>}
                    {req.victim_count > 0 && <span>👥 {req.victim_count} người</span>}
                    {req.province_name && <span>🗺 {req.province_name}</span>}
                    <span>🕐 {formatDate(req.created_at)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  {req.status === 'pending' && (
                    <>
                      <button onClick={() => handleVerify(req.id)} disabled={verifyingId === req.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                        <ThumbsUp size={12} /> {t('requests_mgmt_page.verify')}
                      </button>
                      <button onClick={() => handleReject(req.id)} disabled={verifyingId === req.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50">
                        <ThumbsDown size={12} /> {t('requests_mgmt_page.reject')}
                      </button>
                    </>
                  )}
                  <button onClick={() => loadRequestImages(req.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs border rounded-lg transition-colors ${
                      expandedImagesId === req.id
                        ? 'bg-purple-100 border-purple-300 text-purple-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}>
                    <Camera size={12} /> {t('requests_mgmt_page.view_images')}
                    {req.image_count > 0 && (
                      <span className="ml-0.5 bg-purple-600 text-white rounded-full text-[10px] leading-none px-1.5 py-0.5">
                        {req.image_count}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Images */}
              {expandedImagesId === req.id && (
                <div className="border-t px-4 py-3 bg-gray-50" onClick={e => e.stopPropagation()}>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Ảnh đính kèm</h4>
                  {(requestImagesMap[req.id] || []).length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Không có ảnh đính kèm.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(requestImagesMap[req.id] || []).map((img, i) => (
                        <img key={i} src={img.image_url} alt={`ảnh ${i + 1}`}
                          onClick={() => setLightboxUrl(img.image_url)}
                          className="w-24 h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity" />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Map */}
              {expandedMapId === req.id && req.latitude && req.longitude && (
                <div className="border-t px-4 py-3 bg-gray-50">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Vị trí cứu hộ</h4>
                  <div className="rounded-lg overflow-hidden border" style={{ height: 200 }}>
                    <iframe title="map" width="100%" height="200" frameBorder="0" style={{ border: 0 }}
                      src={`https://maps.google.com/maps?q=${req.latitude},${req.longitude}&z=15&output=embed`}
                      allowFullScreen
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${req.latitude},${req.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <Navigation className="w-3.5 h-3.5" /> Chỉ đường (Google Maps)
                    </a>
                    <a href={`https://maps.google.com/maps?q=${req.latitude},${req.longitude}&z=15`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 text-xs border rounded-lg hover:bg-gray-100">
                      <ExternalLink className="w-3.5 h-3.5" /> Mở bản đồ
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-gray-300" onClick={() => setLightboxUrl(null)}>
            <X size={28} />
          </button>
          <img src={lightboxUrl} alt="ảnh lớn"
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
