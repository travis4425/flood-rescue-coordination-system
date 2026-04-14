import React, { useState } from "react";
import { resourceAPI } from "../../services/api";
import { Modal, Field, Input, Select, Btn } from "./sharedComponents";

export default function ModalWarehouse({ item, provinces, onClose, refresh }) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    name: item?.name || "", address: item?.address || "",
    province_id: item?.province_id || "", capacity_tons: item?.capacity_tons || "",
    phone: item?.phone || "", manager_id: item?.manager_id || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.province_id) return alert("Vui lòng điền tên kho và tỉnh/thành.");
    try {
      if (isEdit) {
        await resourceAPI.updateWarehouse(item.id, { ...form, warehouse_type: "central" });
      } else {
        await resourceAPI.createWarehouse({ ...form, warehouse_type: "central" });
      }
      refresh();
      onClose();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };

  return (
    <Modal title={isEdit ? "Sửa kho tổng" : "Tạo kho tổng mới"} onClose={onClose}>
      <Field label="Tên kho *">
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="VD: Kho tổng Hà Nội" />
      </Field>
      <Field label="Địa chỉ">
        <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
      </Field>
      <Field label="Tỉnh/thành *">
        <Select value={form.province_id} onChange={(e) => set("province_id", e.target.value)}>
          <option value="">-- Chọn tỉnh/thành --</option>
          {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </Field>
      <Field label="Sức chứa (tấn)">
        <Input type="number" value={form.capacity_tons} onChange={(e) => set("capacity_tons", e.target.value)} />
      </Field>
      <Field label="Số điện thoại">
        <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Btn onClick={onClose} className="bg-gray-100 text-gray-700 hover:bg-gray-200">Hủy</Btn>
        <Btn onClick={submit} className="bg-blue-600 text-white hover:bg-blue-700">{isEdit ? "Lưu" : "Tạo kho"}</Btn>
      </div>
    </Modal>
  );
}
