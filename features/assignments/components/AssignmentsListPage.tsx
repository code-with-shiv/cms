"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { LuCheck, LuClipboardList, LuPlus, LuRepeat2 } from "react-icons/lu";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/common/AppShell";
import { Select } from "@/components/ui/Select";
import {
  completeAssignment,
  getAllAssignments,
  reassignAssignment,
} from "@/features/assignments/services/assignments.service";
import { getTemplates } from "@/features/templates/services/templates.service";
import { getUsersByRole } from "@/features/users/services/users.service";
import { ASSIGNMENT_LEVEL_LABEL } from "@/features/assignments/utils/level-compat";
import { StatusBadge } from "@/features/assignments/components/StatusBadge";
import { getApiErrorMessage } from "@/utils/api-error";
import type { Template } from "@/types/template";
import type { ManagedUser } from "@/types/user";
import type { Assignment, AssignmentFilterParams, AssignmentStatus } from "@/types/assignment";

function scopeName(a: Assignment): string {
  if (a.level === "lu") return a.assignment_json.lu_name || "—";
  if (a.level === "topic") return a.assignment_json.topic_name || "—";
  return a.assignment_json.chapter_name || "—";
}

interface FilterState {
  creator_email: string;
  reviewer_email: string;
  status: AssignmentStatus | "";
}

export function AssignmentsListPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [creators, setCreators] = useState<ManagedUser[]>([]);
  const [reviewers, setReviewers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<FilterState>({ creator_email: "", reviewer_email: "", status: "" });

  const [completingId, setCompletingId] = useState<number | null>(null);
  const [reassigningId, setReassigningId] = useState<number | null>(null);
  const [reassignCreator, setReassignCreator] = useState("");
  const [reassignReviewer, setReassignReviewer] = useState("");
  const [reassignNotes, setReassignNotes] = useState("");
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const completingAssignment = assignments.find((a) => a.id === completingId) ?? null;
  const reassigningAssignment = assignments.find((a) => a.id === reassigningId) ?? null;

  async function load(currentFilters: FilterState) {
    setIsLoading(true);
    setError("");
    try {
      const params: AssignmentFilterParams = {};
      if (currentFilters.creator_email) params.creator_email = currentFilters.creator_email;
      if (currentFilters.reviewer_email) params.reviewer_email = currentFilters.reviewer_email;
      if (currentFilters.status) params.status = currentFilters.status;
      const data = await getAllAssignments(params);
      setAssignments(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load assignments."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    async function loadOptions() {
      try {
        const [templateData, creatorData, reviewerData] = await Promise.all([
          getTemplates(),
          getUsersByRole("creator"),
          getUsersByRole("reviewer"),
        ]);
        if (!cancelled) {
          setTemplates(templateData);
          setCreators(creatorData);
          setReviewers(reviewerData);
        }
      } catch {
        // Non-fatal — table falls back to raw ids/emails if this fails.
      }
    }

    loadOptions();
    load(filters);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    load(filters);
  }

  function templateName(templateId: string): string {
    return templates.find((t) => t.template_id === templateId)?.template_name ?? templateId;
  }

  function openReassign(a: Assignment) {
    setReassigningId(a.id);
    setReassignCreator("");
    setReassignReviewer("");
    setReassignNotes("");
  }

  async function handleConfirmComplete(id: number) {
    setIsActionSubmitting(true);
    setError("");
    try {
      await completeAssignment(id);
      await load(filters);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not mark assignment complete."));
      await load(filters);
    } finally {
      setIsActionSubmitting(false);
      setCompletingId(null);
    }
  }

  async function handleReassignSubmit(id: number) {
    setIsActionSubmitting(true);
    setError("");
    try {
      await reassignAssignment(id, {
        new_creator_email: reassignCreator || undefined,
        new_reviewer_email: reassignReviewer || undefined,
        notes: reassignNotes.trim() || undefined,
      });
      await load(filters);
      setReassigningId(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not reassign assignment."));
      await load(filters);
    } finally {
      setIsActionSubmitting(false);
    }
  }

  if (isAuthLoading) {
    return (
      <AppShell title="assignments">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading…</div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="assignments">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
          You don&apos;t have permission to view this page.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="assignments">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Assignments</h1>
            <p className="text-sm text-slate-500">Work allocated to creators and reviewers, scoped by LU, topic, or chapter.</p>
          </div>
          <Link
            href="/assignments/create"
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <LuPlus className="h-4 w-4" /> Create Assignment
          </Link>
        </div>

        <form
          onSubmit={handleFilterSubmit}
          className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-700">Creator Email</label>
            <input
              value={filters.creator_email}
              onChange={(e) => setFilters((prev) => ({ ...prev, creator_email: e.target.value }))}
              placeholder="creator@acadally.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-700">Reviewer Email</label>
            <input
              value={filters.reviewer_email}
              onChange={(e) => setFilters((prev) => ({ ...prev, reviewer_email: e.target.value }))}
              placeholder="reviewer@acadally.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="w-40">
            <label className="mb-1 block text-xs font-medium text-slate-700">Status</label>
            <Select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as AssignmentStatus | "" }))}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="reassigned">Reassigned</option>
            </Select>
          </div>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Apply Filters
          </button>
        </form>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading assignments…</div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
            <LuClipboardList className="h-6 w-6 text-slate-300" />
            No assignments yet. Create the first one to get started.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Creator / Reviewer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((a) => {
                  return (
                    <Fragment key={a.id}>
                      <tr className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">#{a.id}</td>
                        <td className="px-4 py-3 text-slate-600">{ASSIGNMENT_LEVEL_LABEL[a.level]}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{scopeName(a)}</p>
                          <p className="text-xs text-slate-400">
                            {[a.assignment_json.board, a.assignment_json.grade, a.assignment_json.subject]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{templateName(a.template_id)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{a.creator_email}</p>
                          <p className="text-xs text-slate-400">{a.reviewer_email || "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={a.status} />
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <p>{new Date(a.assigned_at).toLocaleDateString()}</p>
                          {a.completed_at ? (
                            <p className="text-xs text-slate-400">Completed {new Date(a.completed_at).toLocaleDateString()}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {a.status === "active" || a.status === "completed" ? (
                            <div className="flex items-center gap-1.5">
                              {a.status === "active" ? (
                                <button
                                  onClick={() => setCompletingId(a.id)}
                                  title="Mark complete"
                                  aria-label="Mark complete"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                                >
                                  <LuCheck className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                              <button
                                onClick={() => openReassign(a)}
                                title="Reassign"
                                aria-label="Reassign"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                              >
                                <LuRepeat2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {completingAssignment ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isActionSubmitting) setCompletingId(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-sm font-bold text-slate-900">Mark assignment #{completingAssignment.id} complete?</h2>
            <p className="mt-1 text-xs text-slate-500">
              {scopeName(completingAssignment)} · {completingAssignment.creator_email}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCompletingId(null)}
                disabled={isActionSubmitting}
                className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmComplete(completingAssignment.id)}
                disabled={isActionSubmitting}
                className="h-9 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {isActionSubmitting ? "Completing…" : "Confirm Complete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reassigningAssignment ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isActionSubmitting) setReassigningId(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-sm font-bold text-slate-900">Reassign #{reassigningAssignment.id}</h2>
            <p className="mt-1 text-xs text-slate-500">{scopeName(reassigningAssignment)}</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  New Creator (optional — leave as current to keep {reassigningAssignment.creator_email})
                </label>
                <Select value={reassignCreator} onChange={(e) => setReassignCreator(e.target.value)}>
                  <option value="">Keep current creator ({reassigningAssignment.creator_email})</option>
                  {creators.map((c) => (
                    <option key={c.email} value={c.email}>
                      {c.email} ({c.name})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  New Reviewer (optional — leave as current to keep{" "}
                  {reassigningAssignment.reviewer_email || "unassigned"})
                </label>
                <Select value={reassignReviewer} onChange={(e) => setReassignReviewer(e.target.value)}>
                  <option value="">
                    Keep current reviewer ({reassigningAssignment.reviewer_email || "unassigned"})
                  </option>
                  {reviewers.map((r) => (
                    <option key={r.email} value={r.email}>
                      {r.email} ({r.name})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes (optional — leave blank to carry over existing notes)
                </label>
                <textarea
                  value={reassignNotes}
                  onChange={(e) => setReassignNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReassigningId(null)}
                disabled={isActionSubmitting}
                className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReassignSubmit(reassigningAssignment.id)}
                disabled={isActionSubmitting}
                className="h-9 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {isActionSubmitting ? "Reassigning…" : "Reassign"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
