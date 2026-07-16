import { apiClient } from "@/lib/axios";
import type {
  ChapterOption,
  HierarchicalChapter,
  LearningUnitOption,
  LearningUnitsByChapter,
  LoLuTag,
  TopicOption,
} from "@/types/metadata";

const CHAPTERS_TOPICS_PATH = "/api/v2/get_chapters_topics";

export async function getBoards(): Promise<string[]> {
  const { data } = await apiClient.get<{ data: string[] }>(CHAPTERS_TOPICS_PATH);
  return data.data;
}

export async function getGrades(board: string): Promise<string[]> {
  const { data } = await apiClient.get<{ data: string[] }>(CHAPTERS_TOPICS_PATH, {
    params: { board },
  });
  return data.data;
}

export async function getSubjects(board: string, grade: string): Promise<string[]> {
  const { data } = await apiClient.get<{ data: string[] }>(CHAPTERS_TOPICS_PATH, {
    params: { board, grade },
  });
  return data.data;
}

export async function getChapters(
  board: string,
  grade: string,
  subject: string,
): Promise<ChapterOption[]> {
  const { data } = await apiClient.get<{ data: ChapterOption[] }>(CHAPTERS_TOPICS_PATH, {
    params: { board, grade, subject },
  });
  return data.data;
}

export async function getTopics(chapterId: string): Promise<TopicOption[]> {
  const { data } = await apiClient.get<{ data: TopicOption[] }>(CHAPTERS_TOPICS_PATH, {
    params: { chapter_id: chapterId },
  });
  return data.data;
}

export async function getLearningUnits(topicId: string): Promise<LearningUnitOption[]> {
  const { data } = await apiClient.get<{ data: Array<LearningUnitsByChapter | LearningUnitOption> }>(
    CHAPTERS_TOPICS_PATH,
    { params: { topic_id: topicId } },
  );

  return data.data.flatMap((item) => {
    if ("topics" in item) {
      return item.topics.flatMap((topic) => topic.learning_units ?? []);
    }
    return item.luid ? [item] : [];
  });
}

export async function getHierarchicalMetadata(
  board: string,
  grade: string,
  subject: string,
): Promise<HierarchicalChapter[]> {
  const { data } = await apiClient.post<{ data: HierarchicalChapter[] }>(CHAPTERS_TOPICS_PATH, {
    board,
    grade,
    subject,
  });
  return data.data;
}

export async function getLoLus(
  templateId: string,
  board: string,
  grade: string,
  subject: string,
  chapterName: string,
): Promise<LoLuTag[]> {
  const { data } = await apiClient.post<{ data: LoLuTag[] }>(
    "/api/v2/questions/lo-lus",
    { board, grade, subject, chapter_name: chapterName },
    { params: { template_id: templateId } },
  );
  return data.data;
}
