import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { approvalsApi } from "../api/approvals";

export function useApprovals(params = {}) {
  return useQuery({
    queryKey: ["approvals", params],
    queryFn: () => approvalsApi.list(params).then((r) => r.data),
    keepPreviousData: true,
  });
}

export function useApproval(id) {
  return useQuery({
    queryKey: ["approval", id],
    queryFn: () => approvalsApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useProcessL1() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => approvalsApi.processL1(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["approval"] });
      toast.success("L1 decision submitted");
    },
    onError: (err) =>
      toast.error(err.response?.data?.error || "Failed to process L1"),
  });
}

export function useProcessL2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => approvalsApi.processL2(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["approval"] });
    },
    onError: (err) =>
      toast.error(err.response?.data?.error || "Failed to process L2"),
  });
}
