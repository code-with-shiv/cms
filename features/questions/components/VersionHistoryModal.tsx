"use client";

import { useCallback, useEffect, useState } from "react";
import { AxiosError } from "axios";
import { LuChevronDown, LuChevronUp, LuHistory, LuX } from "react-icons/lu";
import { RenderInline } from "@/features/questions/components/RenderInline";
import { contentBlocksToText } from "@/features/questions/utils/content-blocks";
import { getVersionHistory } from "@/features/questions/services/questions.service";
import { getApiErrorMessage } from "@/utils/api-error";
import type { VersionEntry } from "@/types/question";

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
                const questionText = contentBlocksToText(entry.snapshot?.question);
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
                    {questionText ? (
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
                        {isOpen ? (
                          <div className="mt-2 rounded-lg bg-slate-50 p-3">
                            <RenderInline content={questionText} className="text-xs text-slate-800" style={{ padding: 0 }} />
                          </div>
                        ) : null}
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
