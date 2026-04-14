import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Download } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { resourceAPI, regionAPI, teamAPI } from "../services/api";
import { getSocket } from "../services/socket";
import useAuthStore from "../store/authStore";

import { TABS } from "./resources/constants";
import TabWarehouses from "./resources/TabWarehouses";
import TabDistributions from "./resources/TabDistributions";
import TabVehicleDispatches from "./resources/TabVehicleDispatches";
import TabSupplyTransfers from "./resources/TabSupplyTransfers";
import TabVehicleTransfers from "./resources/TabVehicleTransfers";
import TabVehicleRequests from "./resources/TabVehicleRequests";
import TabMySupplies from "./resources/TabMySupplies";
import TabMyVehicles from "./resources/TabMyVehicles";
import TabSupplyRequests from "./resources/TabSupplyRequests";
import TabHistory from "./resources/TabHistory";
import ModalWarehouse from "./resources/ModalWarehouse";
import ModalDispatchSupply from "./resources/ModalDispatchSupply";
import ModalDispatchVehicle from "./resources/ModalDispatchVehicle";
import ModalTransferSupply from "./resources/ModalTransferSupply";
import ModalTransferVehicle from "./resources/ModalTransferVehicle";
import ModalConfirmQty from "./resources/ModalConfirmQty";
import ModalRequestReturn from "./resources/ModalRequestReturn";
import ModalVehicleRequest from "./resources/ModalVehicleRequest";

export default function ResourcesPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const role = user?.role;

  const defaultTab = TABS.find((tb) => tb.roles.includes(role))?.key || "warehouses";
  const [tab, setTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [data, setData] = useState([]);
  const [tabVehicles, setTabVehicles] = useState([]);
  const [modal, setModal] = useState(null);

  const [warehouses, setWarehouses] = useState([]);
  const [reliefItems, setReliefItems] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [sharedLoaded, setSharedLoaded] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState({ vehicle_requests: 0, supply_requests: 0 });

  const visibleTabs = TABS.filter((tab) => tab.roles.includes(role));

  const loadSharedData = useCallback(() => {
    if (sharedLoaded) return;
    setSharedLoaded(true);
    const vehicleParams = role === "coordinator" && user?.province_id ? { province_id: user.province_id } : {};
    const warehouseParams = role === "coordinator" && user?.province_id ? { province_id: user.province_id } : {};
    resourceAPI.getWarehouses(warehouseParams).then((r) => setWarehouses(r.data || [])).catch(() => {});
    resourceAPI.getReliefItems().then((r) => setReliefItems(r.data || [])).catch(() => {});
    resourceAPI.getVehicles(vehicleParams).then((r) => setVehicles(r.data || [])).catch(() => {});
    teamAPI.getAll().then((r) => setTeams(r.data || [])).catch(() => {});
    regionAPI.getProvinces().then((r) => setProvinces(r.data || [])).catch(() => {});
  }, [sharedLoaded, role, user?.province_id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let res;
      if (tab === "warehouses") {
        const warehouseFilter = role === "coordinator" && user?.province_id ? { province_id: user.province_id } : {};
        const [wRes, vRes] = await Promise.all([resourceAPI.getWarehouses(warehouseFilter), resourceAPI.getVehicles()]);
        setData(wRes?.data || []);
        setTabVehicles(vRes?.data || []);
      } else if (tab === "distributions") res = await resourceAPI.getDistributions();
      else if (tab === "vehicle_dispatches") res = await resourceAPI.getVehicleDispatches();
      else if (tab === "supply_transfers") res = await resourceAPI.getSupplyTransfers();
      else if (tab === "vehicle_transfers") res = await resourceAPI.getVehicleTransfers();
      else if (tab === "vehicle_requests") res = await resourceAPI.getVehicleRequests();
      else if (tab === "supply_requests") res = await resourceAPI.getSupplyRequests();
      else if (tab === "my_supplies") res = await resourceAPI.getDistributions();
      else if (tab === "my_vehicles") res = await resourceAPI.getVehicleDispatches();
      else if (tab === "history") res = await resourceAPI.getHistory();
      if (res !== undefined) setData(res?.data || []);
    } catch (e) {
      setData([]);
      setLoadError(e?.response?.data?.error || e?.message || "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [tab, role, user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadBadgeCounts = useCallback(async () => {
    if (!['manager', 'warehouse_manager', 'coordinator'].includes(role)) return;
    try {
      const [vrRes, srRes] = await Promise.all([resourceAPI.getVehicleRequests(), resourceAPI.getSupplyRequests()]);
      const vrData = vrRes?.data || [];
      const srData = srRes?.data || [];
      const actionable = (list) => {
        if (role === 'manager') return list.filter(r => r.status === 'pending').length;
        if (role === 'warehouse_manager') return list.filter(r => r.status === 'manager_approved').length;
        if (role === 'coordinator') return list.filter(r => ['pending', 'manager_approved'].includes(r.status)).length;
        return 0;
      };
      setBadgeCounts({ vehicle_requests: actionable(vrData), supply_requests: actionable(srData) });
    } catch { /* ignore */ }
  }, [role]);

  useEffect(() => { loadBadgeCounts(); }, [loadBadgeCounts]);

  useEffect(() => {
    const socket = getSocket();
    const refreshBadge = () => loadBadgeCounts();
    socket.on('vehicle_request_new', refreshBadge);
    socket.on('vehicle_request_updated', refreshBadge);
    socket.on('supply_request_created', refreshBadge);
    socket.on('supply_request_updated', refreshBadge);
    return () => {
      socket.off('vehicle_request_new', refreshBadge);
      socket.off('vehicle_request_updated', refreshBadge);
      socket.off('supply_request_created', refreshBadge);
      socket.off('supply_request_updated', refreshBadge);
    };
  }, [loadBadgeCounts]);

  const closeModal = () => setModal(null);
  const openModal = (config) => { loadSharedData(); setModal(config); };
  const refresh = () => { loadData(); loadBadgeCounts(); };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-800">{t('resources_page.title')}</h1>
        <div className="flex items-center gap-2">
          {["manager", "admin", "coordinator", "warehouse_manager"].includes(role) && (
            <a
              href={`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/reports/resources`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
            >
              <Download className="w-4 h-4" /> Xuất kho
            </a>
          )}
          <button onClick={refresh} className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
            <RefreshCw className="w-4 h-4" /> Làm mới
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b mb-6 overflow-x-auto">
        {visibleTabs.map((tabItem) => {
          const Icon = tabItem.icon;
          const badgeCount = badgeCounts[tabItem.key] || 0;
          return (
            <button key={tabItem.key} onClick={() => setTab(tabItem.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
                ${tab === tabItem.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <Icon className="w-4 h-4" />
              {t(tabItem.labelKey)}
              {badgeCount > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Đang tải...</div>
      ) : loadError ? (
        <div className="text-center py-16">
          <p className="text-red-500 font-medium mb-2">Không thể tải dữ liệu</p>
          <p className="text-sm text-gray-500 mb-4">{loadError}</p>
          <button onClick={refresh} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Thử lại</button>
        </div>
      ) : (
        <>
          {tab === "warehouses" && <TabWarehouses data={data} vehicles={tabVehicles} role={role} setModal={openModal} refresh={refresh} />}
          {tab === "distributions" && <TabDistributions data={data} role={role} setModal={openModal} refresh={refresh} />}
          {tab === "vehicle_dispatches" && <TabVehicleDispatches data={data} role={role} setModal={openModal} refresh={refresh} />}
          {tab === "supply_transfers" && <TabSupplyTransfers data={data} setModal={openModal} refresh={refresh} />}
          {tab === "vehicle_transfers" && <TabVehicleTransfers data={data} setModal={openModal} refresh={refresh} />}
          {tab === "vehicle_requests" && <TabVehicleRequests data={data} role={role} user={user} warehouses={warehouses} teams={teams} loadSharedData={loadSharedData} refresh={refresh} />}
          {tab === "my_supplies" && <TabMySupplies data={data} user={user} setModal={openModal} refresh={refresh} />}
          {tab === "my_vehicles" && <TabMyVehicles data={data} user={user} refresh={refresh} />}
          {tab === "supply_requests" && <TabSupplyRequests data={data} role={role} user={user} warehouses={warehouses} reliefItems={reliefItems} loadSharedData={loadSharedData} refresh={refresh} />}
          {tab === "history" && <TabHistory data={data} refresh={refresh} />}
        </>
      )}

      {(modal?.type === "warehouse_create" || modal?.type === "warehouse_edit") && (
        <ModalWarehouse item={modal.item} provinces={provinces} onClose={closeModal} refresh={refresh} />
      )}
      {modal?.type === "dispatch_supply" && (
        <ModalDispatchSupply warehouses={warehouses} reliefItems={reliefItems} teams={teams} user={user} onClose={closeModal} refresh={refresh} />
      )}
      {modal?.type === "dispatch_vehicle" && (
        <ModalDispatchVehicle vehicles={vehicles} teams={teams} user={user} role={role} onClose={closeModal} refresh={refresh} />
      )}
      {modal?.type === "transfer_supply" && (
        <ModalTransferSupply warehouses={warehouses} reliefItems={reliefItems} onClose={closeModal} refresh={refresh} />
      )}
      {modal?.type === "transfer_vehicle" && (
        <ModalTransferVehicle vehicles={vehicles} provinces={provinces} onClose={closeModal} refresh={refresh} />
      )}
      {modal?.type === "confirm_qty" && (
        <ModalConfirmQty item={modal.item} onClose={closeModal} refresh={refresh} />
      )}
      {modal?.type === "request_return" && (
        <ModalRequestReturn item={modal.item} onClose={closeModal} refresh={refresh} />
      )}
      {modal?.type === "vreq_create" && (
        <ModalVehicleRequest teams={teams} onClose={closeModal} refresh={refresh} />
      )}
    </div>
  );
}
