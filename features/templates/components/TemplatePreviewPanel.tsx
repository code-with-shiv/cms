"use client";

import { useState } from "react";
import { LuChevronDown, LuChevronUp } from "react-icons/lu";
import type { TemplateCreatePayload } from "@/types/template";
import { FORMAT_LABELS } from "@/features/templates/constants/formats";

// Same shape as the real create-template payload, but question_type/level may still be ""
// while the form is in progress — lets the preview show "—" instead of a misleading default.
export type PreviewPayload = Omit<TemplateCreatePayload, "question_type" | "level" | "created_by"> & {
  question_type: TemplateCreatePayload["question_type"] | "";
  level: TemplateCreatePayload["level"] | "";
};

interface TemplatePreviewPanelProps {
  payload: PreviewPayload;
}

function FeatureChip({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
        on ? "bg-indigo-50 text-indigo-700 ring-indigo-200" : "bg-slate-100 text-slate-500 ring-slate-200"
      }`}
    >
      {label}: {on ? "On" : "Off"}
    </span>
  );
}

export function TemplatePreviewPanel({ payload }: TemplatePreviewPanelProps) {
  const [isPayloadOpen, setIsPayloadOpen] = useState(false);
  const collectionName = payload.template_name.trim() ? `${payload.template_name.trim()}Questions` : "—";

  return (
    <div className="sticky top-6 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Template Preview</p>
        <p className={`mt-2 text-lg font-semibold ${payload.template_name.trim() ? "text-slate-900" : "italic text-slate-400"}`}>
          {payload.template_name.trim() || "Unnamed Template"}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">Collection: {collectionName}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Question Type</p>
            <p className="text-sm font-medium text-slate-900">{payload.question_type || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Level</p>
            <p className="text-sm font-medium text-slate-900">{payload.level || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Test Based</p>
            <p className="text-sm font-medium text-slate-900">{payload.test_based ? "Yes" : "No"}</p>
          </div>
        </div>

        {payload.allowed_question_format.length ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Formats</p>
            <div className="flex flex-wrap gap-1.5">
              {payload.allowed_question_format.map((fmt) => (
                <span key={fmt} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
                  {FORMAT_LABELS[fmt]}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Features</p>
          <div className="flex flex-wrap gap-1.5">
            <FeatureChip label="Options" on={payload.options} />
            <FeatureChip label="Hint" on={payload.hint} />
            <FeatureChip label="Can Have Clone" on={payload.can_have_clone} />
            <FeatureChip label="Requires Year" on={payload.requires_year} />
            <FeatureChip label="Test Based" on={payload.test_based} />
          </div>
        </div>
      </div>
    </div>
  );
}
