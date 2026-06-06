import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { poApi } from "../api/purchase_orders";

export function usePurchaseOrders(params = {}) {
  return useQuery({
    queryKey: ["purchase-orders", params],
    queryFn: () => poApi.list(params).then((r) => r.data),
    keepPreviousData: true,
  });
}

export function usePurchaseOrder(id) {
  return useQuery({
    queryKey: ["purchase-order", id],
    queryFn: () => poApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useUpdatePOStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => poApi.updateStatus(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["purchase-order"] });
      toast.success("PO status updated");
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed to update PO status"),
  });
}
