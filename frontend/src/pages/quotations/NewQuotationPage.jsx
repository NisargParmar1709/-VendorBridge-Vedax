import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  FileText,
  Loader2,
  Save,
  Send,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useRFQ } from "../../hooks/useRFQs";
import {
  useCreateQuotation,
  useSubmitQuotation,
} from "../../hooks/useQuotations";

const quotationSchema = z.object({
  gst_percentage: z.coerce.number().min(0).max(100),
  delivery_days: z.coerce.number().min(1, "Min 1 day").optional(),
  payment_terms: z.coerce.number().min(0).optional(),
  notes: z.string().optional().or(z.literal("")),
  line_items: z.array(
    z.object({
      rfq_line_item_id: z.string(),
      item_name: z.string(),
      quantity: z.coerce.number(),
      unit: z.string().optional().or(z.literal("")),
      unit_price: z.coerce.number().positive("Unit price must be greater than 0"),
    })
  ),
});

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-500";

function formatCurrency(v) {
  if (v == null || isNaN(v)) return "₹0.00";
  return `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isDatePast(d) {
  if (!d) return false;
  return new Date(d) < new Date();
}

export default function NewQuotationPage() {
  const { rfq_id } = useParams();
  const navigate = useNavigate();
  const { data: rfq, isLoading: rfqLoading } = useRFQ(rfq_id);
  const createQuotation = useCreateQuotation();
  const submitQuotation = useSubmitQuotation();

  const deadlinePassed = rfq?.deadline && isDatePast(rfq.deadline);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      gst_percentage: 18,
      delivery_days: 7,
      payment_terms: 30,
      notes: "",
      line_items: [],
    },
  });

  const { fields } = useFieldArray({ control, name: "line_items" });

  // Pre-populate line items from RFQ
  useEffect(() => {
    if (rfq?.line_items?.length) {
      reset({
        gst_percentage: 18,
        delivery_days: 7,
        payment_terms: 30,
        notes: "",
        line_items: rfq.line_items.map((li) => ({
          rfq_line_item_id: String(li.id),
          item_name: li.item_name,
          quantity: li.quantity,
          unit: li.unit || "",
          unit_price: 0,
        })),
      });
    }
  }, [rfq, reset]);

  // Watch line items + gst for live totals
  const watchedItems = useWatch({ control, name: "line_items" });
  const watchedGst = useWatch({ control, name: "gst_percentage" });

  const { subtotal, gstAmount, grandTotal } = useMemo(() => {
    const sub = (watchedItems || []).reduce(
      (sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0),
      0
    );
    const gst = sub * ((Number(watchedGst) || 0) / 100);
    return { subtotal: sub, gstAmount: gst, grandTotal: sub + gst };
  }, [watchedItems, watchedGst]);

  const onSubmit = (data, shouldSubmit = false) => {
    createQuotation.mutate(
      { rfqId: rfq_id, data: { ...data, currency: "INR" } },
      {
        onSuccess: (res) => {
          const qId = res.data?.id;
          if (shouldSubmit && qId) {
            submitQuotation.mutate(qId, {
              onSuccess: () => navigate(`/rfqs/${rfq_id}`),
            });
          } else {
            navigate(`/rfqs/${rfq_id}`);
          }
        },
      }
    );
  };

  if (rfqLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 rounded bg-gray-200 mb-6" />
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-gray-100 mb-4" />
          ))}
        </div>
      </div>
    );
  }

  const isBusy = isSubmitting || createQuotation.isPending || submitQuotation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Submit Quotation"
        subtitle={rfq ? `For: ${rfq.title}` : ""}
        actions={
          <button type="button" onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        }
      />

      {/* RFQ summary */}
      {rfq && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">{rfq.title}</h3>
                <StatusBadge status={rfq.status} type="rfq" />
              </div>
              <p className="text-sm text-gray-500">{rfq.category} · Deadline: {rfq.deadline ? format(new Date(rfq.deadline), "dd MMM yyyy") : "N/A"}</p>
            </div>
          </div>
          {rfq.description && (
            <p className="mt-3 text-sm text-gray-600 border-t border-gray-100 pt-3">{rfq.description}</p>
          )}
        </div>
      )}

      {/* Deadline warning */}
      {deadlinePassed && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm font-medium text-yellow-800">
            The deadline for this RFQ has passed. Your quotation may not be accepted.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit((d) => onSubmit(d, false))} className="space-y-6">
        {/* Quotation details */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-lg font-semibold text-gray-900">Quotation Details</h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">GST % *</label>
              <input {...register("gst_percentage")} type="number" min="0" max="100" step="0.01" className={inputClass} />
              {errors.gst_percentage && <p className="mt-1 text-xs text-red-500">{errors.gst_percentage.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Delivery Days</label>
              <input {...register("delivery_days")} type="number" min="1" className={inputClass} />
              {errors.delivery_days && <p className="mt-1 text-xs text-red-500">{errors.delivery_days.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Payment Terms (days)</label>
              <input {...register("payment_terms")} type="number" min="0" className={inputClass} />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Currency</label>
              <input value="INR" disabled className={inputClass} />
            </div>
          </div>
          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
            <textarea {...register("notes")} rows={3} className={inputClass} placeholder="Additional remarks..." />
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Line Items Pricing</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Item Name</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-20">Qty</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-20">Unit</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-36">Unit Price (₹) *</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-32 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, idx) => {
                  const qty = Number(watchedItems?.[idx]?.quantity) || 0;
                  const price = Number(watchedItems?.[idx]?.unit_price) || 0;
                  return (
                    <tr key={field.id} className="border-b border-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {field.item_name}
                        <input type="hidden" {...register(`line_items.${idx}.rfq_line_item_id`)} />
                        <input type="hidden" {...register(`line_items.${idx}.item_name`)} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {field.quantity}
                        <input type="hidden" {...register(`line_items.${idx}.quantity`)} />
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {field.unit || "—"}
                        <input type="hidden" {...register(`line_items.${idx}.unit`)} />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          {...register(`line_items.${idx}.unit_price`, { valueAsNumber: true })}
                          type="number" step="0.01" min="0.01"
                          className={`${inputClass} ${errors.line_items?.[idx]?.unit_price ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
                          placeholder="0.00"
                        />
                        {errors.line_items?.[idx]?.unit_price && (
                          <p className="mt-0.5 text-xs text-red-500">{errors.line_items[idx].unit_price.message}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(qty * price)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>GST ({watchedGst || 0}%)</span>
                  <span className="font-medium">{formatCurrency(gstAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-2 text-base font-bold text-gray-900">
                  <span className="flex items-center gap-1.5"><Calculator className="h-4 w-4" /> Grand Total</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <button type="button" onClick={() => navigate(-1)}
            className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {createQuotation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Draft
          </button>
          <button type="button" disabled={isBusy}
            onClick={handleSubmit((d) => onSubmit(d, true))}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
            {submitQuotation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Save & Submit
          </button>
        </div>
      </form>
    </div>
  );
}