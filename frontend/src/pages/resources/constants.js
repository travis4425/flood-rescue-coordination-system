import { Warehouse, Send, Truck, ClipboardList, PackagePlus, Package } from "lucide-react";

export const VEHICLE_TYPE_LABELS = {
  boat: "🚤 Xuồng/Tàu",
  truck: "🚛 Xe tải",
  car: "🚗 Xe con",
  helicopter: "🚁 Trực thăng",
  ambulance: "🚑 Xe cứu thương",
};

export const CATEGORY_LABELS = {
  food: "Thực phẩm",
  water: "Nước uống",
  medical: "Y tế",
  shelter: "Chỗ ở / Lều",
  equipment: "Thiết bị",
  fuel: "Nhiên liệu",
  other: "Khác",
};

export const UNIT_LABELS = {
  piece: "cái", box: "hộp", bag: "túi", bottle: "chai",
  liter: "lít", kg: "kg", ton: "tấn", pack: "gói",
  set: "bộ", roll: "cuộn", pair: "đôi", unit: "đơn vị",
};

export const fmtUnit = (u) => UNIT_LABELS[u] || u;

export const SOURCE_TYPE_LABELS = {
  purchase: "🛒 Mua mới",
  borrow_local: "🤝 Mượn trong tỉnh",
  borrow_external: "📦 Mượn ngoài tỉnh",
};

export const STATUS_BADGE = {
  available: "bg-green-100 text-green-700",
  in_use: "bg-orange-100 text-orange-700",
  in_transit: "bg-blue-100 text-blue-700",
  maintenance: "bg-yellow-100 text-yellow-700",
  lost: "bg-red-100 text-red-700",
  retired: "bg-gray-100 text-gray-500",
  issued: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  return_requested: "bg-orange-100 text-orange-700",
  partially_returned: "bg-purple-100 text-purple-700",
  returned: "bg-gray-100 text-gray-600",
  dispatched: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
  pending: "bg-yellow-100 text-yellow-700",
  manager_approved: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  fulfilled: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

export const STATUS_LABEL = {
  issued: "Đã cấp",
  confirmed: "Đã nhận",
  return_requested: "Chờ trả",
  partially_returned: "Trả một phần",
  returned: "Đã trả",
  dispatched: "Đã điều",
  available: "Sẵn sàng",
  in_use: "Đang dùng",
  in_transit: "Đang vận chuyển",
  maintenance: "Bảo trì",
  lost: "Mất xe",
  retired: "Nghỉ",
  completed: "Hoàn thành",
  cancelled: "Đã huỷ",
  pending: "Chờ duyệt",
  manager_approved: "Quản lý đã duyệt",
  approved: "Đã nhập kho",
  fulfilled: "Đã nhận xe",
  rejected: "Từ chối",
};

export const TABS = [
  { key: "warehouses",        labelKey: "resources_page.warehouses",        icon: Warehouse,    roles: ["manager", "warehouse_manager", "coordinator"] },
  { key: "distributions",     labelKey: "resources_page.distributions",     icon: Send,         roles: ["manager", "warehouse_manager"] },
  { key: "vehicle_dispatches",labelKey: "resources_page.vehicle_dispatches",icon: Truck,        roles: ["manager", "warehouse_manager"] },
  { key: "vehicle_requests",  labelKey: "resources_page.vehicle_requests",  icon: ClipboardList,roles: ["manager", "warehouse_manager", "coordinator"] },
  { key: "supply_requests",   labelKey: "resources_page.supply_requests",   icon: PackagePlus,  roles: ["coordinator", "manager", "warehouse_manager"] },
  { key: "my_supplies",       labelKey: "resources_page.my_supplies",       icon: Package,      roles: ["rescue_team"] },
  { key: "my_vehicles",       labelKey: "resources_page.my_vehicles",       icon: Truck,        roles: ["rescue_team"] },
  { key: "history",           labelKey: "resources_page.history",           icon: ClipboardList,roles: ["manager", "coordinator"] },
];
