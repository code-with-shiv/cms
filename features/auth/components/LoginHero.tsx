"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { heroFeatures } from "@/features/auth/constants/hero-content";
import { CheckBadgeIcon, ShieldIcon } from "./icons";

export function LoginHero() {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  const motion = useMemo(
    () => ({
      glowOne: {
        transform: `translate(${pointer.x * 140}px, ${pointer.y * 140}px)`,
      },
      glowTwo: {
        transform: `translate(${pointer.x * -120}px, ${pointer.y * 110}px)`,
      },
      glowThree: {
        transform: `translate(calc(-50% + ${pointer.x * 100}px), calc(-50% + ${pointer.y * -100}px))`,
      },
    }),
    [pointer],
  );

  return (
    <div
      className="relative hidden lg:flex lg:w-[45%] flex-col justify-between overflow-hidden bg-[#130f28] px-12 py-14 text-white"
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPointer({
          x: (event.clientX - rect.left) / rect.width - 0.5,
          y: (event.clientY - rect.top) / rect.height - 0.5,
        });
      }}
      onMouseLeave={() => setPointer({ x: 0, y: 0 })}
    >
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.65)_0%,rgba(99,102,241,0.2)_42%,transparent_74%)] blur-3xl transition-transform duration-300 ease-out"
        style={motion.glowOne}
      />
      <div
        className="pointer-events-none absolute -bottom-28 -right-24 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.55)_0%,rgba(139,92,246,0.18)_45%,transparent_72%)] blur-3xl transition-transform duration-300 ease-out"
        style={motion.glowTwo}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.45)_0%,rgba(59,130,246,0.14)_46%,transparent_72%)] blur-3xl transition-transform duration-300 ease-out"
        style={motion.glowThree}
      />

      <div className="relative flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-lg shadow-black/30 ring-1 ring-white/40">
          <Image
            src="/acadally_logo.png"
            alt="Acadally"
            width={44}
            height={44}
            className="h-full w-full object-contain"
          />
        </div>
        <div>
          <p className="text-base font-semibold leading-tight">Acadally CMS</p>
          <p className="text-[11px] font-semibold tracking-wider text-indigo-400">ADMIN PORTAL</p>
        </div>
      </div>

      <div className="relative flex flex-col gap-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight">
            Manage academic
            <br />
            content with confidence
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-slate-300">
            Review questions, assign chapters, track progress, and manage content workflows from
            one secure platform.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {heroFeatures.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <CheckBadgeIcon className="mb-2 text-emerald-400" />
              <p className="text-sm font-semibold">{feature.title}</p>
              <p className="mt-1 text-xs leading-snug text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex items-center gap-1.5 text-xs text-slate-500">
        <ShieldIcon />
        Secure internal CMS — authorized users only
      </div>
    </div>
  );
}
