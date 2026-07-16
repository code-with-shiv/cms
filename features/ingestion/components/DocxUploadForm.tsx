"use client";

import { useState } from "react";
import { LuUpload } from "react-icons/lu";
import { Select } from "@/components/ui/Select";
import { PUBLICATIONS } from "@/features/ingestion/constants/publications";
import { HierarchyPicker, type HierarchyPathResult } from "@/features/metadata/components/HierarchyPicker";
import type { ProcessDocxPayload } from "@/types/ingestion";

interface DocxUploadFormProps {
  isSubmitting: boolean;
  error: string;
  onSubmit: (payload: ProcessDocxPayload) => void;
}

export function DocxUploadForm({ isSubmitting, error, onSubmit }: DocxUploadFormProps) {
  const [result, setResult] = useState<HierarchyPathResult | null>(null);
  const [publication, setPublication] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState("");

  const publicationOptions = result?.board && result.board in PUBLICATIONS
    ? PUBLICATIONS[result.board as keyof typeof PUBLICATIONS]
    : [];

  function handleResultChange(next: HierarchyPathResult | null) {
    if (next?.board !== result?.board) setPublication("");
    setResult(next);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (selected && !selected.name.toLowerCase().endsWith(".docx")) {
      setValidationError("Please select a .docx file.");
      setFile(null);
      return;
    }
    setValidationError("");
    setFile(selected);
  }

  function handleSubmit() {
    if (!result) return setValidationError("Template, board, grade, subject, and chapter are required.");
    if (!file) return setValidationError("Please select a .docx file to upload.");
    setValidationError("");
    onSubmit({
      file,
      grade: result.grade,
      board: result.board,
      subject: result.subject,
      chapter_name: result.chapterName,
      template_id: result.template.template_id,
      publication: publication || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Template &amp; scope</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Question path <span className="text-red-500">*</span>
            </label>
            <HierarchyPicker maxDepth="chapter" onChange={handleResultChange} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Publication</label>
            <Select value={publication} onChange={(e) => setPublication(e.target.value)} disabled={!result}>
              <option value="">{result ? "Select publication…" : "Select a question path first"}</option>
              {publicationOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">DOCX file</h2>
        <input
          type="file"
          accept=".docx"
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
        />
        {file ? <p className="mt-2 text-xs text-slate-500">Selected: {file.name}</p> : null}
      </div>

      {(validationError || error) ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {validationError || error}
        </div>
      ) : null}

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        <LuUpload className="h-4 w-4" /> {isSubmitting ? "Processing…" : "Process DOCX"}
      </button>
    </div>
  );
}
