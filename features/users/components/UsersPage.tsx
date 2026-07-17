"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/common/AppShell";
import { getAllUsers } from "@/features/users/services/users.service";
import { getApiErrorMessage } from "@/utils/api-error";
import type { Role } from "@/types/auth";
import type { ManagedUser } from "@/types/user";
import { UsersTable } from "./UsersTable";
import { CreateUserPanel } from "./CreateUserPanel";
import { SetPasswordModal } from "./SetPasswordModal";
import { DeleteUserModal } from "./DeleteUserModal";

const ROLE_FILTERS: Array<Role | "all"> = ["all", "creator", "reviewer", "admin", "superadmin"];

export function UsersPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [allUsers, setAllUsers] = useState<ManagedUser[]>([]);
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<ManagedUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isSuperadmin = user?.role === "superadmin";
  const refresh = () => setRefreshToken((token) => token + 1);

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const data = await getAllUsers();
        if (!cancelled) setAllUsers(data);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, "Could not load users."));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, refreshToken]);

  const users = roleFilter === "all" ? allUsers : allUsers.filter((u) => u.role === roleFilter);

  if (isAuthLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <AppShell title="users">
        <div className="flex flex-1 items-center justify-center py-24 text-sm text-slate-500">
          You don&apos;t have permission to view this page.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="users">
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">User Management</h1>
            <p className="text-sm text-slate-500">Manage CMS accounts and roles.</p>
          </div>
          {isSuperadmin ? (
            <button
              onClick={() => setIsCreating(true)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Add user
            </button>
          ) : null}
        </div>

        <div className="mb-4 flex items-center gap-2">
          {ROLE_FILTERS.map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                roleFilter === role
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading users…</div>
        ) : (
          <UsersTable
            users={users}
            canManagePasswords={isSuperadmin}
            onSetPassword={setPasswordTarget}
            onDeleteUser={setDeleteTarget}
          />
        )}
      </div>

      {isCreating ? (
        <CreateUserPanel
          onClose={() => setIsCreating(false)}
          onCreated={refresh}
        />
      ) : null}

      {passwordTarget ? (
        <SetPasswordModal
          user={passwordTarget}
          onClose={() => setPasswordTarget(null)}
          onUpdated={refresh}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteUserModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={refresh}
        />
      ) : null}
    </AppShell>
  );
}
