import type { ContentItem, OptionItem } from "@/types/question";

// Extracted/hand-authored questions in the ingestion pipeline are loose,
// template-shaped dicts (no _id/qid yet) rather than full QuestionDocuments —
// mirror that looseness instead of inventing a fixed shape.
export interface IngestionQuestion {
  question_id?: string | number;
  question: ContentItem[];
  solution: ContentItem[];
  hint?: ContentItem[];
  options?: OptionItem[];
  isClone?: "true" | "false"; // string, only meaningful when template.can_have_clone
  isCloneOf?: string | null;
  [key: string]: unknown;
}

export interface InvalidQuestion {
  question_index: number;
  question_id: string | number;
  errors: string[];
  question_data: Record<string, unknown>;
}

export interface ProcessDocxPayload {
  file: File;
  grade: string;
  board: string;
  subject: string;
  chapter_name: string;
  template_id: string;
  publication?: string;
}

export interface ProcessDocxResponse {
  total_extracted: number;
  valid_questions: IngestionQuestion[];
  invalid_questions: InvalidQuestion[];
}

export interface PushToDatabasePayload {
  template_id: string;
  update: boolean;
  questions: IngestionQuestion[];
}

export interface PushToDatabaseResponse {
  message: string;
  qid_map: Record<string, number | string>;
}

export interface UploadFlashcardPayload {
  file: File;
  uploaded_by: string;
}

export interface FlashcardRecordResult {
  lu_id?: string | null;
  updated?: boolean;
  upserted?: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// A .zip input yields one result-array per contained file; .docx/.json yield a flat array.
export interface UploadFlashcardResponse {
  data: FlashcardRecordResult[] | FlashcardRecordResult[][];
}

export interface UploadQuestionsJsonPayload {
  file: File;
  template_id: string;
  uploaded_by: string;
}

export interface UploadQuestionsJsonResponse {
  data: {
    inserted: number;
    collection?: string;
    message?: string;
  };
}

export interface GenerateQuesPayload {
  subject: string;
  grade: string;
  chapter_name: string;
  topics: string;
  file: File;
}

export interface ExtractedQuestion {
  question: string;
}

export interface RephrasedQuestion {
  topic: string;
  topic_id: string | number;
  question: string;
}

export interface GenerateQuesResponse {
  // Both fields are independently nullable even on HTTP 200 (internal LLM/parse
  // failures are swallowed server-side) — never assume one implies the other.
  extracted_questions: ExtractedQuestion[] | null;
  final_rephrased_questions: Record<string, RephrasedQuestion[]> | null;
}

export interface QueuedFlashcardFile {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  results?: FlashcardRecordResult[];
  error?: string;
}

export interface PublishContentPayload {
  questions: IngestionQuestion[];
  images: unknown[]; // required by the backend model but unused server-side — always send []
  email: string;
  question_type: "objective" | "subjective";
  template_id: string;
  submit_for_review?: boolean;
}

export interface PublishContentResponse {
  message: string;
  questions_published: number;
  temp_qid: string;
  assigned_qids: (number | string)[];
  published_timestamp: string;
  published_by: string;
  status: string;
  questions: IngestionQuestion[];
}
