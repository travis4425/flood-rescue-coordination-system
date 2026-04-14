import React, { useState, useEffect, useCallback } from 'react';
import { teamAPI, resourceAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import useAuthStore from '../../store/authStore';
import { Plus, RefreshCw, Truck, CheckCircle, History, Layers } from 'lucide-react';

const VEHICLE_TYPE_LABEL = {
  boat: 'Xuồng', truck: 'Xe tải', car: 'Xe con',
  ambulance: 'Xe cứu thương', helicopter: 'Trực thăng', other: 'Khác',
};
const DISPATCH_STATUS = {
  dispatched:  { label: 'Chờ xác nhận', cls: 'bg-yellow-100 text-yellow-700' },
  confirmed:   { label: 'Đang sử dụng',  cls: 'bg-blue-100 text-blue-700' },
  returned:    { label: 'Đã trả',         cls: 'bg-gray-100 text-gray-500' },
  cancelled:   { label: 'Đã hủy',         cls: 'bg-red-100 text-red-500' },
};

export default function VehicleAllocationTab({ activeTasks }) {
  const { user } = useAuthStore();
  const [teams, setTeams] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dispatchModal, setDispatchModal] = useState(null);
  const [reassignModal, setReassignModal] = useState(null);
  const [form, setForm] = useState({ vehicle_id: '', mission_note: '' });
  const [reassignTaskId, setReassignTaskId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const provinceFilter = user?.province_id ? { province_id: user.province_id } : {};

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [teamRes, dispRes, vehRes] = await Promise.all([
        teamAPI.getAll(provinceFilter),
        resourceAPI.getVehicleDispatches(provinceFilter),
        resourceAPI.getVehicles({ status: 'available', ...provinceFilter }),
      ]);
      setTeams(teamRes.data || []);
      setDispatches(dispRes.data || []);
      setVehicles(vehRes.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user?.province_id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => fetchAll();
    socket.on('vehicle_dispatch_new', refresh);
    socket.on('vehicle_dispatch_updated', refresh);
    socket.on('vehicle_dispatch_returned', refresh);
    socket.on('vehicle_dispatch_reassigned', refresh);
    return () => {
      socket.off('vehicle_dispatch_new', refresh);
      socket.off('vehicle_dispatch_updated', refresh);
      socket.off('vehicle_dispatch_returned', refresh);
      socket.off('vehicle_dispatch_reassigned', refresh);
    };
  }, [fetchAll]);

  const activeDispatches = dispatches.filter(d => ['dispatched', 'confirmed'].includes(d.status));
  const historyDispatches = dispatches.filter(d => ['returned', 'cancelled'].includes(d.status));

  const teamDispatches = (teamId) => activeDispatches.filter(d => d.team_id === teamId);
  const teamHistory = (teamId) => historyDispatches.filter(d => d.team_id === teamId).slice(0, 3);

  const handleDispatch = async () => {
    if (!form.vehicle_id || !dispatchModal) return;
    setSubmitting(true);
    try {
      await resourceAPI.createVehicleDispatch({
        vehicle_id: parseInt(form.vehicle_id),
        team_id: dispatchModal.team.id,
        mission_note: form.mission_note || null,
      });
      setDispatchModal(null);
      setForm({ vehicle_id: '', mission_note: '' });
      fetchAll();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
    finally { setSubmitting(false); }
  };

  const handleReassign = async () => {
    if (!reassignTaskId || !reassignModal) return;
    setSubmitting(true);
    try {
      await resourceAPI.reassignVehicleDispatch(reassignModal.dispatch.id, {
        task_id: parseInt(reassignTaskId),
      });
      setReassignModal(null);
      setReassignTaskId('');
      fetchAll();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
    finally { setSubmitting(false); }
  };

  const handleReturn = async (dispatchId) => {
    if (!window.confirm('Xác nhận đội trả xe về kho?')) return;
    try {
      await resourceAPI.returnVehicleDispatch(dispatchId);
      fetchAll();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
  };

  const usedVehicleIds = new Set(activeDispatches.map(d => d.vehicle_id));
  const freeVehicles = vehicles.filter(v => !usedVehicleIds.has(v.id));

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Truck size={16} className="text-indigo-500" /> Phân bổ phương tiện
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Gán xe cho đội, kế thừa xe qua nhiều task mà không cần trả-rồi-mượn lại</p>
        </div>
        <button onClick={fetchAll} className="p-2 border rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-700">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="bg-white border rounded-2xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <CheckCircle size={13} className="text-green-500" /> Xe sẵn sàng ({freeVehicles.length})
        </p>
        {freeVehicles.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Không có xe nào đang rảnh.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {freeVehicles.map(v => (
              <div key={v.id} className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-xl text-sm">
                <Truck size={13} className="text-green-600 shrink-0" />
                <span className="font-medium text-gray-800">{v.name}</span>
                {v.plate_number && <span className="text-xs text-gray-400">{v.plate_number}</span>}
                <span className="text-xs text-green-600">{VEHICLE_TYPE_LABEL[v.type] || v.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {teams.map(team => {
          const active = teamDispatches(team.id);
          const history = teamHistory(team.id);
          const teamTasks = activeTasks.filter(t => t.team_id === team.id);
          return (
            <div key={team.id} className="bg-white border rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${team.status === 'available' ? 'bg-green-400' : team.status === 'on_mission' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{team.name}</p>
                    <p className="text-xs text-gray-400">{team.code}
                      {teamTasks.length > 0 && <span className="ml-2 text-blue-500">· {teamTasks.length} task đang chạy</span>}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setDispatchModal({ team }); setForm({ vehicle_id: '', mission_note: '' }); }}
                  disabled={freeVehicles.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Plus size={12} /> Điều xe
                </button>
              </div>

              <div className="p-4 space-y-3">
                {active.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Xe đang giao / đang dùng</p>
                    {active.map(d => (
                      <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border bg-blue-50/30 border-blue-100">
                        <Truck size={15} className="text-indigo-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-800">{d.vehicle_name}</span>
                            {d.plate_number && <span className="text-xs text-gray-400">{d.plate_number}</span>}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DISPATCH_STATUS[d.status]?.cls}`}>
                              {DISPATCH_STATUS[d.status]?.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                            {d.mission_note && <span>📝 {d.mission_note}</span>}
                            <span>🕐 {new Date(d.dispatched_at).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Chưa có xe nào được giao cho đội này.</p>
                )}

                {history.length > 0 && (
                  <details className="group">
                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none list-none flex items-center gap-1">
                      <History size={12} /> Lịch sử gần đây ({history.length})
                    </summary>
                    <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-gray-100">
                      {history.map(d => (
                        <div key={d.id} className="flex items-center gap-2 text-xs text-gray-400">
                          <Truck size={11} className="shrink-0" />
                          <span className="font-medium text-gray-600">{d.vehicle_name}</span>
                          <span className={`px-1.5 py-0.5 rounded-full ${DISPATCH_STATUS[d.status]?.cls}`}>
                            {DISPATCH_STATUS[d.status]?.label}
                          </span>
                          {d.returned_at && <span>{new Date(d.returned_at).toLocaleDateString('vi-VN')}</span>}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {dispatchModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDispatchModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Truck size={16} className="text-indigo-500" /> Điều xe cho {dispatchModal.team.name}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Chọn xe <span className="text-red-500">*</span></label>
                <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))}>
                  <option value="">-- Chọn xe --</option>
                  {freeVehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.plate_number ? `(${v.plate_number})` : ''} · {VEHICLE_TYPE_LABEL[v.type] || v.type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Ghi chú nhiệm vụ</label>
                <input className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="VD: Hỗ trợ cứu lụt khu A..."
                  value={form.mission_note} onChange={e => setForm(f => ({ ...f, mission_note: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setDispatchModal(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Hủy</button>
              <button onClick={handleDispatch} disabled={!form.vehicle_id || submitting}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                <Truck size={14} /> {submitting ? 'Đang xử lý...' : 'Điều xe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reassignModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setReassignModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
              <Layers size={16} className="text-amber-500" /> Gán xe sang task khác
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Xe <strong>{reassignModal.dispatch.vehicle_name}</strong> đang được đội giữ sẽ được gán tiếp sang task mới — không cần trả rồi điều lại.
            </p>
            <div>
              <label className="text-xs font-medium text-gray-600">Chọn task mới <span className="text-red-500">*</span></label>
              <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                value={reassignTaskId} onChange={e => setReassignTaskId(e.target.value)}>
                <option value="">-- Chọn task --</option>
                {activeTasks
                  .filter(t => t.team_id === reassignModal.dispatch.team_id)
                  .map(t => <option key={t.id} value={t.id}>Task #{t.id} · {t.name}</option>)}
              </select>
              {activeTasks.filter(t => t.team_id === reassignModal.dispatch.team_id).length === 0 && (
                <p className="text-xs text-gray-400 mt-1 italic">Đội này không có task đang chạy nào khác.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setReassignModal(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Hủy</button>
              <button onClick={handleReassign} disabled={!reassignTaskId || submitting}
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
                <Layers size={14} /> {submitting ? 'Đang xử lý...' : 'Gán sang task này'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
