"use client";

import { useEffect, useMemo, useState } from "react";
import { LuTriangleAlert } from "react-icons/lu";
import { AppShell } from "@/components/common/AppShell";
import { useAuth } from "@/context/AuthContext";
import { getAllAssignments, getMyAssignments } from "@/features/assignments/services/assignments.service";
import { getTemplates } from "@/features/templates/services/templates.service";
import { ASSIGNMENT_LEVEL_LABEL } from "@/features/assignments/utils/level-compat";
import {
  countByCreator,
  countByLevel,
  countByReviewer,
  countByTemplate,
  scopeName,
  summarize,
  type UserBreakdownRow,
} from "@/features/assignments/utils/assignment-stats";
import { contentBlocksToText } from "@/features/questions/utils/content-blocks";
import { RenderInline } from "@/features/questions/components/RenderInline";
import { QuestionDetailsModal } from "@/features/questions/components/QuestionDetailsModal";
import { Badge } from "@/features/questions/components/QuestionResultsTable";
import { getQuestionByQid, getQuestions } from "@/features/questions/services/questions.service";
import { getApiErrorMessage } from "@/utils/api-error";
import type { Assignment, AssignmentLevel } from "@/types/assignment";
import type { QuestionDocument, QuestionStatus } from "@/types/question";
import type { Template } from "@/types/template";

// Explicit — omitting status_filter makes the backend default to excluding "rejected".
const ALL_QUESTION_STATUSES: QuestionStatus[] = [
  "draft",
  "pending_review",
  "accepted",
  "accepted_with_changes",
  "re_edit",
  "rejected",
  "synced",
];
const DRILLDOWN_LIMIT = 20; // ponytail: arbitrary cap for chapter/topic-scoped assignments with 100s of questions

// The scope value get_questions_by_level_filter expects for an assignment's level.
function scopeFilterValue(a: Assignment): string | number {
  if (a.level === "lu") return a.assignment_json.luid ?? "";
  if (a.level === "topic") return a.assignment_json.topic_id ?? "";
  return a.assignment_json.chapter_id;
}

interface StatTile {
  label: string;
  value: string | number;
  hint: string;
  color: string;
}

const STATUS_SEGMENT_META = [
  { key: "active", label: "Active", barColor: "bg-indigo-500" },
  { key: "completed", label: "Completed", barColor: "bg-emerald-500" },
  { key: "reassigned", label: "Reassigned", barColor: "bg-amber-500" },
] as const;

// Today → time (e.g. "2:45 PM"), yesterday → "Yesterday", otherwise the date.
function formatActivityTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function UserBreakdownTable({ title, rows, emailLabel }: { title: string; rows: UserBreakdownRow[]; emailLabel: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-slate-500">No data.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">{emailLabel}</th>
                <th className="px-4 py-2.5 text-center">Total</th>
                <th className="px-4 py-2.5 text-center">Active</th>
                <th className="px-4 py-2.5 text-center">Completed</th>
                <th className="px-4 py-2.5 text-center">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.email}>
                  <td className="max-w-[220px] truncate px-4 py-2.5 text-slate-700">{row.email}</td>
                  <td className="px-4 py-2.5 text-center font-semibold text-slate-900">{row.total}</td>
                  <td className="px-4 py-2.5 text-center text-indigo-700">{row.counts.active}</td>
                  <td className="px-4 py-2.5 text-center text-emerald-700">{row.counts.completed}</td>
                  <td className="px-4 py-2.5 text-center font-semibold text-slate-900">
                    {row.completionRate === null ? "—" : `${row.completionRate}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AssignmentsDashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [pendingReviewCount, setPendingReviewCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [drillQuestions, setDrillQuestions] = useState<QuestionDocument[]>([]);
  const [isDrillLoading, setIsDrillLoading] = useState(false);
  const [drillError, setDrillError] = useState("");
  const [viewingQuestion, setViewingQuestion] = useState<QuestionDocument | null>(null);
  const [viewingQid, setViewingQid] = useState<number | null>(null);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isTier1 = user?.role === "creator" || user?.role === "reviewer";
  const isReviewer = user?.role === "reviewer";

  useEffect(() => {
    if (!isAdmin && !isTier1) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const [assignmentData, templateData] = await Promise.all([
          isAdmin ? getAllAssignments() : getMyAssignments(),
          getTemplates().catch(() => []),
        ]);
        if (cancelled) return;
        setAssignments(assignmentData);
        setTemplates(templateData);

        if (isReviewer) {
          // "Pending Your Review" — count of pending_review questions across every
          // scope this reviewer is actively assigned to (Recent Activity can't show
          // this: submissions are logged under the creator's email, not the reviewer's).
          const scopes = new Map<string, { template_id: string; filterValue: string | number }>();
          for (const a of assignmentData) {
            if (a.status !== "active") continue;
            const filterValue = scopeFilterValue(a);
            if (!filterValue) continue;
            scopes.set(`${a.template_id}|${a.level}|${filterValue}`, { template_id: a.template_id, filterValue });
          }
          const counts = await Promise.all(
            Array.from(scopes.values()).map((scope) =>
              getQuestions({ template_id: scope.template_id, filter_value: scope.filterValue, status_filter: ["pending_review"] })
                .then((qs) => qs.length)
                .catch(() => 0),
            ),
          );
          if (!cancelled) setPendingReviewCount(counts.reduce((sum, c) => sum + c, 0));
        } else {
          setPendingReviewCount(null);
        }
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, "Could not load assignment data."));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, isTier1, isReviewer]);

  const summary = useMemo(() => summarize(assignments), [assignments]);
  const levelCounts = useMemo(() => countByLevel(assignments), [assignments]);
  const templateRows = useMemo(() => countByTemplate(assignments).slice(0, 5), [assignments]);
  const creatorRows = useMemo(() => (isAdmin ? countByCreator(assignments) : []), [assignments, isAdmin]);
  const reviewerRows = useMemo(() => (isAdmin ? countByReviewer(assignments) : []), [assignments, isAdmin]);

  function templateName(templateId: string): string {
    return templates.find((t) => t.template_id === templateId)?.template_name ?? templateId;
  }

  const activeAssignments = useMemo(() => assignments.filter((a) => a.status === "active"), [assignments]);
  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId) ?? null;

  function pillLabel(a: Assignment): string {
    return `${scopeName(a)} · ${templateName(a.template_id)}`;
  }

  async function handlePillClick(a: Assignment) {
    if (selectedAssignmentId === a.id) {
      setSelectedAssignmentId(null);
      return;
    }
    setSelectedAssignmentId(a.id);
    setDrillQuestions([]);
    setDrillError("");
    const filterValue = scopeFilterValue(a);
    if (!filterValue) return;
    setIsDrillLoading(true);
    try {
      const qs = await getQuestions({
        template_id: a.template_id,
        filter_value: filterValue,
        status_filter: ALL_QUESTION_STATUSES,
      });
      // Scope is shared per-LU/topic/chapter and can hold other creators' questions
      // too — scope to this assignment's creator, except admin/superadmin who see
      // every question in the scope with no filtering.
      const owned = isAdmin ? qs : qs.filter((q) => q.created_by === a.creator_email);
      const sorted = owned.sort(
        (x, y) => new Date(String(y.updated_at ?? 0)).getTime() - new Date(String(x.updated_at ?? 0)).getTime(),
      );
      setDrillQuestions(sorted.slice(0, DRILLDOWN_LIMIT));
    } catch (err) {
      setDrillError(getApiErrorMessage(err, "Could not load questions for this assignment."));
    } finally {
      setIsDrillLoading(false);
    }
  }

  async function handleViewQuestion(doc: QuestionDocument, templateId: string) {
    setDrillError("");
    setViewingQid(doc.qid);
    try {
      const results = await getQuestionByQid({ template_id: templateId, qid: doc.qid });
      setViewingQuestion(results[0] ?? doc);
    } catch (err) {
      setDrillError(getApiErrorMessage(err, `Could not load full details for Q-${doc.qid}.`));
    } finally {
      setViewingQid(null);
    }
  }

  const statTiles: StatTile[] = [
    ...(isReviewer
      ? [{ label: "Pending Your Review", value: pendingReviewCount ?? 0, hint: "Awaiting action in your scopes", color: "text-rose-700" }]
      : []),
    { label: "Total", value: summary.total, hint: isAdmin ? "All assignments" : "Assigned to you", color: "text-slate-900" },
    { label: "Active", value: summary.counts.active, hint: "In progress", color: "text-indigo-700" },
    { label: "Completed", value: summary.counts.completed, hint: "Marked done", color: "text-emerald-700" },
    { label: "Reassigned", value: summary.counts.reassigned, hint: "Moved on", color: "text-amber-700" },
    {
      label: "Completion Rate",
      value: summary.completionRate === null ? "—" : `${summary.completionRate}%`,
      hint: "Completed of total",
      color: "text-teal-700",
    },
    {
      label: "Avg Turnaround",
      value: summary.avgTurnaroundDays === null ? "—" : `${summary.avgTurnaroundDays}d`,
      hint: "Assigned → completed",
      color: "text-violet-700",
    },
  ];

  if (isAuthLoading) {
    return (
      <AppShell title="Assignments Dashboard">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading…</div>
      </AppShell>
    );
  }

  if (!isAdmin && !isTier1) {
    return (
      <AppShell title="Assignments Dashboard">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
          You don&apos;t have permission to view this page.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Assignments Dashboard">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Assignments Dashboard</h1>
          <p className="text-sm text-slate-500">
            {isAdmin
              ? "Organization-wide assignment activity across every creator and reviewer."
              : "Your assignment workload at a glance."}
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading dashboard…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {statTiles.map((card) => (
                <section key={card.label} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <span className="inline-flex rounded-full bg-slate-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    {card.label}
                  </span>
                  <p className={`mt-3 text-3xl font-extrabold tracking-tight ${card.color}`}>{card.value}</p>
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">{card.hint}</p>
                </section>
              ))}
            </div>

            {summary.staleActive.length > 0 ? (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <p className="text-sm text-red-700">
                  <strong className="font-bold">{summary.staleActive.length}</strong> assignment
                  {summary.staleActive.length === 1 ? " has" : "s have"} been active for over 7 days without completion.
                </p>
              </div>
            ) : null}

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">Status Breakdown</h2>
              {summary.total === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No assignments yet.</p>
              ) : (
                <>
                  <div className="mt-3 flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100">
                    {STATUS_SEGMENT_META.filter((segment) => summary.counts[segment.key] > 0).map((segment) => (
                      <div
                        key={segment.key}
                        className={`${segment.barColor} h-full rounded-full`}
                        style={{ width: `${(summary.counts[segment.key] / summary.total) * 100}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                    {STATUS_SEGMENT_META.map((segment) => (
                      <div key={segment.key} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span className={`h-2 w-2 rounded-full ${segment.barColor}`} />
                        <span className="font-medium text-slate-900">{segment.label}</span>
                        <span>
                          {summary.counts[segment.key]} ({Math.round((summary.counts[segment.key] / summary.total) * 100)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {!isAdmin ? (
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-900">By Level</h2>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(Object.keys(ASSIGNMENT_LEVEL_LABEL) as AssignmentLevel[]).map((level) => (
                      <div key={level} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-center">
                        <p className="text-lg font-extrabold text-slate-900">{levelCounts[level]}</p>
                        <p className="text-xs text-slate-500">{ASSIGNMENT_LEVEL_LABEL[level]}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-900">Top Templates</h2>
                  {templateRows.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">No assignments yet.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {templateRows.map((row) => (
                        <div key={row.templateId} className="flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate text-slate-700">{templateName(row.templateId)}</span>
                          <span className="shrink-0 font-semibold text-slate-900">
                            {row.completed}/{row.total} done
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <UserBreakdownTable title="By Creator" rows={creatorRows} emailLabel="Creator" />
                <UserBreakdownTable title="By Reviewer" rows={reviewerRows} emailLabel="Reviewer" />
              </div>
            )}

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">Recent Activity</h2>
              <p className="text-xs text-slate-500">Pick an active assignment to see its most recently edited questions.</p>

              {activeAssignments.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No active assignments.</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeAssignments.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => handlePillClick(a)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        selectedAssignmentId === a.id
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                      }`}
                    >
                      {pillLabel(a)}
                    </button>
                  ))}
                </div>
              )}

              {selectedAssignment ? (
                <div className="mt-4">
                  {isDrillLoading ? (
                    <p className="text-sm text-slate-500">Loading questions…</p>
                  ) : drillError ? (
                    <p className="text-sm text-rose-600">{drillError}</p>
                  ) : drillQuestions.length === 0 ? (
                    <p className="text-sm text-slate-500">No questions found for this assignment.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                      {drillQuestions.map((q) => (
                        <li key={q.qid} className="flex items-center gap-3 px-3 py-2.5">
                          <span className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            Q-{q.qid}
                          </span>
                          <div className="min-w-0 flex-1">
                            <RenderInline
                              content={contentBlocksToText(q.question) || "Untitled question"}
                              className="truncate text-[13px] text-slate-900"
                              style={{ padding: 0, overflow: "visible" }}
                            />
                          </div>
                          <Badge label={String(q.status)} />
                          <span className="shrink-0 text-xs text-slate-400">
                            {q.updated_at ? formatActivityTime(String(q.updated_at)) : "—"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleViewQuestion(q, selectedAssignment.template_id)}
                            disabled={viewingQid === q.qid}
                            className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                          >
                            {viewingQid === q.qid ? "Loading…" : "View"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>

      {viewingQuestion ? <QuestionDetailsModal question={viewingQuestion} onClose={() => setViewingQuestion(null)} /> : null}
    </AppShell>
  );
}
