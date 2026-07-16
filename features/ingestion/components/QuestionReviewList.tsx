"use client";

import { LuTriangleAlert } from "react-icons/lu";
import { QuestionReviewCard } from "@/features/ingestion/components/QuestionReviewCard";
import type { IngestionQuestion, InvalidQuestion } from "@/types/ingestion";

interface QuestionReviewListProps {
  validQuestions: IngestionQuestion[];
  invalidQuestions: InvalidQuestion[];
  selected: Set<number>;
  onSelectedChange: (next: Set<number>) => void;
  canHaveClone: boolean;
  cloneFlags: Record<number, "true" | "false">;
  onCloneFlagChange: (index: number, value: "true" | "false") => void;
}

export function QuestionReviewList({
  validQuestions,
  invalidQuestions,
  selected,
  onSelectedChange,
  canHaveClone,
  cloneFlags,
  onCloneFlagChange,
}: QuestionReviewListProps) {
  const allSelected = validQuestions.length > 0 && selected.size === validQuestions.length;

  function toggleAll() {
    onSelectedChange(allSelected ? new Set() : new Set(validQuestions.map((_, i) => i)));
  }

  function toggleOne(index: number) {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    onSelectedChange(next);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded accent-indigo-600" />
          Valid questions ({validQuestions.length}) — {selected.size} selected
        </label>
      </div>

      <div className="space-y-3">
        {validQuestions.map((q, i) => (
          <QuestionReviewCard
            key={i}
            question={q}
            index={i}
            selected={selected.has(i)}
            onToggleSelected={() => toggleOne(i)}
            canHaveClone={canHaveClone}
            isClone={cloneFlags[i] ?? "false"}
            onIsCloneChange={(value) => onCloneFlagChange(i, value)}
          />
        ))}
      </div>

      {invalidQuestions.length ? (
        <div>
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-rose-700">
            <LuTriangleAlert className="h-4 w-4" /> Invalid questions ({invalidQuestions.length}) — cannot be pushed
          </p>
          <div className="space-y-2">
            {invalidQuestions.map((q, i) => (
              <div key={i} className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
                <p className="mb-1 font-semibold">
                  Question #{q.question_index} · {q.question_id}
                </p>
                <ul className="list-disc pl-5">
                  {q.errors.map((e, ei) => (
                    <li key={ei}>{e}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
