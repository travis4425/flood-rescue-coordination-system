const router = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth');
const WarehouseController = require('../controllers/warehouseController');
const ResourceController = require('../controllers/resourceController');

// ── VEHICLES ──────────────────────────────────────────────────────────────────
router.get('/vehicles', authenticate, ResourceController.getVehicles);
router.post('/vehicles', authenticate, authorize('admin', 'manager', 'warehouse_manager'), ResourceController.createVehicle);
router.put('/vehicles/:id', authenticate, authorize('admin', 'manager', 'warehouse_manager'), ResourceController.updateVehicle);
router.put('/vehicles/:id/mark-repaired', authenticate, authorize('warehouse_manager'), ResourceController.markVehicleRepaired);

// ── WAREHOUSES (delegated to WarehouseController) ─────────────────────────────
router.get('/warehouses/map', WarehouseController.getForMap);
router.get('/warehouses', authenticate, WarehouseController.getAll);
router.post('/warehouses', authenticate, authorize('admin', 'manager'), WarehouseController.create);
router.put('/warehouses/:id', authenticate, authorize('admin', 'manager'), WarehouseController.update);
router.delete('/warehouses/:id', authenticate, authorize('admin', 'manager'), WarehouseController.softDelete);

// ── INVENTORY (delegated to WarehouseController) ──────────────────────────────
router.get('/inventory', authenticate, WarehouseController.getInventory);
router.put('/inventory/:id', authenticate, authorize('manager', 'warehouse_manager'), WarehouseController.updateInventory);
router.get('/relief-items', WarehouseController.getReliefItems);

// ── DISTRIBUTIONS ─────────────────────────────────────────────────────────────
router.get('/distributions', authenticate, authorize('manager', 'warehouse_manager', 'coordinator', 'rescue_team'), ResourceController.getDistributions);
router.post('/distributions', authenticate, authorize('manager', 'warehouse_manager', 'coordinator'), ResourceController.createDistribution);
router.post('/distributions/batch', authenticate, authorize('manager', 'warehouse_manager', 'coordinator'), ResourceController.createDistributionBatch);
router.put('/distributions/batch/:batchId/cancel', authenticate, authorize('manager', 'warehouse_manager', 'coordinator'), ResourceController.cancelDistributionBatch);
router.put('/distributions/:id/cancel', authenticate, authorize('manager', 'warehouse_manager', 'coordinator'), ResourceController.cancelDistribution);
router.put('/distributions/:id/confirm', authenticate, authorize('rescue_team'), ResourceController.confirmDistribution);
router.put('/distributions/:id/warehouse-confirm', authenticate, authorize('manager', 'warehouse_manager'), ResourceController.warehouseConfirmDistribution);
router.put('/distributions/:id/request-return', authenticate, authorize('rescue_team'), ResourceController.requestReturnDistribution);
router.put('/distributions/:id/confirm-return', authenticate, authorize('manager', 'warehouse_manager'), ResourceController.confirmReturnDistribution);

// ── VEHICLE REQUESTS ──────────────────────────────────────────────────────────
router.get('/vehicle-requests', authenticate, authorize('admin', 'manager', 'warehouse_manager', 'coordinator'), ResourceController.getVehicleRequests);
router.post('/vehicle-requests', authenticate, authorize('admin', 'coordinator'), ResourceController.createVehicleRequest);
router.put('/vehicle-requests/:id/status', authenticate, authorize('admin', 'manager', 'warehouse_manager'), ResourceController.updateVehicleRequestStatus);
router.put('/vehicle-requests/:id/confirm', authenticate, authorize('admin', 'manager', 'coordinator', 'rescue_team'), ResourceController.confirmVehicleRequest);

// ── VEHICLE DISPATCHES ────────────────────────────────────────────────────────
router.get('/vehicle-dispatches', authenticate, authorize('manager', 'warehouse_manager', 'coordinator', 'rescue_team'), ResourceController.getVehicleDispatches);
router.post('/vehicle-dispatches', authenticate, authorize('manager', 'warehouse_manager', 'coordinator'), ResourceController.createVehicleDispatch);
router.put('/vehicle-dispatches/:id/reassign', authenticate, authorize('coordinator', 'manager'), ResourceController.reassignVehicleDispatch);
router.put('/vehicle-dispatches/:id/cancel', authenticate, authorize('manager', 'warehouse_manager', 'coordinator'), ResourceController.cancelVehicleDispatch);
router.put('/vehicle-dispatches/:id/warehouse-confirm', authenticate, authorize('manager', 'warehouse_manager'), ResourceController.warehouseConfirmVehicleDispatch);
router.put('/vehicle-dispatches/:id/confirm', authenticate, authorize('rescue_team'), ResourceController.confirmVehicleDispatch);
router.put('/vehicle-dispatches/:id/return', authenticate, authorize('rescue_team'), ResourceController.returnVehicleDispatch);
router.put('/vehicle-dispatches/:id/confirm-return', authenticate, authorize('manager', 'warehouse_manager'), ResourceController.confirmReturnVehicleDispatch);
router.put('/vehicle-dispatches/:id/report-incident', authenticate, authorize('rescue_team'), ResourceController.reportVehicleIncident);
router.put('/vehicle-dispatches/:id/confirm-incident', authenticate, authorize('manager', 'warehouse_manager'), ResourceController.confirmVehicleIncident);

// ── SUPPLY TRANSFERS ──────────────────────────────────────────────────────────
router.get('/supply-transfers', authenticate, authorize('manager', 'warehouse_manager', 'coordinator'), ResourceController.getSupplyTransfers);
router.post('/supply-transfers', authenticate, authorize('manager', 'warehouse_manager'), ResourceController.createSupplyTransfer);
router.put('/supply-transfers/:id/confirm', authenticate, authorize('manager', 'warehouse_manager', 'coordinator'), ResourceController.confirmSupplyTransfer);
router.put('/supply-transfers/:id/cancel', authenticate, authorize('manager', 'warehouse_manager'), ResourceController.cancelSupplyTransfer);

// ── VEHICLE TRANSFERS ─────────────────────────────────────────────────────────
router.get('/vehicle-transfers', authenticate, authorize('manager', 'warehouse_manager', 'coordinator'), ResourceController.getVehicleTransfers);
router.post('/vehicle-transfers', authenticate, authorize('manager', 'warehouse_manager'), ResourceController.createVehicleTransfer);
router.put('/vehicle-transfers/:id/confirm', authenticate, authorize('manager', 'warehouse_manager', 'coordinator'), ResourceController.confirmVehicleTransfer);
router.put('/vehicle-transfers/:id/cancel', authenticate, authorize('manager', 'warehouse_manager'), ResourceController.cancelVehicleTransfer);

// ── SUPPLY REQUESTS ───────────────────────────────────────────────────────────
router.get('/supply-requests', authenticate, authorize('coordinator', 'manager', 'warehouse_manager'), ResourceController.getSupplyRequests);
router.post('/supply-requests', authenticate, authorize('coordinator'), ResourceController.createSupplyRequest);
router.put('/supply-requests/:id/approve', authenticate, authorize('manager'), ResourceController.approveSupplyRequest);
router.put('/supply-requests/:id/reject', authenticate, authorize('manager'), ResourceController.rejectSupplyRequest);
router.put('/supply-requests/:id/warehouse-confirm', authenticate, authorize('warehouse_manager'), ResourceController.warehouseConfirmSupplyRequest);

// ── HISTORY ───────────────────────────────────────────────────────────────────
router.get('/history', authenticate, authorize('admin', 'manager', 'warehouse_manager', 'coordinator'), ResourceController.getHistory);

module.exports = router;
