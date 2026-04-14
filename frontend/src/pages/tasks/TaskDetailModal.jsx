import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle, ClipboardList, Ban, Lock, Users, Package, User, Crown } from 'lucide-react';
import { taskAPI, teamAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import useAuthStore from '../../store/authStore';
import { RESCUE_CATEGORY, TASK_STATUS, REPORT_TYPE_LABEL } from './constants';

export default function TaskDetailModal({ taskId, onClose, onRefresh }) {
  const { user } = useAuthStore();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teams, setTeams] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [activeTab, setActiveTab] = useState('requests');

  const fetchTask = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await taskAPI.getById(taskId);
      setTask(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Lỗi tải dữ liệu');
    } finally { setLoading(false); }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
    teamAPI.getAll({}).then(r => setTeams(r.data || [])).catch(() => {});
  }, [fetchTask]);

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => fetchTask();
    socket.on('task_incident_report', refresh);
    socket.on('task_updated', refresh);
    socket.on('request_updated', refresh);
    return () => {
      socket.off('task_incident_report', refresh);
      socket.off('task_updated', refresh);
      socket.off('request_updated', refresh);
    };
  }, [fetchTask]);

  const handleConfirmComplete = async () => {
    if (!window.confirm('Xác nhận đóng task này? Tất cả yêu cầu hoàn thành sẽ được cập nhật.')) return;
    setConfirming(true);
    try {
      await taskAPI.confirmComplete(taskId);
      fetchTask();
      onRefresh();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
    finally { setConfirming(false); }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return alert('Vui lòng nhập lý do hủy task.');
    setCancelling(true);
    try {
      await taskAPI.cancel(taskId, { reason: cancelReason.trim() });
      setShowCancelModal(false);
      setCancelReason('');
      fetchTask();
      onRefresh();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
    finally { setCancelling(false); }
  };

  const resolveReport = async (reportId, status) => {
    try {
      await taskAPI.resolveReport(taskId, reportId, { status, resolution_note: '' });
      fetchTask();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
  };

  const unresolveReport = async (reportId) => {
    try {
      await taskAPI.unresolveReport(taskId, reportId);
      fetchTask();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
  };

  if (loading) return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="text-red-500" size={20} />
          <h3 className="font-bold text-red-700">Lỗi tải chi tiết task</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">{error}</p>
        <div className="flex gap-2">
          <button onClick={fetchTask} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Thử lại</button>
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Đóng</button>
        </div>
      </div>
    </div>
  );

  if (!task) return null;

  const pendingReports = (task.incident_reports || []).filter(r => r.status === 'pending');
  const resolvedReports = (task.incident_reports || []).filter(r => r.status !== 'pending');
  const stalledMissions = (task.missions || []).filter(m => m.stalled);
  const activeMissions = (task.missions || []).filter(m => !['completed', 'failed', 'aborted'].includes(m.status));
  const totalVictims = (task.missions || []).reduce((s, m) => s + (m.victim_count || 0), 0);
  const totalRescued = (task.missions || []).reduce((s, m) => s + (m.rescued_count || 0), 0);
  const allDone = activeMissions.length === 0 && (task.missions || []).length > 0;
  const canConfirm = allDone && task.status === 'in_progress' && user?.role !== 'rescue_team';
  const allReports = task.incident_reports || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl my-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{task.name}</h2>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TASK_STATUS[task.status]?.cls}`}>
                {TASK_STATUS[task.status]?.label}
              </span>
              <span className="text-xs text-gray-500">#{task.id} · {task.province_name}</span>
              {(task.all_teams || []).map(t => (
                <span key={t.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.is_primary ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                  {t.name}{t.is_primary ? ' (Chủ lực)' : ''}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === 'coordinator' &&
             !['cancelled', 'completed'].includes(task.status) &&
             !(task.missions || []).some(m => ['completed', 'failed'].includes(m.status)) && (
              <button onClick={() => { setCancelReason(''); setShowCancelModal(true); }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 border border-red-300 rounded-lg hover:bg-red-50">
                <Ban size={13} /> Hủy Task
              </button>
            )}
            {showCancelModal && (
              <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCancelModal(false)}>
                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                  <h3 className="text-base font-bold text-gray-800 mb-1">Hủy Task</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Lý do sẽ được gửi thông báo đến team leader. Các yêu cầu cứu hộ sẽ trở về trạng thái chờ.
                  </p>
                  <label className="text-sm font-medium text-gray-700">
                    Lý do hủy <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                    rows={3}
                    placeholder="VD: Đội cứu hộ không đủ phương tiện, cần điều phối lại..."
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setShowCancelModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Quay lại</button>
                    <button onClick={handleCancel} disabled={cancelling || !cancelReason.trim()}
                      className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5">
                      <Ban size={14} /> {cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
        </div>

        {task.estimated_completion && (
          <div className="flex flex-wrap gap-3 px-5 pt-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="shrink-0">⏱ Dự kiến hoàn thành:</span>
              <span className="font-medium text-gray-700">
                {new Date(task.estimated_completion.replace(/Z$/, '')).toLocaleString('vi-VN')}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 px-5 pt-4">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-blue-700">{(task.missions || []).length}</p>
            <p className="text-xs text-blue-500 mt-0.5">Yêu cầu</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-green-700">{totalRescued}</p>
            <p className="text-xs text-green-500 mt-0.5">Đã cứu</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-gray-700">{totalVictims}</p>
            <p className="text-xs text-gray-500 mt-0.5">Tổng nạn nhân</p>
          </div>
        </div>

        {canConfirm && (
          <div className="mx-5 mt-3 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-green-800">Tất cả nhiệm vụ đã hoàn thành</p>
              <p className="text-xs text-green-600">Xác nhận để đóng task và cập nhật báo cáo tổng hợp</p>
            </div>
            <button onClick={handleConfirmComplete} disabled={confirming}
              className="shrink-0 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
              <Lock size={14} /> {confirming ? 'Đang xử lý...' : 'Xác nhận đóng'}
            </button>
          </div>
        )}

        {stalledMissions.length > 0 && (
          <div className="mx-5 mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-semibold text-orange-800">{stalledMissions.length} yêu cầu bị chậm trễ</p>
              <p className="text-xs text-orange-600 mt-0.5">{stalledMissions.map(m => m.tracking_code || `#${m.id}`).join(', ')}</p>
            </div>
          </div>
        )}

        <div className="flex border-b mx-5 mt-4 gap-1">
          <button onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'requests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <ClipboardList size={14} className="inline mr-1" />
            Yêu cầu ({task.missions?.length || 0})
          </button>
          <button onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${activeTab === 'reports' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <AlertTriangle size={14} className="inline" />
            Báo cáo ({allReports.length})
            {pendingReports.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full leading-none">{pendingReports.length}</span>
            )}
          </button>
          <button onClick={() => setActiveTab('resources')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${activeTab === 'resources' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Package size={14} className="inline" />
            Tài nguyên
          </button>
        </div>

        <div className="p-5 space-y-4">
          {activeTab === 'requests' && (
            <div className="space-y-2">
              {(task.missions || []).map(m => {
                const statusCls = {
                  completed: 'border-green-200 bg-green-50', failed: 'border-red-200 bg-red-50',
                  aborted: 'border-gray-200 bg-gray-50', on_scene: 'border-blue-200 bg-blue-50',
                  en_route: 'border-cyan-200 bg-cyan-50',
                }[m.status] || 'border-gray-100';
                const statusLabel = {
                  assigned: 'Đã giao', accepted: 'Đã nhận', en_route: 'Đang đi',
                  on_scene: 'Tại hiện trường', completed: 'Hoàn thành',
                  aborted: 'Đã hủy', failed: 'Không thể cứu',
                }[m.status] || m.status;
                const isCitizenCancelled = m.status === 'aborted' && m.citizen_rescued_by_other_count > 0;
                return (
                  <div key={m.id} className={`border rounded-xl overflow-hidden ${isCitizenCancelled ? 'border-orange-300' : statusCls} ${m.stalled ? 'ring-2 ring-orange-300' : ''}`}>
                    {isCitizenCancelled && (
                      <div className="bg-orange-50 border-b border-orange-200 px-3 py-1.5 flex items-center gap-1.5">
                        <AlertTriangle size={12} className="text-orange-500 shrink-0" />
                        <p className="text-xs font-semibold text-orange-700">Người dân xác nhận đã được cứu bởi người khác</p>
                      </div>
                    )}
                    <div className={`p-3 ${isCitizenCancelled ? 'bg-orange-50/30' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-gray-500">{m.tracking_code}</span>
                            {m.rescue_category && RESCUE_CATEGORY[m.rescue_category] && (
                              <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${RESCUE_CATEGORY[m.rescue_category].cls}`}>
                                {RESCUE_CATEGORY[m.rescue_category].label}
                              </span>
                            )}
                            <span className="text-xs font-medium text-gray-700">{m.incident_type}</span>
                            {m.stalled && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Chậm trễ</span>}
                          </div>
                          <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">{m.address}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                            <span>{m.victim_count} nạn nhân</span>
                            {m.rescued_count > 0 && <span className="text-green-600">Đã cứu: {m.rescued_count}</span>}
                            {m.assigned_to_name && <span>Giao: {m.assigned_to_name}</span>}
                            {m.citizen_phone && <span>{m.citizen_phone}</span>}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          m.status === 'completed' ? 'bg-green-100 text-green-700'
                          : m.status === 'failed' ? 'bg-red-100 text-red-700'
                          : m.status === 'on_scene' ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>{statusLabel}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Users size={13} /> Đội cứu hộ
                </h3>
                {(task.all_teams || []).length === 0 ? (
                  <p className="text-sm text-gray-400">Chưa có đội nào.</p>
                ) : (
                  <div className="space-y-2">
                    {(task.all_teams || []).map(t => (
                      <div key={t.id} className={`border rounded-xl p-3 flex items-start gap-3 ${t.is_primary ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
                        <User size={16} className={`mt-0.5 shrink-0 ${t.is_primary ? 'text-amber-500' : 'text-gray-400'}`} />
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {t.name}{t.is_primary && <span className="ml-1 text-xs text-amber-600">(Chủ lực)</span>}
                          </p>
                          <p className="text-xs text-gray-500">Mã: {t.code}</p>
                          {t.leader_name && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Crown size={11} /> {t.leader_name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Package size={13} /> Vật tư đã cấp
                </h3>
                {(task.distributions || []).length === 0 ? (
                  <p className="text-sm text-gray-400">Chưa có vật tư nào được cấp phát.</p>
                ) : (
                  <div className="space-y-1.5">
                    {(task.distributions || []).map((d, i) => (
                      <div key={i} className="border border-gray-100 rounded-lg px-3 py-2 flex items-center justify-between gap-2 bg-white">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{d.item_name}</p>
                          <p className="text-xs text-gray-500">{d.warehouse_name} · {d.voucher_code || '—'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-blue-700">{d.quantity} {d.unit}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            d.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                            d.status === 'issued' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{d.status === 'confirmed' ? 'Đã nhận' : d.status === 'issued' ? 'Đã xuất' : d.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-3">
              {allReports.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">Chưa có báo cáo nào.</div>
              ) : (
                <>
                  {pendingReports.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2">Chờ xử lý ({pendingReports.length})</h3>
                      <div className="space-y-2">
                        {pendingReports.map(r => (
                          <div key={r.id} className="border border-red-200 bg-red-50 rounded-xl p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-red-700">{REPORT_TYPE_LABEL[r.report_type] || r.report_type}</span>
                                  {r.tracking_code && <span className="text-xs font-mono text-gray-400">{r.tracking_code}</span>}
                                </div>
                                <p className="text-sm text-gray-700 mt-1">{r.description}</p>
                                {r.support_type && <p className="text-xs text-blue-600 mt-1">Cần: {r.support_type}</p>}
                                <p className="text-xs text-gray-400 mt-1">— {r.reported_by_name} · {new Date(r.created_at).toLocaleString('vi-VN')}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {resolvedReports.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Đã xử lý ({resolvedReports.length})</h3>
                      <div className="space-y-2">
                        {resolvedReports.map(r => (
                          <div key={r.id} className="border border-gray-200 bg-gray-50 rounded-xl p-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-gray-700">{REPORT_TYPE_LABEL[r.report_type] || r.report_type}</span>
                              {r.tracking_code && <span className="text-xs font-mono text-gray-400">{r.tracking_code}</span>}
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${r.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {r.status === 'resolved' ? 'Đã giải quyết' : 'Đã ghi nhận'}
                              </span>
                            </div>
                            <div className="flex items-start justify-between gap-2 mt-1">
                              <div>
                                <p className="text-sm text-gray-700">{r.description}</p>
                                {r.resolution_note && <p className="text-xs text-blue-600 mt-0.5">Ghi chú: {r.resolution_note}</p>}
                                <p className="text-xs text-gray-400 mt-0.5">— {r.reported_by_name} · {new Date(r.created_at).toLocaleString('vi-VN')}</p>
                              </div>
                              {user?.role !== 'rescue_team' && (
                                <button onClick={() => unresolveReport(r.id)}
                                  className="px-2 py-1 text-xs border border-gray-300 text-gray-500 rounded-lg hover:bg-gray-100 shrink-0">
                                  Hoàn tác
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
