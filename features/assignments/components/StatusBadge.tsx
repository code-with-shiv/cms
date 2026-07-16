import type { AssignmentStatus } from "@/types/assignment";

const STATUS_STYLES: Record<AssignmentStatus, string> = {
  active: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  reassigned: "bg-amber-50 text-amber-700 ring-amber-200",
};

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  active: "Active",
  completed: "Completed",
  reassigned: "Reassigned",
};

export function StatusBadge({ status }: { status: AssignmentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
