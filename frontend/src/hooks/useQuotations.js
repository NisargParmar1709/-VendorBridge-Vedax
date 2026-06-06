import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { quotationsApi } from "../api/quotations";

export function useMyQuotations(params = {}) {
  return useQuery({
    queryKey: ["my-quotations", params],
    queryFn: () => quotationsApi.getAll(params).then((r) => r.data),
  });
}

export function useQuotations(rfqId) {
  return useQuery({
    queryKey: ["quotations", rfqId],
    queryFn: () => quotationsApi.getForRFQ(rfqId).then((r) => r.data),
    enabled: !!rfqId,
  });
}

export function useQuotation(id) {
  return useQuery({
    queryKey: ["quotation", id],
    queryFn: () => quotationsApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rfqId, data }) => quotationsApi.create(rfqId, data),
    onSuccess: (_, { rfqId }) => {
      qc.invalidateQueries({ queryKey: ["quotations", rfqId] });
      qc.invalidateQueries({ queryKey: ["my-quotations"] });
      toast.success("Quotation saved");
    },
    onError: (err) =>
      toast.error(err.response?.data?.error || "Failed to save quotation"),
  });
}

export function useSubmitQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => quotationsApi.submit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotations"] });
      qc.invalidateQueries({ queryKey: ["quotation"] });
      qc.invalidateQueries({ queryKey: ["my-quotations"] });
      toast.success("Quotation submitted");
    },
    onError: (err) =>
      toast.error(err.response?.data?.error || "Failed to submit quotation"),
  });
}

export function useCompareQuotations(rfqId) {
  return useQuery({
    queryKey: ["compare", rfqId],
    queryFn: () => quotationsApi.compare(rfqId).then((r) => r.data),
    enabled: !!rfqId,
  });
}

export function useSelectQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rfqId, data }) => quotationsApi.select(rfqId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rfqs"] });
      toast.success("Vendor selected");
    },
    onError: (err) =>
      toast.error(err.response?.data?.error || "Failed to select vendor"),
  });
}
