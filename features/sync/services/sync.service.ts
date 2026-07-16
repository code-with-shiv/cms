import { apiClient } from "@/lib/axios";
import type { GetFormatCmsDataPayload, GetFormatCmsDataResponse, SyncPayload, SyncResponse } from "@/types/sync";

// Real outbound HTTP (login + data push) to external DEV/PROD systems, plus
// real GCP image uploads for the format step — generous timeout accordingly.
const SYNC_TIMEOUT_MS = 60_000;

export async function getFormatCmsData(payload: GetFormatCmsDataPayload): Promise<GetFormatCmsDataResponse> {
  const { data } = await apiClient.post<GetFormatCmsDataResponse>("/api/v2/get_format_cms_data", payload, {
    timeout: SYNC_TIMEOUT_MS,
  });
  return data;
}

export async function syncToDevOnly(payload: SyncPayload): Promise<SyncResponse> {
  const { data } = await apiClient.post<SyncResponse>("/api/v2/sync_cms_to_dev_only", payload, {
    timeout: SYNC_TIMEOUT_MS,
  });
  return data;
}

export async function syncToDevAndProd(payload: SyncPayload): Promise<SyncResponse> {
  const { data } = await apiClient.post<SyncResponse>("/api/v2/sync_cms_to_dev", payload, {
    timeout: SYNC_TIMEOUT_MS,
  });
  return data;
}
