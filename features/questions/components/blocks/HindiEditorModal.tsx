"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BhaSha } from "@bhashaime/core";
import { LuX } from "react-icons/lu";

export type HindiInsertPayload = {
  hindiText: string;
};

interface HindiEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (payload: HindiInsertPayload) => void;
}

export function HindiEditorModal({ isOpen, onClose, onInsert }: HindiEditorModalProps) {
  const [englishInput, setEnglishInput] = useState("");
  const [bhaSha] = useState(() => {
    const instance = new BhaSha();
    instance.setLanguage("hindi");
    return instance;
  });
  const englishInputRef = useRef<HTMLTextAreaElement>(null);

  // Derived directly from englishInput during render — no need to mirror it into
  // its own state (and no effect needed to reset it alongside englishInput).
  const hindiOutput = englishInput ? bhaSha.transliterateText(englishInput) : "";

  const handleClose = useCallback(() => {
    setEnglishInput("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => englishInputRef.current?.focus(), 100);

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
  }, [isOpen, handleClose]);

  const handleInsert = useCallback(() => {
    if (!hindiOutput.trim()) return;
    onInsert({ hindiText: hindiOutput.trim() });
    handleClose();
  }, [handleClose, hindiOutput, onInsert]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleInsert();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    },
    [handleClose, handleInsert],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 pt-[5%]" onMouseDown={handleClose}>
      <div
        className="flex max-h-[60vh] w-[700px] max-w-[95vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Hindi Editor</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleInsert}
              disabled={!hindiOutput.trim()}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                hindiOutput.trim() ? "bg-indigo-600 text-white hover:bg-indigo-500" : "cursor-not-allowed bg-slate-100 text-slate-400"
              }`}
            >
              Insert Hindi
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full p-1.5 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-500"
              aria-label="Close"
            >
              <LuX size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Type in English</label>
            <textarea
              ref={englishInputRef}
              value={englishInput}
              onChange={(e) => setEnglishInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type English text here..."
              className="min-h-[110px] w-full resize-none rounded-lg border-2 border-slate-200 p-3 text-base outline-none transition-colors focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Hindi Preview</label>
            <div className="min-h-[110px] rounded-lg border-2 border-slate-200 bg-slate-50 p-3 text-lg leading-relaxed text-slate-800">
              {hindiOutput || "Hindi text will appear here..."}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-[10px] text-slate-400">
            Press <span className="font-semibold">Ctrl/Cmd + Enter</span> to insert
          </div>
          <button
            type="button"
            onClick={() => {
              setEnglishInput("");
              englishInputRef.current?.focus();
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
