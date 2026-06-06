import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Download,
  Eye,
  FileText,
  GitCompare,
  Loader2,
  Pencil,
  Send,
  ShoppingCart,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import ConfirmDialog from "../../components/ui/ConfirmDialog";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { ROLES } from "../../constants/roles";
import { useDeleteRFQ, usePublishRFQ, useRFQ } from "../../hooks/useRFQs";
import useAuthStore from "../../store/authStore";

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
        <Icon className="h-4 w-4 text-gray-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <div className="text-sm font-medium text-gray-900">{children || "—"}</div>
      </div>
    </div>
  );
}

function SkeletonDetail() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded bg-gray-200 mb-6" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-gray-100 mb-3" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-40 rounded-xl border border-gray-200 bg-white" />
          <div className="h-40 rounded-xl border border-gray-200 bg-white" />
        </div>
      </div>
    </div>
  );
}

export default function RFQDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canEdit =
    user?.role === ROLES.ADMIN || user?.role === ROLES.PROCUREMENT_OFFICER;
  const isVendor = user?.role === ROLES.VENDOR;

  const { data: rfq, isLoading } = useRFQ(id);
  const publishRFQ = usePublishRFQ();
  const deleteRFQ = useDeleteRFQ();

  const [deleteOpen, setDeleteOpen] = useState(false);

  const handlePublish = () => {
    publishRFQ.mutate(id, {
      onSuccess: () => navigate(`/rfqs/${id}`),
    });
  };

  const handleDelete = () => {
    deleteRFQ.mutate(id, {
      onSuccess: () => navigate("/rfqs"),
    });
  };

  if (isLoading) return <SkeletonDetail />;

  if (!rfq) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">RFQ not found</h3>
          <Link to="/rfqs" className="mt-4 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
            <ArrowLeft className="h-4 w-4" /> Back to RFQs
          </Link>
        </div>
      </div>
    );
  }

  const status = rfq.status;
  const quotationCount = rfq.quotation_count || rfq.quotations?.length || 0;

  // Status-dependent actions
  const renderActions = () => {
    const btns = [];

    btns.push(
      <button key="back" type="button" onClick={() => navigate("/rfqs")}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
    );

    if (status === "draft" && canEdit) {
      btns.push(
        <button key="edit" type="button" onClick={() => navigate(`/rfqs/${id}/edit`)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Pencil className="h-4 w-4" /> Edit
        </button>,
        <button key="publish" type="button" onClick={handlePublish} disabled={publishRFQ.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {publishRFQ.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish
        </button>,
        <button key="delete" type="button" onClick={() => setDeleteOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      );
    }

    if (status === "published" || status === "under_review") {
      // Vendors: Submit Quotation button (only action they need)
      if (isVendor) {
        btns.push(
          <Link key="submit-quotation" to={`/rfqs/${id}/quotations/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
            <Send className="h-4 w-4" /> Submit Quotation
          </Link>
        );
      }

      // All roles: View Quotations (links to filtered quotation list)
      btns.push(
        <Link key="quotations" to={`/quotations?rfq_id=${id}`}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Eye className="h-4 w-4" /> View Quotations ({quotationCount})
        </Link>
      );

      // Procurement/Admin: Compare Quotations (Manager does not have compare permission)
      const canCompare = user?.role === ROLES.ADMIN || user?.role === ROLES.PROCUREMENT_OFFICER;
      if (quotationCount > 0 && canCompare) {
        btns.push(
          <Link key="compare" to={`/rfqs/${id}/compare`}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <GitCompare className="h-4 w-4" /> Compare Quotations
          </Link>
        );
      }
    }

    if (status === "approval_pending") {
      btns.push(
        <Link key="approvals" to="/approvals"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700">
          <CheckCircle className="h-4 w-4" /> View Approval Status
        </Link>
      );
    }

    if (status === "approved") {
      btns.push(
        <Link key="po" to="/purchase-orders"
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          <ShoppingCart className="h-4 w-4" /> View PO
        </Link>
      );
    }

    return <div className="flex flex-wrap items-center gap-2">{btns}</div>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="font-mono text-lg text-blue-600">{rfq.rfq_number}</span>
            <span>{rfq.title}</span>
            <StatusBadge status={rfq.status} type="rfq" />
          </span>
        }
        actions={renderActions()}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Info + Line Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* RFQ Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">RFQ Details</h3>
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <InfoRow icon={Tag} label="Category">{rfq.category || "—"}</InfoRow>
              <InfoRow icon={Calendar} label="Deadline">
                {rfq.deadline ? format(new Date(rfq.deadline), "dd MMM yyyy") : "—"}
              </InfoRow>
              <InfoRow icon={User} label="Created By">
                {rfq.created_by_name || rfq.created_by || "—"}
              </InfoRow>
              <InfoRow icon={Calendar} label="Created At">
                {rfq.created_at ? format(new Date(rfq.created_at), "dd MMM yyyy, HH:mm") : "—"}
              </InfoRow>
            </div>
            {rfq.description && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{rfq.description}</p>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">#</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Item Name</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Qty</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Unit</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {(rfq.line_items || []).length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-400">No line items</td></tr>
                  ) : (
                    rfq.line_items.map((li, idx) => (
                      <tr key={li.id || idx} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{li.item_name}</td>
                        <td className="px-4 py-3 text-gray-700">{li.quantity}</td>
                        <td className="px-4 py-3 text-gray-500">{li.unit || "—"}</td>
                        <td className="px-4 py-3 text-gray-500">{li.description || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attachments */}
          {(rfq.attachments || []).length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Attachments</h3>
              <ul className="space-y-2">
                {rfq.attachments.map((att) => (
                  <li key={att.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">{att.filename}</span>
                    </div>
                    {att.url && (
                      <a href={att.url} target="_blank" rel="noopener noreferrer"
                        className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Vendor Assignments */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Assigned Vendors
              <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 px-1.5 text-xs font-semibold text-blue-700">
                {rfq.vendors?.length || rfq.vendor_ids?.length || 0}
              </span>
            </h3>
            {(rfq.vendors || []).length === 0 ? (
              <p className="text-sm text-gray-400">No vendors assigned</p>
            ) : (
              <ul className="space-y-2">
                {rfq.vendors.map((v) => (
                  <li key={v.id || v.vendor_id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{v.company_name || v.vendor_name || `Vendor #${v.vendor_id}`}</p>
                      <p className="text-xs text-gray-500">{v.category || ""}</p>
                    </div>
                    <StatusBadge
                      status={v.quotation_status || (v.has_submitted ? "submitted" : "pending")}
                      type="quotation"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Recent Activity</h3>
            {(rfq.activity_logs || rfq.activities || []).length === 0 ? (
              <p className="text-sm text-gray-400">No activity yet</p>
            ) : (
              <div className="space-y-4">
                {(rfq.activity_logs || rfq.activities || []).slice(0, 5).map((log, idx) => (
                  <div key={log.id || idx} className="relative flex gap-3 pl-4">
                    <div className="absolute left-0 top-2 h-2 w-2 rounded-full bg-blue-400" />
                    {idx < 4 && <div className="absolute left-[3px] top-4 bottom-0 w-0.5 bg-gray-100" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-700">{log.description || log.message}</p>
                      <p className="text-xs text-gray-400">
                        {log.created_at
                          ? format(new Date(log.created_at), "dd MMM yyyy, HH:mm")
                          : ""}
                        {log.user_name && ` · ${log.user_name}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        title="Delete RFQ?"
        message="This will permanently delete this RFQ and all associated data. This action cannot be undone."
        confirmLabel="Delete RFQ"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}