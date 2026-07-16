"use client";

import { useState } from "react";
import { setUserPassword } from "@/features/users/services/users.service";
import { getApiErrorMessage } from "@/utils/api-error";
import { PasswordInput } from "@/features/users/components/PasswordInput";
import type { ManagedUser } from "@/types/user";

interface SetPasswordModalProps {
  user: ManagedUser;
  onClose: () => void;
  onUpdated: () => void;
}

export function SetPasswordModal({ user, onClose, onUpdated }: SetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      await setUserPassword(user.email, password);
      setSuccess(true);
      onUpdated();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not update password."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg">
        {success ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-900">
              Password updated for {user.email}.
            </p>
            <button
              onClick={onClose}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Set password</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                New password
              </label>
              <PasswordInput value={password} onChange={setPassword} />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
