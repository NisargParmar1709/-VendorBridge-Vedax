import { createColumnHelper } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";

import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import { useActivity } from "../../hooks/useActivity";

const columnHelper = createColumnHelper();

const ENTITY_TYPES = ["", "rfq", "vendor", "quotation", "approval", "po", "invoice", "user"];

function ActionBadge({ action }) {
  let color = "bg-gray-100 text-gray-800";
  if (action?.startsWith("rfq_pub")) color = "bg-blue-100 text-blue-800";
  else if (action?.includes("quotation_sub")) color = "bg-purple-100 text-purple-800";
  else if (action?.startsWith("approval")) color = "bg-orange-100 text-orange-800";
  else if (action?.includes("po_gen") || action?.includes("invoice_paid")) color = "bg-green-100 text-green-800";
  
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${color}`}>
      {action || "unknown"}
    </span>
  );
}

export default function ActivityPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);
  const [entityType, setEntityType] = useState("");

  const params = useMemo(
    () => ({
      page,
      per_page: perPage,
      ...(entityType && { entity_type: entityType }),
    }),
    [page, perPage, entityType]
  );

  const { data, isLoading } = useActivity(params);
  const activities = data?.activities || data?.items || [];
  const totalItems = data?.total || activities.length;
  const totalPages = data?.pages || Math.ceil(totalItems / perPage) || 1;

  const handleEntityClick = (type, id) => {
    if (!type || !id) return;
    const paths = {
      rfq: `/rfqs/${id}`,
      vendor: `/vendors/${id}`,
      quotation: `/rfqs/${id}`, // or similar logic if no direct route
      approval: `/approvals/${id}`,
      po: `/purchase-orders/${id}`,
      invoice: `/invoices/${id}`,
    };
    if (paths[type]) navigate(paths[type]);
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("created_at", {
        header: "Timestamp",
        cell: (info) => (
          <span className="whitespace-nowrap text-gray-500">
            {info.getValue() ? formatDistanceToNow(new Date(info.getValue()), { addSuffix: true }) : "—"}
          </span>
        ),
      }),
      columnHelper.accessor("entity_type", {
        header: "Entity Type",
        cell: (info) => <span className="capitalize text-gray-900">{info.getValue()}</span>,
      }),
      columnHelper.accessor("entity_id", {
        header: "Entity ID",
        cell: (info) => (
          <button type="button" onClick={() => handleEntityClick(info.row.original.entity_type, info.getValue())} className="font-mono text-sm text-blue-600 hover:underline cursor-pointer">
            {info.getValue() ? String(info.getValue()).substring(0, 8) + "..." : "—"}
          </button>
        ),
      }),
      columnHelper.accessor("action", {
        header: "Action",
        cell: (info) => <ActionBadge action={info.getValue()} />,
      }),
      columnHelper.accessor("actor_name", {
        header: "Actor",
        cell: (info) => <span className="text-gray-900">{info.getValue() || info.row.original.actor_email || "System"}</span>,
      }),
      columnHelper.accessor("description", {
        header: "Description",
        cell: (info) => <span className="text-gray-600 truncate max-w-xs block" title={info.getValue()}>{info.getValue() || "—"}</span>,
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate]
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Activity Logs" subtitle="System-wide audit trail and event history" />

      {/* Filter */}
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-gray-700">Filter by Entity Type:</label>
        <select
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 capitalize"
        >
          {ENTITY_TYPES.map((type) => (
            <option key={type} value={type}>{type || "All Entities"}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <DataTable
          columns={columns}
          data={activities}
          isLoading={isLoading}
          showSearch={false}
          page={page}
          perPage={perPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={(p) => setPage(p)}
          emptyState={
            <tr>
              <td colSpan="100%" className="py-16">
                <div className="flex flex-col items-center justify-center text-center">
                  <FileText className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No activity logged yet</h3>
                  <p className="text-sm text-gray-500 mt-1">Activity logs will appear here once actions are taken.</p>
                </div>
              </td>
            </tr>
          }
        />
      </div>
    </div>
  );
}