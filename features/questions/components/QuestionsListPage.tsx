"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/common/AppShell";
import { QuestionScopePicker, type QuestionScope } from "@/features/questions/components/QuestionScopePicker";
import { QuestionResultsTable } from "@/features/questions/components/QuestionResultsTable";
import { QuestionDetailsModal } from "@/features/questions/components/QuestionDetailsModal";
import { deleteQuestion, getQuestionByQid, getQuestions } from "@/features/questions/services/questions.service";
import { getApiErrorMessage } from "@/utils/api-error";
import type { QuestionDocument } from "@/types/question";

export function QuestionsListPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [scope, setScope] = useState<QuestionScope | null>(null);
  const [questions, setQuestions] = useState<QuestionDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<QuestionDocument | null>(null);
  const [loadingQid, setLoadingQid] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<QuestionDocument | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = user?.role === "reviewer" || user?.role === "admin" || user?.role === "superadmin";

  async function loadQuestions(nextScope: QuestionScope) {
    setScope(nextScope);
    setIsLoading(true);
    setError("");
    try {
      const data = await getQuestions({ template_id: nextScope.templateId, filter_value: nextScope.filterValue });
      setQuestions(data);
      setHasLoaded(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load questions."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleView(doc: QuestionDocument) {
    if (!scope) return;
    setError("");
    setLoadingQid(doc.qid);
    try {
      const results = await getQuestionByQid({ template_id: scope.templateId, qid: doc.qid });
      setViewing(results[0] ?? doc);
    } catch (err) {
      setError(getApiErrorMessage(err, `Could not load full details for Q-${doc.qid}.`));
    } finally {
      setLoadingQid(null);
    }
  }

  function handleEdit(doc: QuestionDocument) {
    if (!scope) return;
    sessionStorage.setItem("prev-ques-url", "/questions");
    router.push(`/questions/${doc.qid}/edit?template_id=${encodeURIComponent(scope.templateId)}`);
  }

  async function handleConfirmDelete() {
    if (!deleting || !scope) return;
    setIsDeleting(true);
    setError("");
    try {
      await deleteQuestion({
        template_id: scope.templateId,
        id: deleting._id,
        comment: deleteReason.trim() || "No reason provided",
      });
      setQuestions((prev) => prev.filter((q) => q._id !== deleting._id));
      setDeleting(null);
      setDeleteReason("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not delete question."));
    } finally {
      setIsDeleting(false);
    }
  }

  if (isAuthLoading) {
    return (
      <AppShell title="questions">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading…</div>
      </AppShell>
    );
  }

  return (
    <AppShell title="questions">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        

        <QuestionScopePicker onSelect={loadQuestions} />

        {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

        {scope ? (
          <div className="mt-6">
            <p className="mb-3 text-sm text-slate-600">
              Showing <strong>{scope.label}</strong> · {scope.templateName}
            </p>
            <QuestionResultsTable
              questions={questions}
              isLoading={isLoading}
              hasLoaded={hasLoaded}
              emptyMessage="No questions found in this scope."
              canDelete={canDelete}
              onView={handleView}
              viewingQid={loadingQid}
              onEdit={handleEdit}
              onDelete={setDeleting}
            />
          </div>
        ) : null}
      </div>

      {viewing ? <QuestionDetailsModal question={viewing} onClose={() => setViewing(null)} /> : null}

      {deleting ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setDeleting(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-sm font-bold text-slate-900">Delete Q-{deleting.qid}?</h2>
            <p className="mt-1 text-xs text-slate-500">
              This sets its status to rejected. It won&apos;t appear in default lists anymore.
            </p>
            <input
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Reason (optional)"
              className="mt-3 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={isDeleting}
                className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="h-9 rounded-lg bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
              >
                {isDeleting ? "Deleting…" : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
