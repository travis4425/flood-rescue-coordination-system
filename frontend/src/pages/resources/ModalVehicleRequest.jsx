import React, { useState } from "react";
import { resourceAPI } from "../../services/api";
import { VEHICLE_TYPE_LABELS, SOURCE_TYPE_LABELS } from "./constants";
import { Modal, Field, Input, Select, Btn } from "./sharedComponents";

export default function ModalVehicleRequest({ teams, onClose, refresh }) {
  const [form, setForm] = useState({
    vehicle_type: "boat", quantity: 1, destination_team_id: "",
    source_type: "borrow_local", expected_date: "", notes: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.destination_team_id) return alert("Vui lòng chọn đội nhận.");
    try {
      await resourceAPI.createVehicleRequest(form);
      alert("Đã tạo yêu cầu điều xe.");
      refresh();
      onClose();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };

  return (
    <Modal title="Tạo yêu cầu điều xe" onClose={onClose}>
      <Field label="Loại xe *">
        <Select value={form.vehicle_type} onChange={(e) => set("vehicle_type", e.target.value)}>
          {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Field>
      <Field label="Số lượng *">
        <Input type="number" min="1" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
      </Field>
      <Field label="Đội nhận *">
        <Select value={form.destination_team_id} onChange={(e) => set("destination_team_id", e.target.value)}>
          <option value="">— Chọn đội —</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      </Field>
      <Field label="Nguồn xe *">
        <Select value={form.source_type} onChange={(e) => set("source_type", e.target.value)}>
          {Object.entries(SOURCE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Field>
      <Field label="Ngày cần">
        <Input type="date" value={form.expected_date} onChange={(e) => set("expected_date", e.target.value)} />
      </Field>
      <Field label="Ghi chú">
        <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Không bắt buộc" />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Btn onClick={onClose} className="bg-gray-100 text-gray-700 hover:bg-gray-200">Huỷ</Btn>
        <Btn onClick={submit} className="bg-blue-600 text-white hover:bg-blue-700">Tạo yêu cầu</Btn>
      </div>
    </Modal>
  );
}
