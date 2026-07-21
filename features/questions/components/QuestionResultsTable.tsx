"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  LuChevronLeft,
  LuChevronRight,
  LuEye,
  LuFilter,
  LuLoaderCircle,
  LuPencil,
  LuSearch,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import { RenderInline } from "@/features/questions/components/RenderInline";
import { QuestionFilterSelect } from "@/features/questions/components/QuestionFilterSelect";
import { QuestionsTableShimmer } from "@/features/questions/components/QuestionsTableShimmer";
import { contentBlocksToText } from "@/features/questions/utils/content-blocks";
import type { QuestionDocument } from "@/types/question";

const QUESTIONS_PER_PAGE = 10;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.filter((value) => value && value !== "—"))).sort((a, b) => a.localeCompare(b));
}

function badgeTone(value: string): string {
  const v = value.toLowerCase();
  if (v === "accepted" || v === "accepted_with_changes") return "bg-emerald-50 text-emerald-700";
  if (v === "synced") return "bg-cyan-50 text-cyan-700";
  if (v === "pending_review") return "bg-amber-50 text-amber-700";
  if (v === "re_edit") return "bg-orange-50 text-orange-700";
  if (v === "rejected") return "bg-rose-50 text-rose-700";
  if (v === "draft") return "bg-slate-100 text-slate-600";
  if (v === "easy") return "bg-emerald-50 text-emerald-700";
  if (v === "medium") return "bg-amber-50 text-amber-700";
  if (v === "difficult" || v === "hard") return "bg-rose-50 text-rose-700";
  if (v === "true") return "bg-violet-50 text-violet-700";
  return "bg-slate-100 text-slate-600";
}

function Badge({ label }: { label: string }) {
  return (
    <span className={`inline-flex min-w-[40px] justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeTone(label)}`}>
      {label}
    </span>
  );
}

interface QuestionResultsTableProps {
  questions: QuestionDocument[];
  isLoading: boolean;
  hasLoaded: boolean;
  emptyMessage: string;
  // Edit + delete are management actions, shown only to admin/superadmin.
  canManage: boolean;
  onView: (doc: QuestionDocument) => void;
  viewingQid?: number | null;
  onEdit: (doc: QuestionDocument) => void;
  onDelete: (doc: QuestionDocument) => void;
}

export function QuestionResultsTable({
  questions,
  isLoading,
  hasLoaded,
  emptyMessage,
  canManage,
  onView,
  viewingQid,
  onEdit,
  onDelete,
}: QuestionResultsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [cloneFilter, setCloneFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const rows = useMemo(
    () =>
      questions.map((q) => ({
        document: q,
        id: String(q.qid ?? q._id),
        text: contentBlocksToText(q.question) || "Untitled question",
        isClone: String(q.isClone ?? "—"),
        isCloneOf: q.isCloneOf ? String(q.isCloneOf) : "—",
        difficulty: String(q.difficulty_level ?? "Not set"),
        status: String(q.status ?? "—"),
        updated: String(q.updated_at ?? q.updated_by ?? "—"),
      })),
    [questions],
  );

  const cloneOptions = useMemo(() => uniqueOptions(rows.map((r) => r.isClone)), [rows]);
  const difficultyOptions = useMemo(() => uniqueOptions(rows.map((r) => r.difficulty)), [rows]);
  const statusOptions = useMemo(() => uniqueOptions(rows.map((r) => r.status)), [rows]);

  const searched = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.id.toLowerCase().includes(q));
  }, [deferredSearchQuery, rows]);

  const filtered = useMemo(
    () =>
      searched.filter((r) => {
        const matchesClone = !cloneFilter || normalize(r.isClone) === normalize(cloneFilter);
        const matchesDifficulty = !difficultyFilter || normalize(r.difficulty) === normalize(difficultyFilter);
        const matchesStatus = !statusFilter || normalize(r.status) === normalize(statusFilter);
        return matchesClone && matchesDifficulty && matchesStatus;
      }),
    [cloneFilter, difficultyFilter, statusFilter, searched],
  );

  const hasActiveFilters = Boolean(cloneFilter || difficultyFilter || statusFilter);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / QUESTIONS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * QUESTIONS_PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + QUESTIONS_PER_PAGE);
  const firstVisible = total === 0 ? 0 : startIndex + 1;
  const lastVisible = Math.min(startIndex + QUESTIONS_PER_PAGE, total);
  const visiblePages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  function resetToFirstPage() {
    setCurrentPage(1);
  }

  return (
    <div>
      <div className="rounded-xl border border-slate-200 bg-white p-2.5">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <div className="inline-flex h-9 items-center gap-2 px-2 text-xs font-semibold text-slate-500">
            <LuFilter className="h-3.5 w-3.5" />
            Filters
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
            <QuestionFilterSelect
              label="Clone"
              value={cloneFilter}
              options={cloneOptions}
              onChange={(v) => {
                setCloneFilter(v);
                resetToFirstPage();
              }}
            />
            <QuestionFilterSelect
              label="Difficulty"
              value={difficultyFilter}
              options={difficultyOptions}
              onChange={(v) => {
                setDifficultyFilter(v);
                resetToFirstPage();
              }}
            />
            <QuestionFilterSelect
              label="Status"
              value={statusFilter}
              options={statusOptions}
              onChange={(v) => {
                setStatusFilter(v);
                resetToFirstPage();
              }}
            />
            <label className="relative block min-w-0">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                <LuSearch className="h-3.5 w-3.5" />
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  resetToFirstPage();
                }}
                placeholder="Search by QID…"
                aria-label="Search questions by QID"
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-8 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    resetToFirstPage();
                  }}
                  aria-label="Clear search"
                  className="absolute inset-y-0 right-2 inline-flex items-center text-slate-400 hover:text-slate-700"
                >
                  <LuX className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </label>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {isLoading ? (
          "Loading questions…"
        ) : (
          <>
            <span className="font-semibold text-slate-900">{total}</span> questions found
          </>
        )}
      </p>

      {isLoading ? (
        <div className="mt-2">
          <QuestionsTableShimmer />
        </div>
      ) : (
      <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5">ID</th>
                <th className="px-3 py-2.5">Question</th>
                <th className="px-3 py-2.5">Is Clone</th>
                <th className="px-3 py-2.5">Is Clone Of</th>
                <th className="px-3 py-2.5">Difficulty</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Updated</th>
                <th className="px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-sm font-medium text-slate-600">
                    {!hasLoaded
                      ? "Select a scope above to load questions."
                      : searchQuery
                        ? `No question found with QID "${searchQuery}".`
                        : hasActiveFilters
                          ? "No questions match the selected filters."
                          : emptyMessage}
                  </td>
                </tr>
              ) : (
                paginated.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 align-top">
                      <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {row.id}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="max-w-[395px]">
                        <RenderInline content={row.text} className="text-[13px] font-medium leading-5 text-slate-900" style={{ padding: 0, overflow: "visible" }} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <Badge label={row.isClone} />
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <Badge label={row.isCloneOf} />
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <Badge label={row.difficulty} />
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <Badge label={row.status} />
                    </td>
                    <td className="px-3 py-2.5 align-top text-xs text-slate-500">{row.updated}</td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="flex items-center gap-3 text-slate-500">
                        <button
                          type="button"
                          onClick={() => onView(row.document)}
                          disabled={viewingQid === row.document.qid}
                          aria-label={`View ${row.id}`}
                          className="hover:text-indigo-600 disabled:cursor-wait disabled:opacity-50"
                        >
                          {viewingQid === row.document.qid ? (
                            <LuLoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <LuEye className="h-4 w-4" />
                          )}
                        </button>
                        {canManage ? (
                          <>
                            <button type="button" onClick={() => onEdit(row.document)} aria-label={`Edit ${row.id}`} className="hover:text-indigo-600">
                              <LuPencil className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => onDelete(row.document)} aria-label={`Delete ${row.id}`} className="hover:text-rose-600">
                              <LuTrash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {!isLoading && total > 0 ? (
        <div className="mt-4 flex flex-col gap-2.5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {firstVisible}-{lastVisible} of {total} results
          </p>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous page"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <LuChevronLeft className="h-3.5 w-3.5" />
            </button>
            {visiblePages.map((p, idx) => {
              const prev = visiblePages[idx - 1];
              const showEllipsis = prev !== undefined && p - prev > 1;
              return (
                <span key={p} className="inline-flex items-center gap-2">
                  {showEllipsis ? <span aria-hidden="true">…</span> : null}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    aria-current={page === p ? "page" : undefined}
                    className={`inline-flex h-7.5 min-w-7.5 items-center justify-center rounded-md px-2.5 font-semibold ${
                      page === p ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {p}
                  </button>
                </span>
              );
            })}
            <button
              type="button"
              aria-label="Next page"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <LuChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
