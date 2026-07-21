"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/common/AppShell";
import { QuestionScopePicker, type QuestionScope } from "@/features/questions/components/QuestionScopePicker";
import { QuestionDetailsModal } from "@/features/questions/components/QuestionDetailsModal";
import { ReviewActionModal } from "@/features/questions/components/ReviewActionModal";
import { RenderInline } from "@/features/questions/components/RenderInline";
import { contentBlocksToText } from "@/features/questions/utils/content-blocks";
import { getQuestionByQid, getQuestions, reviewQuestion } from "@/features/questions/services/questions.service";
import { getApiErrorMessage } from "@/utils/api-error";
import type { QuestionDocument, ReviewAction } from "@/types/question";

export function ReviewQueuePage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [scope, setScope] = useState<QuestionScope | null>(null);
  const [questions, setQuestions] = useState<QuestionDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<QuestionDocument | null>(null);
  const [loadingQid, setLoadingQid] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<{ doc: QuestionDocument; action: ReviewAction } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isReviewer = user?.role === "reviewer" || user?.role === "admin" || user?.role === "superadmin";

  async function loadQuestions(nextScope: QuestionScope) {
    setScope(nextScope);
    setIsLoading(true);
    setError("");
    try {
      const data = await getQuestions({
        template_id: nextScope.templateId,
        filter_value: nextScope.filterValue,
        status_filter: ["pending_review"],
      });
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
    sessionStorage.setItem("prev-ques-url", "/questions/review");
    router.push(`/questions/${doc.qid}/edit?template_id=${encodeURIComponent(scope.templateId)}`);
  }

  async function handleConfirmReview(comment?: string) {
    if (!pendingAction || !scope || !user) return;
    setIsSubmitting(true);
    setError("");
    try {
      await reviewQuestion({
        template_id: scope.templateId,
        qid: pendingAction.doc.qid,
        action: pendingAction.action,
        comment,
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
      });
      setPendingAction(null);
      setViewing(null);
      await loadQuestions(scope);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not submit review."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthLoading) {
    return (
      <AppShell title="review-queue">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading…</div>
      </AppShell>
    );
  }

  if (!isReviewer) {
    return (
      <AppShell title="review-queue">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
          You don&apos;t have permission to view this page.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="review-queue">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Review Queue</h1>
          <p className="text-sm text-slate-500">Questions awaiting your review.</p>
        </div>

        <QuestionScopePicker onSelect={loadQuestions} />

        {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

        {scope ? (
          <div className="mt-6">
            <p className="mb-3 text-sm text-slate-600">
              Showing <strong>{scope.label}</strong> · {scope.templateName}
            </p>
            {isLoading ? (
              <div className="py-10 text-center text-sm text-slate-500">Loading questions…</div>
            ) : questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
                {hasLoaded ? "No questions pending review in this scope." : "Select a scope above."}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5">ID</th>
                        <th className="px-3 py-2.5">Question</th>
                        {/* <th className="px-3 py-2.5">Submitted By</th>
                        <th className="px-3 py-2.5">Submitted At</th> */}
                        <th className="px-3 py-2.5">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {questions.map((q) => (
                        <tr key={String(q.qid)} className="hover:bg-slate-50">
                          <td className="px-3 py-3 align-top">
                            <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                              {q.qid}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="max-w-[395px]">
                              <RenderInline
                                content={contentBlocksToText(q.question) || "Untitled question"}
                                className="text-[13px] font-medium leading-5 text-slate-900"
                                style={{ padding: 0, overflow: "visible" }}
                              />
                            </div>
                          </td>
                          {/* <td className="px-3 py-2.5 align-top text-xs text-slate-600">{String(q.submitted_by ?? "—")}</td>
                          <td className="px-3 py-2.5 align-top text-xs text-slate-600">{String(q.submitted_at ?? "—")}</td> */}
                          <td className="px-3 py-2.5 align-top">
                            <button
                              type="button"
                              onClick={() => handleView(q)}
                              disabled={loadingQid === q.qid}
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                            >
                              {loadingQid === q.qid ? "Loading…" : "View"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {viewing ? (
        <QuestionDetailsModal
          question={viewing}
          onClose={() => setViewing(null)}
          onReview={(action) => setPendingAction({ doc: viewing, action })}
          onEdit={() => handleEdit(viewing)}
          escapeDisabled={Boolean(pendingAction)}
        />
      ) : null}
      {pendingAction ? (
        <ReviewActionModal
          question={pendingAction.doc}
          action={pendingAction.action}
          isSubmitting={isSubmitting}
          onConfirm={handleConfirmReview}
          onClose={() => setPendingAction(null)}
        />
      ) : null}
    </AppShell>
  );
}
