"use client";

import { useEffect, useMemo, useState } from "react";
import { LuChevronDown, LuChevronUp, LuX } from "react-icons/lu";
import { RenderInline } from "@/features/questions/components/RenderInline";
import { VersionHistoryList } from "@/features/questions/components/VersionHistoryList";
import { Badge } from "@/features/questions/components/QuestionResultsTable";
import { contentBlocksToText } from "@/features/questions/utils/content-blocks";
import { ALL_QUESTION_STATUSES } from "@/features/questions/utils/question-status";
import { scopeFilterValue, scopeName } from "@/features/assignments/utils/assignment-stats";
import { getQuestions } from "@/features/questions/services/questions.service";
import { getApiErrorMessage } from "@/utils/api-error";
import type { Assignment } from "@/types/assignment";
import type { QuestionDocument } from "@/types/question";

interface UserAssignmentQuestionsModalProps {
  assignment: Assignment;
  templateName: string;
  onClose: () => void;
}

export function UserAssignmentQuestionsModal({ assignment, templateName, onClose }: UserAssignmentQuestionsModalProps) {
  const [questions, setQuestions] = useState<QuestionDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedQid, setExpandedQid] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    const filterValue = scopeFilterValue(assignment);
    if (!filterValue) {
      setQuestions([]);
      setIsLoading(false);
      return;
    }
    getQuestions({
      template_id: assignment.template_id,
      filter_value: filterValue,
      status_filter: ALL_QUESTION_STATUSES,
    })
      .then((qs) => {
        if (cancelled) return;
        const owned = qs.filter((q) => q.created_by === assignment.creator_email);
        const sorted = owned.sort(
          (x, y) => new Date(String(y.updated_at ?? 0)).getTime() - new Date(String(x.updated_at ?? 0)).getTime(),
        );
        setQuestions(sorted);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, "Could not load questions for this assignment."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assignment]);

  const filteredQuestions = useMemo(() => {
    if (!fromDate && !toDate) return questions;
    const from = fromDate ? new Date(fromDate).getTime() : -Infinity;
    // Inclusive of the whole "to" day.
    const to = toDate ? new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1 : Infinity;
    return questions.filter((q) => {
      const updated = new Date(String(q.updated_at ?? 0)).getTime();
      return updated >= from && updated <= to;
    });
  }, [questions, fromDate, toDate]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-assignment-questions-title"
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id="user-assignment-questions-title" className="text-sm font-bold text-slate-900">
              {scopeName(assignment)} · {templateName}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Creator: {assignment.creator_email}
              {assignment.reviewer_email ? ` · Reviewer: ${assignment.reviewer_email}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <LuX className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
          <span className="text-xs font-semibold text-slate-600">Updated between</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
          />
          <span className="text-xs text-slate-400">and</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
          />
          {fromDate || toDate ? (
            <button
              type="button"
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Clear
            </button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-slate-500">Loading questions…</p>
          ) : error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          ) : filteredQuestions.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              {questions.length === 0 ? "No questions found for this assignment." : "No questions in the selected time range."}
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredQuestions.map((q) => {
                const isOpen = expandedQid === q.qid;
                return (
                  <li key={q.qid} className="rounded-xl border border-slate-200 bg-white">
                    <button
                      type="button"
                      onClick={() => setExpandedQid(isOpen ? null : q.qid)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                    >
                      <span className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        Q-{q.qid}
                      </span>
                      <div className="min-w-0 flex-1">
                        <RenderInline
                          content={contentBlocksToText(q.question) || "Untitled question"}
                          className="truncate text-[13px] text-slate-900"
                          style={{ padding: 0, overflow: "visible" }}
                        />
                      </div>
                      <Badge label={String(q.status)} />
                      <span className="shrink-0 text-xs text-slate-400">{String(q.updated_at ?? "—")}</span>
                      {isOpen ? (
                        <LuChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                      ) : (
                        <LuChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                      )}
                    </button>
                    {isOpen ? (
                      <div className="border-t border-slate-100 bg-slate-50 px-3 py-3">
                        <VersionHistoryList qid={q.qid} templateId={assignment.template_id} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
