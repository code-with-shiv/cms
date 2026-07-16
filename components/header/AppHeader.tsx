"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LuMenu, LuUser, LuLogOut } from "react-icons/lu";
import { useAuth } from "@/context/AuthContext";
import { logout } from "@/features/auth/services/auth.service";

interface AppHeaderProps {
  title?: string;
  onMenuClick?: () => void;
  onCollapseClick?: () => void;
}

function toTitleCase(text: string): string {
  return text
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export function AppHeader({ title, onMenuClick, onCollapseClick }: AppHeaderProps) {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await logout();
    setUser(null);
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3">
        {onMenuClick ? (
          <button
            onClick={onMenuClick}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <LuMenu className="h-5 w-5" />
          </button>
        ) : null}
        {onCollapseClick ? (
          <button
            onClick={onCollapseClick}
            className="hidden rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:flex"
            aria-label="Toggle sidebar"
          >
            <LuMenu className="h-5 w-5" />
          </button>
        ) : null}
        {title ? (
          <span className="text-sm font-semibold text-slate-900">{toTitleCase(title)}</span>
        ) : null}
      </div>

      {user ? (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white transition hover:bg-slate-600"
            aria-label="User menu"
          >
            {user.email.charAt(0).toUpperCase()}
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-11 z-50 w-60 rounded-lg border border-slate-200 bg-white py-2 shadow-lg">
              <div className="flex items-center gap-2 px-3 py-2">
                <LuUser className="h-4 w-4 shrink-0 text-slate-400" />
                <p className="truncate text-sm text-slate-700">{user.email}</p>
              </div>
              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={handleLogout}
                className="mx-2 flex w-[calc(100%-1rem)] cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                <LuLogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
