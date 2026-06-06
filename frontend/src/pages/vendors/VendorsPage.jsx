import { createColumnHelper } from "@tanstack/react-table";
import {
  Building2,
  Eye,
  Filter,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Star,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { ROLES } from "../../constants/roles";
import { useVendors } from "../../hooks/useVendors";
import useAuthStore from "../../store/authStore";

const VENDOR_CATEGORIES = [
  "IT Services",
  "Office Supplies",
  "Furniture",
  "Electronics",
  "Construction",
  "Consulting",
  "Logistics",
  "Maintenance",
  "Raw Materials",
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "blocked", label: "Blocked" },
  { value: "inactive", label: "Inactive" },
];

function StarRating({ rating }) {
  const fullStars = Math.floor(rating || 0);
  const hasHalf = (rating || 0) - fullStars >= 0.3;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      <span className="flex items-center text-yellow-400">
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star key={`full-${i}`} className="h-4 w-4 fill-current" />
        ))}
        {hasHalf && (
          <span className="relative">
            <Star className="h-4 w-4 text-gray-300" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
              <Star className="h-4 w-4 fill-current text-yellow-400" />
            </span>
          </span>
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
        ))}
      </span>
      <span className="ml-1 text-sm font-medium text-gray-600">
        {(rating || 0).toFixed(1)}
      </span>
    </div>
  );
}

const columnHelper = createColumnHelper();

export default function VendorsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === ROLES.ADMIN;

  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  const params = useMemo(
    () => ({
      page,
      per_page: perPage,
      ...(search && { search }),
      ...(category && { category }),
      ...(status && { status }),
    }),
    [page, perPage, search, category, status]
  );

  const { data, isLoading, isFetching } = useVendors(params);
  const vendors = data?.vendors || data?.items || [];
  const totalItems = data?.total || vendors.length;
  const totalPages = data?.pages || Math.ceil(totalItems / perPage) || 1;

  const columns = useMemo(
    () => [
      columnHelper.accessor("company_name", {
        header: "Name",
        cell: (info) => (
          <span className="font-medium text-gray-900">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("category", {
        header: "Category",
        cell: (info) => (
          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("contact_email", {
        header: "Contact Email",
      }),
      columnHelper.accessor("gst_number", {
        header: "GST Number",
        cell: (info) => (
          <span className="font-mono text-xs text-gray-600">
            {info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("rating", {
        header: "Rating",
        cell: (info) => <StarRating rating={info.getValue()} />,
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <StatusBadge status={info.getValue()} type="vendor" />,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/vendors/${row.original.id}`);
              }}
              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
              title="View"
            >
              <Eye className="h-4 w-4" />
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/vendors/${row.original.id}?edit=true`);
                }}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-green-50 hover:text-green-600"
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        ),
        enableSorting: false,
      }),
    ],
    [isAdmin, navigate]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        actions={
          isAdmin ? (
            <button
              type="button"
              onClick={() => navigate("/vendors/new")}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              Add Vendor
            </button>
          ) : null
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-8 text-sm text-gray-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All Categories</option>
            {VENDOR_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-gray-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {isFetching && (
          <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={vendors}
        isLoading={isLoading}
        showSearch={false}
        page={page}
        perPage={perPage}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={(newPage) => setPage(newPage)}
        emptyMessage="No vendors found"
        emptyState={
          <tr>
            <td colSpan="100%" className="py-16">
              <div className="flex flex-col items-center justify-center text-center">
                <Building2 className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No vendors yet</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">Add your first vendor to get started.</p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => navigate("/vendors/new")}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add Vendor
                  </button>
                )}
              </div>
            </td>
          </tr>
        }
        onRowClick={(row) => navigate(`/vendors/${row.id}`)}
      />
    </div>
  );
}