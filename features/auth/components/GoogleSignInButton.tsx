"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { loginWithGoogleToken } from "@/features/auth/services/auth.service";
import { signInWithGoogle } from "@/lib/firebase";
import { getApiErrorMessage } from "@/utils/api-error";
import { GoogleIcon } from "./icons";

export function GoogleSignInButton({ onError }: { onError: (message: string) => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const { refreshUser } = useAuth();
  const router = useRouter();

  async function handleClick() {
    setIsLoading(true);
    onError("");
    try {
      const token = await signInWithGoogle();
      await loginWithGoogleToken(token);
      await refreshUser();
      router.push("/assignments/dashboard");
    } catch (error) {
      onError(getApiErrorMessage(error, "Google sign-in failed. Please try again."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <GoogleIcon />
      {isLoading ? "Signing in…" : "Continue with Google"}
    </button>
  );
}
