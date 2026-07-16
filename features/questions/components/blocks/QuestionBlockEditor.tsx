"use client";

import { useEffect, useRef, useState } from "react";
import { LuArrowDown, LuArrowUp, LuBold, LuItalic, LuList, LuListOrdered, LuSigma, LuTable, LuType, LuX } from "react-icons/lu";
import { MathEditorModal, type MathInsertPayload } from "@/features/questions/components/blocks/MathEditorModal";
import { HindiEditorModal, type HindiInsertPayload } from "@/features/questions/components/blocks/HindiEditorModal";
import { BlockTypeSelectionModal } from "@/features/questions/components/blocks/BlockTypeSelectionModal";
import { ImageUploadModal } from "@/features/questions/components/blocks/ImageUploadModal";
import { DeleteConfirmationModal } from "@/features/questions/components/blocks/DeleteConfirmationModal";
import { TableGridPicker } from "@/features/questions/components/blocks/TableGridPicker";

interface QuestionBlockEditorProps {
  value: string;
  canEdit: boolean;
  onChange: (next: string) => void;
  onAddAbove: (content: string) => void;
  onAddBelow: (content: string) => void;
  onDelete: () => void;
  disableDelete: boolean;
  templateId: string;
  userEmail: string;
  className?: string;
}

export function QuestionBlockEditor({
  value,
  canEdit,
  onChange,
  onAddAbove,
  onAddBelow,
  onDelete,
  disableDelete,
  templateId,
  userEmail,
  className = "",
}: QuestionBlockEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isMathEditorOpen, setIsMathEditorOpen] = useState(false);
  const [mathSelection, setMathSelection] = useState<{ start: number; end: number } | null>(null);
  const [isHindiEditorOpen, setIsHindiEditorOpen] = useState(false);
  const [hindiSelection, setHindiSelection] = useState<{ start: number; end: number } | null>(null);
  const [isImageUploadOpen, setIsImageUploadOpen] = useState(false);
  const [isTypeSelectionOpen, setIsTypeSelectionOpen] = useState(false);
  const [addDirection, setAddDirection] = useState<"above" | "below" | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isTablePickerOpen, setIsTablePickerOpen] = useState(false);

  useEffect(() => {
    if (!canEdit || !textareaRef.current) return;
    setIsFocused(true);
    textareaRef.current.focus();
    const textLength = textareaRef.current.value.length;
    textareaRef.current.setSelectionRange(textLength, textLength);
    // Newly-mounted blocks (e.g. just added via the arrow buttons) should be
    // immediately editable, matching the click-to-activate flow that created them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function insertMarkdown(prefix: string, suffix: string = "") {
    if (!canEdit || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);

    onChange(before + prefix + selectedText + suffix + after);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  }

  function insertList(type: "bullet" | "number" | "alpha-cap" | "alpha-small" | "roman") {
    const prefixes: Record<typeof type, string> = {
      bullet: "- ",
      number: "1. ",
      "alpha-cap": "A. ",
      "alpha-small": "a. ",
      roman: "I. ",
    };
    insertMarkdown(prefixes[type]);
  }

  function insertTable(rows: number, cols: number) {
    const cellRow = `|${Array.from({ length: cols }, () => "  ").join("|")}|`;
    const separatorRow = `|${Array.from({ length: cols }, () => "---").join("|")}|`;
    const bodyRows = Array.from({ length: Math.max(rows - 1, 0) }, () => cellRow);
    const table = [cellRow, separatorRow, ...bodyRows].join("\n");

    insertMarkdown(`\n\n${table}\n\n`);
    setIsTablePickerOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!canEdit) return;
    if (e.key !== "Enter" || e.shiftKey) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const text = textarea.value;
    const linesBefore = text.substring(0, start).split("\n");
    const currentLine = linesBefore[linesBefore.length - 1];

    const bulletMatch = currentLine.match(/^(\s*[-*+]\s)(.*)/);
    const numberMatch = currentLine.match(/^(\s*(\d+)\.\s)(.*)/);
    const romanMatch = currentLine.match(/^(\s*([IVXLCDMivxlcdm]+)\.\s)(.*)/);
    const alphaCapMatch = currentLine.match(/^(\s*([A-Z])\.\s)(.*)/);
    const alphaSmallMatch = currentLine.match(/^(\s*([a-z])\.\s)(.*)/);

    let marker = "";
    let nextMarker = "";
    let content = "";

    if (bulletMatch) {
      marker = bulletMatch[1];
      content = bulletMatch[2];
      nextMarker = marker;
    } else if (numberMatch) {
      marker = numberMatch[1];
      content = numberMatch[3];
      nextMarker = marker.replace(/\d+/, String(parseInt(numberMatch[2], 10) + 1));
    } else if (romanMatch && (romanMatch[2].length > 1 || ["I", "V", "X"].includes(romanMatch[2].toUpperCase()))) {
      marker = romanMatch[1];
      content = romanMatch[3];
      const romanNumbers = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
      const currentIndex = romanNumbers.indexOf(romanMatch[2].toUpperCase());
      nextMarker = currentIndex !== -1 && currentIndex < romanNumbers.length - 1 ? marker.replace(romanMatch[2], romanNumbers[currentIndex + 1]) : marker;
    } else if (alphaCapMatch) {
      marker = alphaCapMatch[1];
      content = alphaCapMatch[3];
      nextMarker = marker.replace(/[A-Z]/, String.fromCharCode(alphaCapMatch[2].charCodeAt(0) + 1));
    } else if (alphaSmallMatch) {
      marker = alphaSmallMatch[1];
      content = alphaSmallMatch[3];
      nextMarker = marker.replace(/[a-z]/, String.fromCharCode(alphaSmallMatch[2].charCodeAt(0) + 1));
    }

    if (!marker) return;

    if (content.trim() === "") {
      e.preventDefault();
      const before = text.substring(0, start - marker.length);
      const after = text.substring(start);
      onChange(`${before}\n${after}`);
      setTimeout(() => textarea.setSelectionRange(before.length + 1, before.length + 1), 0);
    } else {
      e.preventDefault();
      const newValue = `${text.substring(0, start)}\n${nextMarker}${text.substring(start)}`;
      onChange(newValue);
      setTimeout(() => {
        const pos = start + nextMarker.length + 1;
        textarea.setSelectionRange(pos, pos);
      }, 0);
    }
  }

  function openMathEditor() {
    if (!canEdit || !textareaRef.current) return;
    setMathSelection({ start: textareaRef.current.selectionStart, end: textareaRef.current.selectionEnd });
    setIsMathEditorOpen(true);
  }

  function openHindiEditor() {
    if (!canEdit || !textareaRef.current) return;
    setHindiSelection({ start: textareaRef.current.selectionStart, end: textareaRef.current.selectionEnd });
    setIsHindiEditorOpen(true);
  }

  function handleMathInsert({ latex }: MathInsertPayload) {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = mathSelection?.start ?? textarea.selectionStart;
    const end = mathSelection?.end ?? textarea.selectionEnd;
    const text = textarea.value;
    const snippet = `\\(${latex}\\)`;

    onChange(text.substring(0, start) + snippet + text.substring(end));
    setIsMathEditorOpen(false);
    setMathSelection(null);

    setTimeout(() => {
      textarea.focus();
      const pos = start + snippet.length;
      textarea.setSelectionRange(pos, pos);
    }, 0);
  }

  function handleHindiInsert({ hindiText }: HindiInsertPayload) {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = hindiSelection?.start ?? textarea.selectionStart;
    const end = hindiSelection?.end ?? textarea.selectionEnd;
    const text = textarea.value;

    onChange(text.substring(0, start) + hindiText + text.substring(end));
    setIsHindiEditorOpen(false);
    setHindiSelection(null);

    setTimeout(() => {
      textarea.focus();
      const pos = start + hindiText.length;
      textarea.setSelectionRange(pos, pos);
    }, 0);
  }

  function handleArrowClick(direction: "above" | "below") {
    if (!canEdit) return;
    setAddDirection(direction);
    setIsTypeSelectionOpen(true);
  }

  function handleTypeSelection(type: "text" | "image") {
    if (type === "text") {
      const callback = addDirection === "above" ? onAddAbove : onAddBelow;
      callback("Type your content here...");
      setAddDirection(null);
      return;
    }
    setIsImageUploadOpen(true);
  }

  function handleImageUploaded(cdnUrl: string) {
    const callback = addDirection === "above" ? onAddAbove : onAddBelow;
    callback(`![image](${cdnUrl})`);
    setIsImageUploadOpen(false);
    setAddDirection(null);
  }

  return (
    <div className={`group relative mb-2 ${className}`} title={!canEdit ? "You do not have permission to edit" : undefined}>
      <div className="mb-1 flex items-end justify-between gap-2">
        <div className="min-w-0 flex-1">
          {isFocused && canEdit ? (
            <div className="flex w-fit items-center divide-x divide-slate-200 rounded-md border border-slate-200 bg-white shadow-sm">
              <button type="button" onMouseDown={(e) => { e.preventDefault(); insertMarkdown("### "); }} className="inline-flex h-7 w-7 items-center justify-center text-slate-700 transition-colors hover:bg-slate-50" title="Heading">
                <LuType size={12} strokeWidth={2.2} />
              </button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); insertMarkdown("**", "**"); }} className="inline-flex h-7 w-7 items-center justify-center text-slate-700 transition-colors hover:bg-slate-50" title="Bold">
                <LuBold size={12} strokeWidth={2.2} />
              </button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); insertMarkdown("_", "_"); }} className="inline-flex h-7 w-7 items-center justify-center text-slate-700 transition-colors hover:bg-slate-50" title="Italic">
                <LuItalic size={12} strokeWidth={2.2} />
              </button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); insertList("bullet"); }} className="inline-flex h-7 w-7 items-center justify-center text-slate-700 transition-colors hover:bg-slate-50" title="Bullet List">
                <LuList size={12} strokeWidth={2.2} />
              </button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); insertList("number"); }} className="inline-flex h-7 w-7 items-center justify-center text-slate-700 transition-colors hover:bg-slate-50" title="Numbered List">
                <LuListOrdered size={12} strokeWidth={2.2} />
              </button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); insertList("alpha-cap"); }} className="inline-flex h-7 w-7 items-center justify-center text-slate-700 transition-colors hover:bg-slate-50" title="Capital ABC List">
                <span className="text-[8px] font-semibold tracking-tight text-slate-600">A.</span>
              </button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); insertList("alpha-small"); }} className="inline-flex h-7 w-7 items-center justify-center text-slate-700 transition-colors hover:bg-slate-50" title="Small abc List">
                <span className="text-[8px] font-semibold tracking-tight text-slate-600">a.</span>
              </button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); insertList("roman"); }} className="inline-flex h-7 w-7 items-center justify-center text-slate-700 transition-colors hover:bg-slate-50" title="Roman Numerals List">
                <span className="text-[8px] font-semibold uppercase tracking-tight text-slate-600">I.</span>
              </button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); openMathEditor(); }} className="inline-flex h-7 w-7 items-center justify-center text-slate-700 transition-colors hover:bg-slate-50" title="Math Editor">
                <LuSigma size={12} strokeWidth={2.2} />
              </button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); openHindiEditor(); }} className="inline-flex h-7 w-7 items-center justify-center text-slate-700 transition-colors hover:bg-slate-50" title="Hindi editor">
                <span className="text-[8px] font-semibold text-slate-600">हि</span>
              </button>
              <div className="relative">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsTablePickerOpen((c) => !c);
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center text-slate-700 transition-colors hover:bg-slate-50"
                  title="Insert Table"
                >
                  <LuTable size={12} strokeWidth={2.2} />
                </button>
                <TableGridPicker
                  isOpen={isTablePickerOpen}
                  onClose={() => setIsTablePickerOpen(false)}
                  onSelect={insertTable}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 divide-x divide-slate-200 rounded-md border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => handleArrowClick("above")}
            className={`p-1.5 text-slate-500 transition-colors hover:bg-slate-50 ${!canEdit ? "cursor-not-allowed opacity-40 hover:bg-transparent" : ""}`}
            title={!canEdit ? "You do not have permission to edit" : "Add Block Above"}
          >
            <LuArrowUp size={12} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => handleArrowClick("below")}
            className={`p-1.5 text-slate-500 transition-colors hover:bg-slate-50 ${!canEdit ? "cursor-not-allowed opacity-40 hover:bg-transparent" : ""}`}
            title={!canEdit ? "You do not have permission to edit" : "Add Block Below"}
          >
            <LuArrowDown size={12} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            disabled={!canEdit || disableDelete}
            onClick={() => setIsDeleteConfirmOpen(true)}
            className={`p-1.5 text-rose-500 transition-colors hover:bg-rose-50 ${!canEdit || disableDelete ? "cursor-not-allowed opacity-40 hover:bg-transparent" : ""}`}
            title={!canEdit ? "You do not have permission to edit" : "Delete"}
          >
            <LuX size={12} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className={`rounded-lg bg-white p-3 transition-all ${isFocused ? "ring-2 ring-indigo-100" : "ring-1 ring-slate-200"}`}>
        <textarea
          ref={textareaRef}
          readOnly={!canEdit}
          className={`w-full resize-y border-none bg-transparent text-[13px] leading-5 font-normal text-slate-800 outline-none transition-all ${isFocused ? "min-h-[140px]" : "min-h-[80px]"} ${!canEdit ? "cursor-not-allowed opacity-70" : ""}`}
          placeholder="Enter content..."
          value={value}
          onChange={(e) => canEdit && onChange(e.target.value)}
          onFocus={() => canEdit && setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        />
      </div>

      <MathEditorModal
        isOpen={isMathEditorOpen}
        onClose={() => {
          setIsMathEditorOpen(false);
          setMathSelection(null);
        }}
        onInsert={handleMathInsert}
      />

      <HindiEditorModal
        isOpen={isHindiEditorOpen}
        onClose={() => {
          setIsHindiEditorOpen(false);
          setHindiSelection(null);
        }}
        onInsert={handleHindiInsert}
      />

      <BlockTypeSelectionModal
        isOpen={isTypeSelectionOpen}
        onClose={() => {
          setIsTypeSelectionOpen(false);
          setAddDirection(null);
        }}
        onSelectText={() => handleTypeSelection("text")}
        onSelectImage={() => handleTypeSelection("image")}
      />

      <ImageUploadModal
        isOpen={isImageUploadOpen}
        onClose={() => {
          setIsImageUploadOpen(false);
          setAddDirection(null);
        }}
        onUploaded={handleImageUploaded}
        templateId={templateId}
        userEmail={userEmail}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onConfirm={() => {
          setIsDeleteConfirmOpen(false);
          onDelete();
        }}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </div>
  );
}
