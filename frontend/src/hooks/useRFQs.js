import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { aiApi } from "../api/ai";
import { rfqsApi } from "../api/rfqs";

/**
 * Fetch paginated RFQ list with optional search/status filters.
 * @param {Object} params - { search, status, page, per_page }
 */
export function useRFQs(params = {}) {
  return useQuery({
    queryKey: ["rfqs", params],
    queryFn: () => rfqsApi.list(params).then((r) => r.data),
    keepPreviousData: true,
  });
}

/**
 * Fetch single RFQ by ID.
 * @param {string|number} id
 */
export function useRFQ(id) {
  return useQuery({
    queryKey: ["rfqs", id],
    queryFn: () => rfqsApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

/**
 * Create RFQ mutation.
 */
export function useCreateRFQ() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => rfqsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfqs"] });
      toast.success("RFQ created");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to create RFQ");
    },
  });
}

/**
 * Update RFQ mutation.
 */
export function useUpdateRFQ() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => rfqsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfqs"] });
      toast.success("RFQ updated");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to update RFQ");
    },
  });
}

/**
 * Delete RFQ mutation.
 */
export function useDeleteRFQ() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => rfqsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfqs"] });
      toast.success("RFQ deleted");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to delete RFQ");
    },
  });
}

/**
 * Publish RFQ mutation.
 */
export function usePublishRFQ() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => rfqsApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfqs"] });
      toast.success("RFQ published successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to publish RFQ");
    },
  });
}

/**
 * Upload attachment mutation.
 */
export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rfqId, file }) => rfqsApi.uploadAttachment(rfqId, file),
    onSuccess: (_, { rfqId }) => {
      queryClient.invalidateQueries({ queryKey: ["rfqs", rfqId] });
      toast.success("File uploaded");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to upload file");
    },
  });
}

/**
 * Delete attachment mutation.
 */
export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rfqId, attachmentId }) =>
      rfqsApi.deleteAttachment(rfqId, attachmentId),
    onSuccess: (_, { rfqId }) => {
      queryClient.invalidateQueries({ queryKey: ["rfqs", rfqId] });
      toast.success("Attachment removed");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to remove attachment");
    },
  });
}

/**
 * AI description generation mutation.
 */
export function useGenerateDescription() {
  return useMutation({
    mutationFn: (data) =>
      aiApi.generateDescription(data).then((r) => r.data),
    onError: () => {
      toast.error("AI service unavailable, please write manually");
    },
  });
}
