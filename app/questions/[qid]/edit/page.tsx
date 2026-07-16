import { QuestionEditorPage } from "@/features/questions/components/QuestionEditorPage";

export default async function EditQuestion({
  params,
  searchParams,
}: {
  params: Promise<{ qid: string }>;
  searchParams: Promise<{ template_id?: string }>;
}) {
  const { qid } = await params;
  const { template_id } = await searchParams;
  return <QuestionEditorPage qid={Number(qid)} templateId={template_id ?? ""} />;
}
