"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LuCheck,
  LuClock,
  LuEye,
  LuEyeOff,
  LuHistory,
  LuLightbulb,
  LuSave,
  LuTrash2,
  LuUser,
  LuX,
} from "react-icons/lu";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/common/AppShell";
import { RenderInline } from "@/features/questions/components/RenderInline";
import { VersionHistoryModal } from "@/features/questions/components/VersionHistoryModal";
import { QuestionBlockEditor } from "@/features/questions/components/blocks/QuestionBlockEditor";
import { contentBlocksToHtml, contentBlocksToText, insertBlockAbove, insertBlockBelow, removeBlockAt } from "@/features/questions/utils/content-blocks";
import { toQuestionView } from "@/features/questions/utils/question-kind";
import { getTemplateSchema } from "@/features/questions/services/template-schema.service";
import {
  deleteQuestion,
  getQuestionByQid,
  updateQuestion,
} from "@/features/questions/services/questions.service";
import { getApiErrorMessage } from "@/utils/api-error";
import type { ContentItem, OptionItem, QuestionDocument, TemplateSchema } from "@/types/question";

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

function ensureAtLeastOneBlock(blocks: ContentItem[]): ContentItem[] {
  return blocks.length ? blocks : [{ type: "text", content: "" }];
}

function buildEditorState(doc: QuestionDocument, schema: TemplateSchema): EditorState {
  const view = toQuestionView(doc, schema);

  const options: EditorOption[] = view.options.flatMap((opt) => {
    if (!contentBlocksToText(opt.option).trim()) return [];
    return [
      {
        option: ensureAtLeastOneBlock(opt.option ?? []),
        dr: opt.dr ?? [],
        isCorrect: Boolean(opt.is_correct),
        isDrExpanded: false,
      },
    ];
  });

  return {
    question: ensureAtLeastOneBlock(view.question),
    options,
    solution: ensureAtLeastOneBlock(doc.solution ?? []),
    hint: ensureAtLeastOneBlock(view.hint),
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

interface QuestionEditorPageProps {
  qid: number;
  templateId: string;
}

export function QuestionEditorPage({ qid, templateId }: QuestionEditorPageProps) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [doc, setDoc] = useState<QuestionDocument | null>(null);
  const [schema, setSchema] = useState<TemplateSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!templateId || !qid) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const [docs, templateSchema] = await Promise.all([
          getQuestionByQid({ template_id: templateId, qid }),
          getTemplateSchema(templateId),
        ]);
        if (cancelled) return;
        if (!docs.length) {
          setError(`Could not find question Q-${qid}.`);
          return;
        }
        setDoc(docs[0]);
        setSchema(templateSchema);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, `Could not load question Q-${qid}.`));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [templateId, qid]);

  if (!templateId) {
    return (
      <AppShell title="edit-question">
        <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          Template ID is missing. Open this editor from the Questions page.
        </div>
      </AppShell>
    );
  }

  if (isAuthLoading || isLoading) {
    return (
      <AppShell title="edit-question">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
          Loading question editor…
        </div>
      </AppShell>
    );
  }

  if (error || !doc || !schema || !user) {
    return (
      <AppShell title="edit-question">
        <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          {error || `Could not load question Q-${qid}.`}
        </div>
      </AppShell>
    );
  }

  return (
    <LoadedQuestionEditor
      key={`${templateId}-${qid}-${doc._id}`}
      qid={qid}
      templateId={templateId}
      doc={doc}
      schema={schema}
      userEmail={user.email}
      role={user.role}
    />
  );
}

function LoadedQuestionEditor({
  qid,
  templateId,
  doc,
  schema,
  userEmail,
  role,
}: {
  qid: number;
  templateId: string;
  doc: QuestionDocument;
  schema: TemplateSchema;
  userEmail: string;
  role: string;
}) {
  const router = useRouter();
  const [backUrl] = useState(() => sessionStorage.getItem("prev-ques-url") ?? "/questions");
  const [form, setForm] = useState<EditorState>(() => buildEditorState(doc, schema));
  const [status, setStatus] = useState(doc.status);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [activeBlockKey, setActiveBlockKey] = useState<string | null>(null);

  const canDelete = role === "reviewer" || role === "admin" || role === "superadmin";
  // Backend now flips status straight to pending_review on any creator save (no separate
  // submit step) — the label just reflects that when there's a meaningful transition to make.
  const saveSubmits = role === "creator" && (status === "draft" || status === "re_edit");
  const hasMarksData = schema.test_based;
  const totalMarks = hasDisplayValue(doc.total_marks) ? String(doc.total_marks) : (schema.total_marks ?? null);

  const questionText = contentBlocksToText(form.question);
  const questionHtml = contentBlocksToHtml(form.question);
  const solutionText = contentBlocksToText(form.solution);
  const solutionHtml = contentBlocksToHtml(form.solution);
  const hintText = contentBlocksToText(form.hint);
  const solutionMarksTotal = form.solution.reduce((total, block) => total + (Number(block.marks) || 0), 0);

  const checklist = useMemo(
    () => [
      { label: "Question text (20+ chars)", complete: questionText.trim().length >= 20 },
      {
        label: form.options.length ? `All ${form.options.length} options filled` : "Solution provided",
        complete: form.options.length
          ? form.options.every((o) => contentBlocksToText(o.option).trim())
          : Boolean(solutionText.trim()),
      },
      { label: "Solution provided", complete: Boolean(solutionText.trim()) },
      { label: "Chapter mapped", complete: Boolean(doc.chapter_name) },
      { label: "Difficulty selected", complete: Boolean(doc.difficulty_level) },
    ],
    [form.options, questionText, solutionText, doc],
  );
  const completedChecks = checklist.filter((c) => c.complete).length;

  function toggleDr(optionIndex: number) {
    setForm((c) => ({
      ...c,
      options: c.options.map((o, i) => {
        if (i !== optionIndex) return o;
        const nextExpanded = !o.isDrExpanded;
        const dr = nextExpanded && o.dr.length === 0 ? [{ type: "text", content: "" }] : o.dr;
        return { ...o, isDrExpanded: nextExpanded, dr };
      }),
    }));
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
              userEmail={userEmail}
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

  async function handleSave(): Promise<boolean> {
    setError("");
    setIsSaving(true);
    try {
      const options: OptionItem[] = schema.options
        ? form.options.map((opt, index) => ({
            ...(doc.options?.[index] ?? { option: [], is_correct: false }),
            option: opt.option,
            is_correct: opt.isCorrect,
            dr: opt.dr,
          }))
        : [];

      await updateQuestion({
        template_id: templateId,
        id: doc._id,
        qid,
        question: form.question,
        solution: form.solution,
        options,
        hint: form.hint,
        updated_by: userEmail,
        updated_at: new Date().toISOString(),
        content_only: true,
      });
      if (role === "creator") {
        setStatus("pending_review");
        setNotice(saveSubmits ? "Question saved and submitted for review." : "Question saved.");
      } else {
        setNotice("Question saved.");
      }
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save question."));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setError("");
    setIsDeleting(true);
    try {
      await deleteQuestion({
        template_id: templateId,
        id: doc._id,
        comment: deleteReason.trim() || "No reason provided",
      });
      router.push(backUrl);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not delete question."));
      setIsDeleting(false);
    }
  }

  return (
    <AppShell title="edit-question">
      <section className="flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-slate-100">
        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-2.5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button type="button" onClick={() => router.push(backUrl)} className="text-slate-500 hover:text-slate-900">
              ← Questions
            </button>
            <span className="text-slate-300">›</span>
            <strong className="text-sm text-slate-900">Q-{qid} · Edit</strong>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold capitalize text-slate-600">
              {status.replace(/_/g, " ")}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(backUrl)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <LuX /> Cancel
            </button>
            <button
              type="button"
              onClick={() => setIsPreviewMode((c) => !c)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {isPreviewMode ? <LuEyeOff /> : <LuEye />} {isPreviewMode ? "Hide Preview" : "Preview"}
            </button>
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <LuHistory /> History
            </button>
            {canDelete ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <LuTrash2 /> Delete
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              <LuSave /> {isSaving ? "Saving…" : saveSubmits ? "Save & Submit for Review" : "Save"}
            </button>
          </div>
        </div>

        {showDeleteConfirm ? (
          <div className="border-b border-rose-200 bg-rose-50 px-5 py-3">
            <p className="mb-2 text-xs font-semibold text-rose-800">Delete Q-{qid}? This sets its status to rejected.</p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Reason (optional)"
                className="h-8 flex-1 rounded-md border border-rose-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex h-8 items-center rounded-md bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
              >
                {isDeleting ? "Deleting…" : "Confirm Delete"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {error ? <div className="border-b border-rose-200 bg-rose-50 px-5 py-2 text-xs text-rose-700">{error}</div> : null}
        {notice ? <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-2 text-xs text-emerald-700">{notice}</div> : null}

        <div className={`grid min-h-0 flex-1 ${isPreviewMode ? "xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.95fr)]" : "grid-cols-1"}`}>
          <div
            className="min-h-0 space-y-4 overflow-y-auto border-r border-slate-200 p-5"
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
              {renderBlocks("question", form.question, (next) => setForm((c) => ({ ...c, question: next })))}
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
                            setForm((c) => ({
                              ...c,
                              options: c.options.map((o, i) => ({ ...o, isCorrect: i === index })),
                            }))
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
                            className={`ml-auto cursor-pointer rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                              option.isDrExpanded ? "bg-rose-100 text-rose-700 hover:bg-rose-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            {option.isDrExpanded ? "Hide DR" : "Show DR"}
                          </button>
                        )}
                      </div>

                      {renderBlocks(`option-${index}`, option.option, (next) =>
                        setForm((c) => ({
                          ...c,
                          options: c.options.map((o, i) => (i === index ? { ...o, option: next } : o)),
                        })),
                      )}

                      {!option.isCorrect && option.isDrExpanded ? (
                        <div className="mt-2 border-t border-dashed border-rose-100 pt-2">
                          <span className="mb-2 inline-block rounded-md border border-rose-100 bg-rose-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-600">
                            DR
                          </span>
                          {renderBlocks(`dr-${index}`, option.dr, (next) =>
                            setForm((c) => ({
                              ...c,
                              options: c.options.map((o, i) => (i === index ? { ...o, dr: next } : o)),
                            })),
                          )}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </EditorCard>
            ) : null}

            <EditorCard title="Solution">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <label className="block text-xs font-semibold text-slate-800">Solution / Explanation</label>
                {totalMarks ? (
                  <span
                    className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-bold text-indigo-700"
                    title={`Assigned ${solutionMarksTotal} of ${totalMarks} marks`}
                  >
                    Total: {marksLabel(totalMarks)}
                  </span>
                ) : null}
              </div>
              {renderBlocks("solution", form.solution, (next) => setForm((c) => ({ ...c, solution: next })), {
                marksEditable: hasMarksData,
              })}
            </EditorCard>

            {schema.hint ? (
              <EditorCard title="Hint (optional)">
                <label className="mb-2 block text-xs font-semibold text-slate-800">Hint</label>
                {renderBlocks("hint", form.hint, (next) => setForm((c) => ({ ...c, hint: next })))}
              </EditorCard>
            ) : null}
          </div>

          {isPreviewMode ? (
            <aside className="min-h-0 space-y-4 overflow-y-auto p-5">
              <EditorCard title="Status">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-[11px] font-semibold text-slate-800">
                    Question Status
                    <input
                      value={status.replace(/_/g, " ")}
                      readOnly
                      className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-normal capitalize"
                    />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <LuUser /> Author: {String(doc.updated_by ?? userEmail)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <LuClock /> Updated: {String(doc.updated_at ?? "—")}
                  </span>
                </div>
              </EditorCard>

              <EditorCard title="Pre-publish checklist">
                <div className="mb-4 flex items-center justify-between text-[11px] font-bold text-emerald-700">
                  <span>
                    {completedChecks}/{checklist.length}
                  </span>
                </div>
                <div className="mb-4 h-1 rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${(completedChecks / checklist.length) * 100}%` }} />
                </div>
                <div className="space-y-3">
                  {checklist.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-xs text-slate-800">
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
                          item.complete ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        <LuCheck className="h-3 w-3" />
                      </span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </EditorCard>

              <EditorCard title="Student preview">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <RenderInline
                    content={questionHtml || "Question preview"}
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
                        {totalMarks ? (
                          <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white">
                            Total: {marksLabel(totalMarks)}
                          </span>
                        ) : null}
                      </div>
                      {hasMarksData && form.solution.some((b) => hasDisplayValue(b.marks)) ? (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {form.solution.map((block, index) =>
                            hasDisplayValue(block.marks) ? (
                              <span key={index} className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                Part {index + 1}: {marksLabel(String(block.marks))}
                              </span>
                            ) : null,
                          )}
                        </div>
                      ) : null}
                      <RenderInline content={solutionHtml} className="text-xs leading-6 text-slate-700" style={{ padding: 0, overflow: "visible" }} />
                    </div>
                  ) : null}
                </div>
              </EditorCard>
            </aside>
          ) : null}
        </div>
      </section>

      {showHistory ? (
        <VersionHistoryModal qid={qid} templateId={templateId} onClose={() => setShowHistory(false)} />
      ) : null}
    </AppShell>
  );
}
