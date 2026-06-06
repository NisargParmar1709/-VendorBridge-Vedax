import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  Eye,
  FileText,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { ROLES } from "../../constants/roles";
import { useMyQuotations } from "../../hooks/useQuotations";
import useAuthStore from "../../store/authStore";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "selected", label: "Selected" },
  { value: "rejected", label: "Rejected" },
];

function formatCurrency(v) {
  if (v == null || isNaN(v)) return "₹0.00";
  return `₹${Number(v).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const columnHelper = createColumnHelper();

export default function QuotationListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rfqIdFilter = searchParams.get("rfq_id") || "";

  const user = useAuthStore((s) => s.user);
  const isVendor = user?.role === ROLES.VENDOR;

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
      ...(rfqIdFilter && { rfq_id: rfqIdFilter }),
    }),
    [page, perPage, search, statusFilter, rfqIdFilter]
  );

  const { data, isLoading, isFetching } = useMyQuotations(params);
  const quotations = data?.quotations || [];
  const totalItems = data?.total || quotations.length;
  const totalPages = data?.pages || Math.ceil(totalItems / perPage) || 1;

  const columns = useMemo(
    () => [
      columnHelper.accessor("rfq_id", {
        header: "RFQ",
        cell: (info) => {
          const q = info.row.original;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/rfqs/${q.rfq_id}`);
              }}
              className="font-mono text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              View RFQ
            </button>
          );
        },
      }),
      columnHelper.accessor("vendor_name", {
        header: "Vendor",
        cell: (info) => (
          <span className="font-medium text-gray-900">
            {info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("grand_total", {
        header: "Grand Total",
        cell: (info) => (
          <span className="font-semibold text-gray-900">
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("delivery_days", {
        header: "Delivery",
        cell: (info) => {
          const days = info.getValue();
          return days ? (
            <span className="text-sm text-gray-700">{days} days</span>
          ) : (
            <span className="text-gray-400">—</span>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <StatusBadge status={info.getValue()} type="quotation" />
        ),
      }),
      columnHelper.accessor("submitted_at", {
        header: "Submitted",
        cell: (info) => {
          const val = info.getValue();
          if (!val)
            return (
              <span className="text-xs text-gray-400 italic">
                Not submitted
              </span>
            );
          return (
            <span className="text-sm text-gray-700">
              {format(new Date(val), "dd MMM yyyy, HH:mm")}
            </span>
          );
        },
      }),
      columnHelper.accessor("created_at", {
        header: "Created",
        cell: (info) => {
          const val = info.getValue();
          if (!val) return <span className="text-gray-400">—</span>;
          return (
            <span className="text-sm text-gray-700">
              {format(new Date(val), "dd MMM yyyy")}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const q = row.original;
          return (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/quotations/${q.id}`);
                }}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                title="View Details"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
          );
        },
        enableSorting: false,
      }),
    ],
    [navigate]
  );

  const subtitle = rfqIdFilter
    ? "Quotations for this RFQ"
    : isVendor
    ? "Your submitted quotations"
    : "All vendor quotations";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations"
        subtitle={subtitle}
        actions={
          rfqIdFilter ? (
            <button
              type="button"
              onClick={() => navigate("/quotations")}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View All Quotations
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
            placeholder="Search quotations..."
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
        data={quotations}
        isLoading={isLoading}
        showSearch={false}
        page={page}
        perPage={perPage}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={(newPage) => setPage(newPage)}
        emptyMessage="No quotations found"
        emptyState={
          <tr>
            <td colSpan="100%" className="py-16">
              <div className="flex flex-col items-center justify-center text-center">
                <FileText className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">
                  No quotations yet
                </h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  {isVendor
                    ? "Go to the RFQs page to view available RFQs and submit your quotation."
                    : "Quotations submitted by vendors against RFQs will appear here."}
                </p>
                {isVendor && (
                  <button
                    type="button"
                    onClick={() => navigate("/rfqs")}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4" />
                    Browse RFQs
                  </button>
                )}
              </div>
            </td>
          </tr>
        }
        onRowClick={(row) => navigate(`/quotations/${row.id}`)}
      />
    </div>
  );
}