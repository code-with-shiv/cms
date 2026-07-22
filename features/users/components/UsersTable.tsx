"use client";

import { Fragment, useState } from "react";
import { LuChevronDown, LuChevronUp, LuTrash2 } from "react-icons/lu";
import { getAllAssignments } from "@/features/assignments/services/assignments.service";
import { scopeName } from "@/features/assignments/utils/assignment-stats";
import { UserAssignmentQuestionsModal } from "./UserAssignmentQuestionsModal";
import type { Assignment } from "@/types/assignment";
import type { ManagedUser } from "@/types/user";
import type { Template } from "@/types/template";
import { RoleBadge } from "./RoleBadge";

interface UsersTableProps {
  users: ManagedUser[];
  templates: Template[];
  canManagePasswords: boolean;
  onSetPassword: (user: ManagedUser) => void;
  onDeleteUser: (user: ManagedUser) => void;
}

export function UsersTable({ users, templates, canManagePasswords, onSetPassword, onDeleteUser }: UsersTableProps) {
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [assignmentsByEmail, setAssignmentsByEmail] = useState<Record<string, Assignment[]>>({});
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ assignment: Assignment; templateName: string } | null>(null);

  function templateName(templateId: string): string {
    return templates.find((t) => t.template_id === templateId)?.template_name ?? templateId;
  }

  async function toggleExpand(user: ManagedUser) {
    if (expandedEmail === user.email) {
      setExpandedEmail(null);
      return;
    }
    setExpandedEmail(user.email);
    if (assignmentsByEmail[user.email]) return;

    setLoadingEmail(user.email);
    setAssignmentError(null);
    try {
      const filters = user.role === "reviewer" ? { reviewer_email: user.email } : { creator_email: user.email };
      const data = await getAllAssignments(filters);
      setAssignmentsByEmail((current) => ({ ...current, [user.email]: data }));
    } catch {
      setAssignmentError(`Could not load assignments for ${user.email}.`);
    } finally {
      setLoadingEmail(null);
    }
  }

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">
        No users found.
      </div>
    );
  }

  const columnCount = 4 + (canManagePasswords ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-8 px-2 py-3" />
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
            {canManagePasswords ? <th className="px-4 py-3 font-medium">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((user) => {
            const canExpand = user.role === "creator" || user.role === "reviewer";
            const isExpanded = expandedEmail === user.email;
            const assignments = assignmentsByEmail[user.email];

            return (
              <Fragment key={user.email}>
                <tr>
                  <td className="px-2 py-3 text-center">
                    {canExpand ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(user)}
                        aria-label={isExpanded ? `Collapse ${user.email}` : `Expand ${user.email}`}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        {isExpanded ? <LuChevronUp className="h-4 w-4" /> : <LuChevronDown className="h-4 w-4" />}
                      </button>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={user.role} />
                  </td>
                  {canManagePasswords ? (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onSetPassword(user)}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          Set password
                        </button>
                        <button
                          onClick={() => onDeleteUser(user)}
                          aria-label={`Delete ${user.email}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700"
                        >
                          <LuTrash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>

                {isExpanded ? (
                  <tr>
                    <td colSpan={columnCount} className="bg-slate-50 px-4 py-3">
                      {loadingEmail === user.email ? (
                        <p className="text-xs text-slate-500">Loading assignments…</p>
                      ) : assignmentError && !assignments ? (
                        <p className="text-xs text-rose-600">{assignmentError}</p>
                      ) : !assignments || assignments.length === 0 ? (
                        <p className="text-xs text-slate-500">No assignments for this user.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {assignments.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => setSelected({ assignment: a, templateName: templateName(a.template_id) })}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                a.status === "active"
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${a.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                              {scopeName(a)} · {templateName(a.template_id)}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {selected ? (
        <UserAssignmentQuestionsModal
          assignment={selected.assignment}
          templateName={selected.templateName}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}
