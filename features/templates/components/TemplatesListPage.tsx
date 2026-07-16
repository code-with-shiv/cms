"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LuPlus, LuLayoutList } from "react-icons/lu";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/common/AppShell";
import { getTemplates } from "@/features/templates/services/templates.service";
import { FORMAT_LABELS } from "@/features/templates/constants/formats";
import { getApiErrorMessage } from "@/utils/api-error";
import type { Template } from "@/types/template";

const LEVEL_LABEL: Record<Template["level"], string> = {
  lu: "LU",
  topic: "Topic",
  chapter: "Chapter",
};

export function TemplatesListPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const data = await getTemplates();
        if (!cancelled) setTemplates(data);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, "Could not load templates."));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (isAuthLoading) {
    return (
      <AppShell title="templates">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading…</div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="templates">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
          You don&apos;t have permission to view this page.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="templates">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Templates</h1>
            <p className="text-sm text-slate-500">Question templates that drive collections, filters, and sync output.</p>
          </div>
          <Link
            href="/templates/create"
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <LuPlus className="h-4 w-4" /> Create Template
          </Link>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading templates…</div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
            <LuLayoutList className="h-6 w-6 text-slate-300" />
            No templates yet. Create the first one to get started.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Formats</th>
                  <th className="px-4 py-3">Test Based</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {templates.map((template) => (
                  <tr key={template.template_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{template.template_name}</p>
                      <p className="text-xs text-slate-400">{template.collection_name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{LEVEL_LABEL[template.level]}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{template.question_type}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {template.allowed_question_format.length
                        ? template.allowed_question_format.map((f) => FORMAT_LABELS[f]).join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{template.test_based ? "Yes" : "No"}</td>
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
