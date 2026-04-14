import React, { useState } from "react";
import { Plus, ChevronDown, ChevronUp, CheckCircle, RotateCcw } from "lucide-react";
import { resourceAPI } from "../../services/api";
import { formatDate } from "../../utils/helpers";
import { VEHICLE_TYPE_LABELS } from "./constants";
import { Badge, Btn, EmptyState } from "./sharedComponents";

function VehicleDispatchCard({ d, role, setModal, refresh }) {
  const [open, setOpen] = useState(false);

  const handleConfirmReturn = async () => {
    if (!window.confirm("Xác nhận đã nhận lại xe?")) return;
    try {
      await resourceAPI.confirmReturnVehicleDispatch(d.id);
      alert("Đã xác nhận nhận lại xe.");
      refresh();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };

  const handleCancelDispatch = async () => {
    if (!window.confirm("Hoàn tác điều xe này? Xe sẽ trở về trạng thái sẵn sàng.")) return;
    try {
      await resourceAPI.cancelVehicleDispatch(d.id);
      alert("Đã hoàn tác điều xe.");
      refresh();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-center gap-3">
          <Badge status={d.status} />
          <div>
            <p className="font-bold text-sm text-gray-800">{d.team_name}</p>
            <p className="text-xs text-gray-500">{d.vehicle_name} · {d.plate_number} · {VEHICLE_TYPE_LABELS[d.vehicle_type]}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{formatDate(d.dispatched_at)}</span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>
      {open && (
        <div className="border-t px-4 py-3 bg-gray-50 text-sm space-y-3">
          <p className="text-xs text-gray-500">Điều bởi: {d.dispatched_by_name}</p>
          {d.mission_note && <p className="text-xs text-gray-500">Ghi chú: {d.mission_note}</p>}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">📥 Nhận xe</p>
            <div className="border rounded-lg overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400 border-b">
                    <th className="px-3 py-1.5 text-left font-medium">Xe</th>
                    <th className="px-3 py-1.5 text-left font-medium">Biển số</th>
                    <th className="px-3 py-1.5 text-center font-medium">Trạng thái</th>
                    <th className="px-3 py-1.5 text-right font-medium">Thời gian nhận</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 text-gray-800">{d.vehicle_name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">{d.plate_number}</td>
                    <td className="px-3 py-2 text-center">
                      {["confirmed", "returned"].includes(d.status)
                        ? <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Đội đã nhận</span>
                        : <span className="text-xs text-gray-300">Chưa nhận</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-gray-500">
                      {d.confirmed_at ? formatDate(d.confirmed_at) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">📤 Trả xe</p>
            <div className="border rounded-lg overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400 border-b">
                    <th className="px-3 py-1.5 text-left font-medium">Xe</th>
                    <th className="px-3 py-1.5 text-left font-medium">Biển số</th>
                    <th className="px-3 py-1.5 text-center font-medium">Trạng thái</th>
                    <th className="px-3 py-1.5 text-right font-medium">Thời gian trả</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 text-gray-800">{d.vehicle_name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">{d.plate_number}</td>
                    <td className="px-3 py-2 text-center">
                      {d.status === "returned"
                        ? <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Đã nhận lại</span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-gray-500">
                      {d.returned_at ? formatDate(d.returned_at) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          {["manager", "warehouse_manager", "coordinator"].includes(role) && d.status === "dispatched" && !d.warehouse_confirmed && (
            <Btn onClick={handleCancelDispatch} className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
              <RotateCcw className="w-4 h-4 inline mr-1" /> Hoàn tác
            </Btn>
          )}
          {["manager", "warehouse_manager"].includes(role) && d.status === "returned" && (
            <Btn onClick={handleConfirmReturn} className="bg-green-600 text-white hover:bg-green-700">
              <CheckCircle className="w-4 h-4 inline mr-1" /> Xác nhận nhận lại xe
            </Btn>
          )}
        </div>
      )}
    </div>
  );
}

export default function TabVehicleDispatches({ data, role, setModal, refresh }) {
  return (
    <div>
      {role === "coordinator" && (
        <div className="mb-4">
          <Btn onClick={() => setModal({ type: "dispatch_vehicle" })} className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Điều xe cho đội
          </Btn>
        </div>
      )}
      <div className="space-y-3">
        {data.length === 0 ? <EmptyState text="Chưa có phiếu điều xe." />
          : data.map((d) => <VehicleDispatchCard key={d.id} d={d} role={role} setModal={setModal} refresh={refresh} />)}
      </div>
    </div>
  );
}
