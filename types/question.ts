import type { QuestionType, TemplateLevel } from "@/types/template";

export type QuestionStatus =
  | "draft"
  | "pending_review"
  | "accepted"
  | "accepted_with_changes"
  | "re_edit"
  | "rejected"
  | "synced";

export interface ContentItem {
  type: string;
  content: string | null;
  marks?: number | null; // only meaningful on solution blocks of test_based templates
}

export interface OptionItem {
  option: ContentItem[];
  is_correct: boolean;
  dr?: ContentItem[];
}

// Backend documents are loose Mongo dicts shaped by their template rather than
// a fixed schema — mirror that instead of inventing fields that don't exist.
export interface QuestionDocument {
  _id: string;
  qid: number;
  template_id: string;
  status: QuestionStatus;
  question: ContentItem[];
  solution: ContentItem[];
  hint?: ContentItem[];
  options?: OptionItem[];
  luid?: string;
  lu_name?: string;
  loid?: string;
  lo?: string;
  topic_id?: string | number;
  topic_name?: string;
  chapter_id?: string | number;
  chapter_name?: string;
  topics_covered?: number[];
  isClone?: boolean;
  isCloneOf?: number | string | null;
  review_comment?: string | null;
  reviewer_edited?: boolean;
  submitted_by?: string;
  submitted_at?: string;
  updated_by?: string;
  updated_at?: string;
  comment?: string;
  difficulty_level?: string;
  [key: string]: unknown;
}

// Render config needed to know how a question of this template should be
// shown/edited — fetched via GET /questions/template-schema/{template_id}
// (tier1-accessible; unlike /get-templates which is admin-only).
export interface TemplateSchema {
  template_id: string;
  question_type: QuestionType;
  level: TemplateLevel;
  allowed_question_format: string[];
  options: boolean;
  hint: boolean;
  can_have_clone: boolean;
  requires_year: boolean;
  test_based: boolean;
  total_marks?: string | null;
}

// Whether the question carries answer options — this is the `question_type`
// axis. Per real template data, it is independent of `test_based`: a
// chapter-level "test_based" template can still be question_type=objective
// (options + per-part marks together), so these are NOT mutually exclusive
// branches of one union — they're two separate flags on the same struct.
export type QuestionKind = "objective" | "subjective";

export interface TestPrepSolutionPart {
  content: ContentItem;
  marks: number | null;
}

// The "struct per question type" the list/modal/editor render from. `kind`
// decides whether `options` is shown; `totalMarks` (non-null only when the
// template is test_based) decides whether solutionParts render marks inputs.
export interface QuestionView {
  kind: QuestionKind;
  question: ContentItem[];
  options: OptionItem[];
  solutionParts: TestPrepSolutionPart[];
  totalMarks: number | null;
  marksAwardedSum: number;
  hint: ContentItem[];
}

// --- Request/response payloads for features/questions/services/questions.service.ts ---

export interface GetQuestionsPayload {
  template_id: string;
  filter_value: string | number | (string | number)[];
  status_filter?: QuestionStatus[];
}

export interface GetByQidPayload {
  template_id: string;
  qid: number;
}

export interface SearchQuestionsPayload {
  template_id: string;
  text: string;
}

export interface SearchByLuidsPayload {
  template_id: string;
  luids: string[];
}

export interface UpdateQuestionPayload {
  template_id: string;
  id: string;
  qid: number;
  question: ContentItem[];
  solution: ContentItem[];
  options?: OptionItem[];
  hint?: ContentItem[];
  updated_by: string;
  updated_at: string;
  content_only?: boolean;
}

export interface DeleteQuestionPayload {
  template_id: string;
  id: string;
  comment: string;
}


export interface SubmitForReviewPayload {
  template_id: string;
  qids: number[];
  submitted_by: string;
  submitted_at: string;
}

export interface SubmitForReviewResult {
  success: number[];
  failed: { qid: number; reason: string }[];
}

export type ReviewAction = "accept" | "re_edit" | "reject";

export interface ReviewQuestionPayload {
  template_id: string;
  qid: number;
  action: ReviewAction;
  comment?: string;
  reviewed_by: string;
  reviewed_at: string;
}

export interface VersionEntry {
  version: number;
  changed_by: string;
  changed_at: string;
  change_type: string;
  role: string;
  previous_status: QuestionStatus;
  new_status: QuestionStatus;
  snapshot: QuestionDocument;
}

export interface VersionHistory {
  qid: number;
  template_id: string;
  collection_name: string;
  versions: VersionEntry[];
}
