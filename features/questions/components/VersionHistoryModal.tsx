"use client";

import { useCallback, useEffect } from "react";
import { LuHistory, LuX } from "react-icons/lu";
import { VersionHistoryList } from "@/features/questions/components/VersionHistoryList";

interface VersionHistoryModalProps {
  qid: number;
  templateId: string;
  onClose: () => void;
}

export function VersionHistoryModal({ qid, templateId, onClose }: VersionHistoryModalProps) {
  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-history-title"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <LuHistory className="h-4 w-4 text-indigo-600" />
            <h2 id="version-history-title" className="text-sm font-bold text-slate-900">
              Version History · Q-{qid}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close version history"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <LuX className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <VersionHistoryList qid={qid} templateId={templateId} />
        </div>
      </section>
    </div>
  );
}
