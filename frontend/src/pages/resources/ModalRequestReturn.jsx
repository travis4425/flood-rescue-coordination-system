import React, { useState } from "react";
import { resourceAPI } from "../../services/api";
import { fmtUnit } from "./constants";
import { Modal, Field, Input, Btn } from "./sharedComponents";

export default function ModalRequestReturn({ item, onClose, refresh }) {
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");

  const submit = async () => {
    const val = parseFloat(qty);
    if (!val || val <= 0) return alert("Số lượng phải lớn hơn 0.");
    if (val > item.quantity) return alert(`Không được vượt quá số đã nhận (${item.quantity}).`);
    try {
      await resourceAPI.requestReturnDistribution(item.id, { return_quantity: val, return_note: note });
      alert("Đã gửi phiếu trả hàng. Chờ xác nhận.");
      refresh();
      onClose();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };

  return (
    <Modal title="Trả hàng dư" onClose={onClose}>
      <p className="text-sm text-gray-600">Đã nhận: {item.quantity} {fmtUnit(item.item_unit)}</p>
      <Field label="Số lượng muốn trả *">
        <Input type="number" min="0.1" step="0.1" max={item.quantity} value={qty} onChange={(e) => setQty(e.target.value)} />
      </Field>
      <Field label="Ghi chú">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tình trạng hàng, lý do trả..." />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Btn onClick={onClose} className="bg-gray-100 text-gray-700 hover:bg-gray-200">Huỷ</Btn>
        <Btn onClick={submit} className="bg-orange-500 text-white hover:bg-orange-600">Gửi phiếu trả</Btn>
      </div>
    </Modal>
  );
}
