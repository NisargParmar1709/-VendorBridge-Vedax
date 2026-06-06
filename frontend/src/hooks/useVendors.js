import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { vendorsApi } from "../api/vendors";

/**
 * Fetch paginated vendor list with optional search/category/status filters.
 * @param {Object} params - { search, category, status, page, per_page }
 */
export function useVendors(params = {}) {
  return useQuery({
    queryKey: ["vendors", params],
    queryFn: () => vendorsApi.list(params).then((r) => r.data),
    keepPreviousData: true,
  });
}

/**
 * Fetch single vendor by ID.
 * @param {string|number} id
 */
export function useVendor(id) {
  return useQuery({
    queryKey: ["vendors", id],
    queryFn: () => vendorsApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

/**
 * Create vendor mutation.
 */
export function useCreateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => vendorsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor created");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to create vendor");
    },
  });
}

/**
 * Update vendor mutation.
 */
export function useUpdateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => vendorsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor updated");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to update vendor");
    },
  });
}

/**
 * Delete vendor mutation.
 */
export function useDeleteVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => vendorsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor deleted");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to delete vendor");
    },
  });
}

/**
 * Update vendor status mutation.
 */
export function useUpdateVendorStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) => vendorsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Status updated");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to update status");
    },
  });
}

export function useRateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, rating }) => vendorsApi.rate(id, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-performance'] });
      toast.success('Vendor rated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to rate vendor');
    },
  });
}
