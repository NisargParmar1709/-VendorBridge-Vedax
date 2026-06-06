import { useQuery } from "@tanstack/react-query";
import { activityApi } from "../api/activity";

export function useActivity(params = {}) {
  return useQuery({
    queryKey: ["activity", params],
    queryFn: () => activityApi.list(params).then((r) => r.data),
    keepPreviousData: true,
  });
}
