import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { taskAPI, resourceAPI } from '../services/api';
import { getSocket } from '../services/socket';
import useAuthStore from '../store/authStore';
import {
  Plus, RefreshCw, Search, AlertTriangle, Eye,
  ClipboardList, Layers, Truck, Clock, Users, MapPin, Package,
} from 'lucide-react';

import { TASK_STATUS } from './tasks/constants';
import TaskDetailModal from './tasks/TaskDetailModal';
import CreateTaskPanel from './tasks/CreateTaskPanel';
import ResAllocModal from './tasks/ResAllocModal';
import VehicleAllocationTab from './tasks/VehicleAllocationTab';

function TaskCard({ task, onClick }) {
  const hasPendingReports = task.pending_reports > 0;
  const progress = task.total_sub > 0
    ? Math.min(100, Math.round((task.completed_sub / task.total_sub) * 100))
    : 0;
  return (
    <div
      className={`bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer ${hasPendingReports ? 'border-red-300 ring-1 ring-red-200' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-800 truncate">{task.name}</h3>
          <p className="text-xs text-gray-400 font-mono">Task #{task.id}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TASK_STATUS[task.status]?.cls}`}>
            {TASK_STATUS[task.status]?.label}
          </span>
          {hasPendingReports && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <AlertTriangle size={11} /> {task.pending_reports} báo cáo
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {task.cuu_nan_count > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 border border-red-200">Cứu Nạn ×{task.cuu_nan_count}</span>
        )}
        {task.cuu_tro_count > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 border border-green-200">Cứu Trợ ×{task.cuu_tro_count}</span>
        )}
        {task.cuu_ho_count > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700 border border-purple-200">Cứu Hộ ×{task.cuu_ho_count}</span>
        )}
      </div>

      <div className="mt-2 space-y-1.5 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="truncate">{task.team_name}</span>
          {task.extra_team_count > 0 && (
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full shrink-0">+{task.extra_team_count} đội</span>
          )}
        </div>
        {task.province_name && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{task.province_name}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <ClipboardList className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span>{task.completed_sub}/{task.total_sub} hoàn thành{task.failed_sub > 0 && ` · ${task.failed_sub} không thể cứu`}</span>
        </div>
      </div>

      <div className="mt-3">
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${task.failed_sub > 0 ? 'bg-yellow-400' : 'bg-blue-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{progress}% hoàn thành</p>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <span className="text-xs text-gray-400">
          {new Date(task.created_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
        <span className="text-xs text-blue-600 flex items-center gap-1"><Eye size={12} /> Xem chi tiết</span>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState(null);
  const [pendingRequestCount, setPendingRequestCount] = useState(null);
  const [pageTab, setPageTab] = useState('tasks');

  const [resTasks, setResTasks] = useState([]);
  const [resTasksLoading, setResTasksLoading] = useState(false);
  const [selectedResTask, setSelectedResTask] = useState(null);
  const [selectedResTaskDetail, setSelectedResTaskDetail] = useState(null);
  const [selectedResTaskLoading, setSelectedResTaskLoading] = useState(false);
  const [resAllocModal, setResAllocModal] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [reliefItems, setReliefItems] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [resSharedLoaded, setResSharedLoaded] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await taskAPI.getAll({});
      setTasks(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const fetchPendingCount = useCallback(async () => {
    try {
      const { data } = await taskAPI.suggestRequests({ province_id: user?.province_id, limit: 100 });
      setPendingRequestCount((data || []).length);
    } catch { setPendingRequestCount(0); }
  }, [user?.province_id]);

  const fetchResTasks = useCallback(async () => {
    setResTasksLoading(true);
    try {
      const { data } = await taskAPI.getAll({ status: 'in_progress' });
      const sorted = (data || []).sort((a, b) => (b.max_priority || 0) - (a.max_priority || 0));
      setResTasks(sorted);
    } catch { /* ignore */ }
    finally { setResTasksLoading(false); }
  }, []);

  const fetchSelectedResTaskDetail = useCallback(async (taskId) => {
    if (!taskId) return;
    setSelectedResTaskLoading(true);
    try {
      const { data } = await taskAPI.getById(taskId);
      setSelectedResTaskDetail(data);
    } catch { /* ignore */ }
    finally { setSelectedResTaskLoading(false); }
  }, []);

  const loadResShared = useCallback(() => {
    if (resSharedLoaded) return;
    setResSharedLoaded(true);
    const prov = user?.province_id ? { province_id: user.province_id } : {};
    resourceAPI.getWarehouses(prov).then(r => setWarehouses(r.data || [])).catch(() => {});
    resourceAPI.getReliefItems().then(r => setReliefItems(r.data || [])).catch(() => {});
    resourceAPI.getVehicles({ status: 'available', ...prov }).then(r => setAvailableVehicles(r.data || [])).catch(() => {});
  }, [resSharedLoaded, user?.province_id]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { if (pageTab === 'resources') fetchResTasks(); }, [pageTab, fetchResTasks]);

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => fetchTasks();
    socket.on('task_created', refresh);
    socket.on('task_updated', refresh);
    socket.on('task_incident_report', refresh);
    socket.on('task_support_dispatched', refresh);
    return () => {
      socket.off('task_created', refresh);
      socket.off('task_updated', refresh);
      socket.off('task_incident_report', refresh);
      socket.off('task_support_dispatched', refresh);
    };
  }, [fetchTasks]);

  const isCoordinator = user?.role === 'coordinator';
  const isManager = user?.role === 'manager';

  useEffect(() => { if (isCoordinator) fetchPendingCount(); }, [fetchPendingCount, isCoordinator]);

  const activeTasks = tasks.filter(t => t.status === 'in_progress');
  const historyTasks = tasks.filter(t => t.status !== 'in_progress').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const filteredHistory = filterStatus ? historyTasks.filter(t => t.status === filterStatus) : historyTasks;

  const renderTaskList = (list) => {
    const filtered = list.filter(t => {
      if (!search) return true;
      const q = search.toLowerCase();
      return t.name?.toLowerCase().includes(q) || t.team_name?.toLowerCase().includes(q) || t.province_name?.toLowerCase().includes(q);
    });
    if (filtered.length === 0) return <div className="text-center py-12 text-gray-500 text-sm">Không có task nào.</div>;
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(task => <TaskCard key={task.id} task={task} onClick={() => setDetailTaskId(task.id)} />)}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold" style={{ color: 'var(--eoc-text-primary)' }}>
          {t('tasks_page.title')}
        </h1>
        {!showCreate && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="pl-8 pr-3 py-2 text-sm border rounded-lg w-48"
                placeholder="Tìm task, đội..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button onClick={fetchTasks} className="p-2 border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
            {isCoordinator && (
              <button onClick={() => setShowCreate(true)}
                className="px-4 py-2 text-sm rounded-lg flex items-center gap-1" style={{ background: 'var(--eoc-accent)', color: '#fff' }}>
                <Plus className="w-4 h-4" /> {t('tasks_page.create')}
              </button>
            )}
          </div>
        )}
      </div>

      {showCreate ? (
        <CreateTaskPanel
          onClose={() => setShowCreate(false)}
          onCreated={(id) => { setShowCreate(false); fetchTasks(); setDetailTaskId(id); }}
        />
      ) : (
        <>
          {isCoordinator && (
            <div className="flex border-b gap-1">
              {[
                { key: 'tasks', icon: ClipboardList, label: 'Task đang chạy', badge: activeTasks.length, badgeCls: 'bg-blue-500', activeCls: 'border-blue-600 text-blue-600' },
                { key: 'resources', icon: Layers, label: 'Phân bổ tài nguyên', activeCls: 'border-purple-600 text-purple-600' },
                { key: 'vehicles', icon: Truck, label: 'Phân bổ phương tiện', activeCls: 'border-indigo-600 text-indigo-600' },
                { key: 'history', icon: Clock, label: 'Lịch sử', badge: historyTasks.length, badgeCls: 'bg-gray-400', activeCls: 'border-gray-600 text-gray-700' },
              ].map(({ key, icon: Icon, label, badge, badgeCls, activeCls }) => (
                <button key={key}
                  onClick={() => { setPageTab(key); if (key === 'history') setFilterStatus(''); }}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    pageTab === key ? activeCls : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  <Icon size={14} /> {label}
                  {badge > 0 && <span className={`px-1.5 py-0.5 text-xs text-white rounded-full leading-none ${badgeCls}`}>{badge}</span>}
                </button>
              ))}
            </div>
          )}

          {!loading && tasks.length > 0 && (() => {
            const counts = { in_progress: 0, completed: 0, partial: 0, cancelled: 0 };
            tasks.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { status: 'in_progress', count: counts.in_progress, label: 'Đang thực hiện', color: 'blue', tabKey: 'tasks' },
                  { status: 'completed',   count: counts.completed,   label: 'Hoàn thành',     color: 'green' },
                  { status: 'partial',     count: counts.partial,     label: 'Một phần',        color: 'yellow' },
                  { status: 'cancelled',   count: counts.cancelled,   label: 'Đã hủy',          color: 'red' },
                ].map(({ status, count, label, color, tabKey }) => (
                  <button key={status}
                    onClick={() => {
                      if (isCoordinator) { setPageTab(tabKey || 'history'); if (!tabKey) setFilterStatus(status); }
                      else setFilterStatus(f => f === status ? '' : status);
                    }}
                    className={`rounded-xl p-3 text-center border transition-colors bg-white hover:bg-${color}-50 ${filterStatus === status ? `border-${color}-400 bg-${color}-50` : ''}`}>
                    <p className={`text-lg font-bold text-${color}-700`}>{count}</p>
                    <p className={`text-xs text-${color}-500 mt-0.5`}>{label}</p>
                  </button>
                ))}
              </div>
            );
          })()}

          {(pageTab === 'tasks' || !isCoordinator) && (
            loading
              ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
              : activeTasks.length === 0 && isCoordinator
                ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="text-gray-400 text-sm">Không có task nào đang thực hiện.</div>
                    {pendingRequestCount > 0 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-2xl px-6 py-5 max-w-md w-full text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <AlertTriangle size={18} className="text-orange-500" />
                          <p className="text-sm font-semibold text-orange-700">
                            Có <span className="text-orange-600 text-base font-bold">{pendingRequestCount}</span> yêu cầu cứu hộ đang chờ phân công
                          </p>
                        </div>
                        <p className="text-xs text-orange-500 mb-4">Tạo task để phân công đội cứu hộ xử lý các yêu cầu này.</p>
                        <button onClick={() => setShowCreate(true)}
                          className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition flex items-center gap-2 mx-auto">
                          <Plus size={16} /> Tạo Task ngay
                        </button>
                      </div>
                    )}
                    {pendingRequestCount === 0 && <p className="text-xs text-gray-400">Không có yêu cầu nào chờ phân công.</p>}
                  </div>
                )
                : renderTaskList(isCoordinator ? activeTasks : (filterStatus ? tasks.filter(t => t.status === filterStatus) : tasks))
          )}

          {isCoordinator && pageTab === 'resources' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                    <Layers size={15} className="text-purple-500" /> Tasks đang thực hiện
                  </h3>
                  <button onClick={fetchResTasks} className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1">
                    <RefreshCw size={12} /> Làm mới
                  </button>
                </div>
                {resTasksLoading ? (
                  <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : resTasks.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">Không có task nào đang thực hiện.</div>
                ) : (
                  <div className="space-y-2">
                    {resTasks.map(task => (
                      <div key={task.id}
                        onClick={() => { setSelectedResTask(task); setSelectedResTaskDetail(null); loadResShared(); fetchSelectedResTaskDetail(task.id); }}
                        className={`border rounded-xl p-3 cursor-pointer transition-all hover:shadow-sm ${
                          selectedResTask?.id === task.id ? 'border-purple-400 bg-purple-50 ring-1 ring-purple-200' : 'border-gray-200 bg-white hover:border-purple-300'
                        }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{task.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{task.team_name || 'Chưa có đội'} · {task.province_name}</p>
                          </div>
                          {task.max_priority > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                              task.max_priority >= 80 ? 'bg-red-100 text-red-700' :
                              task.max_priority >= 50 ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>Ưu tiên {task.max_priority}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-400">{task.total_sub || 0} yêu cầu</span>
                          <button
                            onClick={e => { e.stopPropagation(); setResAllocModal({ type: 'supply', task }); loadResShared(); }}
                            className="ml-auto flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            <Package size={11} /> Cấp vật tư
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                {!selectedResTask ? (
                  <div className="flex flex-col items-center justify-center py-24 text-gray-300">
                    <Layers size={40} className="mb-3" />
                    <p className="text-sm text-center">Chọn một task bên trái<br />để xem tài nguyên đã phân bổ</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                        <Package size={15} className="text-blue-500" /> Tài nguyên đã phân bổ
                      </h3>
                      <button onClick={() => fetchSelectedResTaskDetail(selectedResTask.id)}
                        className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1">
                        <RefreshCw size={12} /> Làm mới
                      </button>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-xl px-3 py-2.5 mb-3">
                      <p className="text-sm font-semibold text-gray-800">{selectedResTask.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{selectedResTask.team_name} · {selectedResTask.province_name}</p>
                    </div>
                    {selectedResTaskLoading ? (
                      <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Package size={12} /> Vật tư đã cấp
                        </p>
                        {(selectedResTaskDetail?.distributions || []).length === 0 ? (
                          <p className="text-xs text-gray-400 py-2 pl-1">Chưa có vật tư nào.</p>
                        ) : (
                          <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gray-50 border-b text-gray-400 uppercase tracking-wide">
                                  <th className="px-3 py-2 text-left font-medium">Vật phẩm</th>
                                  <th className="px-3 py-2 text-right font-medium">SL</th>
                                  <th className="px-3 py-2 text-left font-medium">Trạng thái</th>
                                  <th className="px-3 py-2 text-left font-medium font-mono">Mã phiếu</th>
                                  <th className="px-3 py-2 text-left font-medium">Thời gian</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {(selectedResTaskDetail?.distributions || []).map((d, i) => (
                                  <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 font-medium text-gray-800">{d.item_name}</td>
                                    <td className="px-3 py-2 text-right font-bold text-blue-700">
                                      {d.return_quantity > 0
                                        ? <span>{d.quantity}<span className="text-gray-400 font-normal"> (-{d.return_quantity})</span></span>
                                        : d.quantity} {d.unit}
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className={`px-1.5 py-0.5 rounded font-medium ${
                                        d.status === 'returned' ? 'bg-gray-100 text-gray-600' :
                                        d.status === 'confirmed' || d.status === 'return_requested' ? 'bg-green-100 text-green-700' :
                                        'bg-yellow-100 text-yellow-700'
                                      }`}>
                                        {d.status === 'returned' ? 'Đã trả' : d.status === 'confirmed' ? 'Đã nhận' : d.status === 'return_requested' ? 'Đang trả' : 'Đã xuất'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-blue-700 font-bold text-xs">{d.voucher_code || '—'}</td>
                                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                                      {d.confirmed_at
                                        ? new Date(d.confirmed_at).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
                                        : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {isCoordinator && pageTab === 'history' && (
            loading
              ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-gray-400 border-t-transparent rounded-full animate-spin" /></div>
              : historyTasks.length === 0
                ? <div className="text-center py-12 text-gray-400 text-sm">Chưa có lịch sử task nào.</div>
                : renderTaskList(filteredHistory)
          )}

          {isCoordinator && pageTab === 'vehicles' && (
            <VehicleAllocationTab activeTasks={activeTasks} />
          )}
        </>
      )}

      {detailTaskId && (
        <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} onRefresh={fetchTasks} />
      )}

      {resAllocModal && (
        <ResAllocModal
          modal={resAllocModal}
          warehouses={warehouses}
          reliefItems={reliefItems}
          vehicles={availableVehicles}
          onClose={() => setResAllocModal(null)}
          onSuccess={({ closeModal = true } = {}) => {
            if (closeModal) setResAllocModal(null);
            fetchResTasks();
            if (selectedResTask?.id) fetchSelectedResTaskDetail(selectedResTask.id);
          }}
        />
      )}
    </div>
  );
}
