import React, { useState, useEffect } from 'react';
import { resourceAPI } from '../../services/api';
import { X, Package, Truck, Minus } from 'lucide-react';

export default function ResAllocModal({ modal, warehouses, reliefItems, vehicles, onClose, onSuccess }) {
  const { task, type } = modal;
  const isSupply = type === 'supply';

  const [warehouseId, setWarehouseId] = useState('');
  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [pick, setPick] = useState({ item_id: '', quantity: '' });
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState('');
  const [doneVoucher, setDoneVoucher] = useState(null);

  const [vehicleId, setVehicleId] = useState('');
  const [missionNote, setMissionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isSupply || !warehouses?.length) return;
    if (warehouses.length === 1) setWarehouseId(String(warehouses[0].id));
  }, [warehouses, isSupply]);

  useEffect(() => {
    if (!isSupply || !warehouseId) { setInventory([]); return; }
    setInventoryLoading(true);
    resourceAPI.getInventory({ warehouse_id: warehouseId })
      .then(r => setInventory(r.data || []))
      .catch(() => setInventory([]))
      .finally(() => setInventoryLoading(false));
  }, [warehouseId, isSupply]);

  const stockOf = (itemId) =>
    inventory.find(inv => inv.item_id === Number(itemId))?.quantity ?? null;

  const remainingStock = (itemId) => {
    const base = stockOf(itemId);
    if (base === null) return null;
    const inCart = cart.filter(c => String(c.item_id) === String(itemId)).reduce((s, c) => s + c.quantity, 0);
    return base - inCart;
  };

  const addToCart = () => {
    if (!pick.item_id || !pick.quantity) return alert('Chọn vật phẩm và số lượng.');
    const rem = remainingStock(pick.item_id);
    if (rem !== null && Number(pick.quantity) > rem) return alert(`Tồn kho không đủ. Còn lại: ${rem}.`);
    const item = reliefItems.find(i => String(i.id) === pick.item_id);
    setCart(prev => {
      const existing = prev.find(c => String(c.item_id) === pick.item_id);
      if (existing) {
        return prev.map(c => String(c.item_id) === pick.item_id
          ? { ...c, quantity: Number(c.quantity) + Number(pick.quantity) } : c);
      }
      return [...prev, {
        item_id: pick.item_id,
        item_name: item?.name ?? `#${pick.item_id}`,
        unit: item?.unit ?? '',
        quantity: Number(pick.quantity),
      }];
    });
    setPick({ item_id: '', quantity: '' });
  };

  const submitSupply = async () => {
    if (!warehouseId) return alert('Vui lòng chọn kho xuất.');
    if (cart.length === 0) return alert('Hãy thêm ít nhất 1 vật phẩm.');
    setSubmitting(true);
    try {
      const res = await resourceAPI.createDistributionBatch({
        team_id: task.team_id,
        task_id: task.id,
        warehouse_id: warehouseId,
        notes: notes || undefined,
        items: cart.map(c => ({ item_id: c.item_id, quantity: c.quantity })),
      });
      setDoneVoucher(res.data.voucher_code);
      onSuccess({ closeModal: false });
    } catch (e) {
      alert(e?.response?.data?.error || 'Có lỗi xảy ra.');
    } finally { setSubmitting(false); }
  };

  const submitVehicle = async () => {
    if (!vehicleId) return alert('Vui lòng chọn xe.');
    setSubmitting(true);
    try {
      await resourceAPI.createVehicleDispatch({
        vehicle_id: vehicleId,
        team_id: task.team_id,
        task_id: task.id,
        mission_note: missionNote || undefined,
      });
      alert('Đã điều xe cho đội.');
      onSuccess();
    } catch (e) {
      alert(e?.response?.data?.error || 'Có lỗi xảy ra.');
    } finally { setSubmitting(false); }
  };

  const availableVehicles = (vehicles || []).filter(v => v.status === 'available');

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-purple-50 to-white">
          <div>
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              {isSupply ? <Package size={16} className="text-blue-500" /> : <Truck size={16} className="text-purple-500" />}
              {isSupply ? 'Cấp vật tư' : 'Điều xe'} cho đội
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              <span className="font-semibold text-gray-700">{task.team_name || 'Đội chủ lực'}</span>
              {' · '}Task #{task.id}: {task.name}
            </p>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {doneVoucher ? (
            <div className="text-center py-6 space-y-3">
              <div className="text-green-500 text-5xl">✓</div>
              <p className="font-medium text-gray-700">Phiếu cấp phát đã được tạo</p>
              <div className="bg-gray-100 rounded-xl px-6 py-4">
                <p className="text-xs text-gray-500 mb-1">Mã phiếu</p>
                <p className="text-2xl font-bold tracking-widest text-blue-700">{doneVoucher}</p>
              </div>
              <p className="text-xs text-gray-500">{cart.length} loại vật tư — Kho sẽ xác nhận xuất kho</p>
              <button onClick={() => onSuccess({ closeModal: true })} className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Đóng</button>
            </div>
          ) : isSupply ? (
            <>
              {(warehouses || []).length > 1 ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kho xuất *</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={warehouseId}
                    onChange={e => setWarehouseId(e.target.value)}
                  >
                    <option value="">— Chọn kho —</option>
                    {(warehouses || []).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              ) : warehouseId ? (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 border rounded-lg px-3 py-2">
                  <Package size={14} className="text-gray-400 shrink-0" />
                  <span className="font-medium">{(warehouses || []).find(w => String(w.id) === warehouseId)?.name || 'Kho mặc định'}</span>
                  <span className="ml-auto text-xs text-green-600 font-medium">Tự động</span>
                </div>
              ) : (
                <p className="text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                  Chưa có kho nào trong tỉnh. Liên hệ quản lý kho.
                </p>
              )}

              {warehouseId && (
                <div className="border rounded-xl p-3 bg-gray-50 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Thêm vật phẩm</p>
                  {inventoryLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        className="flex-1 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        value={pick.item_id}
                        onChange={e => setPick(p => ({ ...p, item_id: e.target.value }))}
                      >
                        <option value="">— Chọn vật phẩm —</option>
                        {(reliefItems || []).map(item => {
                          const rem = remainingStock(item.id);
                          return (
                            <option key={item.id} value={item.id} disabled={rem !== null && rem <= 0}>
                              {item.name}{rem !== null ? ` (còn: ${rem} ${item.unit || ''})` : ''}
                            </option>
                          );
                        })}
                      </select>
                      <input
                        type="number" min="1" placeholder="SL"
                        className="w-20 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={pick.quantity}
                        onChange={e => setPick(p => ({ ...p, quantity: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && addToCart()}
                      />
                      <button onClick={addToCart}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">+</button>
                    </div>
                  )}
                </div>
              )}

              {cart.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Giỏ hàng ({cart.length} loại)</p>
                  <div className="space-y-1.5">
                    {cart.map(item => (
                      <div key={item.item_id} className="flex items-center justify-between border rounded-lg px-3 py-2 bg-white">
                        <span className="text-sm font-medium text-gray-800">{item.item_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-blue-700">{item.quantity} {item.unit}</span>
                          <button onClick={() => setCart(prev => prev.filter(c => c.item_id !== item.item_id))}
                            className="text-gray-300 hover:text-red-400"><Minus size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Ghi chú cho phiếu xuất (tuỳ chọn)"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Xe điều động *</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={vehicleId}
                  onChange={e => setVehicleId(e.target.value)}
                >
                  <option value="">— Chọn xe —</option>
                  {availableVehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.plate_number}){v.type ? ` · ${v.type}` : ''}
                    </option>
                  ))}
                </select>
                {availableVehicles.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">Không có xe nào đang sẵn sàng.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú nhiệm vụ</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Ghi chú cho đội (tuỳ chọn)"
                  value={missionNote}
                  onChange={e => setMissionNote(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {!doneVoucher && (
          <div className="flex justify-end gap-2 px-5 py-4 border-t bg-gray-50">
            <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100">Hủy</button>
            <button
              onClick={isSupply ? submitSupply : submitVehicle}
              disabled={submitting || (isSupply ? cart.length === 0 : !vehicleId)}
              className={`px-5 py-2 text-sm text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5 font-medium ${
                isSupply ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {isSupply ? <Package size={14} /> : <Truck size={14} />}
              {submitting ? 'Đang xử lý...' : isSupply ? `Tạo phiếu (${cart.length} loại)` : 'Điều xe'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
