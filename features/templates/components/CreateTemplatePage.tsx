"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuSave, LuRotateCcw, LuStar, LuTag } from "react-icons/lu";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/common/AppShell";
import { Toggle } from "@/components/ui/Toggle";
import { Select } from "@/components/ui/Select";
import { createTemplate } from "@/features/templates/services/templates.service";
import { OBJECTIVE_FORMATS, SUBJECTIVE_FORMATS, FORMAT_LABELS } from "@/features/templates/constants/formats";
import { getLevelMetadata, LEVEL_METADATA_FIELD_LABELS } from "@/features/templates/utils/level-metadata";
import { getApiErrorMessage } from "@/utils/api-error";
import type { QuestionFormat, QuestionType, TemplateCreatePayload, TemplateLevel } from "@/types/template";
import { TemplatePreviewPanel, type PreviewPayload } from "./TemplatePreviewPanel";

interface FormState {
  template_name: string;
  question_type: QuestionType | "";
  level: TemplateLevel | "";
  allowed_question_format: QuestionFormat[];
  options: boolean;
  hint: boolean;
  can_have_clone: boolean;
  requires_year: boolean;
  test_based: boolean;
}

const INITIAL_STATE: FormState = {
  template_name: "",
  question_type: "",
  level: "",
  allowed_question_format: [],
  options: false,
  hint: false,
  can_have_clone: false,
  requires_year: false,
  test_based: false,
};

const PRESETS: Array<{ label: string; description: string; color: string; apply: Partial<FormState> }> = [
  {
    label: "LU Preset",
    description: "Objective · Objective + Objective-AR · Full LU/LO/topic metadata",
    color: "bg-indigo-500",
    apply: { level: "lu", question_type: "objective", allowed_question_format: ["objective", "objective-ar"] },
  },
  {
    label: "Topic Preset",
    description: "Subjective · 1-3M formats · Topic + chapter metadata",
    color: "bg-emerald-500",
    apply: {
      level: "topic",
      question_type: "subjective",
      allowed_question_format: ["subjective-1marks", "subjective-2marks", "subjective-3marks"],
    },
  },
  {
    label: "Chapter Preset",
    description: "Subjective · Full format set · Chapter test",
    color: "bg-amber-500",
    apply: {
      level: "chapter",
      question_type: "subjective",
      allowed_question_format: [...SUBJECTIVE_FORMATS],
      test_based: true,
    },
  },
];

export function CreateTemplatePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ templateId: string } | null>(null);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  // Display-only projection of the form — question_type/level stay "" until chosen so the
  // preview panel can show "—" instead of a misleading default. The real payload sent on submit
  // is built by buildSubmitPayload(), after validate() has guaranteed both are non-empty.
  const previewPayload: PreviewPayload = useMemo(() => {
    const metadata = form.level
      ? getLevelMetadata(form.level)
      : {
          luid: false,
          lu_name: false,
          loid: false,
          lo_name: false,
          topic_id: false,
          chapter_id: false,
          lus_covered: false,
          topics_covered: false,
        };

    return {
      template_name: form.template_name.trim(),
      question_type: form.question_type,
      level: form.level,
      allowed_question_format: form.allowed_question_format,
      options: form.options,
      hint: form.hint,
      can_have_clone: form.can_have_clone,
      requires_year: form.requires_year,
      test_based: form.test_based,
      ...metadata,
    };
  }, [form]);

  function buildSubmitPayload(): TemplateCreatePayload {
    return {
      ...previewPayload,
      question_type: form.question_type as QuestionType,
      level: form.level as TemplateLevel,
      created_by: user?.email ?? "",
    };
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleFormat(format: QuestionFormat) {
    setForm((prev) => ({
      ...prev,
      allowed_question_format: prev.allowed_question_format.includes(format)
        ? prev.allowed_question_format.filter((f) => f !== format)
        : [...prev.allowed_question_format, format],
    }));
  }

  function selectAllFormats(group: QuestionFormat[]) {
    setForm((prev) => {
      const allSelected = group.every((f) => prev.allowed_question_format.includes(f));
      return {
        ...prev,
        allowed_question_format: allSelected
          ? prev.allowed_question_format.filter((f) => !group.includes(f))
          : [...new Set([...prev.allowed_question_format, ...group])],
      };
    });
  }

  function applyPreset(preset: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...preset }));
  }

  function handleReset() {
    setForm(INITIAL_STATE);
    setError("");
    setSuccess(null);
  }

  function validate(): string | null {
    if (!form.template_name.trim()) return "Template name is required.";
    if (!form.question_type) return "Question type is required.";
    if (!form.level) return "Level is required.";
    if (!user?.email) return "Could not determine the current user's email.";
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
      const { templateId } = await createTemplate(buildSubmitPayload());
      setSuccess({ templateId });
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create template."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthLoading) {
    return (
      <AppShell title="create-template">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading…</div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="create-template">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
          You don&apos;t have permission to view this page.
        </div>
      </AppShell>
    );
  }

  const levelMetadata = form.level ? getLevelMetadata(form.level) : null;

  return (
    <AppShell title="create-template">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <Link href="/templates" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
              <LuArrowLeft className="h-4 w-4" /> Back
            </Link>
            <span className="text-slate-300">/</span>
            <h1 className="text-base font-bold text-slate-900">Create Template</h1>
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
              <LuSave className="h-4 w-4" /> {isSubmitting ? "Creating…" : "Create Template"}
            </button>
          </div>
        </div>

        {success ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span>
              Template created successfully (id: <span className="font-mono">{success.templateId}</span>).
            </span>
            <div className="flex gap-2">
              <button onClick={handleReset} className="font-medium underline underline-offset-2">
                Create another
              </button>
              <Link href="/templates" className="font-medium underline underline-offset-2">
                View all templates
              </Link>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
              <span className="font-semibold">Note:</span> Template config controls which question collection is
              used, how <code className="rounded bg-white/60 px-1">/questions/get</code> filters work, sync output
              fields, and downstream metadata expectations.
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <LuStar className="h-4 w-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-900">Quick Start — Apply a Preset</h2>
              </div>
              <p className="mb-4 text-xs text-slate-500">Load a common configuration. You can customize any field after applying.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(preset.apply)}
                    className="rounded-lg border border-slate-200 p-3 text-left hover:border-indigo-300 hover:bg-indigo-50/50"
                  >
                    <span className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <span className={`h-2 w-2 rounded-full ${preset.color}`} />
                      {preset.label}
                    </span>
                    <span className="text-xs text-slate-500">{preset.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  1
                </span>
                <h2 className="text-sm font-semibold text-slate-900">Basic Info</h2>
              </div>

              <label className="mb-1 block text-sm font-medium text-slate-700">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.template_name}
                onChange={(e) => update("template_name", e.target.value)}
                placeholder="e.g. CMS, Olympiad, TestPrep, Hindi…"
                className="mb-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="mb-4 text-xs text-slate-400">
                Used to derive the collection name. Not sent in payload — backend auto-generates it.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Question Type <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={form.question_type}
                    onChange={(e) => update("question_type", e.target.value as QuestionType)}
                  >
                    <option value="">Select type…</option>
                    <option value="subjective">Subjective</option>
                    <option value="objective">Objective</option>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Level <span className="text-red-500">*</span> — auto-sets metadata
                  </label>
                  <Select value={form.level} onChange={(e) => update("level", e.target.value as TemplateLevel)}>
                    <option value="">Select level…</option>
                    <option value="lu">LU</option>
                    <option value="topic">Topic</option>
                    <option value="chapter">Chapter</option>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-1 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  2
                </span>
                <h2 className="text-sm font-semibold text-slate-900">Allowed Question Formats</h2>
              </div>
              <p className="mb-4 text-xs text-slate-500">Select which question formats are valid under this template.</p>

              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subjective Formats</p>
                  <button onClick={() => selectAllFormats(SUBJECTIVE_FORMATS)} className="text-xs font-medium text-indigo-600 hover:underline">
                    Select All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTIVE_FORMATS.map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => toggleFormat(fmt)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${
                        form.allowed_question_format.includes(fmt)
                          ? "bg-indigo-600 text-white ring-indigo-600"
                          : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {FORMAT_LABELS[fmt]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Objective Formats</p>
                  <button onClick={() => selectAllFormats(OBJECTIVE_FORMATS)} className="text-xs font-medium text-indigo-600 hover:underline">
                    Select All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {OBJECTIVE_FORMATS.map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => toggleFormat(fmt)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${
                        form.allowed_question_format.includes(fmt)
                          ? "bg-indigo-600 text-white ring-indigo-600"
                          : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {FORMAT_LABELS[fmt]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-1 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  3
                </span>
                <h2 className="text-sm font-semibold text-slate-900">Question Features</h2>
              </div>
              <p className="mb-2 text-xs text-slate-500">Control which fields and behaviors are enabled for this template&apos;s questions.</p>

              <div className="divide-y divide-slate-100">
                <Toggle
                  label="Options"
                  description="Include answer options in question output and sync"
                  checked={form.options}
                  onChange={(v) => update("options", v)}
                />
                <Toggle
                  label="Hint"
                  description="Include hints in question fetch and sync output"
                  checked={form.hint}
                  onChange={(v) => update("hint", v)}
                />
                <Toggle
                  label="Can Have Clone"
                  description="Enables clone-aware question deduplication behavior"
                  checked={form.can_have_clone}
                  onChange={(v) => update("can_have_clone", v)}
                />
                <Toggle
                  label="Requires Year"
                  description="Attaches year context to questions in this template"
                  checked={form.requires_year}
                  onChange={(v) => update("requires_year", v)}
                />
                <Toggle
                  label="Test Based"
                  description="Enables total marks tracking in sync and export flows"
                  checked={form.test_based}
                  onChange={(v) => update("test_based", v)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5">
              <div className="mb-1 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  4
                </span>
                <h2 className="text-sm font-semibold text-slate-900">Metadata Shape</h2>
              </div>
              {levelMetadata ? (
                <>
                  <p className="mb-3 text-xs text-slate-500">
                    Auto-configured from the selected level — these fields are set on the template automatically.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(levelMetadata) as Array<keyof typeof levelMetadata>).map((key) => (
                      <span
                        key={key}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                          levelMetadata[key]
                            ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
                            : "bg-slate-100 text-slate-400 ring-slate-200 line-through"
                        }`}
                      >
                        {LEVEL_METADATA_FIELD_LABELS[key]}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-slate-400">
                  <LuTag className="h-6 w-6" />
                  Select a Level in Section 1 to see the auto-configured metadata shape.
                </div>
              )}
            </div>
          </div>

          <div>
            <TemplatePreviewPanel payload={previewPayload} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
