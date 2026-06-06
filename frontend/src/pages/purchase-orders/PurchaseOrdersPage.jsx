import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import { Eye, RefreshCw, Search, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { usePurchaseOrders } from "../../hooks/usePurchaseOrders";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const columnHelper = createColumnHelper();

export default function POListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const params = useMemo(
    () => ({
      page,
      per_page: perPage,
      ...(statusFilter && { status: statusFilter }),
      ...(search && { search }),
    }),
    [page, perPage, statusFilter, search]
  );

  const { data, isLoading, isFetching } = usePurchaseOrders(params);
  const pos = data?.purchase_orders || data?.items || [];
  const totalItems = data?.total || pos.length;
  const totalPages = data?.pages || Math.ceil(totalItems / perPage) || 1;

  const columns = useMemo(
    () => [
      columnHelper.accessor("po_number", {
        header: "PO#",
        cell: (info) => (
          <span className={`font-mono text-sm font-medium ${info.row.original.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-blue-600'}`}>
            {info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("vendor_name", {
        header: "Vendor",
        cell: (info) => <span className={`font-medium ${info.row.original.status === 'cancelled' ? 'text-gray-400' : 'text-gray-900'}`}>{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("rfq_title", {
        header: "RFQ Title",
        cell: (info) => <span className={info.row.original.status === 'cancelled' ? 'text-gray-400' : 'text-gray-700'}>{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("grand_total", {
        header: "Grand Total",
        cell: (info) => {
          const v = info.getValue();
          return (
            <span className={info.row.original.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-900'}>
              {v ? `₹${Number(v).toLocaleString("en-IN")}` : "—"}
            </span>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <StatusBadge status={info.getValue()} type="po" />,
      }),
      columnHelper.accessor("created_at", {
        header: "PO Date",
        cell: (info) => (
          <span className={info.row.original.status === 'cancelled' ? 'text-gray-400' : 'text-gray-700'}>
            {info.getValue() ? format(new Date(info.getValue()), "dd MMM yyyy") : "—"}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <button type="button"
            onClick={(e) => { e.stopPropagation(); navigate(`/purchase-orders/${row.original.id}`); }}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
            <Eye className="h-4 w-4" />
          </button>
        ),
        enableSorting: false,
      }),
    ],
    [navigate]
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase Orders" subtitle="Manage and track purchase orders" />

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
        {STATUS_TABS.map((tab) => (
          <button key={tab.value} type="button"
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
              statusFilter === tab.value
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by PO# or Vendor..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </div>
        {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
      </div>

      <DataTable
        columns={columns}
        data={pos}
        isLoading={isLoading}
        showSearch={false}
        page={page}
        perPage={perPage}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={(p) => setPage(p)}
        emptyMessage="No purchase orders found"
        emptyState={
          <tr>
            <td colSpan="100%" className="py-16">
              <div className="flex flex-col items-center justify-center text-center">
                <ShoppingCart className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No purchase orders</h3>
                <p className="text-sm text-gray-500 mt-1">Purchase orders will appear here once quotations are approved.</p>
              </div>
            </td>
          </tr>
        }
        onRowClick={(row) => navigate(`/purchase-orders/${row.id}`)}
      />
    </div>
  );
}