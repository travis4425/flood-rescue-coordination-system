import React, { useState } from "react";
import { resourceAPI } from "../../services/api";
import { Modal, Field, Input, Select, Btn } from "./sharedComponents";

export default function ModalTransferVehicle({ vehicles, provinces, onClose, refresh }) {
  const [form, setForm] = useState({ vehicle_id: "", to_province_id: "", notes: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const availableVehicles = vehicles.filter((v) => v.status === "available");

  const submit = async () => {
    if (!form.vehicle_id || !form.to_province_id) return alert("Vui lòng chọn xe và tỉnh đích.");
    try {
      await resourceAPI.createVehicleTransfer(form);
      alert("Đã tạo lệnh điều xe. Xe đang vận chuyển.");
      refresh();
      onClose();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };

  return (
    <Modal title="Điều xe liên tỉnh" onClose={onClose}>
      <Field label="Xe *">
        <Select value={form.vehicle_id} onChange={(e) => set("vehicle_id", e.target.value)}>
          <option value="">— Chọn xe —</option>
          {availableVehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.name} ({v.plate_number}) - {v.province_name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Tỉnh đích *">
        <Select value={form.to_province_id} onChange={(e) => set("to_province_id", e.target.value)}>
          <option value="">— Chọn tỉnh đích —</option>
          {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </Field>
      <Field label="Ghi chú">
        <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Không bắt buộc" />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Btn onClick={onClose} className="bg-gray-100 text-gray-700 hover:bg-gray-200">Huỷ</Btn>
        <Btn onClick={submit} className="bg-blue-600 text-white hover:bg-blue-700">Tạo lệnh điều</Btn>
      </div>
    </Modal>
  );
}
