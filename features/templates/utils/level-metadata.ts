import type { LevelMetadataFields, TemplateLevel } from "@/types/template";

// Mirrors the mandatory/not_allowed rules in cms-backend TemplateCreateRequest.validate_template —
// each level maps to exactly one valid combination of these booleans.
const LEVEL_METADATA: Record<TemplateLevel, LevelMetadataFields> = {
  lu: {
    luid: true,
    lu_name: true,
    loid: true,
    lo_name: true,
    topic_id: true,
    chapter_id: true,
    lus_covered: false,
    topics_covered: false,
  },
  topic: {
    luid: false,
    lu_name: false,
    loid: false,
    lo_name: false,
    topic_id: true,
    chapter_id: true,
    lus_covered: true,
    topics_covered: false,
  },
  chapter: {
    luid: false,
    lu_name: false,
    loid: false,
    lo_name: false,
    topic_id: false,
    chapter_id: true,
    lus_covered: false,
    topics_covered: true,
  },
};

export function getLevelMetadata(level: TemplateLevel): LevelMetadataFields {
  return LEVEL_METADATA[level];
}

export const LEVEL_METADATA_FIELD_LABELS: Record<keyof LevelMetadataFields, string> = {
  luid: "LU ID",
  lu_name: "LU Name",
  loid: "LO ID",
  lo_name: "LO Name",
  topic_id: "Topic ID",
  chapter_id: "Chapter ID",
  lus_covered: "LUs Covered",
  topics_covered: "Topics Covered",
};
