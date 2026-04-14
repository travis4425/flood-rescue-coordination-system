import React, { useState, useEffect, useCallback } from 'react';
import { userAPI, regionAPI, teamAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import { useTranslation } from 'react-i18next';
import { ROLE_LABELS, formatDate } from '../utils/helpers';
import { Plus, Search, Edit2, Key, UserCheck, UserX, X, Save, ChevronLeft, ChevronRight } from 'lucide-react';

const ROLE_BADGE = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-purple-100 text-purple-700',
  coordinator: 'bg-cyan-100 text-cyan-700',
  rescue_team: 'bg-orange-100 text-orange-700',
};

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [provinces, setProvinces] = useState([]);
  const [regions, setRegions] = useState([]);
  const [teams, setTeams] = useState([]);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', full_name: '', phone: '',
    role: 'rescue_team', region_id: '', province_id: '', team_id: '', role_in_team: 'member'
  });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const validateField = (name, value) => {
    if (name === 'username' && !value.trim()) return 'Username không được để trống';
    if (name === 'username' && !/^[a-zA-Z0-9_]{3,30}$/.test(value)) return 'Username chỉ gồm chữ, số, gạch dưới (3-30 ký tự)';
    if (name === 'email' && !value.trim()) return 'Email không được để trống';
    if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email không hợp lệ';
    if (name === 'full_name' && !value.trim()) return 'Họ tên không được để trống';
    if (name === 'phone' && value && !/^(0[35789])[0-9]{8}$/.test(value)) return 'Số điện thoại không hợp lệ';
    return '';
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (search) params.search = search;
      if (filterRole) params.role = filterRole;
      const { data } = await userAPI.getAll(params);
      setUsers(data.data || []);
      setPagination(p => ({ ...p, total: data.pagination.total, totalPages: data.pagination.totalPages }));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [pagination.page, search, filterRole]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    Promise.all([regionAPI.getAll(), regionAPI.getProvinces(), teamAPI.getAll({})])
      .then(([rRes, pRes, tRes]) => {
        setRegions(rRes.data || []);
        setProvinces(pRes.data || []);
        setTeams(tRes.data || []);
      })
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setEditUser(null);
    setFormData({
      username: '', email: '', password: '123456', full_name: '', phone: '',
      role: 'rescue_team', region_id: '', province_id: ''
    });
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setFormData({
      full_name: u.full_name, phone: u.phone || '', role: u.role,
      region_id: u.region_id || '', province_id: u.province_id || ''
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    // Validate all required fields before saving
    const errors = {};
    if (!editUser) {
      const uErr = validateField('username', formData.username);
      const eErr = validateField('email', formData.email);
      if (uErr) errors.username = uErr;
      if (eErr) errors.email = eErr;
    }
    const nErr = validateField('full_name', formData.full_name);
    const pErr = validateField('phone', formData.phone);
    if (nErr) errors.full_name = nErr;
    if (pErr) errors.phone = pErr;
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    setSaving(true);
    try {
      if (editUser) {
        await userAPI.update(editUser.id, {
          full_name: formData.full_name, phone: formData.phone, role: formData.role,
          region_id: formData.region_id || null, province_id: formData.province_id || null
        });
      } else {
        const res = await userAPI.create(formData);
        // Nếu là rescue_team và chọn đội → gán vào đội
        if (formData.role === 'rescue_team' && formData.team_id) {
          const newUserId = res.data?.id;
          if (newUserId) {
            await teamAPI.addMember(formData.team_id, {
              user_id: newUserId,
              role_in_team: formData.role_in_team || 'member'
            });
          }
        }
      }
      setShowForm(false);
      fetchUsers();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
    finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    if (!window.confirm(`${u.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'} tài khoản ${u.full_name}?`)) return;
    try {
      await userAPI.update(u.id, { is_active: !u.is_active });
      fetchUsers();
    } catch (err) { alert('Lỗi: ' + err.message); }
  };

  const resetPassword = async (u) => {
    if (!window.confirm(`Đặt lại mật khẩu cho ${u.full_name} thành 123456?`)) return;
    try {
      await userAPI.resetPassword(u.id);
      alert('Đã đặt lại mật khẩu thành: 123456');
    } catch (err) { alert('Lỗi: ' + err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold" style={{ color: 'var(--eoc-text-primary)' }}>{t('users_page.title')}</h1>
        <button onClick={openCreate}
          className="px-4 py-2 text-sm rounded-lg flex items-center gap-1" style={{ background: 'var(--eoc-accent)', color: '#fff' }}>
          <Plus className="w-4 h-4" /> {t('users_page.create')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder={t('users_page.search')}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={e => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          />
        </div>
        <select className="px-3 py-2 text-sm border rounded-lg"
          value={filterRole} onChange={e => { setFilterRole(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}>
          <option value="">{t('users_page.all_roles')}</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--eoc-text-muted)' }}>{t('users_page.empty')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--eoc-bg-tertiary)', color: 'var(--eoc-text-muted)' }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">{t('users_page.full_name')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('users_page.username')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('users_page.email')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('users_page.role')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('users_page.province')}</th>
                <th className="text-left px-4 py-2.5 font-medium">{t('users_page.col_status')}</th>
                <th className="text-left px-4 py-2.5 font-medium">Last login</th>
                <th className="text-right px-4 py-2.5 font-medium">{t('users_page.col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{u.full_name}</div>
                    {u.phone && <div className="text-xs text-gray-500">{u.phone}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{u.username}</td>
                  <td className="px-4 py-3 text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${ROLE_BADGE[u.role] || 'bg-gray-100'}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {u.province_name || u.region_name || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? t('users_page.active') : t('users_page.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{u.last_login ? formatDate(u.last_login) : 'Chưa'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {u.role !== 'admin' && (
                        <button onClick={() => openEdit(u)} title="Sửa"
                          className="p-1.5 hover:bg-gray-100 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-500" /></button>
                      )}
                      {currentUser?.role === 'admin' && u.role !== 'admin' && (
                        <>
                          <button onClick={() => resetPassword(u)} title="Reset mật khẩu"
                            className="p-1.5 hover:bg-gray-100 rounded"><Key className="w-3.5 h-3.5 text-gray-500" /></button>
                          <button onClick={() => toggleActive(u)} title={u.is_active ? 'Khóa' : 'Mở khóa'}
                            className="p-1.5 hover:bg-gray-100 rounded">
                            {u.is_active ? <UserX className="w-3.5 h-3.5 text-red-500" /> : <UserCheck className="w-3.5 h-3.5 text-green-500" />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-gray-500">{pagination.total} người dùng</span>
          <div className="flex gap-1">
            <button onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page <= 1} className="p-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-2 text-sm">{pagination.page}/{pagination.totalPages}</span>
            <button onClick={() => setPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
              disabled={pagination.page >= pagination.totalPages} className="p-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editUser ? 'Sửa tài khoản' : 'Thêm tài khoản'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {!editUser && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Username *</label>
                    <input className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm ${formErrors.username ? 'border-red-400' : ''}`} value={formData.username}
                      onChange={e => { setFormData(d => ({ ...d, username: e.target.value })); setFormErrors(er => ({ ...er, username: validateField('username', e.target.value) })); }} />
                    {formErrors.username && <p className="text-xs text-red-500 mt-0.5">{formErrors.username}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email *</label>
                    <input type="email" className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm ${formErrors.email ? 'border-red-400' : ''}`} value={formData.email}
                      onChange={e => { setFormData(d => ({ ...d, email: e.target.value })); setFormErrors(er => ({ ...er, email: validateField('email', e.target.value) })); }} />
                    {formErrors.email && <p className="text-xs text-red-500 mt-0.5">{formErrors.email}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Mật khẩu</label>
                    <input className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.password}
                      onChange={e => setFormData(d => ({ ...d, password: e.target.value }))} placeholder="Mặc định: 123456" />
                  </div>
                </>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700">Họ tên *</label>
                <input className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm ${formErrors.full_name ? 'border-red-400' : ''}`} value={formData.full_name}
                  onChange={e => { setFormData(d => ({ ...d, full_name: e.target.value })); setFormErrors(er => ({ ...er, full_name: validateField('full_name', e.target.value) })); }} />
                {formErrors.full_name && <p className="text-xs text-red-500 mt-0.5">{formErrors.full_name}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Số điện thoại</label>
                <input className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm ${formErrors.phone ? 'border-red-400' : ''}`} value={formData.phone}
                  onChange={e => { setFormData(d => ({ ...d, phone: e.target.value })); setFormErrors(er => ({ ...er, phone: validateField('phone', e.target.value) })); }} />
                {formErrors.phone && <p className="text-xs text-red-500 mt-0.5">{formErrors.phone}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Vai trò *</label>
                <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.role}
                  onChange={e => setFormData(d => ({ ...d, role: e.target.value }))}>
                  <option value="coordinator">Điều phối viên</option>
                  <option value="rescue_team">Đội cứu hộ</option>
                  <option value="warehouse_manager">Quản lý kho</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Vùng miền</label>
                <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.region_id}
                  onChange={e => setFormData(d => ({ ...d, region_id: e.target.value }))}>
                  <option value="">Không chọn</option>
                  {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tỉnh/Thành</label>
                <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.province_id}
                  onChange={e => setFormData(d => ({ ...d, province_id: e.target.value, team_id: '' }))}>
                  <option value="">Không chọn</option>
                  {provinces
                    .filter(p => !formData.region_id || p.region_id == formData.region_id)
                    .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {!editUser && formData.role === 'rescue_team' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Gán vào đội</label>
                    <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.team_id}
                      onChange={e => setFormData(d => ({ ...d, team_id: e.target.value }))}>
                      <option value="">Không gán (gán sau)</option>
                      {teams
                        .filter(t => !formData.province_id || t.province_id == formData.province_id)
                        .map(t => <option key={t.id} value={t.id}>{t.name} ({t.province_name})</option>)}
                    </select>
                  </div>
                  {formData.team_id && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Vai trò trong đội</label>
                      <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={formData.role_in_team}
                        onChange={e => setFormData(d => ({ ...d, role_in_team: e.target.value }))}>
                        <option value="member">Thành viên</option>
                        <option value="leader">Đội trưởng</option>
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Hủy</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
