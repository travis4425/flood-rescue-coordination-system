import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, Loader2 } from 'lucide-react';

export default function DataTable({
  columns, data, loading = false,
  onSort, sortKey, sortDir,
  onExport, emptyIcon = '📋', emptyText = 'Không có dữ liệu',
  rowKey = 'id',
}) {
  function handleSort(col) {
    if (!col.sortable || !onSort) return;
    const newDir = sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc';
    onSort(col.key, newDir);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
      <Loader2 size={24} className="animate-spin" />
      <span className="text-sm">Đang tải...</span>
    </div>
  );

  return (
    <div className="w-full overflow-x-auto">
      {onExport && (
        <div className="flex justify-end mb-3">
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition"
            style={{ background: 'var(--eoc-bg-tertiary)', color: 'var(--eoc-accent)' }}
          >
            <Download size={14} /> Xuất Excel
          </button>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--eoc-border)' }}>
            {columns.map(col => (
              <th
                key={col.key}
                onClick={() => handleSort(col)}
                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider select-none
                  ${col.sortable ? 'cursor-pointer hover:opacity-80' : ''}`}
                style={{ color: 'var(--eoc-text-muted)', width: col.width }}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && (
                    sortKey === col.key
                      ? sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      : <ChevronsUpDown size={12} className="opacity-40" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center">
                <div className="text-4xl mb-2">{emptyIcon}</div>
                <p className="text-sm" style={{ color: 'var(--eoc-text-muted)' }}>{emptyText}</p>
              </td>
            </tr>
          ) : data.map((row, i) => (
            <tr
              key={row[rowKey] ?? i}
              className="transition-colors"
              style={{ borderBottom: '1px solid var(--eoc-border)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3" style={{ color: 'var(--eoc-text-primary)' }}>
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
