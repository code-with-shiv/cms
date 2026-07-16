"use client";

import { useState } from "react";
import { deleteUser } from "@/features/users/services/users.service";
import { getApiErrorMessage } from "@/utils/api-error";
import type { ManagedUser } from "@/types/user";

interface DeleteUserModalProps {
  user: ManagedUser;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteUserModal({ user, onClose, onDeleted }: DeleteUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setError("");
    setIsLoading(true);
    try {
      await deleteUser(user.email);
      onDeleted();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not delete user."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Delete user?</p>
            <p className="mt-1 text-xs text-slate-500">
              {user.name} ({user.email}) will be deactivated. Blocked if they have active assignments.
            </p>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Deleting…" : "Delete user"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
