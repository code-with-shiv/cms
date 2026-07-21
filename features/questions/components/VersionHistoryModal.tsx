"use client";

import { useCallback, useEffect, useState } from "react";
import { AxiosError } from "axios";
import { LuCheck, LuChevronDown, LuChevronUp, LuHistory, LuX } from "react-icons/lu";
import { RenderInline } from "@/features/questions/components/RenderInline";
import { contentBlocksToText } from "@/features/questions/utils/content-blocks";
import { getVersionHistory } from "@/features/questions/services/questions.service";
import { getApiErrorMessage } from "@/utils/api-error";
import type { QuestionDocument, VersionEntry } from "@/types/question";

function hasDisplayValue(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

// Renders a version snapshot as a complete, formatted question (question, options,
// solution, hint) — snapshots may omit sections (status-only edits store metadata only).
function SnapshotDetails({ snapshot }: { snapshot: QuestionDocument }) {
  const questionText = contentBlocksToText(snapshot.question);
  const solutionText = contentBlocksToText(snapshot.solution);
  const hintText = contentBlocksToText(snapshot.hint);
  const options = (snapshot.options ?? []).flatMap((option, index) => {
    const content = contentBlocksToText(option.option);
    if (!content) return [];
    return [{ key: `${index}`, label: String.fromCharCode(65 + index), content, isCorrect: Boolean(option.is_correct) }];
  });

  return (
    <div className="mt-2 space-y-3 rounded-lg bg-slate-50 p-3">
      {questionText ? (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Question</p>
          <RenderInline content={questionText} className="text-xs font-medium text-slate-900" style={{ padding: 0, overflow: "visible" }} />
        </div>
      ) : null}

      {options.length ? (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Options</p>
          <div className="space-y-1.5">
            {options.map((option) => (
              <div
                key={option.key}
                className={`flex items-start gap-2 rounded-md border px-2 py-1.5 ${
                  option.isCorrect ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                    option.isCorrect ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 text-slate-500"
                  }`}
                >
                  {option.label}
                </span>
                <div className="min-w-0 flex-1">
                  <RenderInline content={option.content} className="text-xs text-slate-800" style={{ padding: 0, overflow: "visible" }} />
                </div>
                {option.isCorrect ? <LuCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {solutionText ? (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Solution</p>
          <RenderInline content={solutionText} className="text-xs text-slate-700" style={{ padding: 0, overflow: "visible" }} />
        </div>
      ) : null}

      {hintText ? (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Hint</p>
          <RenderInline content={hintText} className="text-xs text-slate-700" style={{ padding: 0, overflow: "visible" }} />
        </div>
      ) : null}

      {!questionText && !options.length && !solutionText && !hintText ? (
        <p className="text-xs italic text-slate-400">No content changed in this version.</p>
      ) : null}
    </div>
  );
}

const CHANGE_TYPE_STYLES: Record<string, string> = {
  submitted_for_review: "bg-violet-100 text-violet-700",
  review_accepted: "bg-emerald-100 text-emerald-700",
  review_re_edit: "bg-amber-100 text-amber-700",
  review_rejected: "bg-rose-100 text-rose-700",
};

function changeTypeLabel(changeType: string): string {
  return changeType.replace(/_/g, " ");
}

interface VersionHistoryModalProps {
  qid: number;
  templateId: string;
  onClose: () => void;
}

export function VersionHistoryModal({ qid, templateId, onClose }: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<VersionEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    getVersionHistory(qid, templateId)
      .then((history) => {
        if (!cancelled) setVersions([...history.versions].reverse());
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof AxiosError && err.response?.status === 404) {
          setVersions([]);
        } else {
          setError(getApiErrorMessage(err, "Could not load version history."));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [qid, templateId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-history-title"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <LuHistory className="h-4 w-4 text-indigo-600" />
            <h2 id="version-history-title" className="text-sm font-bold text-slate-900">
              Version History · Q-{qid}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close version history"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <LuX className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-slate-500">Loading…</p>
          ) : error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          ) : !versions || versions.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No version history yet.</p>
          ) : (
            <div className="space-y-3">
              {versions.map((entry) => {
                const isOpen = expanded === entry.version;
                const snapshot = entry.snapshot;
                const hasContent = Boolean(
                  snapshot &&
                    (hasDisplayValue(contentBlocksToText(snapshot.question)) ||
                      hasDisplayValue(contentBlocksToText(snapshot.solution)) ||
                      hasDisplayValue(contentBlocksToText(snapshot.hint)) ||
                      (snapshot.options ?? []).some((o) => hasDisplayValue(contentBlocksToText(o.option)))),
                );
                return (
                  <div key={entry.version} className="rounded-xl border border-slate-200 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                          v{entry.version}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                            CHANGE_TYPE_STYLES[entry.change_type] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {changeTypeLabel(entry.change_type)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {entry.previous_status || "—"} <span className="text-slate-300">→</span> {entry.new_status || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{entry.changed_by}</span>
                        <span className="text-slate-300">·</span>
                        <span>{entry.changed_at}</span>
                      </div>
                    </div>
                    {hasContent ? (
                      <div className="border-t border-slate-100 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : entry.version)}
                          className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                        >
                          {isOpen ? (
                            <>
                              Hide snapshot <LuChevronUp className="h-3 w-3" />
                            </>
                          ) : (
                            <>
                              Show snapshot <LuChevronDown className="h-3 w-3" />
                            </>
                          )}
                        </button>
                        {isOpen ? <SnapshotDetails snapshot={snapshot} /> : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
