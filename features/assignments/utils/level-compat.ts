import type { TemplateLevel } from "@/types/template";
import type { AssignmentLevel } from "@/types/assignment";

// Mirrors _LEVEL_TEMPLATE_LEVEL_MAP in cms-backend assignment_service.create_assignment:
// a chapter template hosts chapter/topic/lu assignments; a topic template hosts topic/lu; an lu template hosts lu only.
const ALLOWED_ASSIGNMENT_LEVELS: Record<TemplateLevel, AssignmentLevel[]> = {
  chapter: ["chapter", "topic", "lu"],
  topic: ["topic", "lu"],
  lu: ["lu"],
};

export function getAllowedAssignmentLevels(templateLevel: TemplateLevel): AssignmentLevel[] {
  return ALLOWED_ASSIGNMENT_LEVELS[templateLevel];
}

export const ASSIGNMENT_LEVEL_LABEL: Record<AssignmentLevel, string> = {
  lu: "LU",
  topic: "Topic",
  chapter: "Chapter",
};
