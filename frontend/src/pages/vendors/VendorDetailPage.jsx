import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  Award,
  Ban,
  Building2,
  CheckCircle,
  DollarSign,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  ShoppingCart,
  Star,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { vendorsApi } from "../../api/vendors";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { ROLES } from "../../constants/roles";
import { useUpdateVendorStatus, useVendor, useRateVendor } from "../../hooks/useVendors";
import useAuthStore from "../../store/authStore";

function formatCurrency(value) {
  if (value == null) return "₹0";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
        <Icon className="h-4 w-4 text-gray-500" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value || "—"}</p>
      </div>
    </div>
  );
}

function StarDisplay({ rating, onRate, disabled, readonly }) {
  const [hoverRating, setHoverRating] = useState(0);
  const displayRating = hoverRating || rating || 0;
  
  const full = Math.floor(displayRating);
  const hasHalf = !hoverRating && (rating || 0) - full >= 0.3;
  const empty = 5 - full - (hasHalf ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      <span className={`flex items-center text-yellow-400 ${!readonly && !disabled ? "cursor-pointer" : ""}`} onMouseLeave={() => setHoverRating(0)}>
        {Array.from({ length: 5 }).map((_, i) => {
          const val = i + 1;
          const isFull = val <= full;
          const isHalf = !isFull && hasHalf && val === full + 1;
          
          return (
            <span
              key={i}
              className="relative"
              onMouseEnter={() => !readonly && !disabled && setHoverRating(val)}
              onClick={() => !readonly && !disabled && onRate && onRate(val)}
            >
              <Star className={`h-5 w-5 ${isFull || hoverRating >= val ? "fill-current" : "text-gray-300"} ${disabled ? "opacity-50" : ""}`} />
              {isHalf && (
                <span className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
                  <Star className="h-5 w-5 fill-current text-yellow-400" />
                </span>
              )}
            </span>
          );
        })}
      </span>
      <span className="ml-1 text-lg font-bold text-gray-900">
        {(rating || 0).toFixed(1)}
      </span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, colorClass = "bg-blue-100 text-blue-600" }) {
  const [bgClass, textClass] = colorClass.split(" ");
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgClass}`}>
          <Icon className={`h-5 w-5 ${textClass}`} />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function VendorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === ROLES.ADMIN;

  const { data: vendor, isLoading } = useVendor(id);
  const { data: performance, isLoading: perfLoading } = useQuery({
    queryKey: ["vendor-performance", id],
    queryFn: () => vendorsApi.getPerformance(id).then((r) => r.data),
    enabled: !!id,
  });

  const updateStatus = useUpdateVendorStatus();
  const rateVendor = useRateVendor();

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    status: "",
    title: "",
    message: "",
  });

  const handleStatusChange = (newStatus) => {
    const labels = {
      active: "activate",
      blocked: "block",
      inactive: "deactivate",
    };
    setConfirmDialog({
      open: true,
      status: newStatus,
      title: `${labels[newStatus]?.charAt(0).toUpperCase()}${labels[newStatus]?.slice(1)} vendor?`,
      message: `Are you sure you want to ${labels[newStatus]} this vendor? This will change their access and visibility.`,
    });
  };

  const confirmStatusChange = () => {
    updateStatus.mutate(
      { id, status: confirmDialog.status },
      {
        onSuccess: () => setConfirmDialog({ ...confirmDialog, open: false }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 rounded bg-gray-200 mb-6" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6">
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 rounded bg-gray-100" />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl border border-gray-200 bg-white" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Vendor not found</h3>
          <Link
            to="/vendors"
            className="mt-4 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to vendors
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={vendor.company_name}
        subtitle={`${vendor.category || "Uncategorized"} · Vendor since ${
          vendor.created_at
            ? format(new Date(vendor.created_at), "MMM yyyy")
            : "N/A"
        }`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/vendors")}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => navigate(`/vendors/new?edit=${id}`)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                {vendor.status !== "active" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("active")}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Activate
                  </button>
                )}
                {vendor.status !== "blocked" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("blocked")}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                  >
                    <Ban className="h-4 w-4" />
                    Block
                  </button>
                )}
                {vendor.status !== "inactive" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("inactive")}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Deactivate
                  </button>
                )}
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Vendor Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Vendor Information
              </h3>
              <StatusBadge status={vendor.status} type="vendor" />
            </div>

            <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
              <InfoRow icon={Building2} label="Company Name" value={vendor.company_name} />
              <InfoRow icon={Mail} label="Contact Email" value={vendor.contact_email} />
              <InfoRow icon={Phone} label="Contact Phone" value={vendor.contact_phone} />
              <InfoRow icon={Globe} label="Website" value={vendor.website} />
              <InfoRow icon={MapPin} label="Address" value={vendor.address} />
              <InfoRow icon={MapPin} label="City, State" value={[vendor.city, vendor.state].filter(Boolean).join(", ") || "—"} />
              <InfoRow icon={ShieldCheck} label="GST Number" value={vendor.gst_number} />
              <InfoRow icon={ShieldCheck} label="PAN Number" value={vendor.pan_number} />
            </div>
          </div>

          {/* Bank Details */}
          {(vendor.bank_name || vendor.bank_account_number || vendor.bank_ifsc) && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Bank Details
              </h3>
              <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
                <InfoRow icon={Building2} label="Bank Name" value={vendor.bank_name} />
                <InfoRow icon={DollarSign} label="Account Number" value={vendor.bank_account_number} />
                <InfoRow icon={ShieldCheck} label="IFSC Code" value={vendor.bank_ifsc} />
                <InfoRow icon={Building2} label="Branch" value={vendor.bank_branch} />
              </div>
            </div>
          )}

          {/* Rating */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">Rating</h3>
            <StarDisplay 
              rating={vendor.rating} 
              onRate={(val) => rateVendor.mutate({ id, rating: val })}
              readonly={!isAdmin}
              disabled={isAdmin && (performance?.completed_purchase_orders || 0) === 0}
            />
            {isAdmin && (performance?.completed_purchase_orders || 0) === 0 && (
              <p className="mt-2 text-xs text-gray-500">
                Cannot rate vendor with no completed orders.
              </p>
            )}
          </div>
        </div>

        {/* Right: Performance */}
        <div className="space-y-4">
          {perfLoading ? (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gray-200" />
                    <div className="space-y-2">
                      <div className="h-3 w-16 rounded bg-gray-200" />
                      <div className="h-5 w-12 rounded bg-gray-200" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <StatCard
                icon={Award}
                label="Win Rate"
                value={`${(performance?.win_rate || 0).toFixed(1)}%`}
                colorClass="bg-blue-100 text-blue-600"
              />
              <StatCard
                icon={ShoppingCart}
                label="Total Orders"
                value={performance?.total_orders || 0}
                colorClass="bg-green-100 text-green-600"
              />
              <StatCard
                icon={DollarSign}
                label="Total PO Value"
                value={formatCurrency(performance?.total_po_value || 0)}
                colorClass="bg-purple-100 text-purple-600"
              />
              <StatCard
                icon={Star}
                label="Avg. Delivery (days)"
                value={performance?.avg_delivery_days || "N/A"}
                colorClass="bg-orange-100 text-orange-600"
              />
            </>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.status === "blocked" ? "Block Vendor" : "Confirm"}
        onConfirm={confirmStatusChange}
        onCancel={() => setConfirmDialog({ ...confirmDialog, open: false })}
      />
    </div>
  );
}