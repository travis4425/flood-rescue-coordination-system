import React, { useState } from "react";
import { resourceAPI } from "../../services/api";
import { fmtUnit } from "./constants";
import { Modal, Field, Input, Btn } from "./sharedComponents";

export default function ModalConfirmQty({ item, onClose, refresh }) {
  const [qty, setQty] = useState("");
  const isSupplyTransfer = item.mode === "supply_transfer";
  const maxQty = isSupplyTransfer ? item.quantity : item.return_quantity;

  const submit = async () => {
    const val = parseFloat(qty);
    if (!val || val <= 0) return alert("Số lượng phải lớn hơn 0.");
    if (val > maxQty) return alert(`Không được vượt quá ${maxQty}.`);
    try {
      if (isSupplyTransfer) {
        await resourceAPI.confirmSupplyTransfer(item.id, { confirmed_quantity: val });
        alert(`Đã xác nhận nhận ${val} đơn vị. Kho đích đã cộng.`);
      } else {
        await resourceAPI.confirmReturnDistribution(item.id, { received_quantity: val });
        alert(`Đã xác nhận nhận lại ${val} đơn vị. Tồn kho đã cộng.`);
      }
      refresh();
      onClose();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };

  return (
    <Modal title={isSupplyTransfer ? "Xác nhận nhận vật tư" : "Xác nhận nhận lại hàng dư"} onClose={onClose}>
      <p className="text-sm text-gray-600">
        {isSupplyTransfer
          ? `Số lượng điều: ${item.quantity} ${fmtUnit(item.item_unit || "")}`
          : `Số lượng team khai trả: ${item.return_quantity} ${fmtUnit(item.item_unit || "")}`}
      </p>
      <Field label="Số lượng thực nhận *">
        <Input type="number" min="0.1" step="0.1" max={maxQty} value={qty} onChange={(e) => setQty(e.target.value)} />
      </Field>
      <p className="text-xs text-gray-400">Phần chênh lệch sẽ được hoàn lại kho nguồn.</p>
      <div className="flex justify-end gap-2 pt-2">
        <Btn onClick={onClose} className="bg-gray-100 text-gray-700 hover:bg-gray-200">Huỷ</Btn>
        <Btn onClick={submit} className="bg-green-600 text-white hover:bg-green-700">Xác nhận</Btn>
      </div>
    </Modal>
  );
}
