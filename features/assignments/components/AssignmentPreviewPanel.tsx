"use client";

import { useState } from "react";
import { LuChevronDown, LuChevronUp } from "react-icons/lu";
import type { AssignmentCreatePayload, AssignmentLevel } from "@/types/assignment";
import { ASSIGNMENT_LEVEL_LABEL } from "@/features/assignments/utils/level-compat";

// Same shape as the real create-assignment payload, but level may still be "" while the form
// is in progress — lets the preview show "—" instead of a misleading default.
export type PreviewPayload = Omit<AssignmentCreatePayload, "level"> & {
  level: AssignmentLevel | "";
};

interface AssignmentPreviewPanelProps {
  payload: PreviewPayload;
  templateName?: string;
}

export function AssignmentPreviewPanel({ payload, templateName }: AssignmentPreviewPanelProps) {
  const [isPayloadOpen, setIsPayloadOpen] = useState(false);
  const scope = payload.assignment_json;

  const scopeName = payload.level === "lu" ? scope.lu_name : payload.level === "topic" ? scope.topic_name : scope.chapter_name;

  return (
    <div className="sticky top-6 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assignment Preview</p>
        <p className={`mt-2 text-lg font-semibold ${scopeName ? "text-slate-900" : "italic text-slate-400"}`}>
          {scopeName || "No scope selected"}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {[scope.board, scope.grade, scope.subject].filter(Boolean).join(" · ") || "—"}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Template</p>
            <p className="text-sm font-medium text-slate-900">{templateName || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Level</p>
            <p className="text-sm font-medium text-slate-900">
              {payload.level ? ASSIGNMENT_LEVEL_LABEL[payload.level] : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Creator</p>
            <p className="text-sm font-medium text-slate-900">{payload.creator_email || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Reviewer</p>
            <p className="text-sm font-medium text-slate-900">{payload.reviewer_email || "—"}</p>
          </div>
        </div>

        {payload.notes ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Notes</p>
            <p className="text-sm text-slate-700">{payload.notes}</p>
          </div>
        ) : null}
      </div>

      
    </div>
  );
}
