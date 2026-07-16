import { apiClient } from "@/lib/axios";

export interface RequestImageUploadPayload {
  filename: string;
  template_id: string;
  uploaded_by: string;
  content_type?: string;
}

export interface RequestImageUploadResult {
  signed_url: string;
  cdn_url: string;
}

export async function requestImageUpload(
  payload: RequestImageUploadPayload,
): Promise<RequestImageUploadResult> {
  const { data } = await apiClient.post<{ data: RequestImageUploadResult }>(
    "/api/v2/request-image-upload",
    payload,
  );
  return data.data;
}

// Signed URL is a direct-to-GCS PUT — no API base URL, no session cookie.
export async function uploadImageToSignedUrl(signedUrl: string, file: File): Promise<void> {
  await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
}

export interface DeleteImagePayload {
  qid: number;
  image_url: string;
  deleted_by: string;
  where: string;
  task_for: string;
  template_id: string;
}

export async function deleteImageReference(payload: DeleteImagePayload): Promise<void> {
  await apiClient.delete("/api/v2/delete_image", { params: payload });
}
