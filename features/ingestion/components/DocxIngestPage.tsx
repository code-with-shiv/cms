"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/common/AppShell";
import { getTemplates } from "@/features/templates/services/templates.service";
import { processDocx, pushToDatabase } from "@/features/ingestion/services/ingestion.service";
import { DocxUploadForm } from "@/features/ingestion/components/DocxUploadForm";
import { QuestionReviewList } from "@/features/ingestion/components/QuestionReviewList";
import { PushProgressOverlay } from "@/features/ingestion/components/PushProgressOverlay";
import { QidMapResult } from "@/features/ingestion/components/QidMapResult";
import { getApiErrorMessage } from "@/utils/api-error";
import type { Template } from "@/types/template";
import type { ProcessDocxPayload, ProcessDocxResponse, PushToDatabaseResponse } from "@/types/ingestion";

type Step = "form" | "reviewing" | "done";

export function DocxIngestPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [step, setStep] = useState<Step>("form");
  const [template, setTemplate] = useState<Template | null>(null);
  const [processResult, setProcessResult] = useState<ProcessDocxResponse | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [cloneFlags, setCloneFlags] = useState<Record<number, "true" | "false">>({});
  const [updateExisting, setUpdateExisting] = useState(false);
  const [pushResult, setPushResult] = useState<PushToDatabaseResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  function reset() {
    setStep("form");
    setTemplate(null);
    setProcessResult(null);
    setSelected(new Set());
    setCloneFlags({});
    setUpdateExisting(false);
    setPushResult(null);
    setError("");
  }

  async function handleProcess(payload: ProcessDocxPayload) {
    setError("");
    setIsProcessing(true);
    try {
      const [result, templates] = await Promise.all([processDocx(payload), getTemplates()]);
      setProcessResult(result);
      setTemplate(templates.find((t) => t.template_id === payload.template_id) ?? null);
      setSelected(new Set(result.valid_questions.map((_, i) => i)));
      setStep("reviewing");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not process the DOCX file."));
    } finally {
      setIsProcessing(false);
    }
  }

  async function handlePush() {
    if (!processResult || !template) return;
    const questions = processResult.valid_questions
      .filter((_, i) => selected.has(i))
      .map((q, i) => (template.can_have_clone ? { ...q, isClone: cloneFlags[i] ?? "false" } : q));
    if (!questions.length) return setError("Select at least one question to push.");

    setError("");
    setIsPushing(true);
    try {
      const result = await pushToDatabase({ template_id: template.template_id, update: updateExisting, questions });
      setPushResult(result);
      setStep("done");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not push questions to the database."));
    } finally {
      setIsPushing(false);
    }
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
      {isPushing ? <PushProgressOverlay count={selected.size} /> : null}
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
          <h1 className="text-base font-bold text-slate-900">Import DOCX</h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Admin Only</span>
        </div>

        {step === "form" ? <DocxUploadForm isSubmitting={isProcessing} error={error} onSubmit={handleProcess} /> : null}

        {step === "reviewing" && processResult && template ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
              <p className="text-sm text-slate-700">
                Extracted <strong>{processResult.total_extracted}</strong> question(s) from the document.
              </p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    className="h-4 w-4 rounded accent-indigo-600"
                  />
                  Update existing questions
                </label>
                <button
                  onClick={handlePush}
                  disabled={isPushing || selected.size === 0}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  Push {selected.size} question{selected.size === 1 ? "" : "s"} to database
                </button>
              </div>
            </div>

            {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <QuestionReviewList
              validQuestions={processResult.valid_questions}
              invalidQuestions={processResult.invalid_questions}
              selected={selected}
              onSelectedChange={setSelected}
              canHaveClone={template.can_have_clone}
              cloneFlags={cloneFlags}
              onCloneFlagChange={(index, value) => setCloneFlags((prev) => ({ ...prev, [index]: value }))}
            />
          </div>
        ) : null}

        {step === "done" && pushResult ? (
          <QidMapResult message={pushResult.message} qidMap={pushResult.qid_map} onStartOver={reset} />
        ) : null}
      </div>
    </AppShell>
  );
}
