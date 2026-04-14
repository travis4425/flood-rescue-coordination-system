import React, { useState, useMemo } from "react";
import { CheckCircle, RotateCcw } from "lucide-react";
import { resourceAPI } from "../../services/api";
import { formatDate } from "../../utils/helpers";
import { fmtUnit } from "./constants";
import { Badge, Btn, EmptyState } from "./sharedComponents";

function MySupplyGroup({ group, isLeader, onConfirm, onReturnAll, setModal }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyVoucher = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(group.voucher_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const statuses = group.items.map((i) => i.status);
  const groupStatus = statuses.includes("return_requested") ? "return_requested"
    : statuses.includes("issued") ? "issued"
    : statuses.includes("confirmed") ? "confirmed"
    : "returned";

  const pendingConfirm = isLeader ? group.items.filter((i) => i.status === "issued" && i.warehouse_confirmed) : [];
  const canReturn = isLeader ? group.items.filter((i) => i.status === "confirmed") : [];
  const isSingle = group.items.length === 1;

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      <div className={`p-4 ${!isSingle ? "cursor-pointer hover:bg-gray-50 transition" : ""}`} onClick={() => !isSingle && setOpen((o) => !o)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge status={groupStatus} />
              {isSingle ? (
                <span className="font-medium text-gray-800">{group.items[0].item_name} × {group.items[0].quantity} {fmtUnit(group.items[0].item_unit)}</span>
              ) : (
                <span className="font-semibold text-gray-800">{group.items.length} loại vật tư</span>
              )}
            </div>
            <p className="text-xs text-gray-500">Từ kho: {group.warehouse_name} · {formatDate(group.created_at)}</p>
            {group.voucher_code && (
              <div className="mt-2 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                <span className="text-xs text-gray-500">Mã phiếu:</span>
                <span className="font-mono font-bold text-blue-700 text-base tracking-widest">{group.voucher_code}</span>
                <button onClick={copyVoucher} title="Sao chép" className="text-blue-400 hover:text-blue-600 transition">
                  {copied ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            )}
            {groupStatus === "issued" && group.items.some((i) => !i.warehouse_confirmed) && (
              <p className="text-xs text-yellow-600 mt-1">⏳ Trình mã phiếu trên cho kho xác nhận bàn giao</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isSingle && isLeader && (
              <div className="flex flex-col gap-1.5">
                {group.items[0].status === "issued" && group.items[0].warehouse_confirmed && (
                  <Btn onClick={() => onConfirm(group.items[0].id)} className="bg-green-600 text-white hover:bg-green-700 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 inline mr-1" /> Xác nhận nhận
                  </Btn>
                )}
                {group.items[0].status === "confirmed" && (
                  <Btn onClick={() => setModal({ type: "request_return", item: group.items[0] })} className="bg-orange-100 text-orange-700 hover:bg-orange-200 text-xs">
                    <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> Trả hàng dư
                  </Btn>
                )}
              </div>
            )}
            {!isSingle && (open ? <span className="text-gray-400">▲</span> : <span className="text-gray-400">▼</span>)}
          </div>
        </div>
      </div>

      {!isSingle && open && (
        <div className="border-t bg-gray-50 px-4 py-3 space-y-3">
          <div className="divide-y border rounded-lg overflow-hidden bg-white">
            {group.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.item_name}</p>
                  <p className="text-xs text-gray-500">{item.quantity} {fmtUnit(item.item_unit)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={item.status} />
                  {item.return_quantity && <span className="text-xs text-orange-500">Trả: {item.return_quantity}</span>}
                </div>
              </div>
            ))}
          </div>
          {isLeader && (pendingConfirm.length > 0 || canReturn.length > 0) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {pendingConfirm.length > 0 && (
                <Btn onClick={async () => { if (!window.confirm(`Xác nhận đã nhận ${pendingConfirm.length} loại vật tư?`)) return; for (const i of pendingConfirm) await onConfirm(i.id); }}
                  className="bg-green-600 text-white hover:bg-green-700 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 inline mr-1" /> Xác nhận nhận ({pendingConfirm.length} món)
                </Btn>
              )}
              {canReturn.length > 1 && (
                <Btn onClick={() => onReturnAll(canReturn)} className="bg-orange-500 text-white hover:bg-orange-600 text-xs">
                  <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> Trả tất cả ({canReturn.length} món)
                </Btn>
              )}
              {canReturn.map((item) => (
                <Btn key={item.id} onClick={() => setModal({ type: "request_return", item })} className="bg-orange-100 text-orange-700 hover:bg-orange-200 text-xs">
                  <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> Trả: {item.item_name}
                </Btn>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TabMySupplies({ data, user, setModal, refresh }) {
  const isLeader = user?.is_team_leader;

  const handleConfirm = async (id) => {
    try { await resourceAPI.confirmDistribution(id); refresh(); }
    catch (e) { alert(e?.response?.data?.error || "Có lỗi."); }
  };

  const handleReturnAll = async (items) => {
    if (!window.confirm(`Gửi yêu cầu trả lại tất cả ${items.length} loại vật tư (toàn bộ số lượng)?`)) return;
    try {
      for (const item of items) {
        await resourceAPI.requestReturnDistribution(item.id, { return_quantity: item.quantity, return_note: "Trả toàn bộ" });
      }
      refresh();
    } catch (e) { alert(e?.response?.data?.error || "Có lỗi khi gửi yêu cầu trả."); }
  };

  const groups = useMemo(() => {
    const map = new Map();
    for (const d of data) {
      const key = d.voucher_code || `solo-${d.id}`;
      if (!map.has(key)) {
        map.set(key, { voucher_code: d.voucher_code, warehouse_name: d.warehouse_name, created_at: d.created_at, items: [] });
      }
      map.get(key).items.push(d);
    }
    return [...map.values()];
  }, [data]);

  if (data.length === 0) return <EmptyState text="Đội chưa được cấp vật tư." />;

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <MySupplyGroup key={group.voucher_code || group.items[0].id} group={group} isLeader={isLeader}
          onConfirm={handleConfirm} onReturnAll={handleReturnAll} setModal={setModal} />
      ))}
    </div>
  );
}
