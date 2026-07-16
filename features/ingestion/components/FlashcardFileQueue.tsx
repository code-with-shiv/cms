"use client";

import { LuCheck, LuLoaderCircle, LuX } from "react-icons/lu";
import type { QueuedFlashcardFile } from "@/types/ingestion";

const STATUS_STYLES: Record<QueuedFlashcardFile["status"], string> = {
  pending: "bg-slate-100 text-slate-600",
  uploading: "bg-indigo-100 text-indigo-700",
  done: "bg-emerald-100 text-emerald-700",
  error: "bg-rose-100 text-rose-700",
};

export function FlashcardFileQueue({ queue }: { queue: QueuedFlashcardFile[] }) {
  return (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {queue.map((item, i) => (
        <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm text-slate-800">{item.file.name}</p>
            <p className="text-xs text-slate-400">{(item.file.size / 1024).toFixed(1)} KB</p>
          </div>
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[item.status]}`}>
            {item.status === "uploading" ? <LuLoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
            {item.status === "done" ? <LuCheck className="h-3.5 w-3.5" /> : null}
            {item.status === "error" ? <LuX className="h-3.5 w-3.5" /> : null}
            {item.status}
          </span>
        </div>
      ))}
    </div>
  );
}
