"use client";

import { useState } from "react";
import { LuChevronDown, LuChevronUp } from "react-icons/lu";
import type { FlashcardRecordResult, QueuedFlashcardFile } from "@/types/ingestion";

function ResultBadge({ result }: { result: FlashcardRecordResult }) {
  if (result.error) return <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">Error</span>;
  if (result.upserted) return <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">Upserted</span>;
  if (result.updated) return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Updated</span>;
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">Duplicate ques</span>;
}

export function FlashcardResultsPanel({ queue }: { queue: QueuedFlashcardFile[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const filesWithResults = queue.filter((item) => item.status === "done" || item.status === "error");
  if (!filesWithResults.length) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">Processed Results</h2>
      {filesWithResults.map((item, fileIndex) => (
        <div key={fileIndex} className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-sm font-medium text-slate-800">{item.file.name}</p>
          {item.error ? (
            <p className="text-xs text-rose-700">{item.error}</p>
          ) : (
            <div className="space-y-2">
              {(item.results ?? []).map((r, i) => {
                const key = `${fileIndex}-${i}`;
                const isOpen = expanded.has(key);
                return (
                  <div key={key} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ResultBadge result={r} />
                        <span className="text-xs text-slate-700">{r.lu_id ?? "—"}</span>
                        {r.error ? <span className="text-xs text-rose-600">{r.error}</span> : null}
                      </div>
                      {r.data ? (
                        <button onClick={() => toggle(key)} className="text-xs text-indigo-600 hover:underline">
                          {isOpen ? (
                            <span className="flex items-center gap-1">
                              Hide <LuChevronUp className="h-3 w-3" />
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              Show Details <LuChevronDown className="h-3 w-3" />
                            </span>
                          )}
                        </button>
                      ) : null}
                    </div>
                    {isOpen && r.data ? (
                      <pre className="mt-2 max-h-56 overflow-auto rounded bg-white p-2 text-[11px] text-slate-700">
                        {JSON.stringify(r.data, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
