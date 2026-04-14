import React, { useState } from "react";
import { PackagePlus } from "lucide-react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { resourceAPI } from "../../services/api";
import { fmtUnit } from "./constants";

const STATUS = {
  pending:          { label: 'Chờ duyệt',          cls: 'bg-yellow-100 text-yellow-700' },
  manager_approved: { label: 'Quản lý đã duyệt',   cls: 'bg-blue-100 text-blue-700' },
  approved:         { label: 'Đã nhập kho',         cls: 'bg-green-100 text-green-700' },
  rejected:         { label: 'Từ chối',             cls: 'bg-red-100 text-red-600' },
};

export default function TabSupplyRequests({ data, role, user, warehouses, reliefItems, loadSharedData, refresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ item_id: '', requested_quantity: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const myWarehouse = warehouses.find(w => w.coordinator_id === user?.id) ||
    (role === 'coordinator' ? warehouses[0] : null);
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, note: '' });
  const [acting, setActing] = useState(false);

  const handleCreate = async () => {
    if (!myWarehouse?.id) return alert('Bạn chưa được gán kho nào. Liên hệ quản lý.');
    if (!form.item_id || !form.requested_quantity) return alert('Vui lòng điền đầy đủ thông tin.');
    setSaving(true);
    try {
      await resourceAPI.createSupplyRequest({ ...form, warehouse_id: myWarehouse.id });
      setShowForm(false);
      setForm({ item_id: '', requested_quantity: '', reason: '' });
      refresh();
    } catch (e) { alert(e?.response?.data?.error || 'Có lỗi xảy ra.'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Duyệt yêu cầu này? Kho sẽ xác nhận nhập hàng sau.')) return;
    setActing(true);
    try { await resourceAPI.approveSupplyRequest(id, {}); refresh(); }
    catch (e) { alert(e?.response?.data?.error || 'Có lỗi.'); }
    finally { setActing(false); }
  };

  const handleWarehouseConfirm = async (id) => {
    if (!window.confirm('Xác nhận đã nhận hàng? Tồn kho sẽ được cập nhật.')) return;
    setActing(true);
    try { await resourceAPI.warehouseConfirmSupplyRequest(id); refresh(); }
    catch (e) { alert(e?.response?.data?.error || 'Có lỗi.'); }
    finally { setActing(false); }
  };

  const handleReject = async () => {
    if (!rejectModal.note.trim()) return alert('Vui lòng nhập lý do từ chối.');
    setActing(true);
    try {
      await resourceAPI.rejectSupplyRequest(rejectModal.id, { review_note: rejectModal.note });
      setRejectModal({ open: false, id: null, note: '' });
      refresh();
    } catch (e) { alert(e?.response?.data?.error || 'Có lỗi.'); }
    finally { setActing(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-700">
          {role === 'coordinator' ? 'Yêu cầu bổ sung vật tư của tôi' : 'Tất cả yêu cầu bổ sung vật tư'}
        </h2>
        {role === 'coordinator' && (
          <button onClick={() => { loadSharedData(); setShowForm(s => !s); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <PackagePlus className="w-4 h-4" />{showForm ? 'Đóng' : 'Tạo yêu cầu'}
          </button>
        )}
      </div>

      {showForm && role === 'coordinator' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-blue-800">Yêu cầu bổ sung vật tư</p>
          {myWarehouse ? (
            <p className="text-xs text-gray-500">Kho phụ trách: <span className="font-medium">{myWarehouse.name}</span></p>
          ) : (
            <p className="text-xs text-red-500">Bạn chưa được gán kho nào. Liên hệ quản lý.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Loại vật tư *</label>
              <select value={form.item_id} onChange={e => setForm(f => ({ ...f, item_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">-- Chọn vật tư --</option>
                {reliefItems.map(i => <option key={i.id} value={i.id}>{i.name} ({fmtUnit(i.unit)})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Số lượng cần bổ sung *</label>
              <input type="number" min="1" value={form.requested_quantity}
                onChange={e => setForm(f => ({ ...f, requested_quantity: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="VD: 100" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Lý do</label>
              <input type="text" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="VD: Tồn kho thấp hơn ngưỡng tối thiểu" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Hủy</button>
            <button onClick={handleCreate} disabled={saving}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">Chưa có yêu cầu nào.</div>
      ) : (
        <div className="space-y-3">
          {data.map(req => (
            <div key={req.id} className="bg-white border rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800">{req.item_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS[req.status]?.cls}`}>{STATUS[req.status]?.label}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Kho: <span className="font-medium">{req.warehouse_name}</span>
                    {' · '}Số lượng: <span className="font-medium text-blue-700">{req.requested_quantity} {fmtUnit(req.unit)}</span>
                  </p>
                  {req.reason && <p className="text-xs text-gray-500">Lý do: {req.reason}</p>}
                  {role === 'manager' && <p className="text-xs text-gray-500">Người yêu cầu: {req.requester_name}</p>}
                  {req.review_note && (
                    <p className="text-xs text-gray-500 mt-1">
                      Phản hồi: <span className="italic">{req.review_note}</span>
                      {req.reviewer_name && ` — ${req.reviewer_name}`}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    {new Date(typeof req.created_at === 'string' ? req.created_at.replace(/Z$/, '') : req.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
                {role === 'warehouse_manager' && req.status === 'manager_approved' && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleWarehouseConfirm(req.id)} disabled={acting}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      <ThumbsUp className="w-3.5 h-3.5" /> Xác nhận nhập kho
                    </button>
                  </div>
                )}
                {role === 'manager' && req.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleApprove(req.id)} disabled={acting}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                      <ThumbsUp className="w-3.5 h-3.5" /> Duyệt
                    </button>
                    <button onClick={() => setRejectModal({ open: true, id: req.id, note: '' })} disabled={acting}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">
                      <ThumbsDown className="w-3.5 h-3.5" /> Từ chối
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-gray-800">Từ chối yêu cầu</h3>
            <textarea rows={3} value={rejectModal.note} onChange={e => setRejectModal(m => ({ ...m, note: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="Lý do từ chối *" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectModal({ open: false, id: null, note: '' })}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Hủy</button>
              <button onClick={handleReject} disabled={acting}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">
                {acting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
