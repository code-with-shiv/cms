"use client";

import { useState } from "react";
import Image from "next/image";
import { LoginHero } from "./LoginHero";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { EmailPasswordForm } from "./EmailPasswordForm";

export function LoginPage() {
  const [errorMessage, setErrorMessage] = useState("");

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <LoginHero />

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center">
              <Image
                src="/acadally_logo.png"
                alt="Acadally"
                width={36}
                height={36}
                className="h-full w-full object-contain"
              />
            </div>
            <p className="text-sm font-semibold text-slate-900">Acadally CMS</p>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in to continue to Acadally CMS</p>

          {errorMessage ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-6">
            <GoogleSignInButton onError={setErrorMessage} />
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">or sign in with email</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <EmailPasswordForm onError={setErrorMessage} />

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
            Only authorized users can access this CMS.
            <br />
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">© ${new Date().getFullYear()} Acadally · Education CMS</p>
      </div>
    </div>
  );
}
