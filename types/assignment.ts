import type { TemplateLevel } from "@/types/template";

export type AssignmentLevel = TemplateLevel;
export type AssignmentStatus = "active" | "completed" | "reassigned";

// Free-form per backend (Dict[str, Any]) — Phase 3 always writes this shape.
export interface AssignmentScope {
  board: string;
  grade: string;
  subject: string;
  chapter_id: string;
  chapter_name: string;
  topic_id?: string;
  topic_name?: string;
  luid?: string;
  lu_name?: string;
}

export interface AssignmentCreatePayload {
  creator_email: string;
  reviewer_email?: string;
  template_id: string;
  level: AssignmentLevel;
  assignment_json: AssignmentScope;
  notes?: string;
}

export interface ReassignPayload {
  new_creator_email?: string; // omitted = keep same creator
  new_reviewer_email?: string; // omitted = keep same reviewer
  notes?: string; // omitted = carry over existing notes
}

export interface AssignmentFilterParams {
  creator_email?: string;
  reviewer_email?: string;
  status?: AssignmentStatus;
}

export interface Assignment {
  id: number;
  creator_email: string;
  reviewer_email: string | null;
  assigned_by_email: string;
  template_id: string;
  level: AssignmentLevel;
  assignment_json: AssignmentScope;
  notes: string | null;
  status: AssignmentStatus;
  assigned_at: string;
  completed_at: string | null;
}
