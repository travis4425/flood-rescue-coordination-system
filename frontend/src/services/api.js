import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true // Gửi cookies theo mọi request
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    // Nếu token hết hạn, thử refresh một lần
    if (error.response?.data?.error === 'TOKEN_EXPIRED' && !original._retry) {
      original._retry = true;
      try {
        await api.post('/auth/refresh');
        return api(original); // Retry request gốc
      } catch {
        // Refresh thất bại — đẩy về login
        localStorage.removeItem('user');
        if (window.location.pathname.startsWith('/dashboard')) window.location.href = '/login';
      }
    }
    if (error.response?.status === 401 && !original._retry) {
      localStorage.removeItem('user');
      if (window.location.pathname.startsWith('/dashboard')) window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// === AUTH ===
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/password', data),
};

// === REQUESTS ===
export const requestAPI = {
  create: (formData) => api.post('/requests', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  track: (code) => api.get(`/requests/track/${code}`),
  trackUpdate: (code, data) => api.put(`/requests/track/${code}/update`, data),
  trackNotifications: (code) => api.get(`/requests/track/${code}/notifications`),
  confirmRescue: (code) => api.put(`/requests/track/${code}/confirm`),
  rescuedByOther: (code) => api.put(`/requests/track/${code}/rescued-by-other`),
  close: (id) => api.put(`/requests/${id}/close`),
  getMapData: (params) => api.get('/requests/map', { params }),
  getAll: (params) => api.get('/requests', { params }),
  getById: (id) => api.get(`/requests/${id}`),
  getStats: () => api.get('/requests/stats/overview'),
  verify: (id, data) => api.put(`/requests/${id}/verify`, data),
  reject: (id, data) => api.put(`/requests/${id}/reject`, data),
  assign: (id, data) => api.put(`/requests/${id}/assign`, data),
  updateStatus: (id, data) => api.put(`/requests/${id}/status`, data),
  cancel: (id) => api.put(`/requests/${id}/cancel`),
  suggestTeam: (id) => api.get(`/requests/${id}/suggest-team`),
  lookupByPhone: (phone) => api.get('/requests/lookup', { params: { phone } }),
};

// === MISSIONS ===
export const missionAPI = {
  getAll: (params) => api.get('/missions', { params }),
  getById: (id) => api.get(`/missions/${id}`),
  updateStatus: (id, data) => api.put(`/missions/${id}/status`, data),
  submitResult: (id, formData) => api.put(`/missions/${id}/result`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getLogs: (id) => api.get(`/missions/${id}/logs`),
};

// === TEAMS ===
export const teamAPI = {
  getAll: (params) => api.get('/teams', { params }),
  getById: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post('/teams', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  updateLocation: (id, data) => api.put(`/teams/${id}/location`, data),
  addMember: (id, data) => api.post(`/teams/${id}/members`, data),
  removeMember: (id, memberId) => api.delete(`/teams/${id}/members/${memberId}`),
  updateStatus: (id, data) => api.put(`/teams/${id}/status`, data),
};

// === RESOURCES ===
export const resourceAPI = {
  getVehicles: (params) => api.get('/resources/vehicles', { params }),
  createVehicle: (data) => api.post('/resources/vehicles', data),
  updateVehicle: (id, data) => api.put(`/resources/vehicles/${id}`, data),
  getWarehouses: (params) => api.get('/resources/warehouses', { params }),
  getWarehousesMap: () => api.get('/resources/warehouses/map'),
  createWarehouse: (data) => api.post('/resources/warehouses', data),
  updateWarehouse: (id, data) => api.put(`/resources/warehouses/${id}`, data),
  deleteWarehouse: (id) => api.delete(`/resources/warehouses/${id}`),
  getInventory: (params) => api.get('/resources/inventory', { params }),
  updateInventory: (id, data) => api.put(`/resources/inventory/${id}`, data),
  getReliefItems: () => api.get('/resources/relief-items'),
  // === Distributions (Cấp phát vật tư) ===
  getDistributions: (params) => api.get('/resources/distributions', { params }),
  createDistribution: (data) => api.post('/resources/distributions', data),
  createDistributionBatch: (data) => api.post('/resources/distributions/batch', data),
  confirmDistribution: (id) => api.put(`/resources/distributions/${id}/confirm`),
  warehouseConfirmDistribution: (id) => api.put(`/resources/distributions/${id}/warehouse-confirm`),
  requestReturnDistribution: (id, data) => api.put(`/resources/distributions/${id}/request-return`, data),
  confirmReturnDistribution: (id, data) => api.put(`/resources/distributions/${id}/confirm-return`, data),
  cancelDistribution: (id) => api.put(`/resources/distributions/${id}/cancel`),
  cancelDistributionBatch: (batchId) => api.put(`/resources/distributions/batch/${batchId}/cancel`),
  cancelVehicleDispatch: (id) => api.put(`/resources/vehicle-dispatches/${id}/cancel`),
  // === Vehicle Dispatches (Điều xe cho team) ===
  getVehicleDispatches: (params) => api.get('/resources/vehicle-dispatches', { params }),
  createVehicleDispatch: (data) => api.post('/resources/vehicle-dispatches', data),
  warehouseConfirmVehicleDispatch: (id) => api.put(`/resources/vehicle-dispatches/${id}/warehouse-confirm`),
  confirmVehicleDispatch: (id) => api.put(`/resources/vehicle-dispatches/${id}/confirm`),
  returnVehicleDispatch: (id) => api.put(`/resources/vehicle-dispatches/${id}/return`),
  confirmReturnVehicleDispatch: (id) => api.put(`/resources/vehicle-dispatches/${id}/confirm-return`),
  reassignVehicleDispatch: (id, data) => api.put(`/resources/vehicle-dispatches/${id}/reassign`, data),
  reportVehicleIncident: (id, data) => api.put(`/resources/vehicle-dispatches/${id}/report-incident`, data),
  confirmVehicleIncident: (id, data) => api.put(`/resources/vehicle-dispatches/${id}/confirm-incident`, data),
  markVehicleRepaired: (id) => api.put(`/resources/vehicles/${id}/mark-repaired`),
  // === Supply Transfers (Điều vật tư liên tỉnh) ===
  getSupplyTransfers: (params) => api.get('/resources/supply-transfers', { params }),
  createSupplyTransfer: (data) => api.post('/resources/supply-transfers', data),
  confirmSupplyTransfer: (id, data) => api.put(`/resources/supply-transfers/${id}/confirm`, data),
  cancelSupplyTransfer: (id) => api.put(`/resources/supply-transfers/${id}/cancel`),
  // === Vehicle Transfers (Điều xe liên tỉnh) ===
  getVehicleTransfers: (params) => api.get('/resources/vehicle-transfers', { params }),
  createVehicleTransfer: (data) => api.post('/resources/vehicle-transfers', data),
  confirmVehicleTransfer: (id) => api.put(`/resources/vehicle-transfers/${id}/confirm`),
  cancelVehicleTransfer: (id) => api.put(`/resources/vehicle-transfers/${id}/cancel`),
  // === Vehicle Requests ===
  getVehicleRequests: (params) => api.get('/resources/vehicle-requests', { params }),
  createVehicleRequest: (data) => api.post('/resources/vehicle-requests', data),
  updateVehicleRequestStatus: (id, data) => api.put(`/resources/vehicle-requests/${id}/status`, data),
  confirmVehicleRequest: (id, action) => api.put(`/resources/vehicle-requests/${id}/confirm`, { action }),
  // === Supply Requests (Yêu cầu bổ sung vật tư: coordinator → manager) ===
  getSupplyRequests: (params) => api.get('/resources/supply-requests', { params }),
  createSupplyRequest: (data) => api.post('/resources/supply-requests', data),
  approveSupplyRequest: (id, data) => api.put(`/resources/supply-requests/${id}/approve`, data),
  rejectSupplyRequest: (id, data) => api.put(`/resources/supply-requests/${id}/reject`, data),
  warehouseConfirmSupplyRequest: (id) => api.put(`/resources/supply-requests/${id}/warehouse-confirm`),
  getHistory: (params) => api.get('/resources/history', { params }),
};

// === REGIONS ===
export const regionAPI = {
  getAll: () => api.get('/regions'),
  getProvinces: (params) => api.get('/regions/provinces', { params }),
  getIncidentTypes: () => api.get('/regions/incident-types'),
  getUrgencyLevels: () => api.get('/regions/urgency-levels'),
  getWeatherAlerts: (params) => api.get('/regions/weather-alerts', { params }),
  getWeatherStatus: () => api.get('/regions/weather-status'),
  getWeatherCurrent: (provinceId) => api.get(`/regions/weather-current/${provinceId}`),
  getWeatherForecast: (provinceId) => api.get(`/regions/weather-forecast/${provinceId}`),
  getWeatherByCoords: (lat, lon) => api.get('/regions/weather-by-coords', { params: { lat, lon } }),
  autoSyncWeatherAlerts: (data) => api.post('/regions/weather-alerts/auto-sync', data),
};

// === USERS ===
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  resetPassword: (id) => api.put(`/users/${id}/reset-password`),
  toggleActive: (id) => api.put(`/users/${id}/toggle-active`),
  getCoordinators: () => api.get('/users/coordinators'),
  getCoordinatorRegions: (id) => api.get(`/users/${id}/coordinator-regions`),
  addCoordinatorRegion: (id, data) => api.post(`/users/${id}/coordinator-regions`, data),
  updateCoordinatorRegion: (id, regionId, data) => api.put(`/users/${id}/coordinator-regions/${regionId}`, data),
  removeCoordinatorRegion: (id, regionId) => api.delete(`/users/${id}/coordinator-regions/${regionId}`),
};

// === DASHBOARD ===
export const dashboardAPI = {
  getOverview: (params) => api.get('/dashboard/overview', { params }),
  getRequestsByProvince: (params) => api.get('/dashboard/by-province', { params }),
  getTeamStats: (params) => api.get('/dashboard/team-stats', { params }),
  getResourceOverview: () => api.get('/dashboard/resource-overview'),
  getCoordinatorWorkload: (params) => api.get('/dashboard/coordinator-workload', { params }),
  getWeatherImpact: () => api.get('/dashboard/weather-impact'),
  getHeatmap: (params) => api.get('/dashboard/heatmap', { params }),
  getByProvince: (params) => api.get('/dashboard/by-province', { params }),
  getDailyTrend: (params) => api.get('/dashboard/daily-trend', { params }),
  getResourceUsage: () => api.get('/dashboard/resource-usage'),
};

// === NOTIFICATIONS ===
export const notificationAPI = {
  getMine: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  create: (data) => api.post('/notifications', data),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// === TASKS ===
export const taskAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  updateStatus: (id, data) => api.put(`/tasks/${id}/status`, data),
  suggestRequests: (params) => api.get('/tasks/suggest-requests', { params }),
  assignMember: (id, data) => api.put(`/tasks/${id}/assign-member`, data),
  getAllMembers: (id) => api.get(`/tasks/${id}/all-members`),
  submitReport: (id, data) => api.post(`/tasks/${id}/reports`, data),
  resolveReport: (id, reportId, data) => api.put(`/tasks/${id}/reports/${reportId}/resolve`, data),
  unresolveReport: (id, reportId) => api.put(`/tasks/${id}/reports/${reportId}/unresolve`),
  dispatchSupport: (id, data) => api.post(`/tasks/${id}/dispatch-support`, data),
  confirmComplete: (id) => api.put(`/tasks/${id}/confirm-complete`),
  cancel: (id, data) => api.put(`/tasks/${id}/cancel`, data),
  setEstimatedCompletion: (id, data) => api.put(`/tasks/${id}/estimated-completion`, data),
  setScheduledDate: (id, data) => api.put(`/tasks/${id}/scheduled-date`, data),
};

// === CONFIG / CATEGORIES ===
export const configAPI = {
  // System params
  getAll: () => api.get('/config'),
  update: (key, data) => api.put(`/config/${key}`, data),
  delete: (key) => api.delete(`/config/${key}`),
  // Incident types
  getIncidentTypes: () => api.get('/config/incident-types'),
  createIncidentType: (data) => api.post('/config/incident-types', data),
  updateIncidentType: (id, data) => api.put(`/config/incident-types/${id}`, data),
  deleteIncidentType: (id) => api.delete(`/config/incident-types/${id}`),
  // Urgency levels
  getUrgencyLevels: () => api.get('/config/urgency-levels'),
  createUrgencyLevel: (data) => api.post('/config/urgency-levels', data),
  updateUrgencyLevel: (id, data) => api.put(`/config/urgency-levels/${id}`, data),
  deleteUrgencyLevel: (id) => api.delete(`/config/urgency-levels/${id}`),
  // Relief items
  getReliefItems: () => api.get('/config/relief-items'),
  createReliefItem: (data) => api.post('/config/relief-items', data),
  updateReliefItem: (id, data) => api.put(`/config/relief-items/${id}`, data),
  deleteReliefItem: (id) => api.delete(`/config/relief-items/${id}`),
};

// === REPORTS ===
export const reportAPI = {
  exportRequests:  (params) => api.get('/reports/requests',  { params, responseType: 'blob' }),
  exportMissions:  (params) => api.get('/reports/missions',  { params, responseType: 'blob' }),
  exportResources: (params) => api.get('/reports/resources', { params, responseType: 'blob' }),
};

// === DISASTER EVENTS ===
export const disasterEventAPI = {
  getTypes:    ()           => api.get('/disaster-events/types'),
  getActive:   ()           => api.get('/disaster-events/active'),
  getAll:      (params)     => api.get('/disaster-events', { params }),
  getById:     (id)         => api.get(`/disaster-events/${id}`),
  getTimeline: (id)         => api.get(`/disaster-events/${id}/timeline`),
  getStats:    ()           => api.get('/disaster-events/stats'),
  create:      (data)       => api.post('/disaster-events', data),
  update:      (id, data)   => api.put(`/disaster-events/${id}`, data),
  updateStatus:(id, status) => api.patch(`/disaster-events/${id}/status`, { status }),
};

export default api;
