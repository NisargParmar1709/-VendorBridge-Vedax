import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Download,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Tag,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";

import ConfirmDialog from "../../components/ui/ConfirmDialog";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { poApi } from "../../api/purchase_orders";
import { usePurchaseOrder, useUpdatePOStatus } from "../../hooks/usePurchaseOrders";
import { useCreateInvoice } from "../../hooks/useInvoices";

function formatCurrency(v) {
  if (v == null) return "₹0.00";
  return `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: po, isLoading } = usePurchaseOrder(id);
  const updateStatus = useUpdatePOStatus();
  const createInvoice = useCreateInvoice();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleUpdateStatus = (status) => {
    updateStatus.mutate({ id, data: { status } });
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const res = await poApi.getPdf(id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${po?.po_number || "purchase_order"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleCreateInvoice = () => {
    if (!po) return;
    const invoiceData = {
      amount: po.grand_total,
      due_date: new Date(Date.now() + (po.payment_terms || 30) * 24 * 60 * 60 * 1000).toISOString(),
    };
    createInvoice.mutate({ poId: id, data: invoiceData }, {
      onSuccess: (res) => {
        if (res.data?.id) {
          navigate(`/invoices/${res.data.id}`);
        }
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-gray-200 mb-6" />
        <div className="h-40 rounded-xl border border-gray-200 bg-white" />
        <div className="h-64 rounded-xl border border-gray-200 bg-white" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-center">
        <div>
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">PO not found</h3>
          <Link to="/purchase-orders" className="mt-4 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
            <ArrowLeft className="h-4 w-4" /> Back to Purchase Orders
          </Link>
        </div>
      </div>
    );
  }

  const { status } = po;
  const isCancelled = status === "cancelled";
  const hasInvoice = !!po.invoice_id;
  const isInvoiceVoided = po.invoice_status === "voided";

  const renderActions = () => {
    const btns = [];
    
    btns.push(
      <button key="back" type="button" onClick={() => navigate("/purchase-orders")}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
    );

    if (status === "draft") {
      btns.push(
        <button key="send" type="button" onClick={() => handleUpdateStatus("sent")} disabled={updateStatus.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Mail className="h-4 w-4" /> Send to Vendor
        </button>
      );
    } else if (status === "sent") {
      btns.push(
        <button key="ack" type="button" onClick={() => handleUpdateStatus("acknowledged")} disabled={updateStatus.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
          <CheckCircle className="h-4 w-4" /> Acknowledge
        </button>
      );
    } else if (status === "acknowledged") {
      btns.push(
        <button key="complete" type="button" onClick={() => handleUpdateStatus("fulfilled")} disabled={updateStatus.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          <CheckCircle className="h-4 w-4" /> Mark Completed
        </button>
      );
    }

    if (!isCancelled) {
      btns.push(
        <button key="pdf" type="button" onClick={handleDownloadPDF} disabled={downloading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PDF
        </button>,
        <button key="cancel" type="button" onClick={() => setCancelOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-100">
          <XCircle className="h-4 w-4" /> Cancel PO
        </button>
      );
    }

    return <div className="flex flex-wrap items-center gap-2">{btns}</div>;
  };

  const subtotal = po.grand_total / (1 + (po.gst_percentage || 18) / 100);
  const gstAmount = po.grand_total - subtotal;
  const halfGst = gstAmount / 2;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="font-mono text-blue-600">{po.po_number || "PO"}</span>
            <StatusBadge status={status} type="po" />
          </span>
        }
        actions={renderActions()}
      />

      {isCancelled && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">This Purchase Order is cancelled.</p>
            {isInvoiceVoided && <p className="text-sm text-red-700 mt-1">The linked invoice has been voided automatically.</p>}
          </div>
        </div>
      )}

      {isInvoiceVoided && !isCancelled && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
          <p className="text-sm font-medium text-red-800">The linked invoice for this PO has been voided.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Purchase Order Details</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-4 text-sm">
                <div><p className="text-gray-500">Vendor</p><p className="font-medium text-gray-900">{po.vendor_name || "—"}</p></div>
                <div><p className="text-gray-500">RFQ Reference</p>
                  {po.rfq_id ? <Link to={`/rfqs/${po.rfq_id}`} className="text-blue-600 hover:underline">{po.rfq_title || `RFQ #${po.rfq_id}`}</Link> : "—"}
                </div>
                <div><p className="text-gray-500">Payment Terms</p><p className="text-gray-900">{po.payment_terms ? `Net ${po.payment_terms} days` : "—"}</p></div>
              </div>
              <div className="space-y-4 text-sm">
                <div><p className="text-gray-500">PO Date</p><p className="text-gray-900">{po.created_at ? format(new Date(po.created_at), "dd MMM yyyy") : "—"}</p></div>
                <div><p className="text-gray-500">Delivery By</p><p className="text-gray-900">{po.delivery_days ? `${po.delivery_days} days from PO` : "—"}</p></div>
              </div>
            </div>

            <div className="mt-6 border-t border-gray-100 pt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-gray-500 flex items-center gap-2"><MapPin className="h-4 w-4" /> Billing Address</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">VendorBridge Headquarters\n123 Procurement Way\nBusiness District, 10001</p>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-gray-500 flex items-center gap-2"><MapPin className="h-4 w-4" /> Shipping Address</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">VendorBridge Central Warehouse\n456 Logistics Blvd\nIndustrial Area, 10002</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Item</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Qty</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Unit Price</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(po.line_items || []).map((li, idx) => {
                    const ltotal = (li.quantity || 0) * (li.unit_price || 0);
                    return (
                      <tr key={li.id || idx} className="border-b border-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{li.item_name}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{li.quantity} {li.unit}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(li.unit_price)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(ltotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between text-sm text-gray-600"><span>CGST ({(po.gst_percentage/2) || 9}%)</span><span>{formatCurrency(halfGst)}</span></div>
                <div className="flex justify-between text-sm text-gray-600"><span>SGST ({(po.gst_percentage/2) || 9}%)</span><span>{formatCurrency(halfGst)}</span></div>
                <div className="flex justify-between border-t border-gray-300 pt-2 text-base font-bold text-gray-900">
                  <span>Grand Total</span><span>{formatCurrency(po.grand_total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Invoice Status</h3>
            {hasInvoice ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Invoice ID</span>
                  <Link to={`/invoices/${po.invoice_id}`} className="text-sm font-medium text-blue-600 hover:underline">
                    {po.invoice_number || `INV-${po.invoice_id}`}
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <StatusBadge status={po.invoice_status} type="invoice" />
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">No invoice has been created for this purchase order yet.</p>
                {!isCancelled && (
                  <button type="button" onClick={handleCreateInvoice} disabled={createInvoice.isPending}
                    className="w-full inline-flex justify-center items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {createInvoice.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Create Invoice
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel Purchase Order?"
        message="This will permanently cancel this PO. If an invoice is linked, it will be voided automatically."
        confirmLabel="Cancel PO"
        confirmClass="bg-red-600 hover:bg-red-700 focus:ring-red-500"
        onConfirm={() => { handleUpdateStatus("cancelled"); setCancelOpen(false); }}
        onCancel={() => setCancelOpen(false)}
      />
    </div>
  );
}