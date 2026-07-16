"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AssignmentScopeCards, scopeName } from "@/features/assignments/components/AssignmentScopeCards";
import { HierarchyPicker, type HierarchyPathResult } from "@/features/metadata/components/HierarchyPicker";
import type { Assignment } from "@/types/assignment";
import type { TemplateLevel } from "@/types/template";

export interface QuestionScope {
  templateId: string;
  templateName: string;
  level: TemplateLevel;
  filterValue: string | number;
  label: string;
}

interface QuestionScopePickerProps {
  onSelect: (scope: QuestionScope) => void;
}

function filterValueFor(a: Assignment): string {
  if (a.level === "lu") return a.assignment_json.luid ?? "";
  if (a.level === "topic") return a.assignment_json.topic_id ?? "";
  return a.assignment_json.chapter_id;
}

// Two modes: creator/reviewer pick from their own assignments (the scope
// gate); admin/superadmin get an unrestricted template + hierarchy cascade.
export function QuestionScopePicker({ onSelect }: QuestionScopePickerProps) {
  const { user } = useAuth();
  const isTier1 = user?.role === "creator" || user?.role === "reviewer";

  if (isTier1) {
    return (
      <AssignmentScopeCards
        onSelect={(a, template) =>
          onSelect({
            templateId: a.template_id,
            templateName: template?.template_name ?? a.template_id,
            level: a.level,
            filterValue: filterValueFor(a),
            label: scopeName(a),
          })
        }
      />
    );
  }
  return <AdminScopeCascade onSelect={onSelect} />;
}

function AdminScopeCascade({ onSelect }: QuestionScopePickerProps) {
  const [result, setResult] = useState<HierarchyPathResult | null>(null);

  function handleLoad() {
    if (!result) return;
    const level = result.template.level;
    const filterValue = level === "lu" ? result.luid : level === "topic" ? result.topicId : result.chapterId;
    const label = level === "lu" ? result.luName : level === "topic" ? result.topicName : result.chapterName;
    if (!filterValue) return;
    onSelect({
      templateId: result.template.template_id,
      templateName: result.template.template_name,
      level,
      filterValue,
      label: label || "—",
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700">Question path</label>
        <HierarchyPicker onChange={setResult} />
      </div>

      <button
        type="button"
        onClick={handleLoad}
        disabled={!result}
        className="inline-flex h-10 shrink-0 items-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Load Questions
      </button>
    </div>
  );
}
