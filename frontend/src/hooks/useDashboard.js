import { useQuery } from "@tanstack/react-query";

import { dashboardApi } from "../api/dashboardApi";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: dashboardApi.summary,
  });
}

