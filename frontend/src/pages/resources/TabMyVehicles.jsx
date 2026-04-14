import React, { useState } from "react";
import { AlertTriangle, CheckCircle, RotateCcw } from "lucide-react";
import { resourceAPI } from "../../services/api";
import { formatDate } from "../../utils/helpers";
import { VEHICLE_TYPE_LABELS } from "./constants";
import { Badge, Btn, EmptyState } from "./sharedComponents";

export default function TabMyVehicles({ data, user, refresh }) {
  const isLeader = user?.is_team_leader;
  const [incidentModal, setIncidentModal] = useState({ open: false, id: null, type: 'damaged', note: '' });

  const handleConfirm = async (id) => {
    if (!window.confirm("Xác nhận đã nhận xe?")) return;
    try { await resourceAPI.confirmVehicleDispatch(id); alert("Đã xác nhận."); refresh(); }
    catch (e) { alert(e?.response?.data?.error || "Có lỗi."); }
  };

  const handleReturn = async (id) => {
    if (!window.confirm("Gửi yêu cầu trả xe?")) return;
    try { await resourceAPI.returnVehicleDispatch(id); alert("Đã gửi yêu cầu trả xe."); refresh(); }
    catch (e) { alert(e?.response?.data?.error || "Có lỗi."); }
  };

  const handleSubmitIncident = async () => {
    if (!incidentModal.note.trim()) { alert("Vui lòng mô tả sự cố."); return; }
    try {
      await resourceAPI.reportVehicleIncident(incidentModal.id, { incident_type: incidentModal.type, incident_note: incidentModal.note });
      setIncidentModal({ open: false, id: null, type: 'damaged', note: '' });
      alert(incidentModal.type === 'lost' ? "Đã báo cáo mất xe." : "Đã báo cáo xe hỏng. Xe chuyển sang bảo trì.");
      refresh();
    } catch (e) { alert(e?.response?.data?.error || "Có lỗi."); }
  };

  return (
    <div className="space-y-3">
      {incidentModal.open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> Báo cáo sự cố xe
            </h3>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Loại sự cố *</label>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-sm ${incidentModal.type === 'damaged' ? 'border-orange-400 bg-orange-50' : 'hover:bg-gray-50'}`}>
                  <input type="radio" name="inc_type" value="damaged" checked={incidentModal.type === 'damaged'}
                    onChange={() => setIncidentModal(m => ({ ...m, type: 'damaged' }))} />
                  🔧 Xe hỏng
                </label>
                <label className={`flex-1 flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-sm ${incidentModal.type === 'lost' ? 'border-red-400 bg-red-50' : 'hover:bg-gray-50'}`}>
                  <input type="radio" name="inc_type" value="lost" checked={incidentModal.type === 'lost'}
                    onChange={() => setIncidentModal(m => ({ ...m, type: 'lost' }))} />
                  ❌ Xe mất
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Mô tả chi tiết *</label>
              <textarea rows={3} value={incidentModal.note} onChange={e => setIncidentModal(m => ({ ...m, note: e.target.value }))}
                placeholder={incidentModal.type === 'lost' ? "Mô tả hoàn cảnh mất xe..." : "Mô tả tình trạng hỏng hóc..."}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
            </div>
            {incidentModal.type === 'lost' && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                ⚠️ Báo mất xe sẽ đánh dấu xe là "Đã mất" và thông báo cho quản lý ngay lập tức.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Btn onClick={() => setIncidentModal({ open: false, id: null, type: 'damaged', note: '' })} className="bg-gray-100 text-gray-700 hover:bg-gray-200">Hủy</Btn>
              <Btn onClick={handleSubmitIncident} className="bg-red-600 text-white hover:bg-red-700">Gửi báo cáo</Btn>
            </div>
          </div>
        </div>
      )}

      {data.length === 0 ? <EmptyState text="Đội chưa được điều xe." /> : (
        data.map((d) => (
          <div key={d.id} className="border rounded-xl bg-white shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge status={d.status} />
                  <span className="font-medium">{d.vehicle_name} ({d.plate_number})</span>
                  <span className="text-xs text-gray-500">{VEHICLE_TYPE_LABELS[d.vehicle_type]}</span>
                </div>
                <p className="text-xs text-gray-500">Điều bởi: {d.dispatched_by_name} · {formatDate(d.dispatched_at)}</p>
                <div className="mt-2 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-gray-500">Mã phiếu:</span>
                  <span className="font-mono font-bold text-blue-700 text-base tracking-widest">{`XE-${String(d.id).padStart(4, '0')}`}</span>
                  <button onClick={() => navigator.clipboard.writeText(`XE-${String(d.id).padStart(4, '0')}`)} title="Sao chép" className="text-blue-400 hover:text-blue-600 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                {d.status === "dispatched" && !d.warehouse_confirmed && (
                  <p className="text-xs text-yellow-600 mt-1">⏳ Trình mã phiếu trên cho kho xác nhận bàn giao</p>
                )}
                {d.mission_note && <p className="text-xs text-gray-400 mt-1">{d.mission_note}</p>}
                {d.incident_type && (
                  <p className={`text-xs mt-1 font-medium ${d.incident_type === 'lost' ? 'text-red-600' : 'text-orange-600'}`}>
                    {d.incident_type === 'lost' ? '❌ Đã báo mất xe' : '🔧 Đã báo hỏng xe'}
                    {d.incident_note && ` — ${d.incident_note}`}
                  </p>
                )}
              </div>
              {isLeader && (
                <div className="flex flex-col gap-1.5 items-end">
                  {d.status === "dispatched" && !d.warehouse_confirmed && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">⏳ Chờ kho xác nhận bàn giao xe</span>
                  )}
                  {d.status === "dispatched" && d.warehouse_confirmed && (
                    <Btn onClick={() => handleConfirm(d.id)} className="bg-green-600 text-white hover:bg-green-700 text-xs">
                      <CheckCircle className="w-3.5 h-3.5 inline mr-1" /> Xác nhận nhận xe
                    </Btn>
                  )}
                  {d.status === "confirmed" && (
                    <>
                      <Btn onClick={() => handleReturn(d.id)} className="bg-gray-200 text-gray-700 hover:bg-gray-300 text-xs">
                        <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> Trả xe
                      </Btn>
                      <Btn onClick={() => setIncidentModal({ open: true, id: d.id, type: 'damaged', note: '' })}
                        className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 inline mr-1" /> Báo sự cố
                      </Btn>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
