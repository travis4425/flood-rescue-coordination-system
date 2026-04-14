import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ClipboardCheck, Package, Truck, CheckCircle, Clock, RefreshCw, ShieldCheck, AlertTriangle, ChevronDown, ChevronUp, Search, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resourceAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import { getSocket } from '../services/socket';

const SUPPLY_STATUS_LABELS = {
  issued:             { label: 'Đã xuất',          color: 'bg-blue-100 text-blue-700' },
  confirmed:          { label: 'Đội đã nhận',       color: 'bg-indigo-100 text-indigo-700' },
  return_requested:   { label: 'Đang yêu cầu trả', color: 'bg-yellow-100 text-yellow-700' },
  partially_returned: { label: 'Trả 1 phần',        color: 'bg-orange-100 text-orange-700' },
  returned:           { label: 'Đã trả hết',         color: 'bg-green-100 text-green-700' },
};

const VEHICLE_TYPE_LABELS = {
  boat: 'Thuyền',
  truck: 'Xe tải',
  car: 'Xe ô tô',
  helicopter: 'Trực thăng',
  ambulance: 'Xe cấp cứu',
  other: 'Khác',
};

const VEHICLE_STATUS_LABELS = {
  pending: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Đã duyệt', color: 'bg-blue-100 text-blue-700' },
  fulfilled: { label: 'Đã nhận xe', color: 'bg-indigo-100 text-indigo-700' },
  returned: { label: 'Đã trả xe', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Đã hủy', color: 'bg-gray-100 text-gray-500' },
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(typeof dateStr === 'string' ? dateStr.replace(/Z$/, '') : dateStr);
  return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

export default function InventoryCheckPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [tab, setTab] = useState('supplies');
  const [distributions, setDistributions] = useState([]);
  const [vehicleRequests, setVehicleRequests] = useState([]);
  const [maintenanceVehicles, setMaintenanceVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [error, setError] = useState('');
  const [voucherSearch, setVoucherSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [historyData, setHistoryData] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterDir, setHistoryFilterDir] = useState('');
  const [returnModal, setReturnModal] = useState({ open: false, id: null, max: null, requested: null, qty: '' });
  const [incidentModal, setIncidentModal] = useState({ open: false, id: null, reported_type: null, reported_note: null, confirmed_type: 'damaged', confirmed_note: '' });

  const fetchDistributions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await resourceAPI.getDistributions({});
      setDistributions(res.data || []);
    } catch {
      setError('Không thể tải dữ liệu vật tư.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVehicleRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dispatchRes, vehicleRes] = await Promise.all([
        resourceAPI.getVehicleDispatches({}),
        resourceAPI.getVehicles({ status: 'maintenance' }),
      ]);
      setVehicleRequests(dispatchRes.data || []);
      setMaintenanceVehicles(vehicleRes.data || []);
    } catch {
      setError('Không thể tải dữ liệu phương tiện.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await resourceAPI.getHistory();
      setHistoryData(res.data || []);
    } catch {
      setError('Không thể tải lịch sử nhập xuất.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch cả 2 khi mount để badge hiện đúng ngay từ đầu
  useEffect(() => {
    fetchDistributions();
    fetchVehicleRequests();
  }, [fetchDistributions, fetchVehicleRequests]);

  // Refresh lại tab hiện tại khi chuyển tab
  useEffect(() => {
    if (tab === 'supplies') fetchDistributions();
    else if (tab === 'vehicles') fetchVehicleRequests();
    else if (tab === 'history') fetchHistory();
  }, [tab, fetchDistributions, fetchVehicleRequests, fetchHistory]);

  // Real-time socket listeners
  useEffect(() => {
    const socket = getSocket();

    const onDistributionChange = () => fetchDistributions();
    const onVehicleChange = () => fetchVehicleRequests();

    socket.on('distribution_new', onDistributionChange);
    socket.on('distribution_warehouse_confirmed', onDistributionChange);
    socket.on('distribution_return_requested', onDistributionChange);
    socket.on('distribution_return_confirmed', onDistributionChange);

    socket.on('vehicle_dispatch_new', onVehicleChange);
    socket.on('vehicle_dispatch_returned', onVehicleChange);
    socket.on('vehicle_incident_reported', onVehicleChange);
    socket.on('vehicle_incident_confirmed', onVehicleChange);
    socket.on('vehicle_warehouse_confirmed', onVehicleChange);

    return () => {
      socket.off('distribution_new', onDistributionChange);
      socket.off('distribution_warehouse_confirmed', onDistributionChange);
      socket.off('distribution_return_requested', onDistributionChange);
      socket.off('distribution_return_confirmed', onDistributionChange);

      socket.off('vehicle_dispatch_new', onVehicleChange);
      socket.off('vehicle_dispatch_returned', onVehicleChange);
      socket.off('vehicle_incident_reported', onVehicleChange);
      socket.off('vehicle_incident_confirmed', onVehicleChange);
      socket.off('vehicle_warehouse_confirmed', onVehicleChange);
    };
  }, [fetchDistributions, fetchVehicleRequests]);

  async function handleTeamConfirmReceipt(id) {
    setConfirmingId(id);
    try {
      await resourceAPI.confirmDistribution(id);
      setDistributions(prev =>
        prev.map(d => d.id === id ? { ...d, status: 'confirmed', confirmed_at: new Date().toISOString() } : d)
      );
    } catch (e) {
      alert(e?.response?.data?.error || 'Xác nhận thất bại.');
    } finally {
      setConfirmingId(null);
    }
  }

  function handleConfirmReturn(id) {
    const dist = distributions.find(d => d.id === id);
    setReturnModal({
      open: true,
      id,
      max: dist?.return_quantity ?? dist?.quantity ?? null,
      requested: dist?.return_quantity ?? null,
      qty: String(dist?.return_quantity ?? ''),
    });
  }

  async function handleSubmitReturn() {
    const qty = parseInt(returnModal.qty, 10);
    if (!qty || qty <= 0) { alert('Vui lòng nhập số lượng thực nhận hợp lệ.'); return; }
    const { id } = returnModal;
    setReturnModal(m => ({ ...m, open: false }));
    setConfirmingId(id);
    try {
      const res = await resourceAPI.confirmReturnDistribution(id, { received_quantity: qty });
      const newStatus = res.data?.status || 'returned';
      setDistributions(prev =>
        prev.map(d => d.id === id ? { ...d, status: newStatus, return_confirmed_at: new Date().toISOString() } : d)
      );
    } catch (e) {
      alert(e?.response?.data?.error || 'Xác nhận thất bại.');
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleWarehouseConfirm(id) {
    setConfirmingId(id);
    try {
      await resourceAPI.warehouseConfirmDistribution(id);
      setDistributions(prev =>
        prev.map(d => d.id === id ? { ...d, warehouse_confirmed: 1, warehouse_confirmed_at: new Date().toISOString() } : d)
      );
    } catch (e) {
      alert(e?.response?.data?.error || 'Xác nhận thất bại.');
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleWarehouseConfirmVehicle(id) {
    setConfirmingId(id);
    try {
      await resourceAPI.warehouseConfirmVehicleDispatch(id);
      setVehicleRequests(prev =>
        prev.map(v => v.id === id ? { ...v, warehouse_confirmed: 1, warehouse_confirmed_at: new Date().toISOString() } : v)
      );
    } catch (e) {
      alert(e?.response?.data?.error || 'Xác nhận thất bại.');
    } finally {
      setConfirmingId(null);
    }
  }

  function handleOpenIncidentModal(v) {
    setIncidentModal({
      open: true,
      id: v.id,
      reported_type: v.incident_type,
      reported_note: v.incident_note,
      confirmed_type: v.incident_type || 'damaged',
      confirmed_note: '',
    });
  }

  async function handleSubmitIncident() {
    const { id, confirmed_type, confirmed_note } = incidentModal;
    setIncidentModal(m => ({ ...m, open: false }));
    setConfirmingId(id);
    try {
      await resourceAPI.confirmVehicleIncident(id, { confirmed_type, confirmed_note });
      setVehicleRequests(prev =>
        prev.map(v => v.id === id ? { ...v, status: 'cancelled', incident_confirmed: 1 } : v)
      );
    } catch (e) {
      alert(e?.response?.data?.error || 'Xác nhận thất bại.');
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleConfirmVehicleReturn(id) {
    setConfirmingId(id);
    try {
      await resourceAPI.confirmReturnVehicleDispatch(id);
      setVehicleRequests(prev =>
        prev.map(v => v.id === id ? { ...v, status: 'cancelled', return_confirmed_at: new Date().toISOString() } : v)
      );
    } catch (e) {
      alert(e?.response?.data?.error || 'Xác nhận thất bại.');
    } finally {
      setConfirmingId(null);
    }
  }

  const pendingSupplies = distributions.filter(d => d.status !== 'returned').length;
  const pendingVehicles = vehicleRequests.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="text-blue-600" size={28} />
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--eoc-text-primary)' }}>{t('inventory_page.title')}</h1>
          </div>
        </div>
        <button
          onClick={() => tab === 'supplies' ? fetchDistributions() : tab === 'vehicles' ? fetchVehicleRequests() : fetchHistory()}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          <RefreshCw size={15} /> {t('actions.refresh')}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0">
          <button
            onClick={() => setTab('supplies')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition
              ${tab === 'supplies'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Package size={16} />
            {t('inventory_page.supplies')}
            {pendingSupplies > 0 && (
              <span className="ml-1 bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                {pendingSupplies}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('vehicles')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition
              ${tab === 'vehicles'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Truck size={16} />
            {t('inventory_page.vehicles')}
            {pendingVehicles > 0 && (
              <span className="ml-1 bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                {pendingVehicles}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition
              ${tab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <History size={16} />
            {t('inventory_page.history')}
          </button>
        </nav>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {tab !== 'history' && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={tab === 'supplies' ? 'Tra cứu mã phiếu (VT-...)...' : 'Tìm theo mã phiếu (XE-...), biển số, tên xe...'}
            value={tab === 'supplies' ? voucherSearch : vehicleSearch}
            onChange={e => tab === 'supplies' ? setVoucherSearch(e.target.value) : setVehicleSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono w-64 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          {(tab === 'supplies' ? voucherSearch : vehicleSearch) && (
            <button
              onClick={() => tab === 'supplies' ? setVoucherSearch('') : setVehicleSearch('')}
              className="text-xs text-gray-400 hover:text-gray-600"
            >Xóa</button>
          )}
        </div>
      )}

      {/* Modal xác nhận nhận lại vật tư */}
      {returnModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-96 space-y-4">
            <h3 className="font-bold text-gray-900 text-base">Xác nhận nhận lại vật tư</h3>

            {returnModal.requested != null && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2.5 text-sm">
                <span className="text-gray-500">Đội khai trả: </span>
                <span className="font-bold text-yellow-800">{returnModal.requested}</span>
                <span className="text-gray-500 ml-1">đơn vị</span>
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">
                Số lượng thực tế kho đếm được
                {returnModal.max != null && (
                  <span className="text-gray-400 ml-1">(tối đa {returnModal.max})</span>
                )}:
              </label>
              <input
                type="number"
                min="1"
                max={returnModal.max ?? undefined}
                value={returnModal.qty}
                onChange={e => setReturnModal(m => ({ ...m, qty: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSubmitReturn()}
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Nhập số lượng..."
              />
              {returnModal.requested != null && returnModal.qty &&
                parseInt(returnModal.qty, 10) !== returnModal.requested && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ Số lượng khác với khai báo của đội — sẽ ghi nhận theo số bạn đếm.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setReturnModal({ open: false, id: null, max: null, requested: null, qty: '' })}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitReturn}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Xác nhận nhận lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận tình trạng xe sự cố */}
      {incidentModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-[420px] space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-orange-500" size={20} />
              <h3 className="font-bold text-gray-900 text-base">Xác nhận tình trạng xe sau sự cố</h3>
            </div>

            {(incidentModal.reported_type || incidentModal.reported_note) && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm space-y-1">
                <p className="font-medium text-orange-800">Đội báo cáo:</p>
                {incidentModal.reported_type && (
                  <p className="text-orange-700">
                    Loại sự cố: <span className="font-semibold">
                      {incidentModal.reported_type === 'damaged' ? 'Hư hỏng' : 'Mất/Thất lạc'}
                    </span>
                  </p>
                )}
                {incidentModal.reported_note && (
                  <p className="text-orange-600 italic">"{incidentModal.reported_note}"</p>
                )}
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Kho xác nhận thực tế:</p>
              <div className="space-y-2">
                {[
                  { value: 'damaged', label: 'Hư hỏng — cần sửa chữa', color: 'text-orange-700' },
                  { value: 'lost',    label: 'Mất/Thất lạc — không thu hồi được', color: 'text-red-700' },
                  { value: 'ok',      label: 'Bình thường — xe vẫn ổn', color: 'text-green-700' },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <input
                      type="radio"
                      name="confirmed_type"
                      value={opt.value}
                      checked={incidentModal.confirmed_type === opt.value}
                      onChange={e => setIncidentModal(m => ({ ...m, confirmed_type: e.target.value }))}
                      className="accent-blue-600"
                    />
                    <span className={`text-sm font-medium ${opt.color}`}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Ghi chú thêm (tuỳ chọn):</label>
              <textarea
                value={incidentModal.confirmed_note}
                onChange={e => setIncidentModal(m => ({ ...m, confirmed_note: e.target.value }))}
                rows={2}
                placeholder="Mô tả mức độ hư hỏng, vị trí phát hiện..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setIncidentModal(m => ({ ...m, open: false }))}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitIncident}
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
              >
                Xác nhận & Báo cáo lên
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400 text-sm">Đang tải...</div>
      ) : tab === 'history' ? (
        <div>
          {/* Search + filter bar */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" size={14} />
              <input
                type="text"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Tìm đội, vật tư/xe, mã phiếu..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              {historySearch && (
                <button onClick={() => setHistorySearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
              )}
            </div>
            <select
              value={historyFilterDir}
              onChange={e => setHistoryFilterDir(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            >
              <option value="">Tất cả</option>
              <option value="issue">Xuất kho</option>
              <option value="return">Trả hàng</option>
              <option value="import">Nhập kho</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
          {(() => {
            const q = historySearch.toLowerCase().trim();
            const filtered = historyData.filter(row => {
              if (historyFilterDir === 'return') {
                if (!['returned', 'partially_returned'].includes(row.status)) return false;
              } else if (historyFilterDir === 'cancelled') {
                if (row.status !== 'cancelled') return false;
              } else if (historyFilterDir === 'issue') {
                if (row.direction !== 'issue') return false;
                if (['returned', 'partially_returned', 'cancelled'].includes(row.status)) return false;
              } else if (historyFilterDir && row.direction !== historyFilterDir) return false;
              if (!q) return true;
              return (
                row.item_name?.toLowerCase().includes(q) ||
                row.team_name?.toLowerCase().includes(q) ||
                row.voucher_code?.toLowerCase().includes(q) ||
                row.warehouse_name?.toLowerCase().includes(q)
              );
            });
            const STATUS_LABEL = { issued: 'Đã xuất', confirmed: 'Đã nhận', returned: 'Đã trả', partially_returned: 'Trả 1 phần', return_requested: 'Xin trả', dispatched: 'Điều động', fulfilled: 'Đã nhận xe', cancelled: 'Đã hủy', manager_approved: 'Chờ kho duyệt', approved: 'Kho đã duyệt', rejected: 'Từ chối' };
            const STATUS_CLS = { issued: 'bg-blue-100 text-blue-700', confirmed: 'bg-green-100 text-green-700', returned: 'bg-gray-100 text-gray-600', partially_returned: 'bg-orange-100 text-orange-700', return_requested: 'bg-yellow-100 text-yellow-700', dispatched: 'bg-purple-100 text-purple-700', fulfilled: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-500', manager_approved: 'bg-sky-100 text-sky-700', approved: 'bg-indigo-100 text-indigo-700', rejected: 'bg-red-100 text-red-700' };
            if (historyData.length === 0) return <div className="text-center py-16 text-gray-400 text-sm">Chưa có lịch sử nhập xuất.</div>;
            if (filtered.length === 0) return <div className="text-center py-12 text-gray-400 text-sm">Không tìm thấy kết quả phù hợp.</div>;
            return (
              <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b">
                      <th className="px-4 py-3 text-left">Thời gian</th>
                      <th className="px-4 py-3 text-left">Loại</th>
                      <th className="px-4 py-3 text-left">Hướng</th>
                      <th className="px-4 py-3 text-left">Vật tư / Xe</th>
                      <th className="px-4 py-3 text-right">Số lượng</th>
                      <th className="px-4 py-3 text-left">Đội / Kho nhận</th>
                      <th className="px-4 py-3 text-left font-mono">Mã phiếu</th>
                      <th className="px-4 py-3 text-left">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs">{new Date(row.event_time).toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${row.record_type === 'vehicle' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                            {row.record_type === 'vehicle' ? 'Xe' : 'Vật tư'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${row.direction === 'issue' ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
                            {row.direction === 'issue' ? 'Xuất' : 'Nhập'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-gray-800">
                          {row.item_name}
                          {row.record_type === 'vehicle' && row.unit && <span className="ml-1 text-xs text-gray-400">{row.unit}</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-700">
                          {row.record_type === 'vehicle' ? '1' : `${row.quantity} ${row.unit || ''}`}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-gray-800">
                          {row.record_type === 'import' ? (row.warehouse_name || '—') : (row.team_name || '—')}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-blue-700 text-xs font-bold">{row.voucher_code || '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_CLS[row.status] || 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABEL[row.status] || row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-gray-400 px-4 py-2 border-t">{filtered.length} bản ghi</p>
              </div>
            );
          })()}
        </div>
      ) : tab === 'supplies' ? (
        <SuppliesTable
          rows={voucherSearch
            ? distributions.filter(d => d.voucher_code?.toLowerCase().includes(voucherSearch.toLowerCase()))
            : distributions}
          onConfirmReturn={handleConfirmReturn}
          onWarehouseConfirm={handleWarehouseConfirm}
          onTeamConfirmReceipt={handleTeamConfirmReceipt}
          confirmingId={confirmingId}
          setConfirmingId={setConfirmingId}
          setDistributions={setDistributions}
          user={user}
        />
      ) : (
        <>
        <VehiclesTable
          rows={vehicleSearch
            ? vehicleRequests.filter(v =>
                v.plate_number?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
                v.vehicle_name?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
                v.team_name?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
                `XE-${String(v.id).padStart(4, '0')}`.toLowerCase().includes(vehicleSearch.toLowerCase())
              )
            : vehicleRequests}
          onWarehouseConfirm={handleWarehouseConfirmVehicle}
          onConfirmReturn={handleConfirmVehicleReturn}
          onConfirmIncident={handleOpenIncidentModal}
          confirmingId={confirmingId}
          user={user}
        />

        {/* Xe đang sửa chữa */}
        {user?.role === 'warehouse_manager' && maintenanceVehicles.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-1.5">
              <AlertTriangle size={14} /> Xe đang bảo trì ({maintenanceVehicles.length})
            </h3>
            <div className="space-y-2">
              {maintenanceVehicles.map(v => (
                <div key={v.id} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                      {VEHICLE_TYPE_LABELS[v.type] || v.type}
                    </span>
                    <span className="text-sm font-medium text-gray-800">{v.name}</span>
                    <span className="font-mono text-xs text-gray-500">{v.plate_number}</span>
                  </div>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Xác nhận xe ${v.name} (${v.plate_number}) đã sửa xong?`)) return;
                      try {
                        await resourceAPI.markVehicleRepaired(v.id);
                        setMaintenanceVehicles(prev => prev.filter(x => x.id !== v.id));
                      } catch (e) { alert(e?.response?.data?.error || 'Có lỗi.'); }
                    }}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 font-medium"
                  >
                    ✓ Sửa xong
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}

function SuppliesTable({ rows, onConfirmReturn, onWarehouseConfirm, onTeamConfirmReceipt, confirmingId, user, setConfirmingId, setDistributions }) {
  const canWarehouseConfirm = ['manager', 'warehouse_manager'].includes(user?.role);
  const canTeamConfirm = user?.role === 'rescue_team' && user?.is_team_leader;

  // Xác nhận nhận lại tất cả items trong 1 phiếu (auto dùng return_quantity của từng item)
  const handleConfirmReturnAll = async (items) => {
    if (!window.confirm(`Xác nhận nhận lại tất cả ${items.length} loại vật tư?`)) return;
    for (const item of items) {
      setConfirmingId(item.id);
      try {
        const res = await resourceAPI.confirmReturnDistribution(item.id, {
          received_quantity: item.return_quantity ?? item.quantity,
        });
        const newStatus = res.data?.status || 'returned';
        setDistributions((prev) =>
          prev.map((d) => d.id === item.id ? { ...d, status: newStatus, return_confirmed_at: new Date().toISOString() } : d)
        );
      } catch (e) {
        alert(e?.response?.data?.error || `Xác nhận thất bại: ${item.item_name}`);
      } finally {
        setConfirmingId(null);
      }
    }
  };

  // Nhóm các dòng cùng voucher_code thành 1 phiếu
  const groups = useMemo(() => {
    const map = new Map();
    for (const d of rows) {
      const key = d.voucher_code || `solo-${d.id}`;
      if (!map.has(key)) {
        map.set(key, {
          voucher_code: d.voucher_code,
          team_name: d.team_name,
          warehouse_name: d.warehouse_name,
          distributed_by_name: d.distributed_by_name,
          created_at: d.created_at,
          items: [],
        });
      }
      map.get(key).items.push(d);
    }
    return [...map.values()];
  }, [rows]);

  if (!groups.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Package size={40} className="mx-auto mb-3 opacity-30" />
        <p>Chưa có bản ghi xuất vật tư nào.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <VoucherGroup
          key={group.voucher_code || group.items[0].id}
          group={group}
          canWarehouseConfirm={canWarehouseConfirm}
          canTeamConfirm={canTeamConfirm}
          onWarehouseConfirm={onWarehouseConfirm}
          onConfirmReturn={onConfirmReturn}
          onConfirmReturnAll={handleConfirmReturnAll}
          onTeamConfirmReceipt={onTeamConfirmReceipt}
          confirmingId={confirmingId}
        />
      ))}
    </div>
  );
}

function VoucherGroup({ group, canWarehouseConfirm, canTeamConfirm, onWarehouseConfirm, onConfirmReturn, onConfirmReturnAll, onTeamConfirmReceipt, confirmingId }) {
  const [open, setOpen] = useState(false);

  // Trạng thái tổng của cả phiếu (ưu tiên trạng thái nặng nhất)
  const statuses = group.items.map((i) => i.status);
  const groupStatus = statuses.includes('return_requested') ? 'return_requested'
    : statuses.includes('issued') ? 'issued'
    : statuses.includes('confirmed') ? 'confirmed'
    : statuses.includes('partially_returned') ? 'partially_returned'
    : 'returned';
  const st = SUPPLY_STATUS_LABELS[groupStatus] || { label: groupStatus, color: 'bg-gray-100 text-gray-500' };

  const pendingConfirm = group.items.filter((i) => !i.warehouse_confirmed && i.status === 'issued');
  const pendingTeamConfirm = group.items.filter((i) => i.warehouse_confirmed && i.status === 'issued');
  const pendingReturn = group.items.filter((i) => i.status === 'return_requested');

  return (
    <div className={`border rounded-xl bg-white shadow-sm overflow-hidden ${groupStatus === 'returned' ? 'opacity-60' : ''}`}>
      {/* Header hàng (click để mở rộng) */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded shrink-0">
            {group.voucher_code || '—'}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-gray-800 truncate">{group.team_name || '—'}</p>
            <p className="text-xs text-gray-500 truncate">
              {group.warehouse_name} · {group.items.length} loại vật tư
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
            {groupStatus === 'returned' ? <CheckCircle size={11} /> : <Clock size={11} />}
            {st.label}
          </span>
          <span className="text-xs text-gray-400 hidden sm:block">{fmt(group.created_at)}</span>
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {/* Chi tiết mở rộng */}
      {open && (
        <div className="border-t bg-gray-50 px-4 py-3 space-y-3">
          {group.distributed_by_name && (
            <p className="text-xs text-gray-500">Cấp bởi: <span className="font-medium">{group.distributed_by_name}</span></p>
          )}

          {/* 📥 Nhận hàng */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">📥 Nhận hàng</p>
            <div className="rounded-lg border overflow-hidden bg-white">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-[38%]" />
                  <col className="w-[16%]" />
                  <col className="w-[24%]" />
                  <col className="w-[22%]" />
                </colgroup>
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Vật tư</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Số lượng</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Trạng thái</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Thời gian nhận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {group.items.map((item) => {
                    const teamReceived = ['confirmed', 'return_requested', 'returned', 'partially_returned'].includes(item.status);
                    const warehouseHandedOver = item.status === 'issued' && item.warehouse_confirmed;
                    const itemReceiveSt = teamReceived
                      ? { label: 'Đội đã nhận', color: 'bg-green-100 text-green-700', time: item.confirmed_at }
                      : warehouseHandedOver
                      ? { label: 'Kho đã bàn giao', color: 'bg-indigo-100 text-indigo-700', time: item.warehouse_confirmed_at }
                      : { label: 'Chưa bàn giao', color: 'bg-gray-100 text-gray-500', time: null };
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-2">
                          <span className="font-medium text-gray-800">{item.item_name}</span>
                          {item.category && <span className="ml-1 text-xs text-gray-400">({item.category})</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-gray-700">
                          {item.quantity} <span className="text-gray-400 text-xs">{item.item_unit}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium ${itemReceiveSt.color}`}>
                            {itemReceiveSt.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">{itemReceiveSt.time ? fmt(itemReceiveSt.time) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 📤 Trả hàng */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">📤 Trả hàng</p>
            <div className="rounded-lg border overflow-hidden bg-white">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-[38%]" />
                  <col className="w-[16%]" />
                  <col className="w-[24%]" />
                  <col className="w-[22%]" />
                </colgroup>
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Vật tư</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Số lượng trả</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Trạng thái</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Thời gian trả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {group.items.map((item) => {
                    const hasReturn = ['return_requested', 'returned', 'partially_returned'].includes(item.status);
                    const returnConfirmed = !!item.return_confirmed_at;
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-2 font-medium text-gray-700">{item.item_name}</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-700">
                          {hasReturn ? <>{item.return_quantity ?? item.quantity} <span className="text-gray-400 text-xs">{item.item_unit}</span></> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          {hasReturn ? (
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              returnConfirmed
                                ? item.status === 'partially_returned'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {returnConfirmed
                                ? item.status === 'partially_returned' ? 'Nhận lại 1 phần' : 'Đã nhận lại'
                                : 'Chờ kho xác nhận'}
                            </span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {returnConfirmed ? fmt(item.return_confirmed_at) : hasReturn ? fmt(item.return_requested_at) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Nút hành động */}
          <div className="flex flex-wrap gap-2 pt-1">
            {canTeamConfirm && pendingTeamConfirm.length > 0 && (
              <button
                onClick={() => pendingTeamConfirm.forEach((i) => onTeamConfirmReceipt(i.id))}
                disabled={pendingTeamConfirm.some((i) => confirmingId === i.id)}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition flex items-center gap-1"
              >
                <CheckCircle size={13} />
                Xác nhận đã nhận hàng ({pendingTeamConfirm.length} món)
              </button>
            )}
            {canWarehouseConfirm && pendingConfirm.length > 0 && (
              <button
                onClick={() => pendingConfirm.forEach((i) => onWarehouseConfirm(i.id))}
                disabled={pendingConfirm.some((i) => confirmingId === i.id)}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-1"
              >
                <ShieldCheck size={13} />
                Xác nhận bàn giao ({pendingConfirm.length} món)
              </button>
            )}
            {pendingReturn.length > 1 && (
              <button
                onClick={() => onConfirmReturnAll(pendingReturn)}
                disabled={pendingReturn.some((i) => confirmingId === i.id)}
                className="px-3 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-medium hover:bg-blue-800 disabled:opacity-50 transition flex items-center gap-1"
              >
                <CheckCircle size={13} />
                Nhận lại tất cả ({pendingReturn.length} món)
              </button>
            )}
            {pendingReturn.map((item) => (
              <button
                key={item.id}
                onClick={() => onConfirmReturn(item.id)}
                disabled={confirmingId === item.id}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {confirmingId === item.id ? '...' : `Nhận lại: ${item.item_name}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const VDISPATCH_STATUS_LABELS = {
  dispatched:       { label: 'Chờ bàn giao',        color: 'bg-yellow-100 text-yellow-700' },
  confirmed:        { label: 'Đội đã nhận',          color: 'bg-indigo-100 text-indigo-700' },
  returned:         { label: 'Đã trả xe',            color: 'bg-green-100 text-green-700' },
  cancelled:        { label: 'Đã hủy',               color: 'bg-gray-100 text-gray-500' },
  incident_pending: { label: 'Sự cố — chờ xác nhận', color: 'bg-red-100 text-red-700' },
};

function VehicleCard({ v, canWarehouseConfirm, onWarehouseConfirm, onConfirmReturn, onConfirmIncident, confirmingId }) {
  const [open, setOpen] = useState(false);
  const isCancelledIncident = v.status === 'cancelled' && v.incident_type;
  const isCancelledReturn = v.status === 'cancelled' && v.return_confirmed_at && !v.incident_type;
  const st = isCancelledIncident
    ? { label: 'Sự cố — đã xử lý', color: 'bg-purple-100 text-purple-700' }
    : isCancelledReturn
    ? { label: 'Kho đã nhận lại', color: 'bg-green-100 text-green-700' }
    : (VDISPATCH_STATUS_LABELS[v.status] || { label: v.status, color: 'bg-gray-100 text-gray-600' });
  const isReturned = v.status === 'returned' || v.status === 'cancelled';
  const isIncident = v.status === 'incident_pending';
  const teamReceived = ['confirmed', 'returned', 'cancelled', 'incident_pending'].includes(v.status);
  const voucherCode = `XE-${String(v.id).padStart(4, '0')}`;

  return (
    <div className={`border rounded-xl bg-white shadow-sm overflow-hidden ${isReturned ? 'opacity-60' : ''} ${isIncident ? 'border-red-300' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded shrink-0">{voucherCode}</span>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-gray-800 truncate">{v.team_name || '—'}</p>
            <p className="text-xs text-gray-500 truncate">
              {VEHICLE_TYPE_LABELS[v.vehicle_type] || v.vehicle_type}
              {v.vehicle_name && ` (${v.vehicle_name})`} · {v.plate_number}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
            {isIncident && <AlertTriangle size={11} />}
            {st.label}
          </span>
          <span className="text-xs text-gray-400 hidden sm:block">{fmt(v.dispatched_at)}</span>
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div className="border-t bg-gray-50 px-4 py-3 space-y-3">
          {/* Sự cố alert */}
          {isIncident && (v.incident_type || v.incident_note) && (
            <div className="flex items-start gap-2 text-xs text-red-700 bg-red-100 rounded-lg px-3 py-2">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold">Đội báo cáo: </span>
                {v.incident_type === 'damaged' && 'Xe bị hư hỏng'}
                {v.incident_type === 'lost' && 'Xe bị mất/thất lạc'}
                {v.incident_note && <span className="ml-1 italic">— "{v.incident_note}"</span>}
                {v.incident_reported_at && <span className="text-red-500 ml-2">{fmt(v.incident_reported_at)}</span>}
              </div>
            </div>
          )}

          {/* 📥 Nhận xe */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">📥 Nhận xe</p>
            <div className="rounded-lg border overflow-hidden bg-white">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-[35%]" />
                  <col className="w-[18%]" />
                  <col className="w-[25%]" />
                  <col className="w-[22%]" />
                </colgroup>
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Xe</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Biển số</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Trạng thái</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 font-medium text-gray-800">
                      {VEHICLE_TYPE_LABELS[v.vehicle_type] || v.vehicle_type}
                      {v.vehicle_name && <span className="ml-1 text-xs text-gray-400">({v.vehicle_name})</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-700">{v.plate_number || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium ${teamReceived ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {teamReceived ? 'Đội đã nhận' : 'Chưa nhận'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {teamReceived ? fmt(v.confirmed_at) : fmt(v.dispatched_at)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 📤 Trả xe */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">📤 Trả xe</p>
            <div className="rounded-lg border overflow-hidden bg-white">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-[35%]" />
                  <col className="w-[18%]" />
                  <col className="w-[25%]" />
                  <col className="w-[22%]" />
                </colgroup>
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Xe</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Biển số</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Trạng thái</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Thời gian trả</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 font-medium text-gray-700">
                      {VEHICLE_TYPE_LABELS[v.vehicle_type] || v.vehicle_type}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-700">{v.plate_number || '—'}</td>
                    <td className="px-3 py-2">
                      {(v.status === 'returned' || isCancelledReturn) ? (
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium ${v.return_confirmed_at ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {v.return_confirmed_at ? 'Kho đã nhận' : 'Chờ xác nhận'}
                        </span>
                      ) : isIncident ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <AlertTriangle size={10} />
                          {v.incident_type === 'lost' ? 'Xe bị mất' : 'Xe hư hỏng'} — chờ xử lý
                        </span>
                      ) : isCancelledIncident ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          {v.incident_type === 'lost' ? 'Xe bị mất — đã xử lý' : 'Xe hư hỏng — đã xử lý'}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {isCancelledReturn ? fmt(v.return_confirmed_at) :
                       v.status === 'returned' ? fmt(v.returned_at) :
                       isIncident ? fmt(v.incident_reported_at) :
                       isCancelledIncident ? fmt(v.return_confirmed_at || v.incident_reported_at) :
                       '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {canWarehouseConfirm && v.status === 'dispatched' && !v.warehouse_confirmed && (
              <button onClick={() => onWarehouseConfirm(v.id)} disabled={confirmingId === v.id}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                <ShieldCheck size={13} />
                {confirmingId === v.id ? '...' : 'Xác nhận bàn giao xe'}
              </button>
            )}
            {canWarehouseConfirm && v.status === 'returned' && (
              <button onClick={() => onConfirmReturn(v.id)} disabled={confirmingId === v.id}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                {confirmingId === v.id ? '...' : 'Xác nhận nhận lại xe'}
              </button>
            )}
            {canWarehouseConfirm && v.status === 'incident_pending' && (
              <button onClick={() => onConfirmIncident(v)} disabled={confirmingId === v.id}
                className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center gap-1">
                <AlertTriangle size={13} />
                {confirmingId === v.id ? '...' : 'Xác nhận tình trạng'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VehiclesTable({ rows, onWarehouseConfirm, onConfirmReturn, onConfirmIncident, confirmingId, user }) {
  const canWarehouseConfirm = ['manager', 'warehouse_manager'].includes(user?.role);
  if (!rows.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Truck size={40} className="mx-auto mb-3 opacity-30" />
        <p>Chưa có lệnh điều xe nào.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map(v => (
        <VehicleCard key={v.id} v={v} canWarehouseConfirm={canWarehouseConfirm}
          onWarehouseConfirm={onWarehouseConfirm}
          onConfirmReturn={onConfirmReturn}
          onConfirmIncident={onConfirmIncident}
          confirmingId={confirmingId}
        />
      ))}
    </div>
  );
}
