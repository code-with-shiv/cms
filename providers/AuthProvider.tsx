"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "@/context/AuthContext";
import { fetchCurrentUser } from "@/features/auth/services/auth.service";
import type { SessionUser } from "@/types/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await fetchCurrentUser();
      const sessionUser: SessionUser = { email: me.email, role: me.role };
      setUser(sessionUser);
      return sessionUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await refreshUser();
      if (!cancelled) setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, isLoading, setUser, refreshUser }),
    [user, isLoading, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
