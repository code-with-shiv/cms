"use client";

import { useState } from "react";
import { Select } from "@/components/ui/Select";
import { PasswordInput } from "@/features/users/components/PasswordInput";
import { createUser, setUserPassword } from "@/features/users/services/users.service";
import { getApiErrorMessage } from "@/utils/api-error";
import type { Role } from "@/types/auth";

const ROLES: Role[] = ["creator", "reviewer", "admin", "superadmin"];

interface CreateUserPanelProps {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateUserPanel({ onClose, onCreated }: CreateUserPanelProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("creator");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }

    setIsLoading(true);
    try {
      const { tempPassword: generatedPassword } = await createUser({
        name: name.trim(),
        email: email.trim(),
        role,
      });
      setTempPassword(generatedPassword);
      onCreated();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create user."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    setIsPasswordSaving(true);
    try {
      await setUserPassword(email.trim(), newPassword);
      setPasswordUpdated(true);
      setIsEditingPassword(false);
    } catch (err) {
      setPasswordError(getApiErrorMessage(err, "Could not update password."));
    } finally {
      setIsPasswordSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
        {tempPassword ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-900">User created successfully.</p>
            <div>
              <p className="text-sm text-slate-600">Temporary password (shown once — share it securely):</p>
              <code className="mt-1 block rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-900">{tempPassword}</code>
            </div>

            {isEditingPassword ? (
              <form onSubmit={handlePasswordSubmit} className="space-y-3 border-t border-slate-100 pt-4">
                {passwordError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {passwordError}
                  </div>
                ) : null}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">New password</label>
                  <PasswordInput value={newPassword} onChange={setNewPassword} />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingPassword(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPasswordSaving}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPasswordSaving ? "Saving…" : "Save password"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                {passwordUpdated ? (
                  <p className="text-sm font-medium text-emerald-700">Password updated.</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingPassword(true)}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    Update password
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Done
                </button>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Add user</p>
              <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">
                Cancel
              </button>
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@acadally.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
              <Select
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
                className="capitalize"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">
                    {r}
                  </option>
                ))}
              </Select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Creating…" : "Create user"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
