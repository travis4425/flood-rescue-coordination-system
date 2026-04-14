# Phase Checklist — Flood Rescue Upgrade

Dùng file này để track tiến độ. Đánh dấu ✅ khi xong mỗi bước.

## PHASE 1 — Bản đồ Vmap (Priority: CRITICAL)
- [ ] Tạo `frontend/src/config/mapConfig.js`
- [ ] Thay thế tất cả `openstreetmap.org` URLs
- [ ] Tất cả MapContainer dùng `MAP_CONFIG.defaultCenter`
- [ ] Tile error fallback hoạt động
- [ ] Test tọa độ Hoàng Sa / Trường Sa

## PHASE 2 — Infrastructure
- [ ] `backend/src/utils/cache.js`
- [ ] `backend/src/middlewares/validate.js`
- [ ] `npm install zod` trong backend
- [ ] Tạo thư mục `controllers/`, `repositories/`, `validators/`

## PHASE 3 — Auth Refactor
- [ ] `repositories/userRepository.js`
- [ ] `repositories/refreshTokenRepository.js`
- [ ] `validators/authValidator.js`
- [ ] `database/migrations/001_refresh_tokens.sql` — đã chạy migration
- [ ] `services/authService.js`
- [ ] `controllers/authController.js`
- [ ] `middlewares/auth.js` cập nhật (đọc cookie)
- [ ] `npm install cookie-parser`
- [ ] `server.js` thêm cookie-parser
- [ ] `routes/auth.js` simplified
- [ ] `frontend/src/store/authStore.js` — xóa localStorage token
- [ ] `frontend/src/services/api.js` — withCredentials + refresh interceptor
- [ ] Test: login → cookie set, logout → cookie cleared, token refresh hoạt động

## PHASE 4 — Route Modules Refactor
- [ ] regions (repo + service + controller + route)
- [ ] teams (repo + service + controller + route)
- [ ] missions (repo + service + controller + route)
- [ ] requests (repo + service + controller + route)
- [ ] resources (2 repos + 2 services + 2 controllers + route)
- [ ] tasks (repo + service + controller + route)
- [ ] Test: tất cả endpoints vẫn hoạt động

## PHASE 5 — Frontend Components
- [ ] `DataTable.jsx`
- [ ] `StatusBadge.jsx`
- [ ] `ConfirmDialog.jsx`
- [ ] `EmptyState.jsx`
- [ ] `FloodMap.jsx`
- [ ] `RequestMarker.jsx`
- [ ] `WarehouseMarker.jsx`
- [ ] ResourcesPage tách thành folder `pages/resources/`
- [ ] TasksPage tách thành folder `pages/tasks/`
- [ ] Custom hooks: `useResources.js`, `useTasks.js`, `useRequests.js`, `useSocket.js`
- [ ] Không file nào > 300 lines

## PHASE 6 — Export Reports
- [ ] `npm install exceljs` trong backend
- [ ] `services/reportService.js`
- [ ] `controllers/reportController.js`
- [ ] `routes/reports.js`
- [ ] Nút export trên Dashboard
- [ ] Nút export trên RequestsManagement
- [ ] Nút export trên Resources
- [ ] Test: download file Excel thực sự

## PHASE 7 — PWA
- [ ] `npm install -D vite-plugin-pwa workbox-window`
- [ ] `vite.config.js` cập nhật
- [ ] `frontend/src/utils/offlineQueue.js`
- [ ] `CitizenHome.jsx` hỗ trợ offline submit
- [ ] `OnlineStatus.jsx` banner
- [ ] `DashboardLayout.jsx` thêm OnlineStatus
- [ ] Test: tắt network, submit form, bật lại mạng → request được gửi

## PHASE 8 — Docker
- [ ] `backend/Dockerfile`
- [ ] `frontend/Dockerfile`
- [ ] `frontend/nginx.conf`
- [ ] `docker-compose.yml`
- [ ] `.env.docker.example`
- [ ] Test: `docker-compose up --build` chạy thành công

## PHASE 9 — Cleanup
- [ ] `frontend/dist/` removed từ git
- [ ] Env validation trong `server.js`
- [ ] `ecosystem.config.js` cho PM2
- [ ] `README.md` updated

---

## Ghi chú khi chạy migration
```sql
-- Chạy lệnh này trên SQL Server sau khi tạo migration file:
-- sqlcmd -S localhost -U sa -P <password> -d flood_rescue_db -i database/migrations/001_refresh_tokens.sql
```
