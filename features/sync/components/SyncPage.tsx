"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/common/AppShell";
import { QuestionScopePicker, type QuestionScope } from "@/features/questions/components/QuestionScopePicker";
import { RenderInline } from "@/features/questions/components/RenderInline";
import { contentBlocksToText } from "@/features/questions/utils/content-blocks";
import { getQuestions } from "@/features/questions/services/questions.service";
import { getFormatCmsData, syncToDevAndProd, syncToDevOnly } from "@/features/sync/services/sync.service";
import { SyncPreviewPanel } from "@/features/sync/components/SyncPreviewPanel";
import { SyncConfirmModal, type SyncMode } from "@/features/sync/components/SyncConfirmModal";
import { isSyncFailure } from "@/types/sync";
import { getApiErrorMessage } from "@/utils/api-error";
import type { QuestionDocument } from "@/types/question";
import type { GetFormatCmsDataResponse } from "@/types/sync";

export function SyncPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [scope, setScope] = useState<QuestionScope | null>(null);
  const [questions, setQuestions] = useState<QuestionDocument[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");

  const [preview, setPreview] = useState<GetFormatCmsDataResponse | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);

  const [pendingMode, setPendingMode] = useState<SyncMode | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; message: string } | null>(null);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  async function loadQuestions(nextScope: QuestionScope) {
    setScope(nextScope);
    setSelected(new Set());
    setPreview(null);
    setSyncResult(null);
    setIsLoadingQuestions(true);
    setError("");
    try {
      const data = await getQuestions({
        template_id: nextScope.templateId,
        filter_value: nextScope.filterValue,
        status_filter: ["accepted", "accepted_with_changes"],
      });
      setQuestions(data);
      setHasLoaded(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load questions."));
    } finally {
      setIsLoadingQuestions(false);
    }
  }

  function toggleOne(qid: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === questions.length ? new Set() : new Set(questions.map((q) => q.qid))));
  }

  async function handleFormat() {
    if (!scope || selected.size === 0) return;
    setError("");
    setPreview(null);
    setSyncResult(null);
    setIsFormatting(true);
    try {
      const response = await getFormatCmsData({ template_id: scope.templateId, qid_list: Array.from(selected) });
      setPreview(response);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not format data for sync."));
    } finally {
      setIsFormatting(false);
    }
  }

  async function handleConfirmSync() {
    if (!scope || !preview || !user?.email || !pendingMode) return;
    setIsSyncing(true);
    try {
      const payload = { template_id: scope.templateId, email: user.email, questions: preview.data };
      const response = pendingMode === "dev" ? await syncToDevOnly(payload) : await syncToDevAndProd(payload);
      if (isSyncFailure(response)) {
        setSyncResult({ ok: false, message: response.error ?? response.message });
      } else {
        setSyncResult({ ok: true, message: response.message });
      }
      setPendingMode(null);
    } catch (err) {
      setSyncResult({ ok: false, message: getApiErrorMessage(err, "Sync request failed.") });
      setPendingMode(null);
    } finally {
      setIsSyncing(false);
    }
  }

  if (isAuthLoading) {
    return (
      <AppShell title="release">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading…</div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="release">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
          You don&apos;t have permission to view this page.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="release">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
          <h1 className="text-base font-bold text-slate-900">Sync to Dev/Prod</h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Admin Only</span>
        </div>

        <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          Syncing pushes real data to live external Acadally systems (https://api.acadally.com and, for the combined
          option, https://leap.acadally.com). Only questions already <strong>accepted</strong> are eligible.
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">1. Select scope</h2>
          <QuestionScopePicker onSelect={loadQuestions} />
        </div>

        {error ? <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {scope ? (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">2. Select accepted questions</h2>
            {isLoadingQuestions ? (
              <p className="py-6 text-center text-sm text-slate-500">Loading questions…</p>
            ) : questions.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                {hasLoaded ? "No accepted questions in this scope." : "Select a scope above."}
              </p>
            ) : (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={selected.size === questions.length}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded accent-indigo-600"
                  />
                  {selected.size} of {questions.length} selected
                </label>
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {questions.map((q) => (
                    <label
                      key={q.qid}
                      className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(q.qid)}
                        onChange={() => toggleOne(q.qid)}
                        className="mt-1 h-4 w-4 rounded accent-indigo-600"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="mr-2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                          Q{q.qid}
                        </span>
                        <RenderInline
                          content={contentBlocksToText(q.question) || "Untitled question"}
                          className="inline text-xs text-slate-800"
                          style={{ padding: 0 }}
                        />
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  onClick={handleFormat}
                  disabled={selected.size === 0 || isFormatting}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {isFormatting ? "Formatting…" : `Format ${selected.size} question(s) for sync`}
                </button>
              </div>
            )}
          </div>
        ) : null}

        {preview ? (
          <div className="mb-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">3. Review formatted data</h2>
            <SyncPreviewPanel preview={preview} />

            {syncResult ? (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  syncResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                {syncResult.message}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setPendingMode("dev")}
                disabled={!!preview.error}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-60"
              >
                Sync to DEV only
              </button>
              <button
                onClick={() => setPendingMode("dev_prod")}
                disabled={!!preview.error}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
              >
                Sync to DEV + PROD
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {pendingMode && scope ? (
        <SyncConfirmModal
          mode={pendingMode}
          templateName={scope.templateName}
          questionCount={selected.size}
          isSubmitting={isSyncing}
          onConfirm={handleConfirmSync}
          onClose={() => setPendingMode(null)}
        />
      ) : null}
    </AppShell>
  );
}
