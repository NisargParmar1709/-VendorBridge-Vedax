import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState } from "react";

function SkeletonRows({ columns, rows = 5 }) {
  return Array.from({ length: rows }).map((_, rowIdx) => (
    <tr key={`skeleton-${rowIdx}`} className="border-b border-gray-100">
      {columns.map((col, colIdx) => (
        <td key={`skeleton-${rowIdx}-${colIdx}`} className="px-4 py-3">
          <div className="animate-pulse">
            <div className="h-4 rounded bg-gray-200 w-3/4" />
          </div>
        </td>
      ))}
    </tr>
  ));
}

function EmptyState({ message = "No data found", icon: Icon }) {
  return (
    <tr>
      <td colSpan="100%" className="py-16">
        <div className="flex flex-col items-center justify-center text-center">
          {Icon && <Icon className="w-12 h-12 text-gray-300 mb-4" />}
          <h3 className="text-lg font-medium text-gray-900">{message}</h3>
          <p className="text-sm text-gray-500 mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      </td>
    </tr>
  );
}

/**
 * TanStack Table wrapper with search, sort, pagination, loading skeletons, and empty state.
 *
 * @param {Object} props
 * @param {Array} props.columns - TanStack column definitions
 * @param {Array} props.data - Row data
 * @param {boolean} [props.isLoading] - Show skeleton rows
 * @param {string} [props.searchPlaceholder] - Placeholder for search input
 * @param {boolean} [props.showSearch] - Show search input (default true)
 * @param {number} [props.page] - Current page (1-indexed)
 * @param {number} [props.totalPages] - Total pages (for server-side)
 * @param {number} [props.totalItems] - Total item count
 * @param {Function} [props.onPageChange] - (page, perPage) => void
 * @param {number} [props.perPage] - Items per page (default 20)
 * @param {string} [props.emptyMessage] - Message shown when data is empty
 * @param {Function} [props.onRowClick] - (row) => void
 */
export default function DataTable({
  columns,
  data = [],
  isLoading = false,
  searchPlaceholder = "Search...",
  showSearch = true,
  page = 1,
  totalPages = 1,
  totalItems,
  onPageChange,
  perPage = 20,
  emptyMessage = "No data found",
  emptyState,
  onRowClick,
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState([]);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: "includesString",
  });

  const handlePrev = () => {
    if (page > 1 && onPageChange) {
      onPageChange(page - 1, perPage);
    }
  };

  const handleNext = () => {
    if (page < totalPages && onPageChange) {
      onPageChange(page + 1, perPage);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
          {totalItems !== undefined && (
            <p className="text-sm text-gray-500 hidden sm:block">
              Showing{" "}
              <span className="font-medium text-gray-700">
                {Math.min((page - 1) * perPage + 1, totalItems)}–
                {Math.min(page * perPage, totalItems)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-700">{totalItems}</span>
            </p>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-gray-50 text-left">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1 ${
                          header.column.getCanSort()
                            ? "cursor-pointer select-none hover:text-gray-700"
                            : ""
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                        )}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows columns={columns} />
            ) : table.getRowModel().rows.length === 0 ? (
              emptyState || <EmptyState message={emptyMessage} />
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={`border-b border-gray-50 transition hover:bg-gray-50 ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="whitespace-nowrap px-4 py-3 text-gray-700"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
