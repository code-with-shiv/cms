import { apiClient } from "@/lib/axios";
import type { DashboardApiResult, GetDashboardPayload } from "@/types/dashboard";

export async function getDashboardData(payload: GetDashboardPayload): Promise<DashboardApiResult> {
  const { data } = await apiClient.post<{ data: DashboardApiResult }>("/api/v2/dashboard", payload);
  return data.data;
}
