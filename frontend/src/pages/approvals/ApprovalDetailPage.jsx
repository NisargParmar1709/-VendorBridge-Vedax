import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle,
  DollarSign,
  FileText,
  Loader2,
  ShoppingCart,
  Tag,
  Truck,
  X,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";

import PageHeader from "../../components/ui/PageHeader";
import { ROLES } from "../../constants/roles";
import { useApproval, useProcessL1, useProcessL2 } from "../../hooks/useApprovals";
import useAuthStore from "../../store/authStore";

function formatCurrency(v) {
  if (v == null) return "₹0";
  return `₹${Number(v).toLocaleString("en-IN")}`;
}

// Stepper steps
const STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "l1_review", label: "L1 Review" },
  { key: "l2_review", label: "L2 Review" },
  { key: "po_generated", label: "PO Generated" },
];

function getActiveStep(approval) {
  if (!approval) return 0;
  const l1 = approval.l1_status;
  const l2 = approval.l2_status;
  if (l1 === "rejected" || l2 === "rejected") return -1; // rejected
  if (l2 === "approved") return 4;
  if (l1 === "approved" && l2 === "pending") return 2;
  if (l1 === "pending") return 1;
  return 1;
}

function getStepState(stepIdx, activeStep, approval) {
  const l1 = approval?.l1_status;
  const l2 = approval?.l2_status;

  if (stepIdx === 0) return "complete";
  if (stepIdx === 1) {
    if (l1 === "approved") return "complete";
    if (l1 === "rejected") return "rejected";
    if (l1 === "pending") return "active";
    return "pending";
  }
  if (stepIdx === 2) {
    if (l2 === "approved") return "complete";
    if (l2 === "rejected") return "rejected";
    if (l1 === "approved" && l2 === "pending") return "active";
    return "pending";
  }
  if (stepIdx === 3) {
    if (l2 === "approved") return "complete";
    return "pending";
  }
  return "pending";
}

function Stepper({ approval }) {
  const activeStep = getActiveStep(approval);

  return (
    <div className="flex items-center justify-between">
      {STEPS.map((step, idx) => {
        const state = getStepState(idx, activeStep, approval);
        const isLast = idx === STEPS.length - 1;

        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                state === "complete" ? "border-green-500 bg-green-500 text-white" :
                state === "active" ? "border-blue-500 bg-blue-50 text-blue-600" :
                state === "rejected" ? "border-red-500 bg-red-500 text-white" :
                "border-gray-300 bg-white text-gray-400"
              }`}>
                {state === "complete" ? <Check className="h-5 w-5" /> :
                 state === "rejected" ? <X className="h-5 w-5" /> :
                 <span className="text-sm font-semibold">{idx + 1}</span>}
              </div>
              <p className={`mt-2 text-xs font-medium ${
                state === "complete" ? "text-green-700" :
                state === "active" ? "text-blue-700" :
                state === "rejected" ? "text-red-700" :
                "text-gray-400"
              }`}>
                {step.label}
              </p>
            </div>
            {!isLast && (
              <div className={`mx-2 h-0.5 flex-1 ${
                state === "complete" ? "bg-green-400" :
                state === "rejected" ? "bg-red-300" :
                "bg-gray-200"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, colorClass = "bg-blue-100 text-blue-600" }) {
  const [bg, text] = colorClass.split(" ");
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
        <Icon className={`h-5 w-5 ${text}`} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function ApprovalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isManager = user?.role === ROLES.MANAGER || user?.role === ROLES.ADMIN;

  const { data: approval, isLoading } = useApproval(id);
  const processL1 = useProcessL1();
  const processL2 = useProcessL2();

  const [remarks, setRemarks] = useState("");
  const [remarksError, setRemarksError] = useState("");

  const handleL1 = (action) => {
    if (action === "reject" && remarks.trim().length < 10) {
      setRemarksError("Remarks must be at least 10 characters");
      return;
    }
    setRemarksError("");
    processL1.mutate(
      { id, data: { action, remarks: remarks.trim() } },
      { onSuccess: () => setRemarks("") }
    );
  };

  const handleL2 = (action) => {
    if (action === "reject" && remarks.trim().length < 10) {
      setRemarksError("Remarks must be at least 10 characters");
      return;
    }
    setRemarksError("");
    processL2.mutate(
      { id, data: { action, remarks: remarks.trim() } },
      {
        onSuccess: (res) => {
          setRemarks("");
          if (action === "approve" && res.data?.po?.id) {
            toast.success("PO generated!");
            navigate(`/purchase-orders/${res.data.po.id}`);
          } else if (action === "approve") {
            toast.success("PO generated!");
            navigate("/purchase-orders");
          }
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-gray-200 mb-6" />
        <div className="h-20 rounded-xl border border-gray-200 bg-white" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl border border-gray-200 bg-white" />
          ))}
        </div>
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Approval not found</h3>
          <Link to="/approvals" className="mt-4 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
            <ArrowLeft className="h-4 w-4" /> Back to Approvals
          </Link>
        </div>
      </div>
    );
  }

  const showL1 = approval.l1_status === "pending" && isManager;
  const showL2 = approval.l1_status === "approved" && approval.l2_status === "pending" && isManager;
  const isBusy = processL1.isPending || processL2.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Detail"
        actions={
          <button type="button" onClick={() => navigate("/approvals")}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        }
      />

      {user?.id === approval?.rfq_creator_id && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm font-medium text-yellow-800 shadow-sm">
          ⚠️ The approver may also be the requester. Consider reviewing conflict of interest policy.
        </div>
      )}

      {/* Stepper */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <Stepper approval={approval} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard icon={FileText} label="RFQ" value={approval.rfq_title || approval.rfq_number || "—"} colorClass="bg-blue-100 text-blue-600" />
        <InfoCard icon={Tag} label="Vendor" value={approval.vendor_name || "—"} colorClass="bg-green-100 text-green-600" />
        <InfoCard icon={DollarSign} label="Grand Total" value={formatCurrency(approval.grand_total)} colorClass="bg-purple-100 text-purple-600" />
        <InfoCard icon={Truck} label="Delivery" value={`${approval.delivery_days || "—"} days`} colorClass="bg-orange-100 text-orange-600" />
      </div>

      {/* More details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* RFQ Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">RFQ Details</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">RFQ Number</dt><dd className="font-mono text-blue-600">{approval.rfq_number || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Category</dt><dd className="text-gray-900">{approval.category || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Deadline</dt><dd>{approval.deadline ? format(new Date(approval.deadline), "dd MMM yyyy") : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Created</dt><dd>{approval.created_at ? format(new Date(approval.created_at), "dd MMM yyyy") : "—"}</dd></div>
          </dl>
        </div>

        {/* Quotation details */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Selected Quotation</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Vendor</dt><dd className="font-medium text-gray-900">{approval.vendor_name || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Grand Total</dt><dd className="font-bold text-gray-900">{formatCurrency(approval.grand_total)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">GST</dt><dd>{approval.gst_percentage ?? "—"}%</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Delivery</dt><dd>{approval.delivery_days || "—"} days</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Payment Terms</dt><dd>{approval.payment_terms || "—"} days</dd></div>
          </dl>
        </div>
      </div>

      {/* Line items */}
      {(approval.line_items || []).length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Item</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Qty</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Unit Price</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {approval.line_items.map((li, idx) => (
                  <tr key={li.id || idx} className="border-b border-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{li.item_name}</td>
                    <td className="px-4 py-3 text-gray-600">{li.quantity} {li.unit}</td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(li.unit_price)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency((li.quantity || 0) * (li.unit_price || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* L1 Action panel */}
      {showL1 && (
        <div className="rounded-xl border-2 border-blue-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">L1 Approval Action</h3>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Remarks {<span className="text-gray-400">(required for rejection)</span>}</label>
            <textarea value={remarks} onChange={(e) => { setRemarks(e.target.value); setRemarksError(""); }}
              rows={3} placeholder="Enter remarks..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            {remarksError && <p className="mt-1 text-xs text-red-500">{remarksError}</p>}
          </div>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => handleL1("reject")} disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {processL1.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Reject
            </button>
            <button type="button" onClick={() => handleL1("approve")} disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
              {processL1.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Approve
            </button>
          </div>
        </div>
      )}

      {/* L2 Action panel */}
      {showL2 && (
        <div className="rounded-xl border-2 border-indigo-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">L2 Approval Action</h3>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Remarks {<span className="text-gray-400">(required for rejection)</span>}</label>
            <textarea value={remarks} onChange={(e) => { setRemarks(e.target.value); setRemarksError(""); }}
              rows={3} placeholder="Enter remarks..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            {remarksError && <p className="mt-1 text-xs text-red-500">{remarksError}</p>}
          </div>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => handleL2("reject")} disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {processL2.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Reject
            </button>
            <button type="button" onClick={() => handleL2("approve")} disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
              {processL2.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Approve
            </button>
          </div>
        </div>
      )}

      {/* Show result if fully approved */}
      {approval.l2_status === "approved" && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Fully Approved — Purchase Order Generated</p>
            {approval.po_id && (
              <Link to={`/purchase-orders/${approval.po_id}`} className="text-sm text-green-700 underline hover:text-green-800">
                View Purchase Order →
              </Link>
            )}
          </div>
        </div>
      )}
      {(approval.l1_status === "rejected" || approval.l2_status === "rejected") && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <X className="h-6 w-6 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Rejected</p>
            {approval.remarks && <p className="text-sm text-red-700 mt-1">Remarks: {approval.remarks}</p>}
          </div>
        </div>
      )}
    </div>
  );
}