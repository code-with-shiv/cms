"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "mathlive";
import type { MathfieldElement } from "mathlive";
import { LuX } from "react-icons/lu";

export type MathInsertPayload = {
  latex: string;
};

interface MathEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (payload: MathInsertPayload) => void;
}

export function MathEditorModal({ isOpen, onClose, onInsert }: MathEditorModalProps) {
  const [latex, setLatex] = useState("");
  const mathfieldRef = useRef<MathfieldElement | null>(null);

  const handleClose = useCallback(() => {
    setLatex("");
    if (mathfieldRef.current) mathfieldRef.current.value = "";
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => {
      mathfieldRef.current?.focus();
      window.mathVirtualKeyboard?.show();
    }, 100);

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.mathVirtualKeyboard?.hide();
    };
  }, [isOpen, handleClose]);

  const handleInsert = useCallback(() => {
    const currentLatex = mathfieldRef.current?.value || latex;
    if (!currentLatex.trim()) return;
    onInsert({ latex: currentLatex.trim() });
    handleClose();
  }, [handleClose, latex, onInsert]);

  const handleMathfieldRef = useCallback(
    (el: MathfieldElement | null) => {
      if (!el) return;
      mathfieldRef.current = el;
      el.mathVirtualKeyboardPolicy = "manual";
      el.smartMode = true;
      el.smartSuperscript = true;

      el.addEventListener("input", () => setLatex(el.value));
      el.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          handleClose();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          handleInsert();
        }
      });

      setTimeout(() => el.focus(), 50);
    },
    [handleClose, handleInsert],
  );

  const handleClear = useCallback(() => {
    if (mathfieldRef.current) {
      mathfieldRef.current.value = "";
      mathfieldRef.current.focus();
    }
    setLatex("");
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 pt-[5%]" onMouseDown={handleClose}>
      <div
        className="flex max-h-[60vh] w-[600px] max-w-[95vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Equation Editor</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleInsert}
              disabled={!latex.trim()}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                latex.trim() ? "bg-indigo-600 text-white hover:bg-indigo-500" : "cursor-not-allowed bg-slate-100 text-slate-400"
              }`}
            >
              Insert Equation
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

        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-end justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Type your equation</label>
            <span className="text-[10px] italic text-slate-400">(Use arrow keys to navigate)</span>
          </div>

          <div className="min-h-[120px] w-full overflow-hidden rounded-xl border-2 border-slate-100 bg-slate-50/30 p-2 transition-all focus-within:border-indigo-200 focus-within:bg-white">
            {/* @ts-expect-error -- MathLive web component type augmentation lives in mathlive.d.ts */}
            <math-field
              ref={handleMathfieldRef}
              className="mathfield-editor min-h-[100px] w-full bg-transparent text-2xl outline-none"
              virtual-keyboard-mode="manual"
            />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-slate-100 bg-slate-50 p-2 text-[10px] font-medium text-slate-500">
            <div className="flex items-center gap-1">
              <kbd className="mt-[-1px] rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[9px] shadow-sm"> / </kbd>
              <span>fraction</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="mt-[-1px] rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[9px] shadow-sm"> ^ </kbd>
              <span>superscript</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="mt-[-1px] rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[9px] shadow-sm"> _ </kbd>
              <span>subscript</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="mt-[-1px] rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[9px] shadow-sm"> \ </kbd>
              <span>commands</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[9px] shadow-sm">Ctrl</kbd>
            <span>+</span>
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[9px] shadow-sm">Enter</kbd>
            <span>to insert</span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
