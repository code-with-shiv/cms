"use client";

import { useEffect, useRef, useState } from "react";
import { LuCheck, LuChevronDown } from "react-icons/lu";

function formatOptionLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

interface QuestionFilterSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export function QuestionFilterSelect({ label, value, options, onChange }: QuestionFilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedOption, setHighlightedOption] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const typeaheadRef = useRef("");
  const typeaheadTimeoutRef = useRef<number | null>(null);
  const displayValue = value ? formatOptionLabel(value) : `All ${label}`;
  const allOptions = ["", ...Array.from(new Set(options.filter(Boolean)))];

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      if (typeaheadTimeoutRef.current) window.clearTimeout(typeaheadTimeoutRef.current);
    };
  }, []);

  function selectOption(option: string) {
    onChange(option);
    setIsOpen(false);
    setHighlightedOption(option);
  }

  function openMenu() {
    setHighlightedOption(value);
    setIsOpen(true);
  }

  function handleTypeahead(key: string) {
    const normalizedKey = key.toLowerCase();
    const nextQuery = `${typeaheadRef.current}${normalizedKey}`;
    const label_ = (option: string) => (option ? formatOptionLabel(option) : `All ${label}`);
    const matchedOption =
      allOptions.find((option) => label_(option).toLowerCase().startsWith(nextQuery)) ??
      allOptions.find((option) => label_(option).toLowerCase().startsWith(normalizedKey));

    if (matchedOption !== undefined) {
      setIsOpen(true);
      setHighlightedOption(matchedOption);
      typeaheadRef.current = label_(matchedOption).toLowerCase().startsWith(nextQuery) ? nextQuery : normalizedKey;
    }

    if (typeaheadTimeoutRef.current) window.clearTimeout(typeaheadTimeoutRef.current);
    typeaheadTimeoutRef.current = window.setTimeout(() => {
      typeaheadRef.current = "";
      typeaheadTimeoutRef.current = null;
    }, 700);
  }

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey && /\S/.test(event.key)) {
            event.preventDefault();
            handleTypeahead(event.key);
          }
          if (event.key === "Enter" && isOpen) {
            event.preventDefault();
            selectOption(highlightedOption);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-white px-2.5 text-left text-xs font-medium outline-none transition ${
          isOpen
            ? "border-indigo-500 text-slate-900 ring-1 ring-indigo-500"
            : "border-slate-300 text-slate-700 hover:border-slate-400"
        }`}
      >
        <span className="truncate">{displayValue}</span>
        <LuChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180 text-indigo-600" : "text-slate-400"}`} />
      </button>

      {isOpen ? (
        <div
          role="listbox"
          aria-label={`Filter by ${label}`}
          className="absolute left-0 top-[calc(100%+6px)] z-40 w-full min-w-[150px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          <div className="max-h-56 overflow-y-auto">
            {allOptions.map((option) => {
              const optionLabel = option ? formatOptionLabel(option) : `All ${label}`;
              const isSelected = option === value;
              const isHighlighted = option === highlightedOption;

              return (
                <button
                  key={optionLabel}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedOption(option)}
                  onClick={() => selectOption(option)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                    isSelected
                      ? "bg-indigo-50 font-semibold text-indigo-700"
                      : isHighlighted
                        ? "bg-slate-50 text-slate-900"
                        : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">{optionLabel}</span>
                  {isSelected ? <LuCheck className="h-3.5 w-3.5 shrink-0" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
