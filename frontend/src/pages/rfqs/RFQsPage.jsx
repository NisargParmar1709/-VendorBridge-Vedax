import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  AlertTriangle,
  Eye,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { ROLES } from "../../constants/roles";
import { RFQ_STATUSES } from "../../constants/statuses";
import { useRFQs } from "../../hooks/useRFQs";
import useAuthStore from "../../store/authStore";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "under_review", label: "Under Review" },
  { value: "approval_pending", label: "Approval Pending" },
  { value: "approved", label: "Approved" },
  { value: "expired", label: "Expired" },
];

const columnHelper = createColumnHelper();

export default function RFQsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canCreate =
    user?.role === ROLES.ADMIN ||
    user?.role === ROLES.PROCUREMENT_OFFICER;

  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const params = useMemo(
    () => ({
      page,
      per_page: perPage,
      ...(search && { search }),
      ...(statusFilter && { status: statusFilter }),
    }),
    [page, perPage, search, statusFilter]
  );

  const { data, isLoading, isFetching } = useRFQs(params);
  const rfqs = data?.rfqs || data?.items || [];
  const totalItems = data?.total || rfqs.length;
  const totalPages = data?.pages || Math.ceil(totalItems / perPage) || 1;

  const columns = useMemo(
    () => [
      columnHelper.accessor("rfq_number", {
        header: "RFQ#",
        cell: (info) => (
          <span className="font-mono text-sm font-medium text-blue-600">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("title", {
        header: "Title",
        cell: (info) => {
          const isExpired = info.row.original.status === "expired";
          return (
            <span
              className={`font-medium text-gray-900 ${
                isExpired ? "line-through text-gray-400" : ""
              }`}
            >
              {info.getValue()}
            </span>
          );
        },
      }),
      columnHelper.accessor("category", {
        header: "Category",
        cell: (info) =>
          info.getValue() ? (
            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {info.getValue()}
            </span>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      }),
      columnHelper.accessor("deadline", {
        header: "Deadline",
        cell: (info) => {
          const val = info.getValue();
          if (!val) return <span className="text-gray-400">—</span>;
          const d = new Date(val);
          const isPast = d < new Date();
          return (
            <span
              className={`text-sm ${
                isPast ? "text-red-500 font-medium" : "text-gray-700"
              }`}
            >
              {format(d, "dd MMM yyyy")}
            </span>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue();
          const isExpiredNoResponses = status === "expired" && (info.row.original.quotation_count || 0) === 0;
          return (
            <div className="flex items-center gap-2">
              <StatusBadge status={status} type="rfq" />
              {isExpiredNoResponses && (
                <div className="group relative flex items-center">
                  <AlertTriangle className="h-4 w-4 text-orange-500 cursor-help" />
                  <span className="absolute left-1/2 bottom-full mb-1 -translate-x-1/2 w-max rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none z-10">
                    Expired with no responses
                  </span>
                </div>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("quotation_count", {
        header: "Quotations",
        cell: (info) => (
          <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-blue-50 px-2 text-xs font-semibold text-blue-700">
            {info.getValue() ?? 0}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const rfq = row.original;
          const showQuote =
            user?.role === ROLES.VENDOR &&
            (rfq.status === "published" || rfq.status === "under_review");
          return (
            <div className="flex items-center gap-1">
              {showQuote && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/rfqs/${rfq.id}/quotations/new`);
                  }}
                  className="rounded-lg p-1.5 text-blue-500 transition hover:bg-blue-50 hover:text-blue-700"
                  title="Submit Quotation"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/rfqs/${rfq.id}`);
                }}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                title="View"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
          );
        },
        enableSorting: false,
      }),
    ],
    [navigate, user]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="RFQs"
        subtitle="Request for Quotations"
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={() => navigate("/rfqs/new")}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              Create RFQ
            </button>
          ) : null
        }
      />

      {/* Status Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
              statusFilter === tab.value
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        {isFetching && (
          <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={rfqs}
        isLoading={isLoading}
        showSearch={false}
        page={page}
        perPage={perPage}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={(newPage) => setPage(newPage)}
        emptyMessage="No RFQs found"
        emptyState={
          <tr>
            <td colSpan="100%" className="py-16">
              <div className="flex flex-col items-center justify-center text-center">
                <FileText className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No RFQs yet</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">Create your first Request for Quotation to get started.</p>
                {canCreate && (
                  <button
                    type="button"
                    onClick={() => navigate("/rfqs/new")}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Create RFQ
                  </button>
                )}
              </div>
            </td>
          </tr>
        }
        onRowClick={(row) => navigate(`/rfqs/${row.id}`)}
      />
    </div>
  );
}