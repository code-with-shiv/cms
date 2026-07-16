"use client";

import { Select } from "@/components/ui/Select";
import { RenderInline } from "@/features/questions/components/RenderInline";
import { contentBlocksToText } from "@/features/questions/utils/content-blocks";
import type { IngestionQuestion } from "@/types/ingestion";

interface QuestionReviewCardProps {
  question: IngestionQuestion;
  index: number;
  selected: boolean;
  onToggleSelected: () => void;
  canHaveClone: boolean;
  isClone: "true" | "false";
  onIsCloneChange: (value: "true" | "false") => void;
}

export function QuestionReviewCard({
  question,
  index,
  selected,
  onToggleSelected,
  canHaveClone,
  isClone,
  onIsCloneChange,
}: QuestionReviewCardProps) {
  const questionText = contentBlocksToText(question.question);
  const solutionText = contentBlocksToText(question.solution);
  const hintText = contentBlocksToText(question.hint);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelected}
            className="h-4 w-4 rounded accent-indigo-600"
          />
          Q{index + 1} · {question.question_id ?? "—"}
        </label>
        {canHaveClone ? (
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            Clone?
            <Select
              value={isClone}
              onChange={(e) => onIsCloneChange(e.target.value as "true" | "false")}
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </Select>
          </label>
        ) : null}
      </div>

      <RenderInline content={questionText || "(empty question text)"} className="text-sm font-medium text-slate-900" style={{ padding: 0 }} />

      {question.options?.length ? (
        <div className="mt-3 space-y-1.5">
          {question.options.map((opt, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-lg border px-3 py-1.5 text-xs ${
                opt.is_correct ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              <span className="font-bold">{String.fromCharCode(65 + i)}.</span>
              <RenderInline content={contentBlocksToText(opt.option) || "(empty)"} style={{ padding: 0 }} />
            </div>
          ))}
        </div>
      ) : null}

      {hintText ? (
        <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-amber-800">
          <span className="font-semibold">Hint: </span>
          <RenderInline content={hintText} style={{ padding: 0 }} />
        </div>
      ) : null}

      {solutionText ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Solution</p>
          <RenderInline content={solutionText} className="text-xs text-slate-700" style={{ padding: 0 }} />
        </div>
      ) : null}
    </div>
  );
}
