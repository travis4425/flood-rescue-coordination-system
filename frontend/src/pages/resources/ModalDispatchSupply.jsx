import React, { useState, useEffect } from "react";
import { resourceAPI } from "../../services/api";
import { fmtUnit } from "./constants";
import { Modal, Field, Input, Select, Btn } from "./sharedComponents";

export default function ModalDispatchSupply({ warehouses, reliefItems, teams, user, onClose, refresh }) {
  const isCoordinator = user?.role === "coordinator";
  const provinceId = user?.province_id;

  const myTeams = isCoordinator ? teams.filter((t) => t.province_id === provinceId) : teams;
  const myWarehouses = isCoordinator
    ? warehouses.filter((w) => w.coordinator_id === user?.id || w.province_id === provinceId)
    : warehouses;

  const [header, setHeader] = useState({ team_id: "", warehouse_id: "", notes: "" });
  const setH = (k, v) => setHeader((h) => ({ ...h, [k]: v }));

  const autoWarehouseId = myWarehouses.length === 1 ? String(myWarehouses[0].id) : "";
  useEffect(() => {
    if (autoWarehouseId && !header.warehouse_id) setH("warehouse_id", autoWarehouseId);
  }, [autoWarehouseId]); // eslint-disable-line

  const [cart, setCart] = useState([]);
  const [pick, setPick] = useState({ item_id: "", quantity: "" });
  const setPick_ = (k, v) => setPick((p) => ({ ...p, [k]: v }));

  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  useEffect(() => {
    if (!header.warehouse_id) { setInventory([]); return; }
    setInventoryLoading(true);
    resourceAPI.getInventory({ warehouse_id: header.warehouse_id })
      .then((r) => setInventory(r.data || []))
      .catch(() => setInventory([]))
      .finally(() => setInventoryLoading(false));
  }, [header.warehouse_id]);

  const stockOf = (itemId) => inventory.find((inv) => inv.item_id === Number(itemId))?.quantity ?? null;

  const remainingStock = (itemId) => {
    const base = stockOf(itemId);
    if (base === null) return null;
    const inCart = cart.filter((c) => String(c.item_id) === String(itemId)).reduce((s, c) => s + Number(c.quantity), 0);
    return base - inCart;
  };

  const addToCart = () => {
    if (!pick.item_id || !pick.quantity) return alert("Chọn vật phẩm và số lượng.");
    const rem = remainingStock(pick.item_id);
    if (rem !== null && Number(pick.quantity) > rem) return alert(`Tồn kho không đủ. Còn lại: ${rem}.`);
    const item = reliefItems.find((i) => String(i.id) === pick.item_id);
    setCart((prev) => {
      const existing = prev.find((c) => String(c.item_id) === pick.item_id);
      if (existing) {
        return prev.map((c) => String(c.item_id) === pick.item_id ? { ...c, quantity: Number(c.quantity) + Number(pick.quantity) } : c);
      }
      return [...prev, { item_id: pick.item_id, item_name: item?.name ?? `#${pick.item_id}`, unit: item?.unit ?? "", quantity: Number(pick.quantity), stock: stockOf(pick.item_id) }];
    });
    setPick({ item_id: "", quantity: "" });
  };

  const removeFromCart = (itemId) => setCart((prev) => prev.filter((c) => String(c.item_id) !== String(itemId)));

  const [submitting, setSubmitting] = useState(false);
  const [doneVoucher, setDoneVoucher] = useState(null);

  const submit = async () => {
    if (!header.team_id || !header.warehouse_id) return alert("Vui lòng chọn đội nhận và kho xuất.");
    if (cart.length === 0) return alert("Danh sách vật tư trống. Hãy thêm ít nhất 1 vật phẩm.");
    setSubmitting(true);
    try {
      const res = await resourceAPI.createDistributionBatch({
        team_id: header.team_id, warehouse_id: header.warehouse_id,
        notes: header.notes || undefined,
        items: cart.map((c) => ({ item_id: c.item_id, quantity: c.quantity })),
      });
      setDoneVoucher(res.data.voucher_code);
      refresh();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  };

  if (doneVoucher) {
    return (
      <Modal title="Cấp phát thành công" onClose={onClose}>
        <div className="text-center py-4 space-y-3">
          <div className="text-green-600 text-5xl">✓</div>
          <p className="text-gray-700 font-medium">Phiếu cấp phát đã được tạo</p>
          <div className="bg-gray-100 rounded-xl px-6 py-4">
            <p className="text-xs text-gray-500 mb-1">Mã phiếu</p>
            <p className="text-2xl font-bold tracking-widest text-blue-700">{doneVoucher}</p>
          </div>
          <p className="text-xs text-gray-500">{cart.length} loại vật tư — Đội nhận sẽ xác nhận trên app</p>
        </div>
        <div className="flex justify-end pt-2">
          <Btn onClick={onClose} className="bg-blue-600 text-white hover:bg-blue-700">Đóng</Btn>
        </div>
      </Modal>
    );
  }

  const pickRemaining = pick.item_id ? remainingStock(pick.item_id) : null;

  return (
    <Modal title="Cấp phát vật tư" onClose={onClose}>
      <Field label="Đội nhận *">
        <Select value={header.team_id} onChange={(e) => setH("team_id", e.target.value)}>
          <option value="">— Chọn đội —</option>
          {myTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      </Field>

      {myWarehouses.length !== 1 ? (
        <Field label="Kho xuất *">
          <Select value={header.warehouse_id} onChange={(e) => setH("warehouse_id", e.target.value)}>
            <option value="">— Chọn kho —</option>
            {myWarehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </Field>
      ) : (
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          🏭 Kho xuất: <span className="font-medium text-gray-800">{myWarehouses[0].name}</span>
        </div>
      )}

      <Field label="Ghi chú chung">
        <Input value={header.notes} onChange={(e) => setH("notes", e.target.value)} placeholder="Không bắt buộc" />
      </Field>

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 flex justify-between">
          <span>Danh sách vật tư</span>
          <span className="text-blue-600">{cart.length} loại</span>
        </div>
        {cart.length === 0 ? (
          <p className="text-sm text-gray-400 px-3 py-4 text-center">Chưa có vật phẩm nào. Thêm bên dưới.</p>
        ) : (
          <div className="divide-y">
            {cart.map((c) => (
              <div key={c.item_id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="font-medium text-gray-800">{c.item_name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">{c.quantity} {fmtUnit(c.unit)}</span>
                  <button onClick={() => removeFromCart(c.item_id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 rounded-lg p-3 space-y-2">
        <p className="text-xs font-semibold text-blue-700">+ Thêm vật phẩm</p>
        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={pick.item_id} onChange={(e) => setPick_("item_id", e.target.value)}>
              <option value="">{inventoryLoading ? "Đang tải tồn kho..." : "— Vật phẩm —"}</option>
              {reliefItems.map((i) => {
                const rem = remainingStock(i.id);
                return (
                  <option key={i.id} value={i.id} disabled={rem !== null && rem <= 0}>
                    {i.name} ({fmtUnit(i.unit)}){inventoryLoading ? "" : rem !== null ? ` — còn: ${rem}` : ""}
                  </option>
                );
              })}
            </Select>
          </div>
          <div className="w-24">
            <Input type="number" min="0.1" step="0.1" max={pickRemaining ?? undefined}
              value={pick.quantity} onChange={(e) => setPick_("quantity", e.target.value)} placeholder="SL" />
          </div>
          <Btn onClick={addToCart} className="bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap text-sm px-3">Thêm</Btn>
        </div>
        {pick.item_id && pickRemaining !== null && (
          <p className={`text-xs ${pickRemaining <= 0 ? "text-red-500" : "text-gray-500"}`}>
            Tồn kho còn lại: <span className="font-semibold">{pickRemaining}</span>{" "}
            {fmtUnit(reliefItems.find((i) => String(i.id) === pick.item_id)?.unit)}
            {pickRemaining <= 0 && " — Hết hàng"}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Btn onClick={onClose} className="bg-gray-100 text-gray-700 hover:bg-gray-200">Huỷ</Btn>
        <Btn onClick={submit} disabled={submitting} className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
          {submitting ? "Đang xử lý..." : `Cấp phát (${cart.length} loại)`}
        </Btn>
      </div>
    </Modal>
  );
}
