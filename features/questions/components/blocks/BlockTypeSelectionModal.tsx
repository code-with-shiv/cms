"use client";

import { useEffect } from "react";
import { LuFileText, LuImage, LuX } from "react-icons/lu";

interface BlockTypeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectText: () => void;
  onSelectImage: () => void;
}

export function BlockTypeSelectionModal({ isOpen, onClose, onSelectText, onSelectImage }: BlockTypeSelectionModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Add Block</h2>
          <button type="button" onClick={onClose} className="text-slate-400 transition-colors hover:text-slate-600" aria-label="Close">
            <LuX size={18} />
          </button>
        </div>

        <div className="p-5">
          <p className="mb-4 text-xs text-slate-500">Select block type to insert:</p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                onSelectText();
                onClose();
              }}
              className="group flex flex-1 flex-col items-center gap-2 rounded-xl border-2 border-slate-200 p-4 transition-all hover:border-indigo-400 hover:bg-indigo-50"
            >
              <LuFileText size={26} strokeWidth={1.5} className="text-slate-600 transition-colors group-hover:text-indigo-600" />
              <span className="text-xs font-semibold text-slate-900 group-hover:text-indigo-700">Text</span>
              <span className="text-[11px] text-slate-500 group-hover:text-indigo-600">Add text content</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectImage();
                onClose();
              }}
              className="group flex flex-1 flex-col items-center gap-2 rounded-xl border-2 border-slate-200 p-4 transition-all hover:border-violet-400 hover:bg-violet-50"
            >
              <LuImage size={26} strokeWidth={1.5} className="text-slate-600 transition-colors group-hover:text-violet-600" />
              <span className="text-xs font-semibold text-slate-900 group-hover:text-violet-700">Image</span>
              <span className="text-[11px] text-slate-500 group-hover:text-violet-600">Upload image</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
