import React, { useState, useMemo } from "react";
import { Plus, Search, ChevronDown, ChevronUp, CheckCircle, RotateCcw } from "lucide-react";
import { resourceAPI } from "../../services/api";
import { formatDate } from "../../utils/helpers";
import { fmtUnit } from "./constants";
import { Badge, Btn, EmptyState } from "./sharedComponents";

function BatchDistributionCard({ batch, role, setModal, refresh }) {
  const [open, setOpen] = useState(false);

  const handleCancelBatch = async () => {
    if (!window.confirm("Hoàn tác phiếu cấp phát này? Tồn kho sẽ được cộng lại.")) return;
    try {
      await resourceAPI.cancelDistributionBatch(batch.batch_id);
      alert("Đã hoàn tác. Tồn kho đã được cộng lại.");
      refresh();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };

  const statusColor = {
    issued: "bg-blue-100 text-blue-700",
    confirmed: "bg-green-100 text-green-700",
    return_requested: "bg-yellow-100 text-yellow-700",
    returned: "bg-gray-100 text-gray-600",
  }[batch.status] ?? "bg-gray-100 text-gray-600";

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
            {batch.status === "issued" ? "Đã xuất" : batch.status === "confirmed" ? "Đã nhận" : batch.status === "return_requested" ? "Xin trả" : "Đã trả"}
          </span>
          <div>
            <p className="font-bold text-sm text-gray-800">{batch.team_name}</p>
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="font-mono font-semibold text-blue-700 text-sm">{batch.voucher_code}</span>
              <span className="text-gray-400">·</span>
              <span>{batch.items.length} loại · {batch.warehouse_name}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{formatDate(batch.created_at)}</span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>
      {open && (
        <div className="border-t bg-gray-50 px-4 py-3 space-y-3 text-sm">
          <p className="text-gray-500 text-xs">Cấp bởi: {batch.distributed_by_name}</p>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">📥 Nhận hàng</p>
            <div className="border rounded-lg overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400 border-b">
                    <th className="px-3 py-1.5 text-left font-medium">Vật tư</th>
                    <th className="px-3 py-1.5 text-right font-medium">Số lượng</th>
                    <th className="px-3 py-1.5 text-center font-medium">Trạng thái</th>
                    <th className="px-3 py-1.5 text-right font-medium">Thời gian nhận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {batch.items.map((item) => {
                    const received = ["confirmed", "return_requested", "returned"].includes(item.status);
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-gray-800">{item.item_name}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{item.quantity} {fmtUnit(item.item_unit)}</td>
                        <td className="px-3 py-2 text-center">
                          {received ? <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Đội đã nhận</span>
                            : <span className="text-xs text-gray-300">Chưa nhận</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-gray-500">
                          {item.confirmed_at ? formatDate(item.confirmed_at) : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">📤 Trả hàng</p>
            <div className="border rounded-lg overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400 border-b">
                    <th className="px-3 py-1.5 text-left font-medium">Vật tư</th>
                    <th className="px-3 py-1.5 text-right font-medium">Số lượng trả</th>
                    <th className="px-3 py-1.5 text-center font-medium">Trạng thái</th>
                    <th className="px-3 py-1.5 text-right font-medium">Thời gian trả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {batch.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 text-gray-800">{item.item_name}</td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {item.return_quantity ? `${item.return_quantity} ${fmtUnit(item.item_unit)}` : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {item.status === "returned" ? <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Đã nhận lại</span>
                          : item.status === "return_requested" ? <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Chờ xác nhận</span>
                          : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-gray-500">
                        {item.returned_at ? formatDate(item.returned_at) : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {role === "rescue_team" && batch.status === "issued" && (
            <Btn onClick={() => setModal({ type: "confirm_qty", item: { ...batch.items[0], mode: "confirm_batch", batch_ids: batch.items.map((i) => i.id) } })}
              className="bg-green-600 text-white hover:bg-green-700">
              <CheckCircle className="w-4 h-4 inline mr-1" /> Xác nhận đã nhận
            </Btn>
          )}
          {["manager", "warehouse_manager", "coordinator"].includes(role) && batch.status === "issued" && batch.items.every((i) => !i.warehouse_confirmed) && (
            <Btn onClick={handleCancelBatch} className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
              <RotateCcw className="w-4 h-4 inline mr-1" /> Hoàn tác
            </Btn>
          )}
          {["manager", "warehouse_manager"].includes(role) && batch.status === "return_requested" && (
            <Btn onClick={() => setModal({ type: "confirm_qty", item: { ...batch.items[0], mode: "confirm_return" } })}
              className="bg-green-600 text-white hover:bg-green-700">
              <CheckCircle className="w-4 h-4 inline mr-1" /> Xác nhận nhận lại hàng
            </Btn>
          )}
        </div>
      )}
    </div>
  );
}

function DistributionCard({ d, role, setModal, refresh }) {
  const [open, setOpen] = useState(false);

  const handleCancel = async () => {
    if (!window.confirm("Hoàn tác cấp phát này? Tồn kho sẽ được cộng lại.")) return;
    try {
      await resourceAPI.cancelDistribution(d.id);
      alert("Đã hoàn tác. Tồn kho đã được cộng lại.");
      refresh();
    } catch (e) {
      alert(e?.response?.data?.error || "Có lỗi xảy ra.");
    }
  };

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-center gap-3">
          <Badge status={d.status} />
          <div>
            <p className="font-bold text-sm text-gray-800">{d.team_name}</p>
            <p className="text-xs text-gray-500">{d.item_name} × {d.quantity} {fmtUnit(d.item_unit)} · {d.warehouse_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{formatDate(d.created_at)}</span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>
      {open && (
        <div className="border-t px-4 py-3 bg-gray-50 text-sm space-y-1">
          <p className="text-gray-500">Cấp bởi: {d.distributed_by_name}</p>
          {d.confirmed_at && <p className="text-gray-500">Đã nhận: {formatDate(d.confirmed_at)}</p>}
          {d.return_quantity && <p className="text-gray-500">Số lượng trả: {d.return_quantity} {fmtUnit(d.item_unit)}</p>}
          {d.received_return_qty && <p className="text-gray-500">Nhận lại thực tế: {d.received_return_qty} {fmtUnit(d.item_unit)}</p>}
          {d.notes && <p className="text-gray-500">Ghi chú: {d.notes}</p>}
          {["manager", "warehouse_manager", "coordinator"].includes(role) && d.status === "issued" && !d.warehouse_confirmed && (
            <div className="pt-2">
              <Btn onClick={handleCancel} className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
                <RotateCcw className="w-4 h-4 inline mr-1" /> Hoàn tác
              </Btn>
            </div>
          )}
          {["manager", "warehouse_manager"].includes(role) && d.status === "return_requested" && (
            <div className="pt-2">
              <Btn onClick={() => setModal({ type: "confirm_qty", item: { ...d, mode: "confirm_return" } })}
                className="bg-green-600 text-white hover:bg-green-700">
                <CheckCircle className="w-4 h-4 inline mr-1" /> Xác nhận nhận lại hàng
              </Btn>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TabDistributions({ data, role, setModal, refresh }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { batches, standalone } = useMemo(() => {
    const batchMap = new Map();
    const alone = [];
    for (const d of data) {
      if (d.batch_id) {
        if (!batchMap.has(d.batch_id)) {
          batchMap.set(d.batch_id, {
            batch_id: d.batch_id,
            voucher_code: d.batch_voucher || d.voucher_code,
            team_name: d.team_name,
            warehouse_name: d.warehouse_name,
            distributed_by_name: d.distributed_by_name,
            created_at: d.created_at,
            status: d.status,
            items: [],
          });
        }
        batchMap.get(d.batch_id).items.push(d);
      } else {
        alone.push(d);
      }
    }
    return { batches: [...batchMap.values()], standalone: alone };
  }, [data]);

  const q = search.toLowerCase().trim();
  const filteredBatches = batches.filter((b) => {
    if (filterStatus && b.status !== filterStatus) return false;
    if (!q) return true;
    return b.voucher_code?.toLowerCase().includes(q) || b.team_name?.toLowerCase().includes(q) || b.warehouse_name?.toLowerCase().includes(q) || b.items.some((i) => i.item_name?.toLowerCase().includes(q));
  });
  const filteredStandalone = standalone.filter((d) => {
    if (filterStatus && d.status !== filterStatus) return false;
    if (!q) return true;
    return d.voucher_code?.toLowerCase().includes(q) || d.team_name?.toLowerCase().includes(q) || d.warehouse_name?.toLowerCase().includes(q) || d.item_name?.toLowerCase().includes(q);
  });
  const totalShown = filteredBatches.length + filteredStandalone.length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        {role === "coordinator" && (
          <Btn onClick={() => setModal({ type: "dispatch_supply" })} className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 shrink-0">
            <Plus className="w-4 h-4" /> Cấp phát vật tư
          </Btn>
        )}
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã phiếu, đội, kho, vật tư..."
              className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>}
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
            <option value="">Tất cả TT</option>
            <option value="issued">Đã xuất</option>
            <option value="confirmed">Đã nhận</option>
            <option value="return_requested">Xin trả</option>
            <option value="returned">Đã trả</option>
          </select>
        </div>
      </div>
      {(q || filterStatus) ? <p className="text-xs text-gray-500 mb-2">{totalShown} kết quả{q ? ` cho "${search}"` : ""}</p> : null}
      <div className="space-y-3">
        {data.length === 0 && <EmptyState text="Chưa có phiếu cấp phát." />}
        {data.length > 0 && totalShown === 0 && <EmptyState text="Không tìm thấy phiếu phù hợp." />}
        {filteredBatches.map((b) => <BatchDistributionCard key={b.batch_id} batch={b} role={role} setModal={setModal} refresh={refresh} />)}
        {filteredStandalone.map((d) => <DistributionCard key={d.id} d={d} role={role} setModal={setModal} refresh={refresh} />)}
      </div>
    </div>
  );
}
