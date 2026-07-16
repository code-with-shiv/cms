"use client";

import { useEffect, useState } from "react";

const MAX_ROWS = 6;
const MAX_COLS = 8;
const CELL_SIZE = 18;

interface TableGridPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (rows: number, cols: number) => void;
}

export function TableGridPicker({ isOpen, onClose, onSelect }: TableGridPickerProps) {
  const [hovered, setHovered] = useState({ row: 0, col: 0 });

  useEffect(() => {
    if (!isOpen) return;
    setHovered({ row: 0, col: 0 });
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onMouseDown={onClose} />
      <div
        className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div
          className="grid gap-0.5"
          style={{ gridTemplateColumns: `repeat(${MAX_COLS}, ${CELL_SIZE}px)` }}
          onMouseLeave={() => setHovered({ row: 0, col: 0 })}
        >
          {Array.from({ length: MAX_ROWS * MAX_COLS }, (_, index) => {
            const row = Math.floor(index / MAX_COLS);
            const col = index % MAX_COLS;
            const isActive = row <= hovered.row && col <= hovered.col;
            return (
              <button
                key={index}
                type="button"
                onMouseEnter={() => setHovered({ row, col })}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(row + 1, col + 1);
                }}
                aria-label={`Insert ${row + 1} x ${col + 1} table`}
                className={`h-[18px] w-[18px] rounded-[2px] border transition-colors ${
                  isActive ? "border-indigo-500 bg-indigo-100" : "border-slate-200 bg-slate-50"
                }`}
              />
            );
          })}
        </div>
        <p className="mt-2 text-center text-[11px] font-semibold text-slate-600">
          {hovered.row + 1} x {hovered.col + 1} Table
        </p>
      </div>
    </>
  );
}
