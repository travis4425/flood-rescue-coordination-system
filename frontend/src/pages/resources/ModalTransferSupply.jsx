import React, { useState } from "react";
import { resourceAPI } from "../../services/api";
import { fmtUnit } from "./constants";
import { Modal, Field, Input, Select, Btn } from "./sharedComponents";

export default function ModalTransferSupply({ warehouses, reliefItems, onClose, refresh }) {
  const [form, setForm] = useState({ from_warehouse_id: "", to_warehouse_id: "", item_id: "", quantity: "", notes: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.from_warehouse_id || !form.to_warehouse_id || !form.item_id || !form.quantity)
      return alert("Vui lòng điền đủ thông tin.");
    try {
      await resourceAPI.createSupplyTransfer(form);
      alert("Đã tạo lệnh điều vật tư. Kho nguồn đã trừ.");
      refresh();
      onClose();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };

  return (
    <Modal title="Điều vật tư liên tỉnh" onClose={onClose}>
      <Field label="Kho nguồn *">
        <Select value={form.from_warehouse_id} onChange={(e) => set("from_warehouse_id", e.target.value)}>
          <option value="">— Chọn kho nguồn —</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.province_name})</option>)}
        </Select>
      </Field>
      <Field label="Kho đích *">
        <Select value={form.to_warehouse_id} onChange={(e) => set("to_warehouse_id", e.target.value)}>
          <option value="">— Chọn kho đích —</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.province_name})</option>)}
        </Select>
      </Field>
      <Field label="Vật phẩm *">
        <Select value={form.item_id} onChange={(e) => set("item_id", e.target.value)}>
          <option value="">— Chọn vật phẩm —</option>
          {reliefItems.map((i) => <option key={i.id} value={i.id}>{i.name} ({fmtUnit(i.unit)})</option>)}
        </Select>
      </Field>
      <Field label="Số lượng *">
        <Input type="number" min="0.1" step="0.1" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
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
