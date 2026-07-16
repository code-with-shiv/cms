import { LuTrash2 } from "react-icons/lu";
import type { ManagedUser } from "@/types/user";
import { RoleBadge } from "./RoleBadge";

interface UsersTableProps {
  users: ManagedUser[];
  canManagePasswords: boolean;
  onSetPassword: (user: ManagedUser) => void;
  onDeleteUser: (user: ManagedUser) => void;
}

export function UsersTable({ users, canManagePasswords, onSetPassword, onDeleteUser }: UsersTableProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">
        No users found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
            {canManagePasswords ? <th className="px-4 py-3 font-medium">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((user) => (
            <tr key={user.email}>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
