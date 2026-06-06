import { createColumnHelper } from "@tanstack/react-table";
import { format, subMonths } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";

import DataTable from "../../components/ui/DataTable";
import KPICard from "../../components/ui/KPICard";
import PageHeader from "../../components/ui/PageHeader";
import { reportsApi } from "../../api/reports";
import { useProcurementSummary, useSpendingTrends, useVendorPerformance } from "../../hooks/useReports";

function formatCurrency(v) {
  if (v == null) return "₹0";
  return `₹${Number(v).toLocaleString("en-IN")}`;
}

const columnHelper = createColumnHelper();

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 6), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dateError, setDateError] = useState("");
  const [exporting, setExporting] = useState(null);

  const handleDateChange = (type, val) => {
    let newStart = startDate;
    let newEnd = endDate;
    if (type === "start") newStart = val;
    if (type === "end") newEnd = val;

    if (newStart && newEnd && new Date(newStart) > new Date(newEnd)) {
      setDateError("Start date cannot be after end date");
      return;
    }
    setDateError("");
    if (type === "start") setStartDate(val);
    if (type === "end") setEndDate(val);
  };

  const { data: spendingData, isLoading: spendingLoading } = useSpendingTrends(startDate, endDate);
  const { data: vendorData, isLoading: vendorLoading } = useVendorPerformance();
  const { data: summaryData, isLoading: summaryLoading } = useProcurementSummary();

  const handleExport = async (type) => {
    try {
      setExporting(type);
      const res = await reportsApi.exportCSV(type);
      const blob = new Blob([res.data], { type: "text/csv" });
      
      // Check if file is practically empty (just headers, usually < 100 bytes)
      // Or we can check the text if it has only one line.
      const text = await blob.text();
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      
      if (lines.length <= 1) {
        toast.success(`Exported 0 records (file contains headers only)`);
      } else {
        toast.success(`${type} exported`);
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_export.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(`Failed to export ${type}`);
    } finally {
      setExporting(null);
    }
  };

  const vendorColumns = useMemo(
    () => [
      columnHelper.accessor("vendor_name", {
        header: "Vendor Name",
        cell: (info) => <span className="font-medium text-gray-900">{info.getValue()}</span>,
      }),
      columnHelper.accessor("category", {
        header: "Category",
      }),
      columnHelper.accessor("total_rfqs", {
        header: "Total RFQs",
      }),
      columnHelper.accessor("win_rate", {
        header: "Win Rate (%)",
        cell: (info) => {
          const val = info.getValue() || 0;
          return (
            <div className="flex items-center gap-2">
              <progress value={val} max="100" className="w-16 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-bar]:bg-gray-100 [&::-webkit-progress-value]:bg-blue-600" />
              <span className="text-xs text-gray-600">{val.toFixed(1)}%</span>
            </div>
          );
        },
      }),
      columnHelper.accessor("total_po_value", {
        header: "Total PO Value",
        cell: (info) => formatCurrency(info.getValue()),
      }),
      columnHelper.accessor("rating", {
        header: "Rating",
        cell: (info) => <span className="text-yellow-600 font-medium">★ {(info.getValue() || 0).toFixed(1)}</span>,
      }),
    ],
    []
  );

  return (
    <div className="space-y-8">
      <PageHeader title="Reports & Analytics" subtitle="Comprehensive overview of procurement metrics" />

      {/* Export Section */}
      <div className="flex flex-wrap gap-3">
        {["vendors", "rfqs", "purchase_orders", "invoices"].map((type) => {
          const labelMap = { vendors: "Vendors", rfqs: "RFQs", purchase_orders: "POs", invoices: "Invoices" };
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleExport(type)}
              disabled={exporting === type}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {exporting === type ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export {labelMap[type]} CSV
            </button>
          );
        })}
      </div>

      {/* Spending Trends Section */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Spending Trends</h3>
          <div className="flex items-center gap-3">
            <input type="date" value={startDate} onChange={(e) => handleDateChange("start", e.target.value)} className="rounded-md border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
            <span className="text-gray-500">to</span>
            <input type="date" value={endDate} onChange={(e) => handleDateChange("end", e.target.value)} className="rounded-md border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
          </div>
        </div>
        {dateError && <p className="mb-4 text-sm text-red-500">{dateError}</p>}
        <div className="h-80 w-full">
          {spendingLoading ? (
            <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingData?.trends || spendingData || []} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={10} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                <RechartsTooltip cursor={{ fill: "#f3f4f6" }} formatter={(val) => [formatCurrency(val), "Spend"]} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Procurement Summary */}
        <section className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Procurement Summary</h3>
          {summaryLoading ? (
            <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="mb-4 text-sm font-medium text-gray-500 uppercase tracking-wide">RFQ Status</p>
                <div className="space-y-3">
                  {Object.entries(summaryData?.rfqs || {}).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center text-sm">
                      <span className="capitalize text-gray-600">{status.replace("_", " ")}</span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="mb-4 text-sm font-medium text-gray-500 uppercase tracking-wide">Invoice Status</p>
                <div className="space-y-3">
                  {Object.entries(summaryData?.invoices || {}).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center text-sm">
                      <span className="capitalize text-gray-600">{status}</span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Vendor Performance */}
        <section className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Vendor Performance</h3>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <DataTable
              columns={vendorColumns}
              data={vendorData?.performance || vendorData || []}
              isLoading={vendorLoading}
              showSearch={false}
              pagination={false}
              emptyMessage="No vendor data available"
            />
          </div>
        </section>
      </div>
    </div>
  );
}