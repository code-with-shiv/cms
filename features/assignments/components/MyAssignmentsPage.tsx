"use client";

import { useEffect, useState } from "react";
import { LuClipboardList } from "react-icons/lu";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/common/AppShell";
import { getMyAssignments } from "@/features/assignments/services/assignments.service";
import { getTemplates } from "@/features/templates/services/templates.service";
import { ASSIGNMENT_LEVEL_LABEL } from "@/features/assignments/utils/level-compat";
import { scopeName } from "@/features/assignments/utils/assignment-stats";
import { StatusBadge } from "@/features/assignments/components/StatusBadge";
import { getApiErrorMessage } from "@/utils/api-error";
import type { Template } from "@/types/template";
import type { Assignment } from "@/types/assignment";

export function MyAssignmentsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const isTier1 = user?.role === "creator" || user?.role === "reviewer";
  const isReviewer = user?.role === "reviewer";

  useEffect(() => {
    if (!isTier1) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const [assignmentData, templateData] = await Promise.all([getMyAssignments(), getTemplates().catch(() => [])]);
        if (!cancelled) {
          setAssignments(assignmentData);
          setTemplates(templateData);
        }
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, "Could not load your assignments."));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isTier1]);

  function templateName(templateId: string): string {
    return templates.find((t) => t.template_id === templateId)?.template_name ?? templateId;
  }

  if (isAuthLoading) {
    return (
      <AppShell title="my-assignments">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading…</div>
      </AppShell>
    );
  }

  if (!isTier1) {
    return (
      <AppShell title="my-assignments">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
          You don&apos;t have permission to view this page.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="my-assignments">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">My Assignments</h1>
          <p className="text-sm text-slate-500">Work currently allocated to you.</p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading assignments…</div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
            <LuClipboardList className="h-6 w-6 text-slate-300" />
            No assignments yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">{isReviewer ? "Creator" : "Reviewer"}</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Dates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
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
                    <td className="px-4 py-3 text-slate-600">{isReviewer ? a.creator_email : a.reviewer_email || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>Assigned {new Date(a.assigned_at).toLocaleDateString()}</p>
                      {a.completed_at ? (
                        <p className="text-xs text-slate-400">Completed {new Date(a.completed_at).toLocaleDateString()}</p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
