"use client";

import { useEffect, useState } from "react";
import { LuChevronDown, LuChevronUp } from "react-icons/lu";
import { getMyAssignments } from "@/features/assignments/services/assignments.service";
import { getTemplates } from "@/features/templates/services/templates.service";
import { ASSIGNMENT_LEVEL_LABEL } from "@/features/assignments/utils/level-compat";
import { getApiErrorMessage } from "@/utils/api-error";
import type { Assignment } from "@/types/assignment";
import type { Template } from "@/types/template";

export function scopeName(a: Assignment): string {
  if (a.level === "lu") return a.assignment_json.lu_name || "—";
  if (a.level === "topic") return a.assignment_json.topic_name || "—";
  return a.assignment_json.chapter_name || "—";
}

interface AssignmentScopeCardsProps {
  onSelect: (assignment: Assignment, template: Template | undefined) => void;
}

// Cards for the creator's own active assignments — the shared scope-gate used
// by both the question list/review pages and the create-question page, so a
// creator can only ever act within work actually assigned to them.
export function AssignmentScopeCards({ onSelect }: AssignmentScopeCardsProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const [assignmentData, templateData] = await Promise.all([
          getMyAssignments(),
          getTemplates().catch(() => []),
        ]);
        if (!cancelled) {
          setAssignments(assignmentData.filter((a) => a.status === "active"));
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
  }, []);

  function templateFor(templateId: string): Template | undefined {
    return templates.find((t) => t.template_id === templateId);
  }

  function handleSelect(a: Assignment) {
    setSelectedId(a.id);
    setIsOpen(false);
    onSelect(a, templateFor(a.template_id));
  }

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-slate-500">Loading your assignments…</div>;
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>;
  }

  if (assignments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
        You have no active assignments yet. Ask an admin to assign you work.
      </div>
    );
  }

  const selected = assignments.find((a) => a.id === selectedId);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setIsOpen((c) => !c)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        {selected ? (
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              {ASSIGNMENT_LEVEL_LABEL[selected.level]}
            </p>
            <p className="truncate font-semibold text-slate-900">
              {scopeName(selected)} · {templateFor(selected.template_id)?.template_name ?? selected.template_id}
            </p>
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-700">Select an assignment…</p>
        )}
        {isOpen ? (
          <LuChevronUp className="shrink-0 text-slate-400" />
        ) : (
          <LuChevronDown className="shrink-0 text-slate-400" />
        )}
      </button>

      {isOpen ? (
        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => handleSelect(a)}
              className={`rounded-xl border p-4 text-left shadow-sm transition ${
                a.id === selectedId
                  ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500"
                  : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                {ASSIGNMENT_LEVEL_LABEL[a.level]}
              </p>
              <p className="mt-1 font-semibold text-slate-900">{scopeName(a)}</p>
              <p className="mt-1 text-xs text-slate-400">
                {[a.assignment_json.board, a.assignment_json.grade, a.assignment_json.subject]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="mt-2 text-xs text-slate-500">{templateFor(a.template_id)?.template_name ?? a.template_id}</p>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
