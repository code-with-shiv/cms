export interface GetFormatCmsDataPayload {
  template_id: string;
  luid_list?: string[];
  qid_list?: (number | string)[];
}

export interface GetFormatCmsDataResponse {
  data: Record<string, unknown>[];
  error: string | null;
  image_errors: Record<string, string>;
}

export interface SyncPayload {
  template_id: string;
  email: string;
  questions: Record<string, unknown>[];
}

export interface SyncSuccessResponse {
  message: string;
  data: { qids: (number | string)[]; synced_count?: number };
}

// sync_cms_to_dev / sync_cms_to_dev_only return HTTP 200 even on failure —
// the caller must check for `status === "failure"` or an `error` key, not rely
// on a caught exception.
export interface SyncFailureResponse {
  status?: "failure";
  error?: string;
  message: string;
  invalid_items?: unknown[];
}

export type SyncResponse = SyncSuccessResponse | SyncFailureResponse;

export function isSyncFailure(response: SyncResponse): response is SyncFailureResponse {
  return (response as SyncFailureResponse).status === "failure" || Boolean((response as SyncFailureResponse).error);
}
