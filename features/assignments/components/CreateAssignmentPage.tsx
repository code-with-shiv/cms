"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuRotateCcw, LuSave } from "react-icons/lu";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/common/AppShell";
import { Select } from "@/components/ui/Select";
import { createAssignment } from "@/features/assignments/services/assignments.service";
import { getTemplates } from "@/features/templates/services/templates.service";
import { getUsersByRole } from "@/features/users/services/users.service";
import { getAllowedAssignmentLevels, ASSIGNMENT_LEVEL_LABEL } from "@/features/assignments/utils/level-compat";
import { AssignmentScopePicker } from "@/features/assignments/components/AssignmentScopePicker";
import { AssignmentPreviewPanel, type PreviewPayload } from "@/features/assignments/components/AssignmentPreviewPanel";
import { getApiErrorMessage } from "@/utils/api-error";
import type { Template } from "@/types/template";
import type { ManagedUser } from "@/types/user";
import type { AssignmentCreatePayload, AssignmentLevel, AssignmentScope } from "@/types/assignment";

interface FormState {
  template_id: string;
  level: AssignmentLevel | "";
  scope: AssignmentScope;
  creator_email: string;
  reviewer_email: string;
  notes: string;
}

const INITIAL_SCOPE: AssignmentScope = {
  board: "",
  grade: "",
  subject: "",
  chapter_id: "",
  chapter_name: "",
  topic_id: "",
  topic_name: "",
  luid: "",
  lu_name: "",
};

const INITIAL_STATE: FormState = {
  template_id: "",
  level: "",
  scope: INITIAL_SCOPE,
  creator_email: "",
  reviewer_email: "",
  notes: "",
};

export function CreateAssignmentPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [creators, setCreators] = useState<ManagedUser[]>([]);
  const [reviewers, setReviewers] = useState<ManagedUser[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ assignmentId: number } | null>(null);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    async function load() {
      setIsLoadingOptions(true);
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
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, "Could not load form options."));
      } finally {
        if (!cancelled) setIsLoadingOptions(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const selectedTemplate = templates.find((t) => t.template_id === form.template_id) ?? null;
  const allowedLevels = selectedTemplate ? getAllowedAssignmentLevels(selectedTemplate.level) : [];

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleTemplateChange(templateId: string) {
    const template = templates.find((t) => t.template_id === templateId) ?? null;
    const allowed = template ? getAllowedAssignmentLevels(template.level) : [];
    setForm((prev) => ({
      ...prev,
      template_id: templateId,
      level: prev.level && allowed.includes(prev.level) ? prev.level : "",
    }));
  }

  function handleLevelChange(level: AssignmentLevel) {
    setForm((prev) => ({ ...prev, level, scope: INITIAL_SCOPE }));
  }

  function handleScopeChange(scope: AssignmentScope) {
    update("scope", scope);
  }

  function handleReset() {
    setForm(INITIAL_STATE);
    setError("");
    setSuccess(null);
  }

  const previewPayload: PreviewPayload = useMemo(
    () => ({
      creator_email: form.creator_email,
      reviewer_email: form.reviewer_email || undefined,
      template_id: form.template_id,
      level: form.level,
      assignment_json: form.scope,
      notes: form.notes.trim() || undefined,
    }),
    [form],
  );

  function buildSubmitPayload(): AssignmentCreatePayload {
    return {
      ...previewPayload,
      level: form.level as AssignmentLevel,
    };
  }

  function validate(): string | null {
    if (!form.template_id) return "Template is required.";
    if (!form.level) return "Level is required.";
    const { scope } = form;
    if (!scope.board || !scope.grade || !scope.subject) return "Board, grade, and subject are required.";
    if (!scope.chapter_id) return "Chapter is required.";
    if ((form.level === "topic" || form.level === "lu") && !scope.topic_id) return "Topic is required for this level.";
    if (form.level === "lu" && !scope.luid) return "Learning unit is required for this level.";
    if (!form.creator_email) return "Creator is required.";
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      const { assignmentId } = await createAssignment(buildSubmitPayload());
      setSuccess({ assignmentId });
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create assignment."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthLoading) {
    return (
      <AppShell title="create-assignment">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading…</div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="create-assignment">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
          You don&apos;t have permission to view this page.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="create-assignment">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <Link href="/assignments" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
              <LuArrowLeft className="h-4 w-4" /> Back
            </Link>
            <span className="text-slate-300">/</span>
            <h1 className="text-base font-bold text-slate-900">Create Assignment</h1>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Admin Only</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <LuRotateCcw className="h-4 w-4" /> Reset
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <LuSave className="h-4 w-4" /> {isSubmitting ? "Creating…" : "Create Assignment"}
            </button>
          </div>
        </div>

        {success ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span>
              Assignment created successfully (id: <span className="font-mono">{success.assignmentId}</span>).
            </span>
            <div className="flex gap-2">
              <button onClick={handleReset} className="font-medium underline underline-offset-2">
                Create another
              </button>
              <Link href="/assignments" className="font-medium underline underline-offset-2">
                View all assignments
              </Link>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  1
                </span>
                <h2 className="text-sm font-semibold text-slate-900">Template &amp; Level</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Template <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={form.template_id}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    disabled={isLoadingOptions}
                  >
                    <option value="">{isLoadingOptions ? "Loading…" : "Select template…"}</option>
                    {templates.map((t) => (
                      <option key={t.template_id} value={t.template_id}>
                        {t.template_name} · {ASSIGNMENT_LEVEL_LABEL[t.level]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Level <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={form.level}
                    onChange={(e) => handleLevelChange(e.target.value as AssignmentLevel)}
                    disabled={!selectedTemplate}
                  >
                    <option value="">{selectedTemplate ? "Select level…" : "Select a template first"}</option>
                    {allowedLevels.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {ASSIGNMENT_LEVEL_LABEL[lvl]}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {selectedTemplate ? (
                <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-4">
                  <p className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Allowed Levels:</p>
                  {allowedLevels.map((lvl) => (
                    <span
                      key={lvl}
                      className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200"
                    >
                      {ASSIGNMENT_LEVEL_LABEL[lvl]}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  2
                </span>
                <h2 className="text-sm font-semibold text-slate-900">Scope</h2>
              </div>
              <AssignmentScopePicker level={form.level} value={form.scope} onChange={handleScopeChange} />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  3
                </span>
                <h2 className="text-sm font-semibold text-slate-900">People</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Creator <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={form.creator_email}
                    onChange={(e) => update("creator_email", e.target.value)}
                    disabled={isLoadingOptions}
                  >
                    <option value="">{isLoadingOptions ? "Loading…" : "Select creator…"}</option>
                    {creators.map((c) => (
                      <option key={c.email} value={c.email}>
                        {c.email} ({c.name})
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Reviewer</label>
                  <Select
                    value={form.reviewer_email}
                    onChange={(e) => update("reviewer_email", e.target.value)}
                    disabled={isLoadingOptions}
                  >
                    <option value="">— None —</option>
                    {reviewers.map((r) => (
                      <option key={r.email} value={r.email}>
                        {r.email} ({r.name})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  4
                </span>
                <h2 className="text-sm font-semibold text-slate-900">Notes</h2>
              </div>
              <textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={3}
                placeholder="Optional notes for the creator/reviewer…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <AssignmentPreviewPanel payload={previewPayload} templateName={selectedTemplate?.template_name} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
