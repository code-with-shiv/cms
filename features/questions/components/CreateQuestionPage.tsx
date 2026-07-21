"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LuCheck,
  LuExternalLink,
  LuEye,
  LuEyeOff,
  LuLightbulb,
  LuPlus,
  LuSave,
  LuSend,
  LuTrash2,
  LuTriangleAlert,
} from "react-icons/lu";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/common/AppShell";
import { RenderInline } from "@/features/questions/components/RenderInline";
import { QuestionBlockEditor } from "@/features/questions/components/blocks/QuestionBlockEditor";
import { HierarchyPicker, type HierarchyPathResult } from "@/features/metadata/components/HierarchyPicker";
import { AssignmentScopeCards } from "@/features/assignments/components/AssignmentScopeCards";
import { Select } from "@/components/ui/Select";
import { contentBlocksToText, insertBlockAbove, insertBlockBelow, removeBlockAt } from "@/features/questions/utils/content-blocks";
import { getTemplateSchema } from "@/features/questions/services/template-schema.service";
import { publishContent } from "@/features/questions/services/questions.service";
import { getApiErrorMessage } from "@/utils/api-error";
import type { ContentItem, OptionItem, TemplateSchema } from "@/types/question";
import type { IngestionQuestion } from "@/types/ingestion";
import type { Assignment } from "@/types/assignment";
import type { Template } from "@/types/template";

const ALLOWED_ROLES = ["creator", "admin", "superadmin"];
const DIFFICULTY_OPTIONS = ["easy", "medium", "hard"];

interface EditorOption {
  option: ContentItem[];
  dr: ContentItem[];
  isCorrect: boolean;
  isDrExpanded: boolean;
}

interface EditorState {
  question: ContentItem[];
  options: EditorOption[];
  solution: ContentItem[];
  hint: ContentItem[];
}

function hasDisplayValue(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

function marksLabel(value: string) {
  return `${value} ${Number(value) === 1 ? "Mark" : "Marks"}`;
}

function blankBlock(): ContentItem[] {
  return [{ type: "text", content: "" }];
}

function blankOption(): EditorOption {
  return { option: blankBlock(), dr: [], isCorrect: false, isDrExpanded: false };
}

function assignmentToHierarchy(a: Assignment, template: Template): HierarchyPathResult {
  return {
    template,
    board: a.assignment_json.board,
    grade: a.assignment_json.grade,
    subject: a.assignment_json.subject,
    chapterId: a.assignment_json.chapter_id,
    chapterName: a.assignment_json.chapter_name,
    topicId: a.assignment_json.topic_id,
    topicName: a.assignment_json.topic_name,
    luid: a.assignment_json.luid,
    luName: a.assignment_json.lu_name,
  };
}

function buildBlankState(schema: TemplateSchema): EditorState {
  return {
    question: blankBlock(),
    options: schema.options ? Array.from({ length: 4 }, blankOption) : [],
    solution: blankBlock(),
    hint: blankBlock(),
  };
}

function EditorCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

export function CreateQuestionPage() {
  const { user, isLoading: isAuthLoading } = useAuth();

  const [hierarchy, setHierarchy] = useState<HierarchyPathResult | null>(null);
  const [schema, setSchema] = useState<TemplateSchema | null>(null);
  const [isSchemaLoading, setIsSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState("");

  const [form, setForm] = useState<EditorState | null>(null);
  const [difficulty, setDifficulty] = useState("");
  const [year, setYear] = useState("");
  const [questionFormat, setQuestionFormat] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [isClone, setIsClone] = useState(false);
  const [cloneOfQid, setCloneOfQid] = useState("");

  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastCreatedQid, setLastCreatedQid] = useState<number | string | null>(null);
  const [activeBlockKey, setActiveBlockKey] = useState<string | null>(null);

  const templateId = hierarchy?.template.template_id ?? "";

  useEffect(() => {
    if (!templateId) {
      setSchema(null);
      return;
    }
    let cancelled = false;
    setIsSchemaLoading(true);
    setSchemaError("");
    getTemplateSchema(templateId)
      .then((result) => {
        if (!cancelled) setSchema(result);
      })
      .catch((err) => {
        if (!cancelled) setSchemaError(getApiErrorMessage(err, "Could not load template schema."));
      })
      .finally(() => {
        if (!cancelled) setIsSchemaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  function resetContent(nextSchema: TemplateSchema) {
    setForm(buildBlankState(nextSchema));
    setDifficulty("");
    setYear("");
    setQuestionFormat("");
    setTotalMarks(hasDisplayValue(nextSchema.total_marks) ? String(nextSchema.total_marks) : "");
    setIsClone(false);
    setCloneOfQid("");
    setActiveBlockKey(null);
  }

  useEffect(() => {
    if (schema) resetContent(schema);
    else setForm(null);
  }, [schema]);

  const questionText = contentBlocksToText(form?.question ?? []);
  const solutionText = contentBlocksToText(form?.solution ?? []);
  const hintText = contentBlocksToText(form?.hint ?? []);
  const solutionMarksTotal = (form?.solution ?? []).reduce((total, block) => total + (Number(block.marks) || 0), 0);

  const validationErrors = useMemo(() => {
    if (!schema || !form) return [];
    const errors: string[] = [];
    if (!questionText.trim()) errors.push("Question text is required.");
    if (schema.options) {
      if (form.options.length < 2) errors.push("At least two options are required.");
      if (form.options.some((o) => !contentBlocksToText(o.option).trim())) errors.push("All options must have content.");
      const correctCount = form.options.filter((o) => o.isCorrect).length;
      if (correctCount === 0) errors.push("Mark exactly one option as correct.");
      else if (correctCount > 1) errors.push("Only one option can be marked correct.");
    }
    if (!solutionText.trim()) errors.push("Solution / explanation is required.");
    if (!difficulty) errors.push("Difficulty is required.");
    if (schema.requires_year && !year.trim()) errors.push("Year is required for this template.");
    if (schema.test_based) {
      const totalMarksNum = Number(totalMarks);
      if (!totalMarks || Number.isNaN(totalMarksNum) || totalMarksNum <= 0) {
        errors.push("Total marks is required.");
      } else if (Math.abs(solutionMarksTotal - totalMarksNum) > 0.01) {
        errors.push(`Solution part marks (${solutionMarksTotal}) must sum to the total marks (${totalMarksNum}).`);
      }
    }
    if (schema.allowed_question_format.length && !questionFormat) errors.push("Question format is required.");
    if (isClone && !cloneOfQid.trim()) errors.push("Clone-of QID is required when marked as a clone.");
    return errors;
  }, [schema, form, questionText, solutionText, difficulty, year, totalMarks, solutionMarksTotal, questionFormat, isClone, cloneOfQid]);

  function toggleDr(optionIndex: number) {
    setForm((c) => {
      if (!c) return c;
      return {
        ...c,
        options: c.options.map((o, i) => {
          if (i !== optionIndex) return o;
          const nextExpanded = !o.isDrExpanded;
          const dr = nextExpanded && o.dr.length === 0 ? [{ type: "text", content: "" }] : o.dr;
          return { ...o, isDrExpanded: nextExpanded, dr };
        }),
      };
    });
  }

  function addOption() {
    setForm((c) => (c ? { ...c, options: [...c.options, blankOption()] } : c));
  }

  function removeOption(index: number) {
    setForm((c) => (c ? { ...c, options: c.options.filter((_, i) => i !== index) } : c));
  }

  function renderBlocks(
    sectionKey: string,
    blocks: ContentItem[],
    setBlocks: (next: ContentItem[]) => void,
    options?: { marksEditable?: boolean },
  ) {
    return blocks.map((block, i) => {
      const blockKey = `${sectionKey}-${i}`;
      const isActive = activeBlockKey === blockKey;
      const text = block.content ?? "";

      if (isActive) {
        return (
          <div key={blockKey} data-editor-block="true" className="mb-2">
            <QuestionBlockEditor
              value={text}
              canEdit
              templateId={templateId}
              userEmail={user?.email ?? ""}
              disableDelete={blocks.length <= 1}
              onChange={(val) => {
                const next = [...blocks];
                next[i] = { ...next[i], content: val };
                setBlocks(next);
              }}
              onAddAbove={(content) => setBlocks(insertBlockAbove(blocks, i, content))}
              onAddBelow={(content) => setBlocks(insertBlockBelow(blocks, i, content))}
              onDelete={() => {
                setBlocks(removeBlockAt(blocks, i));
                setActiveBlockKey(null);
              }}
            />
            {options?.marksEditable ? (
              <div className="mt-1 flex items-center gap-2">
                <label className="text-[11px] font-semibold text-slate-500">Marks</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={hasDisplayValue(block.marks) ? String(block.marks) : ""}
                  onChange={(e) => {
                    const next = [...blocks];
                    next[i] = { ...next[i], marks: e.target.value ? Number(e.target.value) : null };
                    setBlocks(next);
                  }}
                  className="h-7 w-16 rounded-md border border-slate-300 px-2 text-xs text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>
            ) : null}
          </div>
        );
      }

      return (
        <button
          key={blockKey}
          type="button"
          data-editor-block="true"
          onClick={() => setActiveBlockKey(blockKey)}
          className="mb-1 w-full rounded-lg bg-white p-2 text-left ring-1 ring-transparent transition hover:ring-slate-200"
        >
          <RenderInline
            content={text || "Empty block — click to edit"}
            className="text-[13px] leading-6 text-slate-800"
            style={{ padding: 0, overflow: "visible" }}
          />
        </button>
      );
    });
  }

  function buildQuestionPayload(): IngestionQuestion {
    if (!schema || !form || !hierarchy) throw new Error("Form is not ready.");

    const options: OptionItem[] = schema.options
      ? form.options.map((opt) => ({ option: opt.option, is_correct: opt.isCorrect, dr: opt.dr }))
      : [];

    const payload: IngestionQuestion = {
      question: form.question,
      solution: form.solution,
      hint: schema.hint ? form.hint : [],
      options,
      board: hierarchy.board,
      grade: hierarchy.grade,
      subject: hierarchy.subject,
      chapter_id: hierarchy.chapterId,
      chapter_name: hierarchy.chapterName,
      difficulty_level: difficulty,
    };

    if (hierarchy.topicId) {
      payload.topic_id = hierarchy.topicId;
      payload.topic_name = hierarchy.topicName;
    }
    if (hierarchy.luid) {
      payload.luid = hierarchy.luid;
      payload.lu_name = hierarchy.luName;
    }
    if (hierarchy.loid) {
      payload.loid = hierarchy.loid;
      payload.lo_name = hierarchy.loName;
    }
    if (schema.requires_year) payload.year = year;
    if (schema.test_based) payload.total_marks = totalMarks;
    if (schema.allowed_question_format.length) payload.question_format = questionFormat;
    if (schema.can_have_clone) {
      payload.isClone = isClone ? "true" : "false";
      payload.isCloneOf = isClone ? cloneOfQid.trim() : null;
    }

    return payload;
  }

  async function handleCreate(submitForReview: boolean) {
    if (!schema || !user?.email || validationErrors.length) return;
    setError("");
    setNotice("");
    if (submitForReview) setIsSubmitting(true);
    else setIsSaving(true);
    try {
      const questionPayload = buildQuestionPayload();
      const response = await publishContent({
        questions: [questionPayload],
        images: [],
        email: user.email,
        question_type: schema.question_type,
        template_id: schema.template_id,
        submit_for_review: submitForReview,
      });
      const qid = response.assigned_qids[0];
      setLastCreatedQid(qid ?? null);
      setNotice(`Question Q-${qid} created (${response.status.replace(/_/g, " ")}). Form reset — you can create another.`);
      resetContent(schema);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create question."));
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  }

  if (isAuthLoading) {
    return (
      <AppShell title="create-question">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading…</div>
      </AppShell>
    );
  }

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return (
      <AppShell title="create-question">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
          You don&apos;t have permission to view this page.
        </div>
      </AppShell>
    );
  }

  const canSubmitForReview = user.role === "creator";
  const isReady = Boolean(schema && form);
  const isCreator = user.role === "creator";

  return (
    <AppShell title="create-question">
      <section className="flex min-h-[calc(100vh-64px)] flex-col bg-slate-100">
        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-2.5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {hierarchy ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                {hierarchy.template.template_name}
              </span>
            ) : null}
          </div>

          {isReady ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPreviewMode((c) => !c)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {isPreviewMode ? <LuEyeOff /> : <LuEye />} {isPreviewMode ? "Hide Preview" : "Preview"}
              </button>
              {canSubmitForReview ? (
                <button
                  type="button"
                  onClick={() => handleCreate(true)}
                  disabled={isSaving || isSubmitting || validationErrors.length > 0}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-violet-100 px-4 text-xs font-semibold text-violet-700 hover:bg-violet-200 disabled:opacity-60"
                >
                  <LuSend /> {isSubmitting ? "Submitting…" : "Submit for Review"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => handleCreate(false)}
                disabled={isSaving || isSubmitting || validationErrors.length > 0}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                <LuSave /> {isSaving ? "Saving…" : "Save Draft"}
              </button>
            </div>
          ) : null}
        </div>

        {error ? <div className="border-b border-rose-200 bg-rose-50 px-5 py-2 text-xs text-rose-700">{error}</div> : null}
        {notice ? (
          <div className="flex flex-wrap items-center gap-3 border-b border-emerald-200 bg-emerald-50 px-5 py-2 text-xs text-emerald-700">
            <span>{notice}</span>
            {lastCreatedQid !== null && schema ? (
              <Link
                href={`/questions/${lastCreatedQid}/edit?template_id=${schema.template_id}`}
                className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:underline"
              >
                Open Q-{lastCreatedQid} <LuExternalLink className="h-3 w-3" />
              </Link>
            ) : null}
          </div>
        ) : null}

        <div className="mx-auto w-full max-w-6xl space-y-4 p-5">
          <EditorCard title={isCreator ? "Your assignments" : "Template & metadata path"}>
            {isCreator ? (
              <AssignmentScopeCards
                onSelect={(a, template) => {
                  if (!template) return;
                  setHierarchy(assignmentToHierarchy(a, template));
                }}
              />
            ) : (
              <HierarchyPicker onChange={setHierarchy} />
            )}
            {isSchemaLoading ? <p className="mt-2 text-xs text-slate-500">Loading template schema…</p> : null}
            {schemaError ? <p className="mt-2 text-xs text-rose-600">{schemaError}</p> : null}
          </EditorCard>

          {!hierarchy ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500">
              {isCreator
                ? "Select one of your assigned cards above to start authoring a question."
                : "Select a full board / grade / subject / chapter path above to start authoring a question."}
            </div>
          ) : null}

          {isReady && schema && form && hierarchy ? (
            <>
              {validationErrors.length ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  <div className="mb-1 flex items-center gap-1.5 font-bold">
                    <LuTriangleAlert /> Complete the following before saving
                  </div>
                  <ul className="list-inside list-disc space-y-0.5">
                    {validationErrors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className={`grid gap-4 ${isPreviewMode ? "xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.95fr)]" : "grid-cols-1"}`}>
                <div
                  className="space-y-4"
                  onMouseDown={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('[data-editor-block="true"]')) return;
                    if (target.closest(".fixed")) return;
                    setActiveBlockKey(null);
                  }}
                >
                  <EditorCard title="Question text">
                    <label className="mb-2 block text-xs font-semibold text-slate-800">
                      Question <span className="text-rose-500">*</span>
                    </label>
                    {renderBlocks("question", form.question, (next) => setForm((c) => (c ? { ...c, question: next } : c)))}
                  </EditorCard>

                  {schema.options ? (
                    <EditorCard title="Answer options">
                      <div className="space-y-3">
                        {form.options.map((option, index) => (
                          <div key={index} className="rounded-lg border border-slate-200 p-3">
                            <div className="mb-2 flex items-center gap-3">
                              <input
                                type="radio"
                                name="correct-option"
                                checked={option.isCorrect}
                                onChange={() =>
                                  setForm((c) =>
                                    c
                                      ? { ...c, options: c.options.map((o, i) => ({ ...o, isCorrect: i === index })) }
                                      : c,
                                  )
                                }
                                className="h-4 w-4 accent-indigo-600"
                              />
                              <span
                                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                  option.isCorrect ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {String.fromCharCode(65 + index)}
                              </span>
                              {option.isCorrect ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                  <LuCheck /> Correct
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleDr(index)}
                                  className={`cursor-pointer rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                                    option.isDrExpanded
                                      ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                  }`}
                                >
                                  {option.isDrExpanded ? "Hide DR" : "Show DR"}
                                </button>
                              )}
                              {form.options.length > 2 ? (
                                <button
                                  type="button"
                                  onClick={() => removeOption(index)}
                                  aria-label="Remove option"
                                  className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                >
                                  <LuTrash2 className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </div>

                            {renderBlocks(`option-${index}`, option.option, (next) =>
                              setForm((c) =>
                                c ? { ...c, options: c.options.map((o, i) => (i === index ? { ...o, option: next } : o)) } : c,
                              ),
                            )}

                            {!option.isCorrect && option.isDrExpanded ? (
                              <div className="mt-2 border-t border-dashed border-rose-100 pt-2">
                                <span className="mb-2 inline-block rounded-md border border-rose-100 bg-rose-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-600">
                                  DR
                                </span>
                                {renderBlocks(`dr-${index}`, option.dr, (next) =>
                                  setForm((c) =>
                                    c ? { ...c, options: c.options.map((o, i) => (i === index ? { ...o, dr: next } : o)) } : c,
                                  ),
                                )}
                              </div>
                            ) : null}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addOption}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
                        >
                          <LuPlus className="h-3.5 w-3.5" /> Add option
                        </button>
                      </div>
                    </EditorCard>
                  ) : null}

                  <EditorCard title="Solution">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                      <label className="block text-xs font-semibold text-slate-800">Solution / Explanation</label>
                      {schema.test_based ? (
                        <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
                          Assigned {solutionMarksTotal} of {totalMarks || "?"} marks
                        </span>
                      ) : null}
                    </div>
                    {renderBlocks("solution", form.solution, (next) => setForm((c) => (c ? { ...c, solution: next } : c)), {
                      marksEditable: schema.test_based,
                    })}
                  </EditorCard>

                  {schema.hint ? (
                    <EditorCard title="Hint (optional)">
                      <label className="mb-2 block text-xs font-semibold text-slate-800">Hint</label>
                      {renderBlocks("hint", form.hint, (next) => setForm((c) => (c ? { ...c, hint: next } : c)))}
                    </EditorCard>
                  ) : null}

                  <EditorCard title="Question metadata">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-slate-800">
                        Difficulty <span className="text-rose-500">*</span>
                        <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="mt-2">
                          <option value="" disabled>
                            Select difficulty…
                          </option>
                          {DIFFICULTY_OPTIONS.map((d) => (
                            <option key={d} value={d}>
                              {d[0].toUpperCase() + d.slice(1)}
                            </option>
                          ))}
                        </Select>
                      </label>

                      {schema.allowed_question_format.length ? (
                        <label className="text-xs font-semibold text-slate-800">
                          Question format <span className="text-rose-500">*</span>
                          <Select value={questionFormat} onChange={(e) => setQuestionFormat(e.target.value)} className="mt-2">
                            <option value="" disabled>
                              Select format…
                            </option>
                            {schema.allowed_question_format.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </Select>
                        </label>
                      ) : null}

                      {schema.test_based ? (
                        <label className="text-xs font-semibold text-slate-800">
                          Total marks <span className="text-rose-500">*</span>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={totalMarks}
                            onChange={(e) => setTotalMarks(e.target.value)}
                            className="mt-2 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                          />
                        </label>
                      ) : null}

                      {schema.requires_year ? (
                        <label className="text-xs font-semibold text-slate-800">
                          Year <span className="text-rose-500">*</span>
                          <input
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="mt-2 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                          />
                        </label>
                      ) : null}
                    </div>

                    {schema.can_have_clone ? (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                          <input
                            type="checkbox"
                            checked={isClone}
                            onChange={(e) => setIsClone(e.target.checked)}
                            className="h-4 w-4 rounded accent-indigo-600"
                          />
                          This question is a clone of another
                        </label>
                        {isClone ? (
                          <input
                            value={cloneOfQid}
                            onChange={(e) => setCloneOfQid(e.target.value)}
                            placeholder="Original QID"
                            className="mt-2 h-9 w-full max-w-xs rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </EditorCard>
                </div>

                {isPreviewMode ? (
                  <aside className="space-y-4">
                    <EditorCard title="Student preview">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <RenderInline
                          content={questionText || "Question preview"}
                          className="text-sm font-semibold leading-6 text-slate-900"
                          style={{ padding: 0, overflow: "visible" }}
                        />
                        {form.options.length ? (
                          <div className="mt-4 space-y-2">
                            {form.options.map((option, index) => (
                              <div
                                key={index}
                                className={`flex items-center gap-3 rounded-lg border px-3 py-3 ${
                                  option.isCorrect ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white"
                                }`}
                              >
                                <span
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold ${
                                    option.isCorrect ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 text-slate-500"
                                  }`}
                                >
                                  {String.fromCharCode(65 + index)}
                                </span>
                                <span className="text-xs text-slate-800">{contentBlocksToText(option.option) || "Empty option"}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {hintText.trim() ? (
                          <div className="mt-4 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                            <LuLightbulb className="mt-0.5 shrink-0" />
                            <span>
                              <strong>Hint:</strong> {hintText}
                            </span>
                          </div>
                        ) : null}
                        {solutionText.trim() ? (
                          <div className="mt-4 border-t border-slate-200 pt-4">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Solution</p>
                              {schema.test_based && totalMarks ? (
                                <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white">
                                  Total: {marksLabel(totalMarks)}
                                </span>
                              ) : null}
                            </div>
                            <RenderInline content={solutionText} className="text-xs leading-6 text-slate-700" style={{ padding: 0, overflow: "visible" }} />
                          </div>
                        ) : null}
                      </div>
                    </EditorCard>

                    <EditorCard title="Metadata summary">
                      <dl className="space-y-1.5 text-xs text-slate-700">
                        <div className="flex justify-between gap-2">
                          <dt className="text-slate-500">Board / Grade / Subject</dt>
                          <dd className="text-right font-semibold">
                            {hierarchy.board} / {hierarchy.grade} / {hierarchy.subject}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-slate-500">Chapter</dt>
                          <dd className="text-right font-semibold">{hierarchy.chapterName}</dd>
                        </div>
                        {hierarchy.topicName ? (
                          <div className="flex justify-between gap-2">
                            <dt className="text-slate-500">Topic</dt>
                            <dd className="text-right font-semibold">{hierarchy.topicName}</dd>
                          </div>
                        ) : null}
                        {hierarchy.luName ? (
                          <div className="flex justify-between gap-2">
                            <dt className="text-slate-500">Learning Unit</dt>
                            <dd className="text-right font-semibold">{hierarchy.luName}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </EditorCard>
                  </aside>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
