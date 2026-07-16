"use client";

import { useState, useSyncExternalStore } from "react";
import { Sidebar } from "@/components/common/Sidebar";
import { AppHeader } from "@/components/header/AppHeader";

const COLLAPSED_STORAGE_KEY = "cms-sidebar-collapsed";
const COLLAPSED_CHANGE_EVENT = "cms-sidebar-collapsed-change";

function subscribeToCollapsed(callback: () => void) {
  window.addEventListener(COLLAPSED_CHANGE_EVENT, callback);
  return () => window.removeEventListener(COLLAPSED_CHANGE_EVENT, callback);
}

function getCollapsedSnapshot() {
  return localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true";
}

function getCollapsedServerSnapshot() {
  return false;
}

interface AppShellProps {
  title: string;
  children: React.ReactNode;
}

export function AppShell({ title, children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isCollapsed = useSyncExternalStore(subscribeToCollapsed, getCollapsedSnapshot, getCollapsedServerSnapshot);

  function toggleCollapsed() {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, String(!isCollapsed));
    window.dispatchEvent(new Event(COLLAPSED_CHANGE_EVENT));
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isCollapsed}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppHeader
          title={title}
          onMenuClick={() => setIsSidebarOpen(true)}
          onCollapseClick={toggleCollapsed}
        />
        <main className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
