"use client";

import { useState } from "react";
import { LuRadioTower, LuTriangleAlert, LuX } from "react-icons/lu";

export type SyncMode = "dev" | "dev_prod";

const MODE_CONFIG: Record<SyncMode, { label: string; targets: string; confirmClass: string }> = {
  dev: {
    label: "Sync to DEV only",
    targets: "https://api.acadally.com",
    confirmClass: "bg-amber-600 hover:bg-amber-500",
  },
  dev_prod: {
    label: "Sync to DEV + PROD",
    targets: "https://api.acadally.com and https://leap.acadally.com",
    confirmClass: "bg-rose-600 hover:bg-rose-500",
  },
};

interface SyncConfirmModalProps {
  mode: SyncMode;
  templateName: string;
  questionCount: number;
  isSubmitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function SyncConfirmModal({ mode, templateName, questionCount, isSubmitting, onConfirm, onClose }: SyncConfirmModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const config = MODE_CONFIG[mode];
  const canConfirm = confirmText.trim() === templateName;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <LuRadioTower className="h-4 w-4 text-rose-600" />
            <h2 className="text-sm font-bold text-slate-900">{config.label}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
          >
            <LuX className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-3">
            <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <p className="text-xs text-rose-800">
              This pushes real data to <strong>{config.targets}</strong> — live external Acadally systems, not a local
              or sandbox environment. This cannot be undone from here.
            </p>
          </div>

          <p className="mt-3 text-xs text-slate-600">
            You are about to sync <strong>{questionCount}</strong> question(s) from template{" "}
            <strong>{templateName}</strong>.
          </p>

          <div className="mt-4">
            <label htmlFor="sync-confirm-text" className="block text-xs font-semibold text-slate-900">
              Type <span className="font-mono text-rose-700">{templateName}</span> to confirm
            </label>
            <input
              id="sync-confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={templateName}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-8.5 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:border-slate-400 hover:text-slate-900 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm || isSubmitting}
            className={`h-8.5 rounded-lg px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${config.confirmClass}`}
          >
            {isSubmitting ? "Syncing…" : config.label}
          </button>
        </div>
      </div>
    </div>
  );
}
