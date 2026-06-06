import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ChevronDown, ChevronUp, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { z } from "zod";

import PageHeader from "../../components/ui/PageHeader";
import { useCreateVendor, useUpdateVendor, useVendor } from "../../hooks/useVendors";

const VENDOR_CATEGORIES = [
  "IT Services",
  "Office Supplies",
  "Furniture",
  "Electronics",
  "Construction",
  "Consulting",
  "Logistics",
  "Maintenance",
  "Raw Materials",
];

// GST format: 2-digit state code, 10-char PAN, 1 digit entity, 1 Z, 1 checksum
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const vendorSchema = z.object({
  company_name: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(200, "Company name is too long"),
  contact_email: z
    .string()
    .email("Invalid email address"),
  contact_phone: z
    .string()
    .min(10, "Phone must be at least 10 digits")
    .max(15, "Phone number is too long")
    .optional()
    .or(z.literal("")),
  category: z
    .string()
    .min(1, "Category is required"),
  gst_number: z
    .string()
    .regex(GST_REGEX, "Invalid GST number format (e.g. 27AABCI1234A1Z5)")
    .optional()
    .or(z.literal("")),
  pan_number: z
    .string()
    .max(10)
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(500)
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .max(100)
    .optional()
    .or(z.literal("")),
  state: z
    .string()
    .max(100)
    .optional()
    .or(z.literal("")),
  pincode: z
    .string()
    .max(10)
    .optional()
    .or(z.literal("")),
  website: z
    .string()
    .url("Invalid URL")
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .max(2000)
    .optional()
    .or(z.literal("")),
  // Bank details (optional)
  bank_name: z
    .string()
    .max(200)
    .optional()
    .or(z.literal("")),
  bank_account_number: z
    .string()
    .max(30)
    .optional()
    .or(z.literal("")),
  bank_ifsc: z
    .string()
    .max(11)
    .optional()
    .or(z.literal("")),
  bank_branch: z
    .string()
    .max(200)
    .optional()
    .or(z.literal("")),
});

function FormField({ label, error, required, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-500">{error.message}</p>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-500";

export default function NewVendorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEdit = !!editId;

  const { data: existingVendor, isLoading: vendorLoading } = useVendor(editId);
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();

  const [bankOpen, setBankOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      company_name: "",
      contact_email: "",
      contact_phone: "",
      category: "",
      gst_number: "",
      pan_number: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      website: "",
      description: "",
      bank_name: "",
      bank_account_number: "",
      bank_ifsc: "",
      bank_branch: "",
    },
  });

  // Populate form for edit mode
  useEffect(() => {
    if (isEdit && existingVendor) {
      reset({
        company_name: existingVendor.company_name || "",
        contact_email: existingVendor.contact_email || "",
        contact_phone: existingVendor.contact_phone || "",
        category: existingVendor.category || "",
        gst_number: existingVendor.gst_number || "",
        pan_number: existingVendor.pan_number || "",
        address: existingVendor.address || "",
        city: existingVendor.city || "",
        state: existingVendor.state || "",
        pincode: existingVendor.pincode || "",
        website: existingVendor.website || "",
        description: existingVendor.description || "",
        bank_name: existingVendor.bank_name || "",
        bank_account_number: existingVendor.bank_account_number || "",
        bank_ifsc: existingVendor.bank_ifsc || "",
        bank_branch: existingVendor.bank_branch || "",
      });
      // Auto-expand bank section if any bank fields exist
      if (
        existingVendor.bank_name ||
        existingVendor.bank_account_number ||
        existingVendor.bank_ifsc
      ) {
        setBankOpen(true);
      }
    }
  }, [isEdit, existingVendor, reset]);

  const onSubmit = async (data) => {
    // Clean empty strings to undefined
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === "" ? undefined : v])
    );

    if (isEdit) {
      updateVendor.mutate(
        { id: editId, data: cleaned },
        { onSuccess: () => navigate(`/vendors/${editId}`) }
      );
    } else {
      createVendor.mutate(cleaned, {
        onSuccess: () => navigate("/vendors"),
      });
    }
  };

  if (isEdit && vendorLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 rounded bg-gray-200 mb-6" />
          <div className="rounded-xl border border-gray-200 bg-white p-8">
            <div className="space-y-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-gray-100" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? "Edit Vendor" : "Create Vendor"}
        subtitle={isEdit ? `Editing ${existingVendor?.company_name || "vendor"}` : "Add a new vendor to the system"}
        actions={
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-lg font-semibold text-gray-900">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField label="Company Name" error={errors.company_name} required>
              <input
                {...register("company_name")}
                className={inputClass}
                placeholder="Enter company name"
              />
            </FormField>

            <FormField label="Category" error={errors.category} required>
              <select
                {...register("category")}
                className={inputClass}
              >
                <option value="">Select category</option>
                {VENDOR_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Contact Email" error={errors.contact_email} required>
              <input
                {...register("contact_email")}
                type="email"
                className={inputClass}
                placeholder="vendor@company.com"
              />
            </FormField>

            <FormField label="Contact Phone" error={errors.contact_phone}>
              <input
                {...register("contact_phone")}
                type="tel"
                className={inputClass}
                placeholder="+91 98765 43210"
              />
            </FormField>

            <FormField label="GST Number" error={errors.gst_number}>
              <input
                {...register("gst_number")}
                className={`${inputClass} font-mono uppercase`}
                placeholder="27AABCI1234A1Z5"
                maxLength={15}
              />
            </FormField>

            <FormField label="PAN Number" error={errors.pan_number}>
              <input
                {...register("pan_number")}
                className={`${inputClass} font-mono uppercase`}
                placeholder="AABCI1234A"
                maxLength={10}
              />
            </FormField>

            <FormField label="Website" error={errors.website}>
              <input
                {...register("website")}
                type="url"
                className={inputClass}
                placeholder="https://www.company.com"
              />
            </FormField>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-lg font-semibold text-gray-900">
            Address
          </h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField label="Street Address" error={errors.address}>
                <textarea
                  {...register("address")}
                  rows={2}
                  className={inputClass}
                  placeholder="Enter street address"
                />
              </FormField>
            </div>

            <FormField label="City" error={errors.city}>
              <input
                {...register("city")}
                className={inputClass}
                placeholder="City"
              />
            </FormField>

            <FormField label="State" error={errors.state}>
              <input
                {...register("state")}
                className={inputClass}
                placeholder="State"
              />
            </FormField>

            <FormField label="Pincode" error={errors.pincode}>
              <input
                {...register("pincode")}
                className={inputClass}
                placeholder="400001"
                maxLength={10}
              />
            </FormField>
          </div>
        </div>

        {/* Description */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <FormField label="Description" error={errors.description}>
            <textarea
              {...register("description")}
              rows={3}
              className={inputClass}
              placeholder="Brief description of the vendor and their services..."
            />
          </FormField>
        </div>

        {/* Bank Details (Collapsible) */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setBankOpen((o) => !o)}
            className="flex w-full items-center justify-between p-6 text-left"
          >
            <h3 className="text-lg font-semibold text-gray-900">
              Bank Details
              <span className="ml-2 text-sm font-normal text-gray-400">
                (Optional)
              </span>
            </h3>
            {bankOpen ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {bankOpen && (
            <div className="border-t border-gray-100 p-6 pt-4">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FormField label="Bank Name" error={errors.bank_name}>
                  <input
                    {...register("bank_name")}
                    className={inputClass}
                    placeholder="State Bank of India"
                  />
                </FormField>

                <FormField label="Account Number" error={errors.bank_account_number}>
                  <input
                    {...register("bank_account_number")}
                    className={`${inputClass} font-mono`}
                    placeholder="1234567890123"
                  />
                </FormField>

                <FormField label="IFSC Code" error={errors.bank_ifsc}>
                  <input
                    {...register("bank_ifsc")}
                    className={`${inputClass} font-mono uppercase`}
                    placeholder="SBIN0001234"
                    maxLength={11}
                  />
                </FormField>

                <FormField label="Branch" error={errors.bank_branch}>
                  <input
                    {...register("bank_branch")}
                    className={inputClass}
                    placeholder="Andheri West, Mumbai"
                  />
                </FormField>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createVendor.isPending || updateVendor.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isEdit ? "Update Vendor" : "Create Vendor"}
          </button>
        </div>
      </form>
    </div>
  );
}