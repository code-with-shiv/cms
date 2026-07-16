export type QuestionType = "subjective" | "objective";
export type TemplateLevel = "lu" | "topic" | "chapter";

export const ALLOWED_QUESTION_FORMATS = [
  "subjective-1marks",
  "subjective-2marks",
  "subjective-3marks",
  "subjective-4marks",
  "casestudy-4marks",
  "subjective-5marks",
  "subjective",
  "objective",
  "objective-ar",
] as const;

export type QuestionFormat = (typeof ALLOWED_QUESTION_FORMATS)[number];

export interface LevelMetadataFields {
  luid: boolean;
  lu_name: boolean;
  loid: boolean;
  lo_name: boolean;
  topic_id: boolean;
  chapter_id: boolean;
  lus_covered: boolean;
  topics_covered: boolean;
}

export interface TemplateCreatePayload extends LevelMetadataFields {
  template_name: string;
  question_type: QuestionType;
  level: TemplateLevel;
  allowed_question_format: QuestionFormat[];
  options: boolean;
  hint: boolean;
  can_have_clone: boolean;
  requires_year: boolean;
  test_based: boolean;
  created_by: string;
}

export interface Template extends TemplateCreatePayload {
  template_id: string;
  collection_name: string;
}
