import { apiClient } from "@/lib/axios";
import type {
  DeleteQuestionPayload,
  GetByQidPayload,
  GetQuestionsPayload,
  QuestionDocument,
  RecentActivityEntry,
  ReviewQuestionPayload,
  SearchByLuidsPayload,
  SearchQuestionsPayload,
  SubmitForReviewPayload,
  SubmitForReviewResult,
  UpdateQuestionPayload,
  VersionHistory,
} from "@/types/question";
import type { PublishContentPayload, PublishContentResponse } from "@/types/ingestion";

const BASE = "/api/v2/questions";

export async function getQuestions(payload: GetQuestionsPayload): Promise<QuestionDocument[]> {
  const { data } = await apiClient.post<{ data: QuestionDocument[] }>(`${BASE}/get`, payload);
  return data.data;
}

export async function getQuestionByQid(payload: GetByQidPayload): Promise<QuestionDocument[]> {
  const { data } = await apiClient.post<{ data: QuestionDocument[] }>(`${BASE}/by-qid`, payload);
  return data.data;
}

export async function searchQuestions(payload: SearchQuestionsPayload): Promise<QuestionDocument[]> {
  const { data } = await apiClient.post<{ data: QuestionDocument[] }>(`${BASE}/search`, payload);
  return data.data;
}

export async function searchQuestionsByLuids(payload: SearchByLuidsPayload): Promise<QuestionDocument[]> {
  const { data } = await apiClient.post<{ data: QuestionDocument[] }>(`${BASE}/search-by-luids`, payload);
  return data.data;
}

export async function updateQuestion(payload: UpdateQuestionPayload): Promise<void> {
  await apiClient.post(`${BASE}/update`, payload);
}

export async function deleteQuestion(payload: DeleteQuestionPayload): Promise<void> {
  await apiClient.post(`${BASE}/delete`, payload);
}

export async function reviewQuestion(payload: ReviewQuestionPayload): Promise<void> {
  await apiClient.post(`${BASE}/review`, payload);
}

export async function submitForReview(payload: SubmitForReviewPayload): Promise<SubmitForReviewResult> {
  const { data } = await apiClient.post<SubmitForReviewResult>(`${BASE}/submit-for-review`, payload);
  return data;
}

export async function getVersionHistory(qid: number, templateId: string): Promise<VersionHistory> {
  const { data } = await apiClient.get<{ data: VersionHistory }>(`${BASE}/version-history`, {
    params: { qid, template_id: templateId },
  });
  return data.data;
}

export async function getRecentActivity(limit = 10): Promise<RecentActivityEntry[]> {
  const { data } = await apiClient.get<{ data: RecentActivityEntry[] }>(`${BASE}/recent-activity`, {
    params: { limit },
  });
  return data.data;
}

export async function publishContent(payload: PublishContentPayload): Promise<PublishContentResponse> {
  const { data } = await apiClient.post<PublishContentResponse>(`${BASE}/publish-content`, payload);
  return data;
}
