export type DashboardFilterValue = string | number | Array<string | number>;

export interface GetDashboardPayload {
  template_id: string;
  filter_value: DashboardFilterValue;
}

export interface DashboardLevelCount {
  level: string;
  question_count: number;
}

export interface DashboardLearningUnit {
  luid: string;
  lu: string;
  lu_name: string;
  level_counts: DashboardLevelCount[];
  total_count: number;
}

export interface DashboardLuChapter {
  chapter_name: string;
  grade: string;
  learning_units: DashboardLearningUnit[];
  chapter_total_count: number;
}

export interface DashboardCloneEntry {
  lo: string;
  loid: string;
  clones: Array<number | string>;
}

export type DashboardCloneMapping = Record<string, DashboardCloneEntry>;

export interface DashboardCloneMappingItem {
  luid: string;
  clones_by_original: DashboardCloneMapping;
}

export interface DashboardTopicItem {
  topic_id: string | number;
  topic_name: string;
  question_count: number;
}

export interface DashboardChapterItem {
  chapter_id: string | number;
  chapter_name: string;
  question_format: string;
  question_count: number;
}

export interface DashboardApiResult {
  dashboard_data: DashboardLuChapter[] | DashboardTopicItem[] | DashboardChapterItem[];
  original_clone_mapping?: DashboardCloneMappingItem[];
}
