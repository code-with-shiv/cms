"use client";

import { useState } from "react";
import { LuChevronDown, LuChevronUp, LuTriangleAlert } from "react-icons/lu";
import type { GetFormatCmsDataResponse } from "@/types/sync";

export function SyncPreviewPanel({ preview }: { preview: GetFormatCmsDataResponse }) {
  const [showRaw, setShowRaw] = useState(false);
  const imageErrorEntries = Object.entries(preview.image_errors ?? {});

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">
          Formatted {preview.data.length} question(s) for sync
        </p>
        <button
          type="button"
          onClick={() => setShowRaw((c) => !c)}
          className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
        >
          {showRaw ? (
            <>
              Hide raw data <LuChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Show raw data <LuChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      </div>

      {preview.error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{preview.error}</div>
      ) : null}

      {imageErrorEntries.length ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <LuTriangleAlert className="h-3.5 w-3.5" /> Image errors ({imageErrorEntries.length})
          </p>
          <ul className="mt-1 list-disc pl-5 text-xs text-amber-800">
            {imageErrorEntries.map(([qid, message]) => (
              <li key={qid}>
                QID {qid}: {message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showRaw ? (
        <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-slate-50 p-3 text-[11px] text-slate-700">
          {JSON.stringify(preview.data, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
