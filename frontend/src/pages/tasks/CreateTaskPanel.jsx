import React, { useState, useEffect } from 'react';
import { taskAPI, teamAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import {
  X, Zap, ClipboardList, Users, AlertTriangle, CheckCircle,
  Navigation, MapPin, Crown,
} from 'lucide-react';

function haversine(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const SPEC_LABEL = s => (s || '')
  .replace(/water_rescue/g, 'Cứu hộ nước')
  .replace(/evacuation/g, 'Sơ tán')
  .replace(/medical/g, 'Y tế')
  .replace(/search_rescue/g, 'Tìm kiếm')
  .replace(/landslide_rescue/g, 'Sạt lở');

function getRequiredSpecs(incidentType) {
  const t = (incidentType || '').toLowerCase();
  if (t.includes('ngập') || t.includes('lũ') || t.includes('lụt') || t.includes('mắc kẹt'))
    return { specs: ['water_rescue', 'evacuation', 'search_rescue'], label: 'Cứu hộ nước / Sơ tán' };
  if (t.includes('sạt lở'))
    return { specs: ['landslide_rescue', 'search_rescue'], label: 'Cứu hộ sạt lở / Tìm kiếm' };
  if (t.includes('sơ tán'))
    return { specs: ['evacuation', 'water_rescue'], label: 'Sơ tán' };
  if (t.includes('y tế') || t.includes('cấp cứu') || t.includes('thương'))
    return { specs: ['medical'], label: 'Y tế' };
  if (t.includes('tìm kiếm'))
    return { specs: ['search_rescue'], label: 'Tìm kiếm' };
  return null;
}

export default function CreateTaskPanel({ onClose, onCreated }) {
  const { user } = useAuthStore();
  const [teams, setTeams] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [primaryTeamId, setPrimaryTeamId] = useState(null);
  const [reqTeamMap, setReqTeamMap] = useState({});
  const [form, setForm] = useState({ name: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [specFilter, setSpecFilter] = useState('');

  const provinceId = user?.province_id;

  useEffect(() => {
    teamAPI.getAll({}).then(r => {
      const filtered = (r.data || []).filter(t =>
        (!provinceId || t.province_id === provinceId) && t.status !== 'off_duty'
      );
      setTeams(filtered);
    }).catch(() => {});
    taskAPI.suggestRequests({ province_id: provinceId, limit: 50 })
      .then(r => setRequests(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingReqs(false));
  }, [provinceId]);

  const toggleRequest = (id) =>
    setSelectedRequests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleTeam = (id) => {
    setSelectedTeamIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (next.length <= 1) setReqTeamMap({});
      setPrimaryTeamId(p => {
        if (next.length === 0) return null;
        if (p === id && !next.includes(id)) return next[0];
        if (!p || !next.includes(p)) return next[0];
        return p;
      });
      return next;
    });
  };

  const selectedReqObjs = requests.filter(r => selectedRequests.includes(r.id));
  const centroid = (() => {
    const geo = selectedReqObjs.filter(r => r.latitude && r.longitude);
    if (!geo.length) return null;
    return {
      lat: geo.reduce((s, r) => s + r.latitude, 0) / geo.length,
      lng: geo.reduce((s, r) => s + r.longitude, 0) / geo.length,
    };
  })();

  const allSpecs = [...new Set(
    teams.flatMap(t => (t.specialization || '').split(',').map(s => s.trim())).filter(Boolean)
  )];

  const displayTeams = teams
    .filter(t => !specFilter || (t.specialization || '').split(',').map(s => s.trim()).includes(specFilter))
    .map(t => ({
      ...t,
      distance: centroid ? haversine(centroid.lat, centroid.lng, t.current_latitude, t.current_longitude) : null,
    }))
    .sort((a, b) => {
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      if (a.distance !== null) return -1;
      if (b.distance !== null) return 1;
      return 0;
    });

  const selectedTeams = teams.filter(t => selectedTeamIds.includes(t.id));
  const multiTeam = selectedTeamIds.length > 1;
  const totalVictims = selectedReqObjs.reduce((s, r) => s + (r.victim_count || 0), 0);

  const selectedTeamSpecs = new Set(
    selectedTeams.flatMap(t => (t.specialization || '').split(',').map(s => s.trim())).filter(Boolean)
  );
  const specWarnings = (() => {
    if (selectedRequests.length === 0 || selectedTeamIds.length === 0) return [];
    const reqsByCategory = {};
    selectedRequests.forEach(id => {
      const req = requests.find(r => r.id === id);
      if (!req) return;
      const rule = getRequiredSpecs(req.incident_type);
      if (!rule) return;
      const covered = rule.specs.some(s => selectedTeamSpecs.has(s));
      if (!covered) {
        const key = rule.label;
        if (!reqsByCategory[key]) reqsByCategory[key] = { label: rule.label, needed: rule.specs, count: 0 };
        reqsByCategory[key].count++;
      }
    });
    return Object.values(reqsByCategory);
  })();

  const handleCreate = async () => {
    if (!form.name.trim()) return alert('Vui lòng nhập tên task.');
    if (selectedTeamIds.length === 0) return alert('Vui lòng chọn ít nhất 1 đội thực hiện.');
    if (selectedRequests.length === 0) return alert('Chọn ít nhất 1 yêu cầu cứu hộ.');
    if (multiTeam) {
      const unassigned = selectedRequests.filter(id => !reqTeamMap[id]);
      if (unassigned.length > 0) return alert(`${unassigned.length} yêu cầu chưa được gán đội. Vui lòng chọn đội cho từng yêu cầu.`);
    }
    setSaving(true);
    try {
      const requestList = selectedRequests.map(id => ({
        id,
        team_id: multiTeam ? reqTeamMap[id] : selectedTeamIds[0],
      }));
      const { data } = await taskAPI.create({
        name: form.name,
        team_ids: selectedTeamIds,
        team_id: primaryTeamId || selectedTeamIds[0],
        requests: requestList,
        notes: form.notes,
      });
      onCreated(data.id);
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex gap-3 flex-wrap">
        <input
          className="flex-1 min-w-0 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Tên task *  VD: Cứu hộ khu Bình Thạnh – lũ sáng 8/3"
          value={form.name}
          onChange={e => setForm(d => ({ ...d, name: e.target.value }))}
        />
        <input
          className="w-56 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Ghi chú (tuỳ chọn)"
          value={form.notes}
          onChange={e => setForm(d => ({ ...d, notes: e.target.value }))}
        />
        <button onClick={onClose} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1.5">
          <X size={14} /> Hủy
        </button>
        <button
          onClick={handleCreate}
          disabled={saving || selectedTeamIds.length === 0 || selectedRequests.length === 0}
          className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
        >
          <Zap size={14} />
          {saving ? 'Đang tạo...' : `Tạo Task (${selectedRequests.length} yêu cầu · ${selectedTeamIds.length} đội)`}
        </button>
      </div>

      {/* Spec warning */}
      {specWarnings.length > 0 && (
        <div className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={17} className="text-orange-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-orange-800">Cảnh báo: chuyên môn đội chưa phù hợp</p>
            <ul className="mt-1 space-y-0.5">
              {specWarnings.map((w, i) => (
                <li key={i} className="text-xs text-orange-700">
                  · <strong>{w.count} yêu cầu "{w.label}"</strong> cần ít nhất 1 đội có chuyên môn{' '}
                  <span className="font-semibold">{w.needed.map(s => SPEC_LABEL(s)).join(' / ')}</span>.
                </li>
              ))}
            </ul>
            <p className="text-xs text-orange-500 mt-1.5">Vẫn có thể tạo task, nhưng nên bổ sung đội phù hợp.</p>
          </div>
        </div>
      )}

      {/* Split panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: 520 }}>
        {/* Left: Requests */}
        <div className="lg:col-span-3 border rounded-2xl overflow-hidden flex flex-col bg-white shadow-sm">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-gray-50 to-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ClipboardList size={15} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Yêu cầu cứu hộ</span>
              {!loadingReqs && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full font-medium">{requests.length}</span>
              )}
            </div>
            {requests.length > 0 && (
              <button
                onClick={() => setSelectedRequests(selectedRequests.length === requests.length ? [] : requests.map(r => r.id))}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
              >
                {selectedRequests.length === requests.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {loadingReqs ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">Không có yêu cầu nào chờ xử lý trong tỉnh.</div>
            ) : requests.map(req => {
              const isChecked = selectedRequests.includes(req.id);
              const urgencyColor = req.urgency_color || '#9ca3af';
              return (
                <div key={req.id}
                  onClick={() => toggleRequest(req.id)}
                  className={`relative flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none ${
                    isChecked ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-all"
                    style={{ backgroundColor: isChecked ? '#3b82f6' : urgencyColor + '60' }} />
                  <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${
                    isChecked ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                  }`}>
                    {isChecked && <CheckCircle size={12} className="text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0 pl-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-mono text-gray-400">{req.tracking_code}</span>
                      {req.urgency_level && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ backgroundColor: urgencyColor + '20', color: urgencyColor }}>
                          {req.urgency_level}
                        </span>
                      )}
                      {req.incident_type && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md">{req.incident_type}</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{req.address}</p>
                    <div className="flex gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users size={11} className="text-gray-400" /> {req.victim_count} nạn nhân
                      </span>
                      {req.support_type && <span className="text-blue-500">{req.support_type}</span>}
                    </div>
                    {multiTeam && isChecked && (
                      <div className="mt-2" onClick={e => e.stopPropagation()}>
                        <select
                          className={`w-full text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white transition-colors ${
                            reqTeamMap[req.id] ? 'border-blue-300 bg-blue-50' : 'border-orange-300'
                          }`}
                          value={reqTeamMap[req.id] || ''}
                          onChange={e => setReqTeamMap(prev => ({ ...prev, [req.id]: parseInt(e.target.value) }))}
                        >
                          <option value="">⚠ Chọn đội phụ trách...</option>
                          {selectedTeams.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name}{t.specialization ? ` · ${SPEC_LABEL(t.specialization)}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`px-4 py-2.5 border-t shrink-0 flex items-center justify-between transition-colors ${
            selectedRequests.length > 0 ? 'bg-blue-50' : 'bg-gray-50'
          }`}>
            <span className="text-xs font-semibold text-blue-700">
              {selectedRequests.length > 0
                ? `✓ ${selectedRequests.length} yêu cầu · ${totalVictims} nạn nhân`
                : <span className="text-gray-400 font-normal">Chưa chọn yêu cầu nào</span>
              }
            </span>
            {multiTeam && selectedRequests.length > 0 && (
              <span className={`text-xs font-medium ${
                selectedRequests.filter(id => !reqTeamMap[id]).length > 0 ? 'text-orange-600' : 'text-green-600'
              }`}>
                {selectedRequests.filter(id => !reqTeamMap[id]).length > 0
                  ? `⚠ ${selectedRequests.filter(id => !reqTeamMap[id]).length} chưa gán đội`
                  : '✓ Đã gán đội đủ'
                }
              </span>
            )}
          </div>
        </div>

        {/* Right: Teams */}
        <div className="lg:col-span-2 border rounded-2xl overflow-hidden flex flex-col bg-white shadow-sm">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-gray-50 to-white shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users size={15} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Đội cứu hộ</span>
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full font-medium">
                  {displayTeams.length}{specFilter ? `/${teams.length}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {centroid && (
                  <span className="text-xs text-blue-500 flex items-center gap-1">
                    <Navigation size={11} /> Gần nhất trước
                  </span>
                )}
                {selectedTeamIds.length > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-semibold">
                    {selectedTeamIds.length} đã chọn
                  </span>
                )}
              </div>
            </div>
            {allSpecs.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setSpecFilter('')}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    !specFilter ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
                  }`}
                >Tất cả</button>
                {allSpecs.map(s => (
                  <button key={s}
                    onClick={() => setSpecFilter(prev => prev === s ? '' : s)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      specFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                    }`}
                  >{SPEC_LABEL(s)}</button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {displayTeams.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                {specFilter ? 'Không có đội nào với chuyên môn này.' : 'Không có đội nào khả dụng.'}
              </div>
            ) : displayTeams.map(team => {
              const isSelected = selectedTeamIds.includes(team.id);
              const isPrimary = primaryTeamId === team.id && selectedTeamIds.length > 1;
              const statusDot = team.status === 'available'
                ? { cls: 'bg-green-400', label: 'Sẵn sàng', text: 'text-green-700' }
                : team.status === 'standby'
                ? { cls: 'bg-yellow-400', label: 'Chờ lệnh', text: 'text-yellow-700' }
                : { cls: 'bg-orange-400', label: 'Đang bận', text: 'text-orange-600' };
              const memberPct = team.capacity > 0
                ? Math.min(Math.round(((team.member_count || 0) / team.capacity) * 100), 100)
                : 0;
              return (
                <label key={team.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    isPrimary
                      ? 'border-amber-400 bg-amber-50 shadow-sm ring-1 ring-amber-200'
                      : isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${
                      isPrimary ? 'bg-amber-400 border-amber-400' : isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                    }`}
                    onClick={e => {
                      if (isSelected && selectedTeamIds.length > 1) {
                        e.preventDefault();
                        setPrimaryTeamId(team.id);
                      }
                    }}
                    title={isSelected && selectedTeamIds.length > 1 ? 'Nhấn để đặt làm đội chủ lực' : ''}
                  >
                    {isPrimary
                      ? <Crown size={10} className="text-white" strokeWidth={2.5} />
                      : isSelected
                      ? <CheckCircle size={12} className="text-white" strokeWidth={3} />
                      : null
                    }
                  </div>
                  <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleTeam(team.id)} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{team.name}</p>
                        {isPrimary && (
                          <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold shrink-0">Chủ lực</span>
                        )}
                      </div>
                      <span className={`flex items-center gap-1 text-xs font-medium shrink-0 ${statusDot.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDot.cls}`} />
                        {statusDot.label}
                      </span>
                    </div>
                    {team.specialization && (
                      <p className="text-xs text-blue-600 mt-0.5 font-medium">{SPEC_LABEL(team.specialization)}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      {team.distance !== null ? (
                        <span className={`flex items-center gap-0.5 font-medium ${
                          team.distance < 5 ? 'text-green-600' : team.distance < 15 ? 'text-yellow-600' : 'text-gray-400'
                        }`}>
                          <MapPin size={10} />
                          {team.distance < 1 ? '<1 km' : `~${Math.round(team.distance)} km`}
                        </span>
                      ) : (
                        team.current_latitude && (
                          <span className="flex items-center gap-0.5 text-gray-400"><MapPin size={10} /> Có tọa độ</span>
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-1">
                        <div className="bg-blue-400 h-1 rounded-full transition-all" style={{ width: `${memberPct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 shrink-0">{team.member_count || 0}/{team.capacity}</span>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="px-4 py-2.5 border-t bg-gray-50 shrink-0">
            {selectedTeamIds.length > 1 ? (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <Crown size={11} /> Nhấn vào vòng tròn của đội để đặt làm <strong>đội chủ lực</strong>
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                {selectedTeamIds.length === 0
                  ? 'Chọn ít nhất 1 đội để phân công'
                  : 'Chọn thêm đội để phân công từng yêu cầu'
                }
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
