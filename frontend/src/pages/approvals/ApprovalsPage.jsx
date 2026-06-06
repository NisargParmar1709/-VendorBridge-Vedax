import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import { Eye, RefreshCw, Search, CheckCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useApprovals } from "../../hooks/useApprovals";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function ApprovalStatusBadge({ status }) {
  const map = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    skipped: "bg-gray-100 text-gray-600",
  };
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "—";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] || "bg-gray-100 text-gray-800"}`}>
      {label}
    </span>
  );
}

const columnHelper = createColumnHelper();

export default function ApprovalsPage() {
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

  const { data, isLoading, isFetching } = useApprovals(params);
  const approvals = data?.approvals || data?.items || [];
  const totalItems = data?.total || approvals.length;
  const totalPages = data?.pages || Math.ceil(totalItems / perPage) || 1;

  const columns = useMemo(
    () => [
      columnHelper.accessor("rfq_title", {
        header: "RFQ Title",
        cell: (info) => <span className="font-medium text-gray-900">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("vendor_name", {
        header: "Vendor",
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("grand_total", {
        header: "Grand Total",
        cell: (info) => {
          const v = info.getValue();
          return v ? `₹${Number(v).toLocaleString("en-IN")}` : "—";
        },
      }),
      columnHelper.accessor("l1_status", {
        header: "L1 Status",
        cell: (info) => <ApprovalStatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor("l2_status", {
        header: "L2 Status",
        cell: (info) => <ApprovalStatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor("overall_status", {
        header: "Overall",
        cell: (info) => <ApprovalStatusBadge status={info.getValue() || info.row.original.status} />,
      }),
      columnHelper.accessor("created_at", {
        header: "Date",
        cell: (info) => info.getValue() ? format(new Date(info.getValue()), "dd MMM yyyy") : "—",
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <button type="button"
            onClick={(e) => { e.stopPropagation(); navigate(`/approvals/${row.original.id}`); }}
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
      <PageHeader title="Approvals" subtitle="Review and approve vendor selections" />

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
          <input type="text" placeholder="Search by RFQ title..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </div>
        {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
      </div>

      <DataTable
        columns={columns}
        data={approvals}
        isLoading={isLoading}
        showSearch={false}
        page={page}
        perPage={perPage}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={(p) => setPage(p)}
        emptyMessage="No approvals found"
        emptyState={
          <tr>
            <td colSpan="100%" className="py-16">
              <div className="flex flex-col items-center justify-center text-center">
                <CheckCircle className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                <p className="text-sm text-gray-500 mt-1">There are no pending approvals requiring your attention.</p>
              </div>
            </td>
          </tr>
        }
        onRowClick={(row) => navigate(`/approvals/${row.id}`)}
      />
    </div>
  );
}