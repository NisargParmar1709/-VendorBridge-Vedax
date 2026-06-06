import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import { Eye, RefreshCw, Search, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useInvoices } from "../../hooks/useInvoices";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "voided", label: "Voided" },
];

const columnHelper = createColumnHelper();

export default function InvoiceListPage() {
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

  const { data, isLoading, isFetching } = useInvoices(params);
  const invoices = data?.invoices || data?.items || [];
  const totalItems = data?.total || invoices.length;
  const totalPages = data?.pages || Math.ceil(totalItems / perPage) || 1;

  const columns = useMemo(
    () => [
      columnHelper.accessor("invoice_number", {
        header: "Invoice#",
        cell: (info) => (
          <span className={`font-mono text-sm font-medium ${info.row.original.status === 'voided' ? 'text-gray-400 line-through' : 'text-blue-600'}`}>
            {info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("po_number", {
        header: "PO#",
        cell: (info) => <span className={`font-mono text-xs ${info.row.original.status === 'voided' ? 'text-gray-400' : 'text-gray-500'}`}>{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("vendor_name", {
        header: "Vendor",
        cell: (info) => <span className={`font-medium ${info.row.original.status === 'voided' ? 'text-gray-400' : 'text-gray-900'}`}>{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("amount", {
        header: "Grand Total",
        cell: (info) => {
          const v = info.getValue() || info.row.original.grand_total;
          return (
            <span className={info.row.original.status === 'voided' ? 'text-gray-400 line-through' : 'text-gray-900'}>
              {v ? `₹${Number(v).toLocaleString("en-IN")}` : "—"}
            </span>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <StatusBadge status={info.getValue()} type="invoice" />,
      }),
      columnHelper.accessor("due_date", {
        header: "Due Date",
        cell: (info) => {
          const val = info.getValue();
          if (!val) return "—";
          const d = new Date(val);
          const isOverdue = d < new Date() && info.row.original.status !== 'paid' && info.row.original.status !== 'voided';
          return (
            <span className={`text-sm ${isOverdue ? 'font-medium text-red-600' : (info.row.original.status === 'voided' ? 'text-gray-400' : 'text-gray-700')}`}>
              {format(d, "dd MMM yyyy")}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <button type="button"
            onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${row.original.id}`); }}
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
      <PageHeader title="Invoices" subtitle="Manage and track invoices" />

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
          <input type="text" placeholder="Search by Invoice#, PO# or Vendor..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </div>
        {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
      </div>

      <div className={invoices.length > 0 ? "[&_tr.opacity-50]:opacity-60" : ""}>
        <DataTable
          columns={columns}
          data={invoices}
          isLoading={isLoading}
          showSearch={false}
          page={page}
          perPage={perPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={(p) => setPage(p)}
          emptyMessage="No invoices found"
          emptyState={
            <tr>
              <td colSpan="100%" className="py-16">
                <div className="flex flex-col items-center justify-center text-center">
                  <FileText className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No invoices generated</h3>
                  <p className="text-sm text-gray-500 mt-1">Invoices will appear here once submitted by vendors against purchase orders.</p>
                </div>
              </td>
            </tr>
          }
          onRowClick={(row) => navigate(`/invoices/${row.id}`)}
          rowClassName={(row) => row.status === 'voided' ? 'opacity-50' : ''}
        />
      </div>
    </div>
  );
}