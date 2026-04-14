import React from "react";
import { Plus } from "lucide-react";
import { resourceAPI } from "../../services/api";
import { formatDate } from "../../utils/helpers";
import { VEHICLE_TYPE_LABELS } from "./constants";
import { Badge, Btn, EmptyState } from "./sharedComponents";

export default function TabVehicleTransfers({ data, setModal, refresh }) {
  const handleCancel = async (id) => {
    if (!window.confirm("Huỷ lệnh điều xe?")) return;
    try {
      await resourceAPI.cancelVehicleTransfer(id);
      alert("Đã huỷ.");
      refresh();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi.");
    }
  };

  const handleConfirm = async (id) => {
    if (!window.confirm("Xác nhận đã nhận xe?")) return;
    try {
      await resourceAPI.confirmVehicleTransfer(id);
      alert("Đã xác nhận. Xe sẵn sàng tại tỉnh mới.");
      refresh();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi.");
    }
  };

  return (
    <div>
      <div className="mb-4">
        <Btn onClick={() => setModal({ type: "transfer_vehicle" })} className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Tạo lệnh điều xe
        </Btn>
      </div>
      <div className="space-y-3">
        {data.length === 0 ? <EmptyState text="Chưa có lệnh điều xe." /> : (
          data.map((d) => (
            <div key={d.id} className="border rounded-xl bg-white shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge status={d.status} />
                    <span className="font-medium text-sm">{d.vehicle_name} ({d.plate_number})</span>
                    <span className="text-xs text-gray-500">{VEHICLE_TYPE_LABELS[d.vehicle_type]}</span>
                  </div>
                  <p className="text-xs text-gray-500">{d.from_province_name} → {d.to_province_name}</p>
                  <p className="text-xs text-gray-400 mt-1">Tạo bởi: {d.transferred_by_name} · {formatDate(d.created_at)}</p>
                  {d.confirmed_by_name && (
                    <p className="text-xs text-green-600">Xác nhận bởi: {d.confirmed_by_name} · {formatDate(d.confirmed_at)}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {d.status === "in_transit" && (
                    <>
                      <Btn onClick={() => handleConfirm(d.id)} className="bg-green-600 text-white hover:bg-green-700 text-xs">Xác nhận nhận</Btn>
                      <Btn onClick={() => handleCancel(d.id)} className="bg-red-100 text-red-600 hover:bg-red-200 text-xs">Huỷ</Btn>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
