import React, { useState, useEffect } from "react";
import { Warehouse, ChevronDown, ChevronUp } from "lucide-react";
import { resourceAPI } from "../../services/api";
import { formatDate } from "../../utils/helpers";
import { CATEGORY_LABELS, VEHICLE_TYPE_LABELS, fmtUnit } from "./constants";
import { Badge, EmptyState } from "./sharedComponents";

export default function TabWarehouses({ data, vehicles, role, setModal, refresh }) {
  const canManage = role === "manager" || role === "admin";
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [invCache, setInvCache] = useState({});

  const loadInventory = async (wId) => {
    if (invCache[wId]) return;
    setInvCache((prev) => ({ ...prev, [wId]: { loading: true, items: [] } }));
    try {
      const res = await resourceAPI.getInventory({ warehouse_id: wId });
      setInvCache((prev) => ({ ...prev, [wId]: { loading: false, items: res.data || [] } }));
    } catch {
      setInvCache((prev) => ({ ...prev, [wId]: { loading: false, items: [] } }));
    }
  };

  useEffect(() => {
    if (role === "coordinator" && data.length > 0) {
      const ids = new Set(data.map((w) => w.id));
      setExpandedIds(ids);
      data.forEach((w) => loadInventory(w.id));
    }
  }, [role, data]); // eslint-disable-line

  const toggleWarehouse = async (w) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(w.id)) { next.delete(w.id); return next; }
      next.add(w.id);
      return next;
    });
    loadInventory(w.id);
  };

  const handleDelete = async (w) => {
    if (!window.confirm(`Vô hiệu hóa kho "${w.name}"?`)) return;
    try {
      await resourceAPI.deleteWarehouse(w.id);
      refresh();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };

  if (data.length === 0) return <EmptyState text="Không có kho hàng." />;

  if (role === "coordinator") {
    const w = data[0];
    const inv = invCache[w?.id];
    const warehouseVehicles = (vehicles || []).filter((v) =>
      v.warehouse_id ? v.warehouse_id === w?.id : v.province_id === w?.province_id,
    );
    return (
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-100">
          📦 Vật tư tồn kho — {w?.name}
        </p>
        {inv?.loading ? (
          <p className="text-center py-6 text-sm text-gray-400">Đang tải...</p>
        ) : !inv?.items?.length ? (
          <p className="px-4 py-4 text-sm text-gray-400">Chưa có vật tư nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b bg-gray-50">
                  {["Vật phẩm", "Danh mục", "Đơn vị", "Số lượng", "Cập nhật"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inv.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-800">{item.item_name}</td>
                    <td className="px-4 py-2 text-gray-500">{CATEGORY_LABELS[item.category] || item.category}</td>
                    <td className="px-4 py-2 text-gray-500">{fmtUnit(item.unit)}</td>
                    <td className="px-4 py-2">
                      <span className={`font-semibold ${item.quantity <= (item.min_threshold || 0) ? "text-red-600" : "text-blue-700"}`}>
                        {item.quantity}
                      </span>
                      {item.quantity <= (item.min_threshold || 0) && (
                        <span className="ml-1 text-xs text-red-500">(dưới ngưỡng)</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs">{formatDate(item.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-100 border-t">
          🚤 Phương tiện ({w?.province_name})
        </p>
        {warehouseVehicles.length === 0 ? (
          <p className="px-4 py-4 text-sm text-gray-400">Không có phương tiện.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b bg-gray-50">
                  {["Tên xe", "Biển số", "Loại", "Sức chứa", "Đội", "Trạng thái"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {warehouseVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-800">{v.name}</td>
                    <td className="px-4 py-2 text-gray-400">{v.plate_number}</td>
                    <td className="px-4 py-2">{VEHICLE_TYPE_LABELS[v.type] || v.type}</td>
                    <td className="px-4 py-2 text-gray-600">{v.capacity}</td>
                    <td className="px-4 py-2 text-gray-500">{v.team_name || '—'}</td>
                    <td className="px-4 py-2"><Badge status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setModal({ type: "warehouse_create" })}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Tạo kho
          </button>
        </div>
      )}
      {data.map((w) => {
        const isCentral = w.warehouse_type === "central";
        const isOpen = expandedIds.has(w.id);
        const inv = invCache[w.id];
        const warehouseVehicles = (vehicles || []).filter((v) =>
          v.warehouse_id ? v.warehouse_id === w.id : isCentral && v.province_id === w.province_id,
        );
        return (
          <div key={w.id} className="border rounded-xl bg-white shadow-sm overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleWarehouse(w)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Warehouse className="w-5 h-5 text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 truncate">{w.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${isCentral ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                      {isCentral ? "Kho tổng" : "Vệ tinh"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">📍 {w.province_name} · {w.address}</p>
                  <div className="flex gap-3 mt-0.5 text-xs text-gray-600">
                    {w.manager_name && <span>👤 {w.manager_name}</span>}
                    {w.coordinator_name && <span>🧑‍💼 {w.coordinator_name}</span>}
                    <span>📦 {w.capacity_tons} tấn</span>
                    {warehouseVehicles.length > 0 && (
                      <span className="text-blue-600 font-medium">🚤 {warehouseVehicles.length} xe</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                {canManage && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setModal({ type: "warehouse_edit", item: w }); }}
                    className="text-gray-400 hover:text-blue-600 p-1"
                  >
                    ✏️
                  </button>
                )}
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </div>

            {isOpen && (
              <div className="border-t bg-gray-50 divide-y divide-gray-200">
                <div>
                  <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-100">
                    📦 Vật tư tồn kho
                  </p>
                  {inv?.loading ? (
                    <p className="text-center py-4 text-sm text-gray-400">Đang tải...</p>
                  ) : !inv?.items?.length ? (
                    <p className="px-4 py-3 text-sm text-gray-400">Chưa có vật tư nào.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-500 border-b bg-gray-50">
                            {["Vật phẩm", "Danh mục", "Đơn vị", "Số lượng", "Cập nhật"].map((h) => (
                              <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {inv.items.map((item) => (
                            <tr key={item.id} className="hover:bg-white transition-colors">
                              <td className="px-4 py-2 font-medium text-gray-800">{item.item_name}</td>
                              <td className="px-4 py-2 text-gray-500">{CATEGORY_LABELS[item.category] || item.category}</td>
                              <td className="px-4 py-2 text-gray-500">{fmtUnit(item.unit)}</td>
                              <td className="px-4 py-2">
                                <span className={`font-semibold ${item.quantity <= (item.min_threshold || 0) ? "text-red-600" : "text-blue-700"}`}>
                                  {item.quantity}
                                </span>
                                {item.quantity <= (item.min_threshold || 0) && (
                                  <span className="ml-1 text-xs text-red-500">(dưới ngưỡng)</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-gray-400 text-xs">{formatDate(item.updated_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div>
                  <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-100">
                    🚤 Phương tiện ({w.province_name})
                  </p>
                  {warehouseVehicles.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">Không có phương tiện.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-500 border-b bg-gray-50">
                            {["Tên xe", "Biển số", "Loại", "Sức chứa", "Đội", "Trạng thái"].map((h) => (
                              <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {warehouseVehicles.map((v) => (
                            <tr key={v.id} className="hover:bg-white transition-colors">
                              <td className="px-4 py-2 font-medium text-gray-800">{v.name}</td>
                              <td className="px-4 py-2 text-gray-400">{v.plate_number}</td>
                              <td className="px-4 py-2">{VEHICLE_TYPE_LABELS[v.type] || v.type}</td>
                              <td className="px-4 py-2 text-gray-600">{v.capacity}</td>
                              <td className="px-4 py-2 text-gray-500">{v.team_name || '—'}</td>
                              <td className="px-4 py-2"><Badge status={v.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
