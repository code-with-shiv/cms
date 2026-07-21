"use client";

import { useEffect, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import { LuCircleCheckBig, LuPencil, LuRefreshCw, LuSend, LuTriangleAlert, LuX } from "react-icons/lu";
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
  summarize,
  type UserBreakdownRow,
} from "@/features/assignments/utils/assignment-stats";
import { getRecentActivity } from "@/features/questions/services/questions.service";
import { getApiErrorMessage } from "@/utils/api-error";
import type { Assignment, AssignmentLevel } from "@/types/assignment";
import type { RecentActivityEntry } from "@/types/question";
import type { Template } from "@/types/template";

const CHANGE_TYPE_META: Record<string, { label: string; icon: IconType; tone: string }> = {
  submitted_for_review: { label: "Submitted for review", icon: LuSend, tone: "bg-violet-50 text-violet-600" },
  updated: { label: "Edited", icon: LuPencil, tone: "bg-indigo-50 text-indigo-600" },
  review_accepted: { label: "Accepted", icon: LuCircleCheckBig, tone: "bg-emerald-50 text-emerald-600" },
  review_re_edit: { label: "Sent for re-edit", icon: LuRefreshCw, tone: "bg-amber-50 text-amber-600" },
  review_rejected: { label: "Rejected", icon: LuX, tone: "bg-rose-50 text-rose-600" },
};

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

function formatRelativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
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
  const [activity, setActivity] = useState<RecentActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isTier1 = user?.role === "creator" || user?.role === "reviewer";

  useEffect(() => {
    if (!isAdmin && !isTier1) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const [assignmentData, templateData, activityData] = await Promise.all([
          isAdmin ? getAllAssignments() : getMyAssignments(),
          getTemplates().catch(() => []),
          getRecentActivity().catch(() => []),
        ]);
        if (!cancelled) {
          setAssignments(assignmentData);
          setTemplates(templateData);
          setActivity(activityData);
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
  }, [isAdmin, isTier1]);

  const summary = useMemo(() => summarize(assignments), [assignments]);
  const levelCounts = useMemo(() => countByLevel(assignments), [assignments]);
  const templateRows = useMemo(() => countByTemplate(assignments).slice(0, 5), [assignments]);
  const creatorRows = useMemo(() => (isAdmin ? countByCreator(assignments) : []), [assignments, isAdmin]);
  const reviewerRows = useMemo(() => (isAdmin ? countByReviewer(assignments) : []), [assignments, isAdmin]);

  function templateName(templateId: string): string {
    return templates.find((t) => t.template_id === templateId)?.template_name ?? templateId;
  }

  const statTiles: StatTile[] = [
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

            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-sm font-bold text-slate-900">Recent Activity</h2>
                <p className="text-xs text-slate-500">
                  {isAdmin ? "Latest question actions across every creator and reviewer." : "Your latest question actions."}
                </p>
              </div>
              {activity.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-500">No recent activity.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {activity.map((a) => {
                    const meta = CHANGE_TYPE_META[a.change_type] ?? {
                      label: a.change_type.replace(/_/g, " "),
                      icon: LuPencil,
                      tone: "bg-slate-100 text-slate-600",
                    };
                    const Icon = meta.icon;
                    return (
                      <li key={`${a.template_id}-${a.qid}-${a.changed_at}-${a.change_type}`} className="flex items-center gap-3 px-4 py-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">
                            Q-{a.qid} · {templateName(a.template_id)}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {meta.label}
                            {a.previous_status && a.new_status ? ` · ${a.previous_status} → ${a.new_status}` : ""}
                            {isAdmin ? ` · ${a.changed_by}` : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-slate-400">{formatRelativeDate(a.changed_at)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
