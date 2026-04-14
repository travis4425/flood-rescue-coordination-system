import React, { useState } from "react";
import { resourceAPI } from "../../services/api";
import { VEHICLE_TYPE_LABELS } from "./constants";
import { Modal, Field, Input, Select, Btn } from "./sharedComponents";

export default function ModalDispatchVehicle({ vehicles, teams, user, onClose, refresh }) {
  const isCoordinator = user?.role === "coordinator";
  const provinceId = user?.province_id;
  const myTeams = isCoordinator ? teams.filter((t) => t.province_id === provinceId) : teams;

  const [form, setForm] = useState({ vehicle_id: "", team_id: "", mission_note: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const availableVehicles = vehicles.filter((v) => v.status === "available");

  const submit = async () => {
    if (!form.vehicle_id || !form.team_id) return alert("Vui lòng chọn xe và đội.");
    try {
      await resourceAPI.createVehicleDispatch(form);
      alert("Đã điều xe cho đội.");
      refresh();
      onClose();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };

  return (
    <Modal title="Điều xe cho đội" onClose={onClose}>
      <Field label="Xe *">
        <Select value={form.vehicle_id} onChange={(e) => set("vehicle_id", e.target.value)}>
          <option value="">— Chọn xe —</option>
          {availableVehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.name} ({v.plate_number}) - {VEHICLE_TYPE_LABELS[v.type]}</option>
          ))}
        </Select>
      </Field>
      <Field label="Đội nhận *">
        <Select value={form.team_id} onChange={(e) => set("team_id", e.target.value)}>
          <option value="">— Chọn đội —</option>
          {myTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      </Field>
      <Field label="Ghi chú nhiệm vụ">
        <Input value={form.mission_note} onChange={(e) => set("mission_note", e.target.value)} placeholder="Không bắt buộc" />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Btn onClick={onClose} className="bg-gray-100 text-gray-700 hover:bg-gray-200">Huỷ</Btn>
        <Btn onClick={submit} className="bg-blue-600 text-white hover:bg-blue-700">Điều xe</Btn>
      </div>
    </Modal>
  );
}
