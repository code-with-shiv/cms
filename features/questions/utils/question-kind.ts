import type {
  OptionItem,
  QuestionDocument,
  QuestionKind,
  QuestionView,
  TemplateSchema,
  TestPrepSolutionPart,
} from "@/types/question";

export function getQuestionKind(schema: Pick<TemplateSchema, "question_type">): QuestionKind {
  return schema.question_type;
}

export function toQuestionView(doc: QuestionDocument, schema: TemplateSchema): QuestionView {
  const solution = doc.solution ?? [];
  const solutionParts: TestPrepSolutionPart[] = solution.map((content) => ({
    content,
    marks: schema.test_based ? (content.marks ?? null) : null,
  }));
  const marksAwardedSum = solutionParts.reduce((sum, part) => sum + (part.marks ?? 0), 0);

  // Prefer the document's own total_marks (each question can have its own total)
  // over the template's default.
  const docTotalMarks = doc.total_marks;
  const rawTotalMarks =
    docTotalMarks !== null && docTotalMarks !== undefined && docTotalMarks !== ""
      ? docTotalMarks
      : schema.total_marks;

  return {
    kind: getQuestionKind(schema),
    question: doc.question ?? [],
    options: (doc.options ?? []) as OptionItem[],
    solutionParts,
    totalMarks: schema.test_based && rawTotalMarks ? Number(rawTotalMarks) : null,
    marksAwardedSum,
    hint: doc.hint ?? [],
  };
}
