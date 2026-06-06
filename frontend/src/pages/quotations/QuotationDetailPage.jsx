import { format } from "date-fns";
import {
  ArrowLeft,
  Calculator,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  Send,
  Tag,
  Truck,
  User,
  Check,
  CheckCircle,
  X,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";

import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { ROLES } from "../../constants/roles";
import { useQuotation, useSubmitQuotation } from "../../hooks/useQuotations";
import { useProcessL1, useProcessL2 } from "../../hooks/useApprovals";
import useAuthStore from "../../store/authStore";

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

function formatCurrency(v) {
  if (v == null || isNaN(v)) return "₹0.00";
  return `₹${Number(v).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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

export default function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isVendor = user?.role === ROLES.VENDOR;
  const isManager = user?.role === ROLES.MANAGER || user?.role === ROLES.ADMIN;

  const { data: quotation, isLoading } = useQuotation(id);
  const submitQuotation = useSubmitQuotation();
  const processL1 = useProcessL1();
  const processL2 = useProcessL2();

  const [remarks, setRemarks] = useState("");
  const [remarksError, setRemarksError] = useState("");

  const handleSubmit = () => {
    submitQuotation.mutate(id, {
      onSuccess: () => navigate(`/quotations/${id}`),
    });
  };

  const approval = quotation?.approval;
  const showL1 = approval && approval.l1_status === "pending" && isManager;
  const showL2 = approval && approval.l1_status === "approved" && approval.l2_status === "pending" && isManager;
  const isBusy = processL1.isPending || processL2.isPending;

  const handleL1 = (action) => {
    if (action === "reject" && remarks.trim().length < 10) {
      setRemarksError("Remarks must be at least 10 characters");
      return;
    }
    setRemarksError("");
    processL1.mutate(
      { id: approval.id, data: { action, remarks: remarks.trim() } },
      { onSuccess: () => { setRemarks(""); navigate(0); } }
    );
  };

  const handleL2 = (action) => {
    if (action === "reject" && remarks.trim().length < 10) {
      setRemarksError("Remarks must be at least 10 characters");
      return;
    }
    setRemarksError("");
    processL2.mutate(
      { id: approval.id, data: { action, remarks: remarks.trim() } },
      {
        onSuccess: (res) => {
          setRemarks("");
          if (action === "approve" && res.data?.po?.id) {
            toast.success("PO generated!");
            navigate(`/purchase-orders/${res.data.po.id}`);
          } else if (action === "approve") {
            toast.success("PO generated!");
            navigate("/purchase-orders");
          } else {
            navigate(0);
          }
        },
      }
    );
  };

  if (isLoading) return <SkeletonDetail />;

  if (!quotation) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Quotation not found</h3>
          <Link
            to="/quotations"
            className="mt-4 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Quotations
          </Link>
        </div>
      </div>
    );
  }

  const canSubmit = isVendor && quotation.status === "draft";

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span>Quotation</span>
            <StatusBadge status={quotation.status} type="quotation" />
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            {canSubmit && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitQuotation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {submitQuotation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit Quotation
              </button>
            )}
            <Link
              to={`/rfqs/${quotation.rfq_id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FileText className="h-4 w-4" /> View RFQ
            </Link>
          </div>
        }
      />

      {/* Stepper */}
      {approval && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <Stepper approval={approval} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Line Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notes */}
          {quotation.notes && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-3 text-lg font-semibold text-gray-900">Notes</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {quotation.notes}
              </p>
            </div>
          )}

          {/* Line Items Table */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Line Items
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      #
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Item Name
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Unit
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Unit Price
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(quotation.line_items || []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-sm text-gray-400"
                      >
                        No line items
                      </td>
                    </tr>
                  ) : (
                    quotation.line_items.map((li, idx) => (
                      <tr
                        key={li.id || idx}
                        className="border-b border-gray-50 hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {li.item_name}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {li.quantity}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {li.unit || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {formatCurrency(li.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {formatCurrency(li.total_price)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex justify-end">
                <div className="w-72 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium">
                      {formatCurrency(quotation.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>GST ({quotation.gst_percentage}%)</span>
                    <span className="font-medium">
                      {formatCurrency(quotation.tax_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-300 pt-2 text-base font-bold text-gray-900">
                    <span className="flex items-center gap-1.5">
                      <Calculator className="h-4 w-4" /> Grand Total
                    </span>
                    <span>{formatCurrency(quotation.grand_total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {quotation.warnings?.length > 0 && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                Warnings
              </h4>
              <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                {quotation.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
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
          {approval?.l2_status === "approved" && (
            <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4 shadow-sm">
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

          {/* Show result if rejected */}
          {approval && (approval.l1_status === "rejected" || approval.l2_status === "rejected") && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 shadow-sm">
              <X className="h-6 w-6 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Rejected</p>
                {approval.l1_remarks && <p className="text-sm text-red-700 mt-1">L1 Remarks: {approval.l1_remarks}</p>}
                {approval.l2_remarks && <p className="text-sm text-red-700 mt-1">L2 Remarks: {approval.l2_remarks}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Quotation Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Quotation Info
            </h3>
            <div className="space-y-0.5">
              <InfoRow icon={Tag} label="Status">
                <StatusBadge status={quotation.status} type="quotation" />
              </InfoRow>
              <InfoRow icon={User} label="Vendor">
                {quotation.vendor_name || "—"}
              </InfoRow>
              <InfoRow icon={CreditCard} label="Currency">
                {quotation.currency}
              </InfoRow>
              <InfoRow icon={Truck} label="Delivery">
                {quotation.delivery_days
                  ? `${quotation.delivery_days} days`
                  : "—"}
              </InfoRow>
              <InfoRow icon={Clock} label="Payment Terms">
                {quotation.payment_terms
                  ? `${quotation.payment_terms} days`
                  : "—"}
              </InfoRow>
              <InfoRow icon={Calendar} label="Created">
                {quotation.created_at
                  ? format(
                      new Date(quotation.created_at),
                      "dd MMM yyyy, HH:mm"
                    )
                  : "—"}
              </InfoRow>
              {quotation.submitted_at && (
                <InfoRow icon={Send} label="Submitted">
                  {format(
                    new Date(quotation.submitted_at),
                    "dd MMM yyyy, HH:mm"
                  )}
                </InfoRow>
              )}
            </div>
          </div>

          {/* Grand Total Card */}
          <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold mb-1">
              Grand Total
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(quotation.grand_total)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Including {quotation.gst_percentage}% GST
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}