"use client";

import { LuCopy } from "react-icons/lu";
import { RenderInline } from "@/features/questions/components/RenderInline";
import type { GenerateQuesResponse } from "@/types/ingestion";

function CopyButton({ text }: { text: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text)}
      className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline"
    >
      <LuCopy className="h-3 w-3" /> Copy
    </button>
  );
}

export function GeneratedQuestionsResult({ result }: { result: GenerateQuesResponse }) {
  const hasExtracted = Boolean(result.extracted_questions?.length);
  const hasRephrased = Boolean(result.final_rephrased_questions && Object.keys(result.final_rephrased_questions).length);

  if (!hasExtracted && !hasRephrased) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        Generation failed internally — no question stems came back. Try again, or use a smaller PDF.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!hasExtracted || !hasRephrased ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Partial result — one of the generation steps failed internally. Showing what came back.
        </div>
      ) : null}

      {hasRephrased ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Rephrased MCQ stems (by topic)</h2>
          {Object.entries(result.final_rephrased_questions ?? {}).map(([chapter, items]) => (
            <div key={chapter} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">{chapter}</p>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                        {item.topic}
                      </span>
                      <CopyButton text={item.question} />
                    </div>
                    <RenderInline content={item.question} className="text-sm text-slate-800" style={{ padding: 0 }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {hasExtracted ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Extracted question stems (raw)</h2>
          <div className="space-y-2">
            {(result.extracted_questions ?? []).map((q, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="mb-1 flex justify-end">
                  <CopyButton text={q.question} />
                </div>
                <RenderInline content={q.question} className="text-sm text-slate-800" style={{ padding: 0 }} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
