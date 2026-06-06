import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Info,
  Star,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ConfirmDialog from "../../components/ui/ConfirmDialog";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { ROLES } from "../../constants/roles";
import { useRFQ } from "../../hooks/useRFQs";
import { useCompareQuotations, useSelectQuotation } from "../../hooks/useQuotations";
import useAuthStore from "../../store/authStore";

function formatCurrency(v) {
  if (v == null) return "₹0";
  return `₹${Number(v).toLocaleString("en-IN")}`;
}

function StarDisplay({ rating }) {
  const full = Math.floor(rating || 0);
  const hasHalf = (rating || 0) - full >= 0.3;
  const empty = 5 - full - (hasHalf ? 1 : 0);
  return (
    <span className="inline-flex items-center gap-0.5 text-yellow-400">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} className="h-4 w-4 fill-current" />
      ))}
      {hasHalf && <Star className="h-4 w-4 fill-current opacity-50" />}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} className="h-4 w-4 text-gray-300" />
      ))}
      <span className="ml-1 text-sm font-medium text-gray-700">{(rating || 0).toFixed(1)}</span>
    </span>
  );
}

export default function CompareQuotationsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canSelect = user?.role === ROLES.ADMIN || user?.role === ROLES.PROCUREMENT_OFFICER;

  const { data: rfq } = useRFQ(id);
  const { data: comparison, isLoading } = useCompareQuotations(id);
  const selectQuotation = useSelectQuotation();

  const [confirmDialog, setConfirmDialog] = useState({ open: false, vendor: null, quotationId: null });

  const quotations = comparison?.quotations || comparison?.vendors || [];

  // Compute highlights
  const highlights = useMemo(() => {
    if (!quotations.length) return {};
    const totals = quotations.map((q) => q.grand_total ?? q.total_amount ?? Infinity);
    const deliveries = quotations.map((q) => q.delivery_days ?? Infinity);
    const ratings = quotations.map((q) => q.rating ?? q.vendor_rating ?? 0);
    const scores = quotations.map((q) => q.score ?? q.total_score ?? 0);

    return {
      lowestTotal: Math.min(...totals),
      fastestDelivery: Math.min(...deliveries),
      highestRating: Math.max(...ratings),
      highestScore: Math.max(...scores),
      allTied: scores.length > 1 && scores.every((s) => s === scores[0]),
    };
  }, [quotations]);

  const handleSelect = (q) => {
    setConfirmDialog({
      open: true,
      vendor: q.vendor_name || q.company_name || "this vendor",
      quotationId: q.quotation_id || q.id,
    });
  };

  const confirmSelect = () => {
    selectQuotation.mutate(
      { rfqId: id, data: { quotation_id: confirmDialog.quotationId } },
      { onSuccess: () => { setConfirmDialog({ open: false }); navigate("/approvals"); } }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 rounded bg-gray-200 mb-6" />
        <div className="h-96 rounded-xl border border-gray-200 bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            Compare Quotations
            {rfq && (
              <span className="text-base font-normal text-gray-500">
                for <span className="font-mono text-blue-600">{rfq.rfq_number}</span>
              </span>
            )}
          </span>
        }
        subtitle={rfq?.deadline && (
          <span className="flex items-center gap-1.5 text-sm">
            <Calendar className="h-4 w-4" />
            Deadline: {format(new Date(rfq.deadline), "dd MMM yyyy")}
          </span>
        )}
        actions={
          <button type="button" onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        }
      />

      {/* Info banners */}
      {quotations.length === 1 && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <p className="text-sm font-medium text-blue-800">Only one quotation available for comparison.</p>
        </div>
      )}
      {highlights.allTied && quotations.length > 1 && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm font-medium text-yellow-800">Scores are identical — please select manually.</p>
        </div>
      )}
      {quotations.length < 2 && quotations.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <p className="text-sm font-medium text-blue-800">
            Only {quotations.length} quotation(s) received. Comparison may not be meaningful. You can still select a vendor.
          </p>
        </div>
      )}
      
      {quotations.some((q) => q.vendor_status === "blocked") && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm font-medium text-red-800">One or more vendors in this comparison are currently blocked. Selection is allowed but not recommended.</p>
        </div>
      )}

      {quotations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
          <AlertCircle className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No quotations to compare</h3>
          <p className="text-sm text-gray-500 mt-1">Vendors haven't submitted quotations yet.</p>
        </div>
      ) : (
        <>
          {/* Comparison table */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="sticky left-0 bg-gray-50 px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 min-w-[160px]">
                    Criteria
                  </th>
                  {quotations.map((q) => (
                    <th key={q.quotation_id || q.id} className="px-6 py-4 text-center min-w-[180px]">
                      <p className="font-semibold text-gray-900">{q.vendor_name || q.company_name}</p>
                      {q.vendor_status === "blocked" && (
                        <span className="mt-1 inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          Blocked
                        </span>
                      )}
                      {(q.is_new_vendor || (q.rating ?? q.vendor_rating ?? 5) <= 2.5) && (
                        <span className="mt-1 block text-xs text-orange-600" title="New vendor — rated 2.5 by default">
                          * New vendor
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Grand Total */}
                <tr className="border-b border-gray-100">
                  <td className="sticky left-0 bg-white px-6 py-3 font-medium text-gray-700">Grand Total</td>
                  {quotations.map((q) => {
                    const val = q.grand_total ?? q.total_amount ?? 0;
                    const isLowest = val === highlights.lowestTotal && val > 0;
                    return (
                      <td key={q.quotation_id || q.id}
                        className={`px-6 py-3 text-center ${isLowest ? "bg-green-50 font-bold text-green-700" : "text-gray-700"}`}>
                        {formatCurrency(val)} {isLowest && <span className="ml-1">🟢</span>}
                      </td>
                    );
                  })}
                </tr>
                {/* GST */}
                <tr className="border-b border-gray-100">
                  <td className="sticky left-0 bg-white px-6 py-3 font-medium text-gray-700">GST %</td>
                  {quotations.map((q) => (
                    <td key={q.quotation_id || q.id} className="px-6 py-3 text-center text-gray-700">
                      {q.gst_percentage ?? q.gst ?? 0}%
                    </td>
                  ))}
                </tr>
                {/* Delivery */}
                <tr className="border-b border-gray-100">
                  <td className="sticky left-0 bg-white px-6 py-3 font-medium text-gray-700">Delivery</td>
                  {quotations.map((q) => {
                    const val = q.delivery_days ?? 0;
                    const isFastest = val === highlights.fastestDelivery && val > 0;
                    return (
                      <td key={q.quotation_id || q.id}
                        className={`px-6 py-3 text-center ${isFastest ? "bg-teal-50 font-bold text-teal-700" : "text-gray-700"}`}>
                        {val} days {isFastest && <span className="ml-1">⚡</span>}
                      </td>
                    );
                  })}
                </tr>
                {/* Payment Terms */}
                <tr className="border-b border-gray-100">
                  <td className="sticky left-0 bg-white px-6 py-3 font-medium text-gray-700">Payment Terms</td>
                  {quotations.map((q) => (
                    <td key={q.quotation_id || q.id} className="px-6 py-3 text-center text-gray-700">
                      {q.payment_terms ?? 0} days
                    </td>
                  ))}
                </tr>
                {/* Rating */}
                <tr className="border-b border-gray-100">
                  <td className="sticky left-0 bg-white px-6 py-3 font-medium text-gray-700">Rating</td>
                  {quotations.map((q) => {
                    const val = q.rating ?? q.vendor_rating ?? 0;
                    const isHighest = val === highlights.highestRating && val > 0;
                    return (
                      <td key={q.quotation_id || q.id}
                        className={`px-6 py-3 text-center ${isHighest ? "bg-blue-50" : ""}`}>
                        <div className="inline-flex justify-center"><StarDisplay rating={val} /></div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Score panel */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-lg font-semibold text-gray-900">Overall Scores</h3>
            <div className="space-y-4">
              {quotations
                .slice()
                .sort((a, b) => (b.score ?? b.total_score ?? 0) - (a.score ?? a.total_score ?? 0))
                .map((q, idx) => {
                  const score = q.score ?? q.total_score ?? 0;
                  const maxScore = highlights.highestScore || 100;
                  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
                  const isFirst = idx === 0 && score > 0;

                  return (
                    <div key={q.quotation_id || q.id} className="flex items-center gap-4">
                      <div className="w-40 flex-shrink-0">
                        <p className="text-sm font-medium text-gray-900">{q.vendor_name || q.company_name}</p>
                      </div>
                      <div className="flex-1">
                        <div className="h-6 w-full rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isFirst ? "bg-blue-600" : "bg-gray-300"}`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-16 text-right">
                        <span className="text-sm font-bold text-gray-900">{score.toFixed(1)}</span>
                      </div>
                      <div className="w-32">
                        {isFirst && !highlights.allTied && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-yellow-300 bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                            <Trophy className="h-3.5 w-3.5" /> Overall Best
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Select button */}
          {canSelect && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Select Vendor</h3>
              <div className="flex flex-wrap gap-3">
                {quotations
                  .slice()
                  .sort((a, b) => (b.score ?? b.total_score ?? 0) - (a.score ?? a.total_score ?? 0))
                  .map((q, idx) => (
                    <button
                      key={q.quotation_id || q.id}
                      type="button"
                      onClick={() => handleSelect(q)}
                      disabled={selectQuotation.isPending}
                      className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition disabled:opacity-50 ${
                        idx === 0
                          ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Select {q.vendor_name || q.company_name}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        title="Confirm Vendor Selection"
        message={`Are you sure you want to select ${confirmDialog.vendor}? This will proceed to the approval workflow.`}
        confirmLabel="Select & Proceed"
        confirmClass="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
        onConfirm={confirmSelect}
        onCancel={() => setConfirmDialog({ open: false })}
      />
    </div>
  );
}