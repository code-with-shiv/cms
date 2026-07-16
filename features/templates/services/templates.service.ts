import { apiClient } from "@/lib/axios";
import type { Template, TemplateCreatePayload } from "@/types/template";

export async function createTemplate(
  payload: TemplateCreatePayload,
): Promise<{ templateId: string; message: string }> {
  const { data } = await apiClient.post<{
    data: { template_id: string; message: string };
  }>("/api/v2/create-template", payload);
  return { templateId: data.data.template_id, message: data.data.message };
}

// "edit" returns the full template document; "view" (unused here) returns a slim
// {template_id, template_name, level} projection meant for pickers/dropdowns.
export async function getTemplates(): Promise<Template[]> {
  const { data } = await apiClient.get<{ data: Template[] }>("/api/v2/get-templates/edit");
  return data.data;
}
