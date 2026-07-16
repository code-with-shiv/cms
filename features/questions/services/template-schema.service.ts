import { apiClient } from "@/lib/axios";
import type { TemplateSchema } from "@/types/question";

export async function getTemplateSchema(templateId: string): Promise<TemplateSchema> {
  const { data } = await apiClient.get<{ data: TemplateSchema }>(
    `/api/v2/questions/template-schema/${templateId}`,
  );
  return data.data;
}
