import type { Assignment, AssignmentLevel } from "@/types/assignment";

const STALE_DAYS = 7;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export interface StatusCounts {
  active: number;
  completed: number;
  reassigned: number;
}

export interface AssignmentSummary {
  total: number;
  counts: StatusCounts;
  completionRate: number | null;
  avgTurnaroundDays: number | null;
  staleActive: Assignment[];
}

export interface UserBreakdownRow {
  email: string;
  total: number;
  counts: StatusCounts;
  completionRate: number | null;
}

export interface TemplateBreakdownRow {
  templateId: string;
  total: number;
  completed: number;
}

export function summarize(assignments: Assignment[], now: number = Date.now()): AssignmentSummary {
  const counts: StatusCounts = { active: 0, completed: 0, reassigned: 0 };
  const turnaroundDays: number[] = [];
  const staleActive: Assignment[] = [];

  for (const a of assignments) {
    counts[a.status] += 1;

    if (a.status === "completed" && a.completed_at) {
      turnaroundDays.push((new Date(a.completed_at).getTime() - new Date(a.assigned_at).getTime()) / MS_PER_DAY);
    }
    if (a.status === "active" && (now - new Date(a.assigned_at).getTime()) / MS_PER_DAY > STALE_DAYS) {
      staleActive.push(a);
    }
  }

  const total = assignments.length;
  const completionRate = total > 0 ? Math.round((counts.completed / total) * 100) : null;
  const avgTurnaroundDays =
    turnaroundDays.length > 0
      ? Math.round((turnaroundDays.reduce((sum, d) => sum + d, 0) / turnaroundDays.length) * 10) / 10
      : null;

  return { total, counts, completionRate, avgTurnaroundDays, staleActive };
}

export function countByLevel(assignments: Assignment[]): Record<AssignmentLevel, number> {
  const result: Record<AssignmentLevel, number> = { lu: 0, topic: 0, chapter: 0 };
  for (const a of assignments) result[a.level] += 1;
  return result;
}

export function countByTemplate(assignments: Assignment[]): TemplateBreakdownRow[] {
  const map = new Map<string, TemplateBreakdownRow>();
  for (const a of assignments) {
    const row = map.get(a.template_id) ?? { templateId: a.template_id, total: 0, completed: 0 };
    row.total += 1;
    if (a.status === "completed") row.completed += 1;
    map.set(a.template_id, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

function groupByEmail(assignments: Assignment[], emailField: "creator_email" | "reviewer_email"): UserBreakdownRow[] {
  const map = new Map<string, Assignment[]>();
  for (const a of assignments) {
    const email = a[emailField];
    if (!email) continue;
    const bucket = map.get(email) ?? [];
    bucket.push(a);
    map.set(email, bucket);
  }
  return [...map.entries()]
    .map(([email, rows]) => {
      const summary = summarize(rows);
      return { email, total: summary.total, counts: summary.counts, completionRate: summary.completionRate };
    })
    .sort((a, b) => b.total - a.total);
}

export function countByCreator(assignments: Assignment[]): UserBreakdownRow[] {
  return groupByEmail(assignments, "creator_email");
}

export function countByReviewer(assignments: Assignment[]): UserBreakdownRow[] {
  return groupByEmail(assignments, "reviewer_email");
}

export function scopeName(a: Assignment): string {
  if (a.level === "lu") return a.assignment_json.lu_name || "—";
  if (a.level === "topic") return a.assignment_json.topic_name || "—";
  return a.assignment_json.chapter_name || "—";
}

export function recentActivity(assignments: Assignment[], limit = 6): Assignment[] {
  return [...assignments]
    .sort((a, b) => {
      const aTime = new Date(a.completed_at ?? a.assigned_at).getTime();
      const bTime = new Date(b.completed_at ?? b.assigned_at).getTime();
      return bTime - aTime;
    })
    .slice(0, limit);
}
