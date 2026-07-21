"use client";

import { useState } from "react";
import { LuCheck, LuRefreshCw, LuX } from "react-icons/lu";
import { contentBlocksToText } from "@/features/questions/utils/content-blocks";
import type { QuestionDocument, ReviewAction } from "@/types/question";

const ACTION_CONFIG = {
  accept: {
    label: "Accept Question",
    description: "Accept this question and move it to accepted status.",
    Icon: LuCheck,
    confirmClass: "bg-emerald-600 hover:bg-emerald-500",
    requiresComment: false,
  },
  re_edit: {
    label: "Request Re-edit",
    description: "Send this question back to the creator for revisions.",
    Icon: LuRefreshCw,
    confirmClass: "bg-amber-500 hover:bg-amber-400",
    requiresComment: true,
  },
  reject: {
    label: "Reject Question",
    description: "Permanently reject this question.",
    Icon: LuX,
    confirmClass: "bg-rose-600 hover:bg-rose-500",
    requiresComment: true,
  },
} as const;

interface ReviewActionModalProps {
  question: QuestionDocument;
  action: ReviewAction;
  isSubmitting: boolean;
  onConfirm: (comment?: string) => void;
  onClose: () => void;
}

export function ReviewActionModal({ question, action, isSubmitting, onConfirm, onClose }: ReviewActionModalProps) {
  const [comment, setComment] = useState("");
  const config = ACTION_CONFIG[action];
  const { Icon } = config;
  const needsComment = config.requiresComment;
  const canSubmit = !needsComment || comment.trim().length > 0;
  const questionText = contentBlocksToText(question.question) || "Untitled question";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Icon className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">{config.label}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
          >
            <LuX className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-xs text-slate-500">{config.description}</p>

          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <span className="inline-flex rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              QID {question.qid}
            </span>
            <p className="mt-1.5 line-clamp-2 text-xs font-semibold text-slate-900">{questionText}</p>
          </div>

          {needsComment ? (
            <div className="mt-4">
              <label htmlFor="review-comment" className="block text-xs font-semibold text-slate-900">
                Comment <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Explain what needs to be changed or why this is rejected…"
                rows={4}
                className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-8.5 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:border-slate-400 hover:text-slate-900 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(needsComment ? comment.trim() : undefined)}
            disabled={!canSubmit || isSubmitting}
            className={`h-8.5 rounded-lg px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${config.confirmClass}`}
          >
            {isSubmitting ? "Submitting…" : config.label}
          </button>
        </div>
      </div>
    </div>
  );
}
