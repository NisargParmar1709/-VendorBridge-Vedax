import { useQuery } from "@tanstack/react-query";
import { format, subMonths } from "date-fns";
import {
  Building2,
  ClipboardCheck,
  FileText,
  Plus,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { reportsApi } from "../../api/reports";
import KPICard from "../../components/ui/KPICard";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { ROUTES } from "../../constants/routes";
import useAuthStore from "../../store/authStore";

const VENDOR_PIE_COLORS = ["#22c55e", "#eab308", "#ef4444", "#9ca3af"];

function formatCurrency(value) {
  if (value == null) return "₹0";
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  }
  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(1)}K`;
  }
  return `₹${value.toLocaleString("en-IN")}`;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-lg bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 rounded bg-gray-200" />
          <div className="h-6 w-16 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 h-5 w-40 rounded bg-gray-200" />
      <div className="h-64 rounded-lg bg-gray-100" />
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 h-5 w-48 rounded bg-gray-200" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-gray-50">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

function CompactTable({ title, columns, rows, isLoading }) {
  if (isLoading) return <SkeletonTable />;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(!rows || rows.length === 0) ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-sm text-gray-400">
                  No data available
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-gray-50 transition hover:bg-gray-50"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="whitespace-nowrap px-4 py-3 text-gray-700"
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const showNewRfq =
    user?.role !== "vendor" && user?.role !== "manager";

  // Dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => reportsApi.getDashboardStats().then((r) => r.data),
  });

  // Spending trends (last 6 months)
  const trendDates = useMemo(() => {
    const end = format(new Date(), "yyyy-MM-dd");
    const start = format(subMonths(new Date(), 6), "yyyy-MM-dd");
    return { start, end };
  }, []);

  const { data: spendingData, isLoading: spendingLoading } = useQuery({
    queryKey: ["spending-trends", trendDates.start, trendDates.end],
    queryFn: () =>
      reportsApi
        .getSpendingTrends(trendDates.start, trendDates.end)
        .then((r) => r.data),
  });

  // Vendor status distribution (from stats)
  const vendorDistribution = useMemo(() => {
    if (!stats?.vendor_status_distribution) return [];
    return Object.entries(stats.vendor_status_distribution).map(
      ([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      })
    );
  }, [stats]);

  // Recent POs
  const recentPOs = stats?.recent_purchase_orders || [];
  const poColumns = [
    { key: "po_number", label: "PO#" },
    { key: "vendor_name", label: "Vendor" },
    {
      key: "total_amount",
      label: "Amount",
      render: (row) => formatCurrency(row.total_amount),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} type="po" />,
    },
    {
      key: "created_at",
      label: "Date",
      render: (row) =>
        row.created_at
          ? format(new Date(row.created_at), "dd MMM yyyy")
          : "—",
    },
  ];

  // Recent Invoices
  const recentInvoices = stats?.recent_invoices || [];
  const invoiceColumns = [
    { key: "invoice_number", label: "Invoice#" },
    { key: "po_number", label: "PO#" },
    {
      key: "total_amount",
      label: "Amount",
      render: (row) => formatCurrency(row.total_amount),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} type="invoice" />,
    },
    {
      key: "due_date",
      label: "Due Date",
      render: (row) =>
        row.due_date
          ? format(new Date(row.due_date), "dd MMM yyyy")
          : "—",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`${getGreeting()}, ${user?.first_name || "User"}`}
        actions={
          showNewRfq ? (
            <Link
              to={ROUTES.RFQS_NEW}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              New RFQ
            </Link>
          ) : null
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <KPICard
              title="Pending Approvals"
              value={stats?.pending_approvals ?? 0}
              icon={ClipboardCheck}
              iconBgClass="bg-orange-100"
              iconColorClass="text-orange-600"
            />
            <KPICard
              title="Active RFQs"
              value={stats?.active_rfqs ?? 0}
              icon={FileText}
              iconBgClass="bg-blue-100"
              iconColorClass="text-blue-600"
            />
            <KPICard
              title="Total Vendors"
              value={stats?.total_vendors ?? 0}
              icon={Building2}
              iconBgClass="bg-green-100"
              iconColorClass="text-green-600"
            />
            <KPICard
              title="Total PO Value"
              value={formatCurrency(stats?.total_po_value ?? 0)}
              icon={TrendingUp}
              iconBgClass="bg-purple-100"
              iconColorClass="text-purple-600"
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Spending Trend Bar Chart */}
        {spendingLoading ? (
          <SkeletonChart />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Monthly Spending Trend
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={spendingData?.trends || spendingData || []}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), "Spending"]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar
                  dataKey="amount"
                  fill="#2563eb"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Vendor Status Pie Chart */}
        {statsLoading ? (
          <SkeletonChart />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Vendor Status Distribution
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={vendorDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {vendorDistribution.map((entry, idx) => (
                    <Cell
                      key={entry.name}
                      fill={VENDOR_PIE_COLORS[idx % VENDOR_PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CompactTable
          title="Recent Purchase Orders"
          columns={poColumns}
          rows={recentPOs.slice(0, 5)}
          isLoading={statsLoading}
        />
        <CompactTable
          title="Recent Invoices"
          columns={invoiceColumns}
          rows={recentInvoices.slice(0, 5)}
          isLoading={statsLoading}
        />
      </div>
    </div>
  );
}