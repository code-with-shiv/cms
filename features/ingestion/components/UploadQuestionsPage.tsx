"use client";

import { useEffect, useState } from "react";
import { LuUpload } from "react-icons/lu";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/common/AppShell";
import { Select } from "@/components/ui/Select";
import { getTemplates } from "@/features/templates/services/templates.service";
import { uploadQuestionsJson } from "@/features/ingestion/services/ingestion.service";
import { getApiErrorMessage } from "@/utils/api-error";
import type { Template } from "@/types/template";
import type { UploadQuestionsJsonResponse } from "@/types/ingestion";

export function UploadQuestionsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templateId, setTemplateId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadedBy, setUploadedBy] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadQuestionsJsonResponse["data"] | null>(null);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

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

  useEffect(() => {
    if (user?.email) setUploadedBy(user.email);
  }, [user?.email]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (selected && !selected.name.toLowerCase().endsWith(".json")) {
      setError("Please select a .json file.");
      setFile(null);
      return;
    }
    setError("");
    setFile(selected);
  }

  async function handleSubmit() {
    if (!templateId) return setError("Template is required.");
    if (!file) return setError("Please select a .json file to upload.");
    if (!uploadedBy) return setError("Uploaded by (email) is required.");

    setError("");
    setResult(null);
    setIsSubmitting(true);
    try {
      const response = await uploadQuestionsJson({ file, template_id: templateId, uploaded_by: uploadedBy });
      setResult(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not upload the JSON file."));
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
          <h1 className="text-base font-bold text-slate-900">Upload JSON</h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Admin Only</span>
        </div>

        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          The server performs no schema validation on this path — each array item is inserted as-is, so make sure
          your JSON is already shaped correctly for the target template&apos;s collection.
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
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Uploaded by <span className="text-red-500">*</span>
            </label>
            <input
              value={uploadedBy}
              onChange={(e) => setUploadedBy(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              JSON file (array of question objects) <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {file ? <p className="mt-2 text-xs text-slate-500">Selected: {file.name}</p> : null}
          </div>

          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          {result ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {result.message ?? `Inserted ${result.inserted} question(s) into ${result.collection}.`}
            </div>
          ) : null}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <LuUpload className="h-4 w-4" /> {isSubmitting ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
