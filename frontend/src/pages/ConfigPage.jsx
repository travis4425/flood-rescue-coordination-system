import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { configAPI } from '../services/api';
import {
  Settings, AlertTriangle, Layers, Package,
  Plus, Edit2, Trash2, Save, X, Check, ToggleLeft, ToggleRight
} from 'lucide-react';

const RESCUE_CATEGORY_LABELS = {
  cuu_nan: 'Cứu nạn',
  cuu_tro: 'Cứu trợ',
  cuu_ho: 'Cứu hộ',
  all: 'Tất cả',
};

const RELIEF_ITEM_CATEGORIES = [
  { value: 'food', label: 'Thực phẩm' },
  { value: 'water', label: 'Nước uống' },
  { value: 'medical', label: 'Y tế' },
  { value: 'equipment', label: 'Thiết bị' },
  { value: 'shelter', label: 'Trú ẩn' },
  { value: 'fuel', label: 'Nhiên liệu' },
  { value: 'other', label: 'Khác' },
];

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all
      ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
      {type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
      {message}
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <p className="text-gray-800 font-medium mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Hủy</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700">Xóa</button>
        </div>
      </div>
    </div>
  );
}

// ==================== SYSTEM PARAMS TAB ====================
function SystemParamsTab() {
  const [params, setParams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await configAPI.getAll();
      setParams(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const startEdit = (p) => {
    setEditingKey(p.config_key);
    setEditValue(p.config_value ?? '');
    setEditDesc(p.description ?? '');
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await configAPI.update(editingKey, { config_value: editValue, description: editDesc });
      setToast({ message: 'Đã lưu', type: 'success' });
      setEditingKey(null);
      fetch();
    } catch {
      setToast({ message: 'Lưu thất bại', type: 'error' });
    }
    setSaving(false);
  };

  const saveNew = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    setSaving(true);
    try {
      await configAPI.update(newKey.trim(), { config_value: newValue, description: newDesc });
      setToast({ message: 'Đã thêm tham số', type: 'success' });
      setNewKey(''); setNewValue(''); setNewDesc(''); setShowNew(false);
      fetch();
    } catch {
      setToast({ message: 'Thêm thất bại', type: 'error' });
    }
    setSaving(false);
  };

  const doDelete = async (key) => {
    try {
      await configAPI.delete(key);
      setToast({ message: 'Đã xóa', type: 'success' });
      fetch();
    } catch {
      setToast({ message: 'Xóa thất bại', type: 'error' });
    }
    setConfirm(null);
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {confirm && <ConfirmDialog message={`Xóa tham số "${confirm}"?`} onConfirm={() => doDelete(confirm)} onCancel={() => setConfirm(null)} />}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{params.length} tham số hệ thống</p>
        <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
          <Plus size={15} /> Thêm tham số
        </button>
      </div>

      {showNew && (
        <div className="mb-4 border border-indigo-200 rounded-xl p-4 bg-indigo-50 space-y-2">
          <p className="text-sm font-semibold text-indigo-800 mb-2">Thêm tham số mới</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Khóa (key)</label>
              <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="vd: max_requests_per_day" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Giá trị</label>
              <input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Giá trị" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Mô tả</label>
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Mô tả tham số (tuỳ chọn)" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => setShowNew(false)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Hủy</button>
            <button onClick={saveNew} disabled={saving || !newKey.trim() || !newValue.trim()} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">Lưu</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {params.length === 0 && <p className="text-center py-10 text-gray-400 text-sm">Chưa có tham số nào.</p>}
        {params.map(p => (
          <div key={p.config_key} className="border border-gray-100 rounded-xl bg-white overflow-hidden">
            {editingKey === p.config_key ? (
              <div className="p-4 space-y-2">
                <p className="font-mono text-sm font-bold text-indigo-700">{p.config_key}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Giá trị</label>
                    <input value={editValue} onChange={e => setEditValue(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Mô tả</label>
                    <input value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button onClick={() => setEditingKey(null)} className="p-1.5 text-gray-400 hover:text-gray-600"><X size={16} /></button>
                  <button onClick={saveEdit} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    <Save size={14} /> Lưu
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-semibold text-gray-800">{p.config_key}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-sm text-indigo-700 font-medium">{p.config_value}</span>
                    {p.description && <span className="text-xs text-gray-400">{p.description}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startEdit(p)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"><Edit2 size={15} /></button>
                  <button onClick={() => setConfirm(p.config_key)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={15} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== INCIDENT TYPES TAB ====================
function IncidentTypesTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode: 'create'|'edit', data? }
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const res = await configAPI.getIncidentTypes(); setItems(res.data); }
    catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => {
    setForm({ name: '', code: '', icon: '', color: '#ef4444', description: '', rescue_category: 'cuu_nan', is_active: true });
    setModal({ mode: 'create' });
  };

  const openEdit = (item) => {
    setForm({ ...item, is_active: !!item.is_active });
    setModal({ mode: 'edit', data: item });
  };

  const handleSave = async () => {
    if (!form.name?.trim() || !form.code?.trim()) return;
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await configAPI.createIncidentType(form);
        setToast({ message: 'Đã thêm loại sự cố', type: 'success' });
      } else {
        await configAPI.updateIncidentType(modal.data.id, form);
        setToast({ message: 'Đã cập nhật', type: 'success' });
      }
      setModal(null);
      fetch();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lưu thất bại', type: 'error' });
    }
    setSaving(false);
  };

  const doDelete = async (id) => {
    try {
      await configAPI.deleteIncidentType(id);
      setToast({ message: 'Đã xóa', type: 'success' });
      fetch();
    } catch { setToast({ message: 'Xóa thất bại', type: 'error' }); }
    setConfirm(null);
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" /></div>;

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {confirm && <ConfirmDialog message="Xóa loại sự cố này?" onConfirm={() => doDelete(confirm)} onCancel={() => setConfirm(null)} />}

      {modal && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-800">{modal.mode === 'create' ? 'Thêm loại sự cố' : 'Chỉnh sửa loại sự cố'}</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Tên <span className="text-red-500">*</span></label>
                  <input value={form.name || ''} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Vd: Lũ lụt" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Mã <span className="text-red-500">*</span></label>
                  <input value={form.code || ''} onChange={e => setForm(f => ({...f, code: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="Vd: flood" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Icon (emoji)</label>
                  <input value={form.icon || ''} onChange={e => setForm(f => ({...f, icon: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Vd: 🌊" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Màu</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={form.color || '#ef4444'} onChange={e => setForm(f => ({...f, color: e.target.value}))} className="w-10 h-9 border rounded-lg cursor-pointer p-0.5" />
                    <input value={form.color || ''} onChange={e => setForm(f => ({...f, color: e.target.value}))} className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono" placeholder="#ef4444" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Loại cứu hộ</label>
                <select value={form.rescue_category || 'cuu_nan'} onChange={e => setForm(f => ({...f, rescue_category: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="cuu_nan">Cứu nạn (cuu_nan)</option>
                  <option value="cuu_tro">Cứu trợ (cuu_tro)</option>
                  <option value="cuu_ho">Cứu hộ (cuu_ho)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Mô tả</label>
                <textarea value={form.description || ''} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" placeholder="Mô tả loại sự cố..." />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setForm(f => ({...f, is_active: !f.is_active}))} className="text-gray-400 hover:text-indigo-600">
                  {form.is_active ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} />}
                </button>
                <span className="text-sm text-gray-600">{form.is_active ? 'Đang hoạt động' : 'Vô hiệu hóa'}</span>
              </div>
            </div>
            <div className="flex gap-2 justify-end px-6 py-4 border-t">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Hủy</button>
              <button onClick={handleSave} disabled={saving || !form.name?.trim() || !form.code?.trim()} className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{items.length} loại sự cố</p>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600">
          <Plus size={15} /> Thêm loại sự cố
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Tên</th>
              <th className="px-4 py-3 text-left">Mã</th>
              <th className="px-4 py-3 text-left">Loại CĐ</th>
              <th className="px-4 py-3 text-left">Màu</th>
              <th className="px-4 py-3 text-left">Trạng thái</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Chưa có dữ liệu</td></tr>
            )}
            {items.map(item => (
              <tr key={item.id} className="bg-white hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">
                  <span className="mr-1.5">{item.icon}</span>{item.name}
                </td>
                <td className="px-4 py-3 font-mono text-gray-500 text-xs">{item.code}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 font-medium">
                    {RESCUE_CATEGORY_LABELS[item.rescue_category] || item.rescue_category}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {item.color && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full border border-gray-200" style={{ background: item.color }} />
                      <span className="text-xs font-mono text-gray-400">{item.color}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {item.is_active ? 'Hoạt động' : 'Vô hiệu'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"><Edit2 size={14} /></button>
                    <button onClick={() => setConfirm(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== URGENCY LEVELS TAB ====================
function UrgencyLevelsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const res = await configAPI.getUrgencyLevels(); setItems(res.data); }
    catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => {
    setForm({ name: '', code: '', priority_score: '', color: '#ef4444', max_response_minutes: '', description: '' });
    setModal({ mode: 'create' });
  };

  const openEdit = (item) => { setForm({ ...item }); setModal({ mode: 'edit', data: item }); };

  const handleSave = async () => {
    if (!form.name?.trim() || !form.code?.trim() || form.priority_score === '') return;
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await configAPI.createUrgencyLevel(form);
        setToast({ message: 'Đã thêm mức độ khẩn cấp', type: 'success' });
      } else {
        await configAPI.updateUrgencyLevel(modal.data.id, form);
        setToast({ message: 'Đã cập nhật', type: 'success' });
      }
      setModal(null);
      fetch();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lưu thất bại', type: 'error' });
    }
    setSaving(false);
  };

  const doDelete = async (id) => {
    try { await configAPI.deleteUrgencyLevel(id); setToast({ message: 'Đã xóa', type: 'success' }); fetch(); }
    catch { setToast({ message: 'Xóa thất bại', type: 'error' }); }
    setConfirm(null);
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-red-200 border-t-red-500 rounded-full animate-spin" /></div>;

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {confirm && <ConfirmDialog message="Xóa mức độ khẩn cấp này?" onConfirm={() => doDelete(confirm)} onCancel={() => setConfirm(null)} />}

      {modal && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-800">{modal.mode === 'create' ? 'Thêm mức độ khẩn cấp' : 'Chỉnh sửa mức độ khẩn cấp'}</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Tên <span className="text-red-500">*</span></label>
                  <input value={form.name || ''} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Vd: Khẩn cấp cao" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Mã <span className="text-red-500">*</span></label>
                  <input value={form.code || ''} onChange={e => setForm(f => ({...f, code: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="Vd: high" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Điểm ưu tiên <span className="text-red-500">*</span></label>
                  <input type="number" min="0" max="100" value={form.priority_score ?? ''} onChange={e => setForm(f => ({...f, priority_score: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="1-100" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Thời gian phản hồi tối đa (phút)</label>
                  <input type="number" min="0" value={form.max_response_minutes ?? ''} onChange={e => setForm(f => ({...f, max_response_minutes: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Vd: 30" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Màu</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.color || '#ef4444'} onChange={e => setForm(f => ({...f, color: e.target.value}))} className="w-10 h-9 border rounded-lg cursor-pointer p-0.5" />
                  <input value={form.color || ''} onChange={e => setForm(f => ({...f, color: e.target.value}))} className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono" placeholder="#ef4444" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Mô tả</label>
                <textarea value={form.description || ''} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
            </div>
            <div className="flex gap-2 justify-end px-6 py-4 border-t">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Hủy</button>
              <button onClick={handleSave} disabled={saving || !form.name?.trim() || !form.code?.trim() || form.priority_score === ''} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{items.length} mức độ khẩn cấp</p>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
          <Plus size={15} /> Thêm mức độ
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Tên</th>
              <th className="px-4 py-3 text-left">Mã</th>
              <th className="px-4 py-3 text-left">Điểm ưu tiên</th>
              <th className="px-4 py-3 text-left">T/gian phản hồi</th>
              <th className="px-4 py-3 text-left">Màu</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Chưa có dữ liệu</td></tr>
            )}
            {items.map(item => (
              <tr key={item.id} className="bg-white hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.code}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: (item.color || '#ef4444') + '20', color: item.color || '#ef4444' }}>
                    {item.priority_score}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {item.max_response_minutes ? `${item.max_response_minutes} phút` : '—'}
                </td>
                <td className="px-4 py-3">
                  {item.color && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full border border-gray-200" style={{ background: item.color }} />
                      <span className="text-xs font-mono text-gray-400">{item.color}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"><Edit2 size={14} /></button>
                    <button onClick={() => setConfirm(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== RELIEF ITEMS TAB ====================
function ReliefItemsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [filterCat, setFilterCat] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const res = await configAPI.getReliefItems(); setItems(res.data); }
    catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => {
    setForm({ name: '', category: 'food', unit: '', description: '', rescue_category: 'all' });
    setModal({ mode: 'create' });
  };

  const openEdit = (item) => { setForm({ ...item }); setModal({ mode: 'edit', data: item }); };

  const handleSave = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await configAPI.createReliefItem(form);
        setToast({ message: 'Đã thêm vật tư', type: 'success' });
      } else {
        await configAPI.updateReliefItem(modal.data.id, form);
        setToast({ message: 'Đã cập nhật', type: 'success' });
      }
      setModal(null);
      fetch();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Lưu thất bại', type: 'error' });
    }
    setSaving(false);
  };

  const doDelete = async (id) => {
    try { await configAPI.deleteReliefItem(id); setToast({ message: 'Đã xóa', type: 'success' }); fetch(); }
    catch { setToast({ message: 'Xóa thất bại — vật tư đang được sử dụng', type: 'error' }); }
    setConfirm(null);
  };

  const displayed = filterCat ? items.filter(i => i.category === filterCat) : items;

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-green-200 border-t-green-500 rounded-full animate-spin" /></div>;

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {confirm && <ConfirmDialog message="Xóa vật tư này?" onConfirm={() => doDelete(confirm)} onCancel={() => setConfirm(null)} />}

      {modal && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-800">{modal.mode === 'create' ? 'Thêm vật tư' : 'Chỉnh sửa vật tư'}</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Tên vật tư <span className="text-red-500">*</span></label>
                <input value={form.name || ''} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Vd: Gạo 5kg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Danh mục</label>
                  <select value={form.category || 'food'} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {RELIEF_ITEM_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Đơn vị</label>
                  <input value={form.unit || ''} onChange={e => setForm(f => ({...f, unit: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Vd: kg, thùng, chai" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Áp dụng cho loại cứu hộ</label>
                <select value={form.rescue_category || 'all'} onChange={e => setForm(f => ({...f, rescue_category: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="all">Tất cả</option>
                  <option value="cuu_nan">Cứu nạn</option>
                  <option value="cuu_tro">Cứu trợ</option>
                  <option value="cuu_ho">Cứu hộ</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Mô tả</label>
                <textarea value={form.description || ''} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
            </div>
            <div className="flex gap-2 justify-end px-6 py-4 border-t">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Hủy</button>
              <button onClick={handleSave} disabled={saving || !form.name?.trim()} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-500">{displayed.length}/{items.length} vật tư</p>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="border rounded-lg px-2 py-1 text-xs text-gray-600">
            <option value="">Tất cả danh mục</option>
            {RELIEF_ITEM_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
          <Plus size={15} /> Thêm vật tư
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Tên vật tư</th>
              <th className="px-4 py-3 text-left">Danh mục</th>
              <th className="px-4 py-3 text-left">Đơn vị</th>
              <th className="px-4 py-3 text-left">Loại cứu hộ</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {displayed.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Chưa có dữ liệu</td></tr>
            )}
            {displayed.map(item => (
              <tr key={item.id} className="bg-white hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                    {RELIEF_ITEM_CATEGORIES.find(c => c.value === item.category)?.label || item.category || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{item.unit || '—'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 font-medium">
                    {RESCUE_CATEGORY_LABELS[item.rescue_category] || item.rescue_category}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"><Edit2 size={14} /></button>
                    <button onClick={() => setConfirm(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== MAIN PAGE ====================
const TABS = [
  { id: 'system',          labelKey: 'config_page.params',        icon: Settings,      color: 'indigo' },
  { id: 'incident-types',  labelKey: 'config_page.incident_types', icon: AlertTriangle, color: 'orange' },
  { id: 'urgency-levels',  labelKey: 'config_page.urgency_levels', icon: Layers,        color: 'red' },
  { id: 'relief-items',    labelKey: 'config_page.relief_items',   icon: Package,       color: 'green' },
];

const TAB_COLORS = {
  indigo: 'border-indigo-600 text-indigo-600 bg-indigo-50',
  orange: 'border-orange-500 text-orange-600 bg-orange-50',
  red: 'border-red-600 text-red-600 bg-red-50',
  green: 'border-green-600 text-green-600 bg-green-50',
};

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState('system');
  const { t } = useTranslation();

  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold" style={{ color: 'var(--eoc-text-primary)' }}>{t('config_page.title')}</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 rounded-xl p-1 border" style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${active ? TAB_COLORS[tab.color] + ' border' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="rounded-2xl border p-6" style={{ background: 'var(--eoc-bg-elevated)', borderColor: 'var(--eoc-border)' }}>
          {activeTab === 'system' && <SystemParamsTab />}
          {activeTab === 'incident-types' && <IncidentTypesTab />}
          {activeTab === 'urgency-levels' && <UrgencyLevelsTab />}
          {activeTab === 'relief-items' && <ReliefItemsTab />}
        </div>
      </div>
    </div>
  );
}
