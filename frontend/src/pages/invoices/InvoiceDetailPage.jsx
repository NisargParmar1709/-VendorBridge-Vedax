import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Download,
  FileText,
  Loader2,
  Mail,
  Printer,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";

import ConfirmDialog from "../../components/ui/ConfirmDialog";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { invoicesApi } from "../../api/invoices";
import { useInvoice, useMarkInvoicePaid, useSendInvoiceEmail } from "../../hooks/useInvoices";

function formatCurrency(v) {
  if (v == null) return "₹0.00";
  return `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: invoice, isLoading } = useInvoice(id);
  const sendEmail = useSendInvoiceEmail();
  const markPaid = useMarkInvoicePaid();

  const [paidOpen, setPaidOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleSendEmail = () => {
    sendEmail.mutate(id, {
      onSuccess: () => toast.success(`Invoice emailed to ${invoice.vendor_email || 'vendor'}`),
      onError: (err) => {
        toast((t) => (
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-medium">Email service unavailable.</p>
              <p className="text-xs text-gray-500 mt-0.5">Please try again later.</p>
              <button onClick={() => { toast.dismiss(t.id); handleSendEmail(); }} className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800">
                Retry <RefreshCw className="inline h-3 w-3 ml-1" />
              </button>
            </div>
          </div>
        ), { duration: 6000, style: { minWidth: '300px' } });
      }
    });
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const res = await invoicesApi.getPdf(id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice?.invoice_number || "invoice"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-gray-200 mb-6" />
        <div className="h-[600px] rounded-xl border border-gray-200 bg-white" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-center">
        <div>
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Invoice not found</h3>
          <Link to="/invoices" className="mt-4 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
            <ArrowLeft className="h-4 w-4" /> Back to Invoices
          </Link>
        </div>
      </div>
    );
  }

  const { status } = invoice;
  const isVoided = status === "voided";
  const isPaid = status === "paid";
  
  const amount = invoice.amount || invoice.grand_total || 0;
  const subtotal = amount / (1 + (invoice.gst_percentage || 18) / 100);
  const gstAmount = amount - subtotal;
  const halfGst = gstAmount / 2;

  const renderActions = () => {
    const btns = [];
    
    btns.push(
      <button key="back" type="button" onClick={() => navigate("/invoices")}
        className="no-print inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
    );

    if (!isVoided) {
      if (status === "draft") {
        btns.push(
          <button key="send" type="button" onClick={handleSendEmail} disabled={sendEmail.isPending}
            className="no-print inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {sendEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send Email
          </button>
        );
      } else if (status === "sent" || status === "overdue") {
        btns.push(
          <button key="resend" type="button" onClick={handleSendEmail} disabled={sendEmail.isPending}
            className="no-print inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {sendEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Resend Email
          </button>
        );
      }

      if (!isPaid) {
        btns.push(
          <button key="pay" type="button" onClick={() => setPaidOpen(true)} disabled={markPaid.isPending}
            className="no-print inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
            <CheckCircle className="h-4 w-4" /> Mark as Paid
          </button>
        );
      }

      btns.push(
        <button key="print" type="button" onClick={handlePrint}
          className="no-print inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Printer className="h-4 w-4" /> Print
        </button>,
        <button key="pdf" type="button" onClick={handleDownloadPDF} disabled={downloading}
          className="no-print inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PDF
        </button>
      );
    }

    return <div className="flex flex-wrap items-center gap-2">{btns}</div>;
  };

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          title={
            <span className="flex items-center gap-3">
              <span className="font-mono text-blue-600">{invoice.invoice_number || "Invoice"}</span>
              <StatusBadge status={status} type="invoice" />
            </span>
          }
          actions={renderActions()}
        />
      </div>

      {isVoided && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 no-print">
          <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0" />
          <span className="text-sm font-medium text-red-800">This invoice has been voided and cannot be modified or sent.</span>
        </div>
      )}

      {/* Invoice Document Layout */}
      <div className={`print-only mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm ${isVoided ? 'opacity-70 grayscale' : ''}`}>
        <div className="flex items-start justify-between border-b border-gray-200 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">INVOICE</h1>
            <p className="mt-2 font-mono text-gray-500 text-lg">#{invoice.invoice_number || "INV-XXXX"}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-blue-600 tracking-tight">VendorBridge</h2>
            <p className="mt-1 text-sm text-gray-500">123 Procurement Way</p>
            <p className="text-sm text-gray-500">Business District, 10001</p>
            <p className="text-sm text-gray-500">finance@vendorbridge.com</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8 pb-8 border-b border-gray-200">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Billed To</p>
            <p className="text-base font-bold text-gray-900">{invoice.vendor_name || "Vendor Name"}</p>
            {invoice.vendor_address && <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{invoice.vendor_address}</p>}
          </div>
          <div className="grid grid-cols-2 gap-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Invoice Date</p>
              <p className="text-sm font-medium text-gray-900">{invoice.created_at ? format(new Date(invoice.created_at), "dd MMM yyyy") : "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Due Date</p>
              <p className={`text-sm font-medium ${!isPaid && !isVoided && invoice.due_date && new Date(invoice.due_date) < new Date() ? 'text-red-600' : 'text-gray-900'}`}>
                {invoice.due_date ? format(new Date(invoice.due_date), "dd MMM yyyy") : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">PO Reference</p>
              <p className="text-sm font-mono text-blue-600">{invoice.po_number || "—"}</p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200 text-left">
                <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Item Description</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Qty</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Unit Price</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(invoice.line_items || []).length > 0 ? (
                invoice.line_items.map((li, idx) => {
                  const ltotal = (li.quantity || 0) * (li.unit_price || 0);
                  return (
                    <tr key={li.id || idx}>
                      <td className="py-4 font-medium text-gray-900">{li.item_name}</td>
                      <td className="py-4 text-right text-gray-600">{li.quantity} {li.unit}</td>
                      <td className="py-4 text-right text-gray-700">{formatCurrency(li.unit_price)}</td>
                      <td className="py-4 text-right font-medium">{formatCurrency(ltotal)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="4" className="py-6 text-center text-gray-400">Items detail not available</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex justify-end">
          <div className="w-80 space-y-3">
            <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-sm text-gray-600"><span>CGST ({(invoice.gst_percentage/2) || 9}%)</span><span>{formatCurrency(halfGst)}</span></div>
            <div className="flex justify-between text-sm text-gray-600"><span>SGST ({(invoice.gst_percentage/2) || 9}%)</span><span>{formatCurrency(halfGst)}</span></div>
            <div className="flex justify-between border-t-2 border-gray-900 pt-3 text-xl font-bold text-gray-900">
              <span>Total Due</span><span>{formatCurrency(amount)}</span>
            </div>
            {invoice.currency && invoice.currency !== "INR" && (
              <div className="mt-2 text-right text-xs text-gray-500">
                Amount in {invoice.currency}: {invoice.currency} {Number(invoice.grand_total || amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <br />
                (Exchange rate: 1 {invoice.currency} = ₹{invoice.exchange_rate || 1})
              </div>
            )}
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-200 text-sm text-gray-500">
          <p className="font-semibold text-gray-900 mb-1">Payment Instructions:</p>
          <p>Please make payment within {invoice.payment_terms || 30} days of invoice date.</p>
          <p>Direct Bank Transfer: VendorBridge Bank / A/C 000011112222 / IFSC: VBNK0000123</p>
        </div>
      </div>

      <ConfirmDialog
        open={paidOpen}
        title="Mark Invoice as Paid?"
        message="Are you sure you want to mark this invoice as paid? This action cannot be undone."
        confirmLabel="Mark Paid"
        confirmClass="bg-green-600 hover:bg-green-700 focus:ring-green-500"
        onConfirm={() => { markPaid.mutate(id); setPaidOpen(false); }}
        onCancel={() => setPaidOpen(false)}
      />
    </div>
  );
}