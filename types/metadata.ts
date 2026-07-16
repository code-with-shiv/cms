export interface ChapterOption {
  chapter_id: number | string;
  chapter_name: string;
}

export interface TopicOption {
  topic_id: number | string;
  topic_name: string;
}

export interface LearningUnitOption {
  lu?: string;
  luid?: string;
  lu_name?: string;
}

export interface LearningUnitsByChapter {
  chapter_name: string;
  topics: Array<TopicOption & { learning_units?: LearningUnitOption[] }>;
}

export interface HierarchicalChapter {
  chapter_id?: number | string;
  chapter_name: string;
  topics: Array<TopicOption & { learning_units?: LearningUnitOption[] }>;
}

export interface LoLuTag {
  qid: number | string;
  lu: string;
  lo: string;
}
