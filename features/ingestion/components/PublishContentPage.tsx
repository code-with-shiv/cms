"use client";

import { useEffect, useState } from "react";
import { LuUpload } from "react-icons/lu";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/common/AppShell";
import { Select } from "@/components/ui/Select";
import { getTemplates } from "@/features/templates/services/templates.service";
import { publishContent } from "@/features/questions/services/questions.service";
import { getApiErrorMessage } from "@/utils/api-error";
import type { Template } from "@/types/template";
import type { IngestionQuestion, PublishContentResponse } from "@/types/ingestion";

export function PublishContentPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templateId, setTemplateId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [submitForReviewFlag, setSubmitForReviewFlag] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PublishContentResponse | null>(null);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const selectedTemplate = templates.find((t) => t.template_id === templateId) ?? null;

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    getTemplates()
      .then((data) => {
        if (!cancelled) setTemplates(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, "Could not load templates."));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTemplates(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setQuestionCount(0);
    setError("");
    if (!selected) {
      setFile(null);
      return;
    }
    if (!selected.name.toLowerCase().endsWith(".json")) {
      setError("Please select a .json file.");
      setFile(null);
      return;
    }
    try {
      const text = await selected.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setError("The JSON file must contain a non-empty array of question objects.");
        setFile(null);
        return;
      }
      setFile(selected);
      setQuestionCount(parsed.length);
    } catch {
      setError("Could not parse this file as JSON.");
      setFile(null);
    }
  }

  async function handleSubmit() {
    if (!selectedTemplate) return setError("Template is required.");
    if (!file) return setError("Please select a .json file with questions to publish.");
    if (!user?.email) return setError("Missing user email.");

    setError("");
    setResult(null);
    setIsSubmitting(true);
    try {
      const text = await file.text();
      const questions = JSON.parse(text) as IngestionQuestion[];
      const response = await publishContent({
        questions,
        images: [],
        email: user.email,
        question_type: selectedTemplate.question_type,
        template_id: selectedTemplate.template_id,
        submit_for_review: submitForReviewFlag,
      });
      setResult(response);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not publish content."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthLoading) {
    return (
      <AppShell title="ingestion">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading…</div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="ingestion">
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
          You don&apos;t have permission to view this page.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="ingestion">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
          <h1 className="text-base font-bold text-slate-900">Publish Content</h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Admin Only</span>
        </div>

        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          This inserts a batch of fully-authored questions directly into the template&apos;s live collection with an
          atomically-assigned QID range. Make sure your JSON is already shaped correctly for this template.
        </div>

        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Template <span className="text-red-500">*</span>
            </label>
            <Select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={isLoadingTemplates}
            >
              <option value="">{isLoadingTemplates ? "Loading…" : "Select template…"}</option>
              {templates.map((t) => (
                <option key={t.template_id} value={t.template_id}>
                  {t.template_name}
                </option>
              ))}
            </Select>
            {selectedTemplate ? (
              <p className="mt-2 text-xs text-slate-500">
                Question type: <span className="font-semibold text-slate-700">{selectedTemplate.question_type}</span> (from
                template, sent automatically)
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              JSON file (array of full question objects) <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {file ? (
              <p className="mt-2 text-xs text-slate-500">
                Selected: {file.name} ({questionCount} question{questionCount === 1 ? "" : "s"})
              </p>
            ) : null}
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={submitForReviewFlag}
              onChange={(e) => setSubmitForReviewFlag(e.target.checked)}
              className="h-4 w-4 rounded accent-indigo-600"
            />
            Submit for review immediately after publishing
          </label>

          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          {result ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <p className="font-semibold">{result.message}</p>
              <p className="mt-1 text-xs">
                Published {result.questions_published} question(s), status <strong>{result.status}</strong>. Assigned QIDs:{" "}
                {result.assigned_qids.join(", ")}
              </p>
            </div>
          ) : null}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <LuUpload className="h-4 w-4" /> {isSubmitting ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
