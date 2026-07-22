import type { QuestionStatus } from "@/types/question";

// Explicit — omitting status_filter makes the backend default to excluding "rejected".
export const ALL_QUESTION_STATUSES: QuestionStatus[] = [
  "draft",
  "pending_review",
  "accepted",
  "accepted_with_changes",
  "re_edit",
  "rejected",
  "synced",
];
