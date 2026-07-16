"use client";

import { useState } from "react";
import { LuDownload, LuWandSparkles } from "react-icons/lu";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/common/AppShell";
import { ChapterScopePicker, type ChapterScope } from "@/features/ingestion/components/ChapterScopePicker";
import { GeneratedQuestionsResult } from "@/features/ingestion/components/GeneratedQuestionsResult";
import { generateQuestions } from "@/features/ingestion/services/ingestion.service";
import { getApiErrorMessage } from "@/utils/api-error";
import type { GenerateQuesResponse } from "@/types/ingestion";

const INITIAL_SCOPE: ChapterScope = { board: "", grade: "", subject: "", chapter_name: "" };

function exportAsText(result: GenerateQuesResponse): string {
  const lines: string[] = [];
  if (result.final_rephrased_questions) {
    for (const [chapter, items] of Object.entries(result.final_rephrased_questions)) {
      lines.push(`# ${chapter}`);
      for (const item of items) lines.push(`[${item.topic}] ${item.question}`);
      lines.push("");
    }
  }
  if (result.extracted_questions?.length) {
    lines.push("# Raw extracted stems");
    for (const q of result.extracted_questions) lines.push(q.question);
  }
  return lines.join("\n");
}

export function GenerateQuestionsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [scope, setScope] = useState<ChapterScope>(INITIAL_SCOPE);
  const [topics, setTopics] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerateQuesResponse | null>(null);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (selected && !selected.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.");
      setFile(null);
      return;
    }
    setError("");
    setFile(selected);
  }

  async function handleSubmit() {
    if (!scope.subject || !scope.grade || !scope.chapter_name) return setError("Grade, subject, and chapter are required.");
    if (!topics.trim()) return setError("Please list at least one topic.");
    if (!file) return setError("Please select a PDF file.");

    setError("");
    setResult(null);
    setIsGenerating(true);
    try {
      const response = await generateQuestions({
        subject: scope.subject,
        grade: scope.grade,
        chapter_name: scope.chapter_name,
        topics: topics.trim(),
        file,
      });
      setResult(response);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not generate questions."));
    } finally {
      setIsGenerating(false);
    }
  }

  function handleExport() {
    if (!result) return;
    const blob = new Blob([exportAsText(result)], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "generated-questions.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (isAuthLoading) {
    return (
      <AppShell title="ingestion">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading…</div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="ingestion">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
          You don&apos;t have permission to view this page.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="ingestion">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
          <h1 className="text-base font-bold text-slate-900">AI Question Generator</h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Admin Only</span>
        </div>

        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          This produces question stems only (no options, solution, or hint) from a chapter PDF. There is no
          push-to-database step here — review the stems below and author full questions elsewhere.
        </div>

        <div className="mb-6 space-y-6 rounded-xl border border-slate-200 bg-white p-5">
          <ChapterScopePicker value={scope} onChange={setScope} />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Topics <span className="text-red-500">*</span>
            </label>
            <textarea
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              rows={3}
              placeholder="One topic per line, e.g.&#10;Linear Equations&#10;Quadratic Equations"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Chapter PDF <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {file ? <p className="mt-2 text-xs text-slate-500">Selected: {file.name}</p> : null}
          </div>

          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <button
            onClick={handleSubmit}
            disabled={isGenerating}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <LuWandSparkles className="h-4 w-4" /> {isGenerating ? "Generating… this may take a while" : "Generate Questions"}
          </button>
        </div>

        {result ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <LuDownload className="h-3.5 w-3.5" /> Export as text
              </button>
            </div>
            <GeneratedQuestionsResult result={result} />
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
