"use client";

import { useEffect } from "react";

interface PushProgressOverlayProps {
  count: number;
}

export function PushProgressOverlay({ count }: PushProgressOverlayProps) {
  // The server blocks for ~60-120s waiting on a DB trigger to backfill QIDs —
  // this write is non-idempotent, so warn on tab close/refresh mid-request.
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60">
      <div className="mx-4 max-w-sm rounded-xl bg-white p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
        <p className="text-sm font-semibold text-slate-900">Pushing {count} question{count === 1 ? "" : "s"}…</p>
        <p className="mt-2 text-xs text-slate-500">
          This can take up to 2 minutes while QIDs are generated. Please don&apos;t close this tab.
        </p>
      </div>
    </div>
  );
}
