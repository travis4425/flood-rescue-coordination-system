import React, { useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { formatDate } from "../../utils/helpers";
import { EmptyState, Badge } from "./sharedComponents";

export default function TabHistory({ data, refresh }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDir, setFilterDir] = useState("");

  const q = search.toLowerCase().trim();
  const filtered = data.filter((row) => {
    if (filterType && row.record_type !== filterType) return false;
    if (filterDir === 'return') {
      if (!['returned', 'partially_returned'].includes(row.status)) return false;
    } else if (filterDir === 'cancelled') {
      if (row.status !== 'cancelled') return false;
    } else if (filterDir === 'issue') {
      if (row.direction !== 'issue') return false;
      if (['returned', 'partially_returned', 'cancelled'].includes(row.status)) return false;
    } else if (filterDir && row.direction !== filterDir) return false;
    if (!q) return true;
    return (
      row.item_name?.toLowerCase().includes(q) ||
      row.team_name?.toLowerCase().includes(q) ||
      row.voucher_code?.toLowerCase().includes(q) ||
      row.warehouse_name?.toLowerCase().includes(q)
    );
  });

  const dirLabel = { issue: "Xuất", return: "Nhập", import: "Nhập" };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm đội, vật tư/xe, mã phiếu, kho..."
            className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" />
          {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>}
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
          <option value="">Tất cả loại</option>
          <option value="supply">Vật tư</option>
          <option value="vehicle">Xe</option>
        </select>
        <select value={filterDir} onChange={(e) => setFilterDir(e.target.value)}
          className="text-sm border rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
          <option value="">Tất cả</option>
          <option value="issue">Xuất kho</option>
          <option value="return">Trả hàng</option>
          <option value="import">Nhập kho</option>
          <option value="cancelled">Đã hủy</option>
        </select>
        <button onClick={refresh} className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 px-2">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {data.length === 0 ? <EmptyState text="Chưa có lịch sử nhập xuất." />
        : filtered.length === 0 ? <EmptyState text="Không tìm thấy kết quả phù hợp." />
        : (
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b">
                  {["Thời gian", "Loại", "Hướng", "Vật tư / Xe", "Số lượng", "Đội / Kho nhận", "Mã phiếu", "Trạng thái"].map(h => (
                    <th key={h} className={`px-4 py-3 text-left ${h === "Số lượng" ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{formatDate(row.event_time)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${row.record_type === 'vehicle' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                        {row.record_type === 'vehicle' ? 'Xe' : 'Vật tư'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${row.direction === 'issue' ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
                        {dirLabel[row.direction] || row.direction}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">
                      {row.item_name}
                      {row.unit && row.record_type === 'vehicle' && <span className="ml-1 text-xs text-gray-400">{row.unit}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-700">
                      {row.record_type === 'vehicle' ? '1' : `${row.quantity} ${row.unit || ''}`}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">
                      {row.record_type === 'import' ? (row.warehouse_name || '—') : (row.team_name || '—')}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-blue-700 text-xs">{row.voucher_code || '—'}</td>
                    <td className="px-4 py-2.5"><Badge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 px-4 py-2 border-t">{filtered.length} bản ghi</p>
          </div>
        )}
    </div>
  );
}
