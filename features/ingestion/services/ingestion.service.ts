import { apiClient } from "@/lib/axios";
import type {
  GenerateQuesPayload,
  GenerateQuesResponse,
  ProcessDocxPayload,
  ProcessDocxResponse,
  PushToDatabasePayload,
  PushToDatabaseResponse,
  UploadFlashcardPayload,
  UploadFlashcardResponse,
  UploadQuestionsJsonPayload,
  UploadQuestionsJsonResponse,
} from "@/types/ingestion";

// apiClient defaults Content-Type to application/json; for FormData bodies that
// default must be removed (not overwritten with a hardcoded string, which would
// omit the multipart boundary) so the browser sets the correct multipart header.
async function postMultipart<T>(url: string, formData: FormData, timeoutMs?: number): Promise<T> {
  const { data } = await apiClient.post<T>(url, formData, {
    headers: { "Content-Type": undefined },
    timeout: timeoutMs,
  });
  return data;
}

export async function processDocx(payload: ProcessDocxPayload): Promise<ProcessDocxResponse> {
  const fd = new FormData();
  fd.append("file", payload.file);
  fd.append("grade", payload.grade);
  fd.append("board", payload.board);
  fd.append("subject", payload.subject);
  fd.append("chapter_name", payload.chapter_name);
  fd.append("template_id", payload.template_id);
  if (payload.publication) fd.append("publication", payload.publication);
  return postMultipart<ProcessDocxResponse>("/api/v2/process-docx", fd);
}

// Server waits on internal DB triggers to backfill QIDs (~60-120s) before responding.
const PUSH_TO_DATABASE_TIMEOUT_MS = 150_000;

export async function pushToDatabase(payload: PushToDatabasePayload): Promise<PushToDatabaseResponse> {
  const { data } = await apiClient.post<PushToDatabaseResponse>("/api/v2/push-to-database", payload, {
    timeout: PUSH_TO_DATABASE_TIMEOUT_MS,
  });
  return data;
}

export async function uploadFlashcard(payload: UploadFlashcardPayload): Promise<UploadFlashcardResponse> {
  const fd = new FormData();
  fd.append("file", payload.file);
  fd.append("uploaded_by", payload.uploaded_by);
  return postMultipart<UploadFlashcardResponse>("/api/v2/upload-flashcard/", fd);
}

export async function uploadQuestionsJson(
  payload: UploadQuestionsJsonPayload,
): Promise<UploadQuestionsJsonResponse> {
  const fd = new FormData();
  fd.append("file", payload.file);
  fd.append("template_id", payload.template_id);
  fd.append("uploaded_by", payload.uploaded_by);
  return postMultipart<UploadQuestionsJsonResponse>("/api/v2/upload-questions", fd);
}

// Multiple sequential LLM calls per PDF chunk on the server — generous client timeout.
const GENERATE_QUESTIONS_TIMEOUT_MS = 300_000;

export async function generateQuestions(payload: GenerateQuesPayload): Promise<GenerateQuesResponse> {
  const fd = new FormData();
  fd.append("subject", payload.subject);
  fd.append("grade", payload.grade);
  fd.append("chapter_name", payload.chapter_name);
  fd.append("topics", payload.topics);
  fd.append("file", payload.file);
  return postMultipart<GenerateQuesResponse>("/api/v2/generateQues", fd, GENERATE_QUESTIONS_TIMEOUT_MS);
}
