import React, { useState } from "react";
import { Plus } from "lucide-react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { resourceAPI } from "../../services/api";
import { VEHICLE_TYPE_LABELS, SOURCE_TYPE_LABELS } from "./constants";
import { Badge } from "./sharedComponents";

export default function TabVehicleRequests({ data, role, user, warehouses, teams, loadSharedData, refresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vehicle_type: 'boat', quantity: 1, source_type: 'purchase', notes: '' });
  const [saving, setSaving] = useState(false);
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, note: '' });
  const [acting, setActing] = useState(false);

  const myWarehouse = warehouses.find(w => w.coordinator_id === user?.id);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await resourceAPI.createVehicleRequest(form);
      setShowForm(false);
      setForm({ vehicle_type: 'boat', quantity: 1, source_type: 'purchase', notes: '' });
      refresh();
    } catch (e) { alert(e?.response?.data?.error || 'Có lỗi xảy ra.'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Duyệt yêu cầu? Kiểm kho sẽ xác nhận nhập sau.')) return;
    setActing(true);
    try { await resourceAPI.updateVehicleRequestStatus(id, { status: 'manager_approved' }); refresh(); }
    catch (e) { alert(e?.response?.data?.error || 'Có lỗi.'); }
    finally { setActing(false); }
  };

  const handleWarehouseConfirmVehicle = async (id) => {
    if (!window.confirm('Xác nhận đã nhận xe? Xe sẽ được thêm vào kho.')) return;
    setActing(true);
    try { await resourceAPI.updateVehicleRequestStatus(id, { status: 'approved' }); refresh(); }
    catch (e) { alert(e?.response?.data?.error || 'Có lỗi.'); }
    finally { setActing(false); }
  };

  const handleReject = async () => {
    setActing(true);
    try {
      await resourceAPI.updateVehicleRequestStatus(rejectModal.id, { status: 'rejected', notes: rejectModal.note });
      setRejectModal({ open: false, id: null, note: '' });
      refresh();
    } catch (e) { alert(e?.response?.data?.error || 'Có lỗi.'); }
    finally { setActing(false); }
  };

  const confirmAction = async (id, action) => {
    try { await resourceAPI.confirmVehicleRequest(id, action); refresh(); }
    catch (e) { alert(e?.response?.data?.error || 'Có lỗi.'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-700">
          {role === 'coordinator' ? 'Yêu cầu điều xe của tôi' : 'Tất cả yêu cầu điều xe'}
        </h2>
        {role === 'coordinator' && (
          <button onClick={() => { loadSharedData(); setShowForm(s => !s); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />{showForm ? 'Đóng' : 'Tạo yêu cầu'}
          </button>
        )}
      </div>

      {showForm && role === 'coordinator' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-blue-800">Yêu cầu điều xe</p>
          {myWarehouse && <p className="text-xs text-gray-500">Kho phụ trách: <span className="font-medium">{myWarehouse.name}</span></p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Loại xe *</label>
              <select value={form.vehicle_type} onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Số lượng *</label>
              <input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="VD: 2" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Ghi chú / Lý do</label>
              <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="VD: Cần thêm xe để hỗ trợ sơ tán dân" />
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
        <div className="text-center py-16 text-gray-400 text-sm">Chưa có yêu cầu điều xe.</div>
      ) : (
        <div className="space-y-3">
          {data.map(vr => (
            <div key={vr.id} className="bg-white border rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge status={vr.status} />
                    <span className="font-medium text-gray-800">{VEHICLE_TYPE_LABELS[vr.vehicle_type]} × {vr.quantity}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {vr.destination_team_name ? <>Đội nhận: <span className="font-medium">{vr.destination_team_name}</span></> : null}
                    {vr.source_type !== 'purchase' && SOURCE_TYPE_LABELS[vr.source_type]}
                  </p>
                  {(role === 'manager' || role === 'warehouse_manager') && (
                    <p className="text-xs text-gray-500">
                      Người yêu cầu: <span className="font-medium">{vr.requested_by_name}</span>
                      {vr.target_warehouse_name && <> · Kho nhập: <span className="font-medium text-blue-600">{vr.target_warehouse_name}</span></>}
                    </p>
                  )}
                  {vr.notes && <p className="text-xs text-gray-500">Ghi chú: {vr.notes}</p>}
                  <p className="text-xs text-gray-400">
                    {new Date(typeof vr.created_at === 'string' ? vr.created_at.replace(/Z$/, '') : vr.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 flex-col">
                  {vr.status === 'pending' && role === 'manager' && (
                    <>
                      <button onClick={() => handleApprove(vr.id)} disabled={acting}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                        <ThumbsUp className="w-3.5 h-3.5" /> Duyệt
                      </button>
                      <button onClick={() => setRejectModal({ open: true, id: vr.id, note: '' })} disabled={acting}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">
                        <ThumbsDown className="w-3.5 h-3.5" /> Từ chối
                      </button>
                    </>
                  )}
                  {vr.status === 'manager_approved' && role === 'warehouse_manager' && (
                    <button onClick={() => handleWarehouseConfirmVehicle(vr.id)} disabled={acting}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      <ThumbsUp className="w-3.5 h-3.5" /> Xác nhận nhập kho
                    </button>
                  )}
                  {vr.status === 'approved' && user?.is_team_leader && (
                    <button onClick={() => confirmAction(vr.id, 'received')}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Xác nhận nhận xe
                    </button>
                  )}
                  {vr.status === 'fulfilled' && vr.source_type !== 'purchase' && user?.is_team_leader && (
                    <button onClick={() => confirmAction(vr.id, 'returned')}
                      className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                      Xác nhận trả xe
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-gray-800">Từ chối yêu cầu điều xe</h3>
            <textarea rows={3} value={rejectModal.note} onChange={e => setRejectModal(m => ({ ...m, note: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="Lý do từ chối (không bắt buộc)" />
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
