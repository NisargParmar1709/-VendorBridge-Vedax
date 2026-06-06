import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  ArrowLeft,
  FileUp,
  Loader2,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import { rfqsApi } from "../../api/rfqs";
import { vendorsApi } from "../../api/vendors";
import PageHeader from "../../components/ui/PageHeader";
import {
  useCreateRFQ,
  useGenerateDescription,
  usePublishRFQ,
  useRFQ,
  useUpdateRFQ,
  useUploadAttachment,
  useDeleteAttachment,
} from "../../hooks/useRFQs";

const CATEGORIES = [
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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

const rfqSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  category: z.string().optional().or(z.literal("")),
  deadline: z.string().refine(
    (val) => !val || new Date(val) > new Date(),
    "Deadline must be in the future"
  ),
  description: z.string().optional().or(z.literal("")),
  line_items: z
    .array(
      z.object({
        item_name: z.string().min(1, "Item name required"),
        quantity: z.coerce.number().min(0.01, "Quantity must be > 0"),
        unit: z.string().optional().or(z.literal("")),
        description: z.string().optional().or(z.literal("")),
      })
    )
    .min(1, "At least one line item is required"),
  vendor_ids: z.array(z.string()).optional(),
});

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-500";

function FormField({ label, error, required, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error.message}</p>}
    </div>
  );
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function NewRFQPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: existingRFQ, isLoading: rfqLoading } = useRFQ(id);
  const createRFQ = useCreateRFQ();
  const updateRFQ = useUpdateRFQ();
  const publishRFQ = usePublishRFQ();
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();
  const generateDescription = useGenerateDescription();

  // Vendors for assignment
  const [vendors, setVendors] = useState([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    vendorsApi
      .list({ per_page: 200 })
      .then((r) => {
        setVendors(r.data?.vendors || r.data?.items || []);
      })
      .catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(rfqSchema),
    defaultValues: {
      title: "",
      category: "",
      deadline: "",
      description: "",
      line_items: [{ item_name: "", quantity: 1, unit: "pcs", description: "" }],
      vendor_ids: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "line_items",
  });

  const watchTitle = watch("title");
  const watchCategory = watch("category");

  // Populate form in edit mode
  useEffect(() => {
    if (isEdit && existingRFQ) {
      reset({
        title: existingRFQ.title || "",
        category: existingRFQ.category || "",
        deadline: existingRFQ.deadline
          ? format(new Date(existingRFQ.deadline), "yyyy-MM-dd")
          : "",
        description: existingRFQ.description || "",
        line_items:
          existingRFQ.line_items?.length > 0
            ? existingRFQ.line_items.map((li) => ({
                item_name: li.item_name || "",
                quantity: li.quantity || 1,
                unit: li.unit || "",
                description: li.description || "",
              }))
            : [{ item_name: "", quantity: 1, unit: "pcs", description: "" }],
        vendor_ids: existingRFQ.vendor_ids || [],
      });
      setSelectedVendorIds(existingRFQ.vendor_ids || []);
      setAttachments(existingRFQ.attachments || []);
    }
  }, [isEdit, existingRFQ, reset]);

  // Vendor toggle
  const toggleVendor = useCallback(
    (vendorId) => {
      setSelectedVendorIds((prev) => {
        const next = prev.includes(String(vendorId))
          ? prev.filter((v) => v !== String(vendorId))
          : [...prev, String(vendorId)];
        setValue("vendor_ids", next);
        return next;
      });
    },
    [setValue]
  );

  // File handling
  const handleFiles = useCallback(
    (fileList) => {
      const currentCount = attachments.length;
      const files = Array.from(fileList);

      if (currentCount + files.length > MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} files allowed`);
        return;
      }

      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} exceeds 10MB limit`);
          continue;
        }
        // If we have an RFQ id, upload immediately
        if (isEdit && id) {
          uploadAttachment.mutate(
            { rfqId: id, file },
            {
              onSuccess: (res) => {
                setAttachments((prev) => [
                  ...prev,
                  res.data?.attachment || {
                    id: Date.now(),
                    filename: file.name,
                    size: file.size,
                  },
                ]);
              },
            }
          );
        } else {
          // Store locally for upload after create
          setAttachments((prev) => [
            ...prev,
            { _file: file, filename: file.name, size: file.size, id: `temp-${Date.now()}-${file.name}` },
          ]);
        }
      }
    },
    [attachments, id, isEdit, uploadAttachment]
  );

  const removeAttachment = useCallback(
    (att) => {
      if (att._file) {
        setAttachments((prev) => prev.filter((a) => a.id !== att.id));
      } else if (isEdit && id) {
        deleteAttachment.mutate(
          { rfqId: id, attachmentId: att.id },
          { onSuccess: () => setAttachments((prev) => prev.filter((a) => a.id !== att.id)) }
        );
      }
    },
    [id, isEdit, deleteAttachment]
  );

  // Drag and drop
  const [dragOver, setDragOver] = useState(false);
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  // AI Description
  const handleGenerateAI = useCallback(() => {
    const items = watch("line_items")
      ?.filter((li) => li.item_name)
      .map((li) => ({ item_name: li.item_name, quantity: li.quantity }));

    generateDescription.mutate(
      {
        context_type: "rfq",
        title: watchTitle,
        category: watchCategory,
        items,
      },
      {
        onSuccess: (data) => {
          setValue("description", data?.description || data?.text || "");
          toast.success("Description generated");
        },
      }
    );
  }, [watchTitle, watchCategory, watch, generateDescription, setValue]);

  // Submit handler
  const onSubmit = async (data, shouldPublish = false) => {
    const payload = {
      ...data,
      vendor_ids: selectedVendorIds,
    };

    const pendingFiles = attachments.filter((a) => a._file);

    if (isEdit) {
      updateRFQ.mutate(
        { id, data: payload },
        {
          onSuccess: async () => {
            if (shouldPublish) {
              publishRFQ.mutate(id, {
                onSuccess: () => navigate(`/rfqs/${id}`),
              });
            } else {
              navigate(`/rfqs/${id}`);
            }
          },
        }
      );
    } else {
      createRFQ.mutate(payload, {
        onSuccess: async (res) => {
          const newId = res.data?.id;
          // Upload any pending files
          if (newId && pendingFiles.length > 0) {
            for (const att of pendingFiles) {
              try {
                await rfqsApi.uploadAttachment(newId, att._file);
              } catch { /* ignore individual failures */ }
            }
          }
          if (shouldPublish && newId) {
            publishRFQ.mutate(newId, {
              onSuccess: () => navigate(`/rfqs/${newId}`),
              onError: () => navigate("/rfqs"),
            });
          } else {
            navigate("/rfqs");
          }
        },
      });
    }
  };

  const filteredVendors = vendors.filter(
    (v) =>
      !vendorSearch ||
      v.company_name?.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  if (isEdit && rfqLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-gray-200 mb-6" />
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-gray-100 mb-4" />
          ))}
        </div>
      </div>
    );
  }

  const isBusy =
    isSubmitting ||
    createRFQ.isPending ||
    updateRFQ.isPending ||
    publishRFQ.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? "Edit RFQ" : "Create RFQ"}
        subtitle={isEdit ? `Editing ${existingRFQ?.title || "RFQ"}` : "Create a new Request for Quotation"}
        actions={
          <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        }
      />

      <form
        onSubmit={handleSubmit((data) => onSubmit(data, false))}
        className="space-y-6"
      >
        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column: Basic info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-5 text-lg font-semibold text-gray-900">Basic Information</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FormField label="Title" error={errors.title} required>
                    <input {...register("title")} className={inputClass} placeholder="Enter RFQ title" />
                  </FormField>
                </div>

                <FormField label="Category" error={errors.category}>
                  <select {...register("category")} className={inputClass}>
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Deadline" error={errors.deadline} required>
                  <input
                    {...register("deadline")}
                    type="date"
                    min={format(new Date(), "yyyy-MM-dd")}
                    className={inputClass}
                  />
                </FormField>

                <div className="sm:col-span-2">
                  <div className="flex items-end justify-between mb-1.5">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <button
                      type="button"
                      onClick={handleGenerateAI}
                      disabled={generateDescription.isPending || !watchTitle}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generateDescription.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {generateDescription.isPending ? "Generating..." : "Generate with AI"}
                    </button>
                  </div>
                  <textarea
                    {...register("description")}
                    rows={4}
                    className={`${inputClass} ${generateDescription.isPending ? "animate-pulse" : ""}`}
                    placeholder="Describe the requirements for this RFQ..."
                    disabled={generateDescription.isPending}
                  />
                  {errors.description && (
                    <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
                <button
                  type="button"
                  onClick={() => append({ item_name: "", quantity: 1, unit: "pcs", description: "" })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                >
                  <Plus className="h-4 w-4" /> Add Line Item
                </button>
              </div>

              {errors.line_items?.root && (
                <p className="mb-3 text-sm text-red-500">{errors.line_items.root.message}</p>
              )}
              {errors.line_items?.message && (
                <p className="mb-3 text-sm text-red-500">{errors.line_items.message}</p>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="pb-2 pr-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Item Name *</th>
                      <th className="pb-2 pr-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-24">Qty *</th>
                      <th className="pb-2 pr-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-24">Unit</th>
                      <th className="pb-2 pr-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Description</th>
                      <th className="pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => (
                      <tr key={field.id} className="border-b border-gray-50">
                        <td className="py-2 pr-2">
                          <input
                            {...register(`line_items.${index}.item_name`)}
                            className={`${inputClass} ${errors.line_items?.[index]?.item_name ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
                            placeholder="Item name"
                          />
                          {errors.line_items?.[index]?.item_name && (
                            <p className="mt-0.5 text-xs text-red-500">{errors.line_items[index].item_name.message}</p>
                          )}
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            {...register(`line_items.${index}.quantity`, { valueAsNumber: true })}
                            type="number"
                            step="0.01"
                            min="0.01"
                            className={`${inputClass} ${errors.line_items?.[index]?.quantity ? "border-red-300" : ""}`}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            {...register(`line_items.${index}.unit`)}
                            className={inputClass}
                            placeholder="pcs"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            {...register(`line_items.${index}.description`)}
                            className={inputClass}
                            placeholder="Optional description"
                          />
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() => fields.length > 1 && remove(index)}
                            disabled={fields.length <= 1}
                            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Attachments */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Attachments</h3>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
                  dragOver
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100"
                }`}
              >
                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-700">
                  Drag & drop files here or{" "}
                  <span className="text-blue-600">browse</span>
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Max 10MB per file, up to {MAX_FILES} files
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>

              {/* File list */}
              {attachments.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {attachments.map((att) => (
                    <li
                      key={att.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <FileUp className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">{att.filename}</p>
                          {att.size && (
                            <p className="text-xs text-gray-400">{formatFileSize(att.size)}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(att)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right column: Vendor assignment */}
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Assign Vendors
                {selectedVendorIds.length > 0 && (
                  <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 px-1.5 text-xs font-semibold text-blue-700">
                    {selectedVendorIds.length}
                  </span>
                )}
              </h3>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm placeholder-gray-400 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                {filteredVendors.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-400">No vendors found</p>
                ) : (
                  filteredVendors.map((v) => (
                    <label
                      key={v.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition ${
                        selectedVendorIds.includes(String(v.id))
                          ? "bg-blue-50 border border-blue-200"
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedVendorIds.includes(String(v.id))}
                        onChange={() => toggleVendor(v.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{v.company_name}</p>
                        <p className="text-xs text-gray-500 truncate">{v.category}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={handleSubmit((data) => onSubmit(data, true))}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Save & Publish
          </button>
        </div>
      </form>
    </div>
  );
}