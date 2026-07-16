"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LuBookOpen, LuCheck, LuCopy, LuLightbulb, LuTag, LuX } from "react-icons/lu";
import { RenderInline } from "@/features/questions/components/RenderInline";
import { contentBlocksToText } from "@/features/questions/utils/content-blocks";
import type { QuestionDocument } from "@/types/question";

function hasDisplayValue(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

function marksLabel(value: string) {
  return `${value} ${Number(value) === 1 ? "Mark" : "Marks"}`;
}

interface SolutionPart {
  key: string;
  content: string;
  marks?: string;
}

function getSolutionParts(question: QuestionDocument): SolutionPart[] {
  const solution = question.solution ?? [];
  return solution.flatMap((item, index) => {
    const content = contentBlocksToText([item]);
    if (!content) return [];
    return [
      {
        key: `solution-${index}`,
        content,
        marks: hasDisplayValue(item.marks) ? String(item.marks) : undefined,
      },
    ];
  });
}

interface OptionRow {
  key: string;
  label: string;
  content: string;
  dr: string;
  isCorrect: boolean;
}

function getOptions(question: QuestionDocument): OptionRow[] {
  const options = question.options ?? [];
  return options.flatMap((option, index) => {
    const content = contentBlocksToText(option.option);
    if (!content) return [];
    return [
      {
        key: `${index}-${content.slice(0, 20)}`,
        label: String.fromCharCode(65 + index),
        content,
        dr: contentBlocksToText(option.dr ?? []),
        isCorrect: Boolean(option.is_correct),
      },
    ];
  });
}

function DetailPill({ label, value }: { label: string; value: unknown }) {
  const displayValue = hasDisplayValue(value) ? String(value) : "—";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500">
      <span>{label}:</span>
      <strong className="font-semibold text-slate-800">{displayValue}</strong>
    </span>
  );
}

interface QuestionDetailsModalProps {
  question: QuestionDocument;
  onClose: () => void;
}

export function QuestionDetailsModal({ question, onClose }: QuestionDetailsModalProps) {
  const [showAllDr, setShowAllDr] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const isClosingRef = useRef(false);

  const options = getOptions(question);
  const qid = question.qid ?? "—";
  const questionContent = contentBlocksToText(question.question) || "Question content is unavailable.";
  const solutionParts = getSolutionParts(question);
  const hint = contentBlocksToText(question.hint);
  const hasSolution = solutionParts.length > 0;
  const totalMarks = question.total_marks;
  const hasTotalMarks = hasDisplayValue(totalMarks);

  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsVisible(false);
    window.setTimeout(onClose, 180);
  }, [onClose]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setIsVisible(true));
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 backdrop-blur-[2px] transition-colors duration-200 ${
        isVisible ? "bg-slate-900/70" : "bg-slate-900/0"
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-details-title"
        className={`flex max-h-[92vh] w-full max-w-[1060px] flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl transition duration-200 ease-out ${
          isVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-[0.97] opacity-0"
        }`}
      >
        <header className="flex items-start justify-between gap-4 bg-slate-900 px-6 py-4 text-white">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="question-details-title" className="text-base font-bold">
                Question Details
              </h2>
              <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[11px] text-slate-300">Q-{qid}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[question.status, question.difficulty_level]
                .filter(Boolean)
                .map((value) => (
                  <span key={String(value)} className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                    {String(value)}
                  </span>
                ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close question details"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-slate-300 transition hover:bg-white/20 hover:text-white"
          >
            <LuX className="h-5 w-5" />
          </button>
        </header>

        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-6 py-3">
          <DetailPill label="Chapter" value={question.chapter_name} />
          <DetailPill label="Topic" value={question.topic_name} />
          <DetailPill label="LUID" value={question.luid} />
          {hasTotalMarks ? <DetailPill label="Total marks" value={totalMarks} /> : null}
        </div>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
          <main className="modal-scroll min-h-0 min-w-0 overflow-y-auto border-r border-slate-200 bg-white px-6 py-5">
            <RenderInline content={questionContent} className="text-[15px] font-semibold leading-7 text-slate-900" style={{ padding: 0, overflow: "visible" }} />

            {options.length ? (
              <section className="mt-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Answer options</h3>
                  <button
                    type="button"
                    onClick={() => setShowAllDr((c) => !c)}
                    aria-pressed={showAllDr}
                    className="inline-flex h-7 items-center rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  >
                    {showAllDr ? "Hide all DR" : "Show all DR"}
                  </button>
                </div>
                <div className="space-y-2">
                  {options.map((option) => (
                    <div
                      key={option.key}
                      className={`rounded-lg border px-3 py-3 ${
                        option.isCorrect ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                            option.isCorrect ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 text-slate-500"
                          }`}
                        >
                          {option.label}
                        </span>
                        <div className="min-w-0 flex-1">
                          <RenderInline content={option.content || "Empty option"} className="text-[13px] text-slate-800" style={{ padding: 0, overflow: "visible" }} />
                        </div>
                        {option.isCorrect ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-emerald-700">
                            <LuCheck className="h-3.5 w-3.5" />
                            Correct
                          </span>
                        ) : null}
                      </div>
                      {showAllDr && !option.isCorrect ? (
                        <div className="ml-10 mt-3 min-h-12 border-t border-slate-200 pt-3">
                          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">DR</p>
                          {option.dr ? (
                            <RenderInline content={option.dr} className="text-xs text-slate-600" style={{ padding: 0, overflow: "visible" }} />
                          ) : (
                            <p className="text-xs italic text-slate-400">No DR provided.</p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {hint ? (
              <section className="mt-6">
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Hint</h3>
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                  <LuLightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
                  <div className="min-w-0 flex-1">
                    <RenderInline content={hint} className="text-[13px] text-amber-800" style={{ padding: 0, overflow: "visible" }} />
                  </div>
                </div>
              </section>
            ) : null}

            {hasSolution ? (
              <section className="mt-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Solution</h3>
                  {hasTotalMarks ? (
                    <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white">
                      Total: {marksLabel(String(totalMarks))}
                    </span>
                  ) : null}
                </div>
                <div className="divide-y divide-indigo-100 rounded-r-lg border-l-4 border-indigo-600 bg-indigo-50 px-4">
                  {solutionParts.map((part) => (
                    <div key={part.key} className="py-3">
                      {part.marks !== undefined ? (
                        <span className="mb-2 inline-flex rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                          {marksLabel(part.marks)}
                        </span>
                      ) : null}
                      <RenderInline content={part.content} className="text-[13px] text-indigo-950" style={{ padding: 0, overflow: "visible" }} />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </main>

          <aside className="modal-scroll min-h-0 space-y-3 overflow-y-auto bg-slate-50 p-5">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <h3 className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <LuCheck className="h-3.5 w-3.5" />
                Question status
              </h3>
              <dl className="space-y-3 px-4 py-4 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Status</dt>
                  <dd className="font-semibold text-slate-800">{String(question.status ?? "—")}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Difficulty</dt>
                  <dd className="font-semibold text-slate-800">{String(question.difficulty_level ?? "—")}</dd>
                </div>
              </dl>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <h3 className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <LuCopy className="h-3.5 w-3.5" />
                Clone details
              </h3>
              <dl className="space-y-3 px-4 py-4 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Is clone</dt>
                  <dd className="font-semibold text-slate-800">{String(question.isClone ?? "—")}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Clone of</dt>
                  <dd className="font-semibold text-slate-800">{question.isCloneOf ? String(question.isCloneOf) : "—"}</dd>
                </div>
              </dl>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <h3 className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <LuBookOpen className="h-3.5 w-3.5" />
                Learning details
              </h3>
              <dl className="space-y-3 px-4 py-4 text-xs">
                <div>
                  <dt className="text-slate-500">Learning unit</dt>
                  <dd className="mt-1 font-semibold text-slate-800">{String(question.lu_name ?? question.lu ?? "—")}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Learning outcome</dt>
                  <dd className="mt-1 font-semibold text-slate-800">{String(question.lo ?? "—")}</dd>
                </div>
              </dl>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <h3 className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <LuTag className="h-3.5 w-3.5" />
                Metadata
              </h3>
              <div className="flex flex-wrap gap-2 px-4 py-4">
                {[question.chapter_name, question.topic_name]
                  .filter(Boolean)
                  .map((value) => (
                    <span key={String(value)} className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
                      #{String(value).replace(/\s+/g, "-").toLowerCase()}
                    </span>
                  ))}
              </div>
            </section>
          </aside>
        </div>

        <footer className="flex items-center border-t border-slate-200 bg-white px-6 py-3">
          <span className="text-[11px] text-slate-500">Question ID: Q-{qid}</span>
        </footer>
        <style>{`
          .modal-scroll {
            scrollbar-width: thin;
            scrollbar-color: #9eacc0 #edf2f7;
          }
          .modal-scroll::-webkit-scrollbar { width: 8px; }
          .modal-scroll::-webkit-scrollbar-track {
            margin-block: 6px;
            border-radius: 999px;
            background: #edf2f7;
          }
          .modal-scroll::-webkit-scrollbar-thumb {
            min-height: 48px;
            border: 2px solid #edf2f7;
            border-radius: 999px;
            background: #9eacc0;
          }
          .modal-scroll::-webkit-scrollbar-thumb:hover { background: #71819a; }
        `}</style>
      </section>
    </div>
  );
}
