"use client";

import { useState } from "react";
import { LuUpload } from "react-icons/lu";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/common/AppShell";
import { uploadFlashcard } from "@/features/ingestion/services/ingestion.service";
import { FlashcardFileQueue } from "@/features/ingestion/components/FlashcardFileQueue";
import { FlashcardResultsPanel } from "@/features/ingestion/components/FlashcardResultsPanel";
import { getApiErrorMessage } from "@/utils/api-error";
import type { QueuedFlashcardFile } from "@/types/ingestion";

const SUPPORTED_FORMATS = ["docx", "json", "zip"];

export function FlashcardUploadPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [queue, setQueue] = useState<QueuedFlashcardFile[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const accepted = files.filter((f) => SUPPORTED_FORMATS.includes(f.name.split(".").pop()?.toLowerCase() ?? ""));
    if (accepted.length !== files.length) {
      setError("Some files were skipped — only .docx, .json, and .zip are supported.");
    } else {
      setError("");
    }
    if (accepted.length) {
      setQueue((prev) => [...prev, ...accepted.map((file) => ({ file, status: "pending" as const }))]);
    }
  }

  async function handleUpload() {
    if (!user?.email || isRunning) return;
    setIsRunning(true);
    setError("");

    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status !== "pending") continue;
      setQueue((prev) => prev.map((item, idx) => (idx === i ? { ...item, status: "uploading" } : item)));
      try {
        const response = await uploadFlashcard({ file: queue[i].file, uploaded_by: user.email });
        const results = response.data.flat();
        setQueue((prev) => prev.map((item, idx) => (idx === i ? { ...item, status: "done", results } : item)));
      } catch (err) {
        const message = getApiErrorMessage(err, "Upload failed.");
        setQueue((prev) => prev.map((item, idx) => (idx === i ? { ...item, status: "error", error: message } : item)));
      }
    }

    setIsRunning(false);
  }

  const pendingCount = queue.filter((item) => item.status === "pending").length;

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
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
          <h1 className="text-base font-bold text-slate-900">Flashcards</h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Admin Only</span>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Select files (.docx, .json, .zip)</h2>
          <input
            type="file"
            multiple
            accept=".docx,.json,.zip"
            onChange={handleFilesSelected}
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

          {queue.length ? (
            <div className="mt-4 space-y-4">
              <FlashcardFileQueue queue={queue} />
              <button
                onClick={handleUpload}
                disabled={isRunning || pendingCount === 0}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                <LuUpload className="h-4 w-4" /> {isRunning ? "Uploading…" : `Upload ${pendingCount} file(s)`}
              </button>
            </div>
          ) : null}
        </div>

        <FlashcardResultsPanel queue={queue} />
      </div>
    </AppShell>
  );
}
