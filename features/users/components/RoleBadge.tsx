import type { Role } from "@/types/auth";

const ROLE_STYLES: Record<Role, string> = {
  creator: "bg-blue-50 text-blue-700 ring-blue-200",
  reviewer: "bg-amber-50 text-amber-700 ring-amber-200",
  admin: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  superadmin: "bg-purple-50 text-purple-700 ring-purple-200",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${ROLE_STYLES[role]}`}
    >
      {role}
    </span>
  );
}
