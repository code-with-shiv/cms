"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LuSearch } from "react-icons/lu";
import { AppShell } from "@/components/common/AppShell";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/context/AuthContext";
import { getTemplates } from "@/features/templates/services/templates.service";
import { QuestionResultsTable } from "@/features/questions/components/QuestionResultsTable";
import { QuestionDetailsModal } from "@/features/questions/components/QuestionDetailsModal";
import {
  deleteQuestion,
  getQuestionByQid,
  searchQuestions,
  searchQuestionsByLuids,
} from "@/features/questions/services/questions.service";
import { getApiErrorMessage } from "@/utils/api-error";
import type { QuestionDocument } from "@/types/question";
import type { Template } from "@/types/template";

type SearchMode = "qid" | "luid" | "text";

const SEARCH_MODE_OPTIONS: Array<{ label: string; value: SearchMode; helper: string; placeholder: string }> = [
  { label: "QID", value: "qid", helper: "Find one question by numeric question id", placeholder: "Enter numeric QID" },
  { label: "LUID", value: "luid", helper: "Fetch all questions mapped to a learning unit", placeholder: "Enter LUID" },
  { label: "Text", value: "text", helper: "Search question text content inside the template", placeholder: "Enter question text" },
];

export function QuestionSearchPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateId, setTemplateId] = useState("");
  const [searchBy, setSearchBy] = useState<SearchMode>("qid");
  const [query, setQuery] = useState("");
  const [questions, setQuestions] = useState<QuestionDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<QuestionDocument | null>(null);
  const [deleting, setDeleting] = useState<QuestionDocument | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const canEdit = user?.role === "creator" || user?.role === "admin" || user?.role === "superadmin";
  const canDelete = user?.role === "admin" || user?.role === "superadmin";
  const selectedMode = SEARCH_MODE_OPTIONS.find((option) => option.value === searchBy)!;

  useEffect(() => {
    let cancelled = false;
    getTemplates()
      .then((data) => {
        if (!cancelled) setTemplates(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, "Could not load templates."));
      })
      .finally(() => {
        if (!cancelled) setTemplatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSearch() {
    const trimmedQuery = query.trim();

    if (!templateId) {
      setError("Select a template before searching.");
      return;
    }
    if (!trimmedQuery) {
      setError("Enter a search value to continue.");
      return;
    }

    setError("");
    setIsLoading(true);
    try {
      let results: QuestionDocument[];
      if (searchBy === "qid") {
        const qid = Number(trimmedQuery);
        if (!Number.isInteger(qid)) throw new Error("QID search expects a numeric value.");
        results = await getQuestionByQid({ template_id: templateId, qid });
      } else if (searchBy === "luid") {
        results = await searchQuestionsByLuids({ template_id: templateId, luids: [trimmedQuery] });
      } else {
        results = await searchQuestions({ template_id: templateId, text: trimmedQuery });
      }
      setQuestions(results);
      setHasLoaded(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not complete the question search."));
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleEdit(doc: QuestionDocument) {
    if (!templateId) return;
    sessionStorage.setItem("prev-ques-url", "/questions/search");
    router.push(`/questions/${doc.qid}/edit?template_id=${encodeURIComponent(templateId)}`);
  }

  async function handleConfirmDelete() {
    if (!deleting || !templateId) return;
    setIsDeleting(true);
    setError("");
    try {
      await deleteQuestion({
        template_id: templateId,
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

  return (
    <AppShell title="search questions">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="min-w-0 flex-1">
              <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)} disabled={templatesLoading}>
                <option value="">{templatesLoading ? "Loading templates…" : "Select a template"}</option>
                {templates.map((template) => (
                  <option key={template.template_id} value={template.template_id}>
                    {template.template_name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {SEARCH_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setSearchBy(option.value);
                    setError("");
                  }}
                  className={`flex h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold transition ${
                    option.value === searchBy ? "bg-indigo-50 text-indigo-600" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="min-w-0 flex-1">
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSearch();
                  }
                }}
                placeholder={selectedMode.placeholder}
                aria-label={`Search by ${searchBy}`}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={isLoading}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <LuSearch className="h-4 w-4" />
              {isLoading ? "Searching…" : "Search"}
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-500">{selectedMode.helper}</p>

          {error ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}
        </div>

        <div className="mt-6">
          <QuestionResultsTable
            questions={questions}
            isLoading={isLoading}
            hasLoaded={hasLoaded}
            emptyMessage="No questions matched the current search."
            canEdit={canEdit}
            canDelete={canDelete}
            onView={setViewing}
            onEdit={handleEdit}
            onDelete={setDeleting}
          />
        </div>
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
