import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../api/reports";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["reports", "dashboard-stats"],
    queryFn: () => reportsApi.getDashboardStats().then((r) => r.data),
  });
}

export function useSpendingTrends(start, end) {
  return useQuery({
    queryKey: ["reports", "spending-trends", start, end],
    queryFn: () => reportsApi.getSpendingTrends(start, end).then((r) => r.data),
    enabled: !!start && !!end,
  });
}

export function useVendorPerformance() {
  return useQuery({
    queryKey: ["reports", "vendor-performance"],
    queryFn: () => reportsApi.getVendorPerformance().then((r) => r.data),
  });
}

export function useProcurementSummary() {
  return useQuery({
    queryKey: ["reports", "procurement-summary"],
    queryFn: () => reportsApi.getProcurementSummary().then((r) => r.data),
  });
}
