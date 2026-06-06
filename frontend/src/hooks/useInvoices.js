import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { invoicesApi } from "../api/invoices";

export function useInvoices(params = {}) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: () => invoicesApi.list(params).then((r) => r.data),
    keepPreviousData: true,
  });
}

export function useInvoice(id) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: () => invoicesApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, data }) => invoicesApi.createForPO(poId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["purchase-order"] });
      toast.success("Invoice created successfully");
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed to create invoice"),
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => invoicesApi.updateStatus(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice"] });
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed to update invoice status"),
  });
}

export function useSendInvoiceEmail() {
  return useMutation({
    mutationFn: (id) => invoicesApi.sendEmail(id),
    // onSuccess/onError handled in component to support custom retry toast
  });
}

export function useMarkInvoicePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => invoicesApi.markPaid(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice"] });
      toast.success("Invoice marked as paid");
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed to mark as paid"),
  });
}
