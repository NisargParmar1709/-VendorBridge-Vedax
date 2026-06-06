import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  CheckCircle,
  ChevronDown,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Menu,
  Receipt,
  ShoppingCart,
  X,
} from "lucide-react";
import { useMemo, useState, useRef, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

import { ROUTES } from "../constants/routes";
import useAuthStore from "../store/authStore";
import useUIStore from "../store/uiStore";
import { useNotifications, useMarkRead, useMarkAllRead } from "../hooks/useNotifications";

const navItems = [
  { label: "Dashboard", path: ROUTES.DASHBOARD, icon: LayoutDashboard, roles: ["*"] },
  { label: "Vendors", path: ROUTES.VENDORS, icon: Building2, roles: ["admin", "procurement_officer", "manager"] },
  { label: "RFQs", path: ROUTES.RFQS, icon: FileText, roles: ["*"] },
  { label: "Quotations", path: ROUTES.QUOTATIONS, icon: ClipboardList, roles: ["*"] },
  { label: "Approvals", path: ROUTES.APPROVALS, icon: CheckCircle, roles: ["manager", "admin"] },
  { label: "Purchase Orders", path: ROUTES.PURCHASE_ORDERS, icon: ShoppingCart, roles: ["*"] },
  { label: "Invoices", path: ROUTES.INVOICES, icon: Receipt, roles: ["*"] },
  { label: "Reports", path: ROUTES.REPORTS, icon: BarChart3, roles: ["admin", "procurement_officer", "manager"] },
  { label: "Activity", path: ROUTES.ACTIVITY, icon: Activity, roles: ["admin", "procurement_officer", "manager"] },
];

const breadcrumbLabels = {
  dashboard: "Dashboard",
  vendors: "Vendors",
  rfqs: "RFQs",
  quotations: "Quotations",
  approvals: "Approvals",
  "purchase-orders": "Purchase Orders",
  invoices: "Invoices",
  reports: "Reports",
  activity: "Activity",
  new: "New",
  edit: "Edit",
  compare: "Compare",
};

function isAllowed(itemRoles, userRole) {
  return itemRoles.includes("*") || itemRoles.includes(userRole);
}

function getInitials(user) {
  const first = user?.first_name?.[0] || "";
  const last = user?.last_name?.[0] || "";
  return (first + last || user?.email?.[0] || "U").toUpperCase();
}

export default function AppLayout() {
  const location = useLocation();
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  
  const { data: notificationsData } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  
  const notifications = notificationsData?.notifications || notificationsData || [];
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotifClick = (n) => {
    if (!n.is_read) markRead.mutate(n.id);
    setNotifOpen(false);
    
    if (!n.entity_type || !n.entity_id) return;
    const paths = {
      rfq: `/rfqs/${n.entity_id}`,
      vendor: `/vendors/${n.entity_id}`,
      quotation: `/rfqs/${n.entity_id}`, 
      approval: `/approvals/${n.entity_id}`,
      po: `/purchase-orders/${n.entity_id}`,
      invoice: `/invoices/${n.entity_id}`,
    };
    if (paths[n.entity_type]) navigate(paths[n.entity_type]);
  };

  const visibleNavItems = useMemo(
    () => navItems.filter((item) => isAllowed(item.roles, user?.role)),
    [user?.role]
  );

  const breadcrumbs = useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    return segments.map((segment, index) => ({
      label: breadcrumbLabels[segment] || segment,
      key: `${segment}-${index}`,
    }));
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {sidebarOpen ? (
        <button
          aria-label="Close sidebar overlay"
          type="button"
          onClick={toggleSidebar}
          className="fixed inset-0 z-30 bg-gray-900/40 lg:hidden"
        />
      ) : null}

      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 text-gray-200 transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-800 px-5">
          <div>
            <p className="text-lg font-semibold text-white">VendorBridge</p>
            <p className="text-xs text-gray-400">Procurement ERP</p>
          </div>
          <button
            className="rounded-md bg-gray-800 p-2 text-white lg:hidden"
            onClick={toggleSidebar}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="space-y-2 p-4">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-blue-600 text-white rounded-md"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`
              }
              onClick={() => {
                if (window.innerWidth < 1024 && sidebarOpen) {
                  toggleSidebar();
                }
              }}
              to={item.path}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSidebar}
              className="rounded-md border border-gray-200 p-2 text-gray-600 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Breadcrumb</p>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <span>Home</span>
                {breadcrumbs.map((crumb) => (
                  <span key={crumb.key} className="flex items-center gap-2">
                    <span>/</span>
                    <span className="font-medium text-gray-700">{crumb.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                aria-label="Notifications"
                className="relative rounded-full border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-96 rounded-xl border border-gray-200 bg-white shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button type="button" onClick={() => markAllRead.mutate()} className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-8 text-center text-sm text-gray-500">No notifications</p>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {notifications.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => handleNotifClick(n)}
                            className={`flex w-full items-start gap-3 p-4 text-left transition hover:bg-gray-50 ${!n.is_read ? "bg-blue-50/50" : "bg-white"}`}
                          >
                            <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${!n.is_read ? "bg-blue-600" : "bg-transparent"}`} />
                            <div className="flex-1 space-y-1">
                              <p className={`text-sm ${!n.is_read ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                                {n.title || n.message}
                              </p>
                              {n.title && <p className="text-xs text-gray-500 line-clamp-2">{n.message}</p>}
                              <p className="text-xs text-gray-400">
                                {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : "just now"}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-2 py-1.5 transition hover:bg-gray-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {getInitials(user)}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-medium text-gray-900">
                    {user?.first_name ? `${user.first_name} ${user?.last_name || ""}`.trim() : "User"}
                  </span>
                  <span className="block text-xs capitalize text-gray-500">
                    {user?.role?.replaceAll("_", " ") || "member"}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>

              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                  <Link
                    to={ROUTES.DASHBOARD}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="print:p-0 flex-1 overflow-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}