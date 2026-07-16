"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import {
  LuClipboardCheck,
  LuClipboardList,
  LuClipboardPlus,
  LuFileJson,
  LuFilePlus2,
  LuFileQuestion,
  LuFileStack,
  LuFileUp,
  LuGauge,
  LuLayoutDashboard,
  LuLayoutList,
  LuListChecks,
  LuRadioTower,
  LuSearch,
  LuUpload,
  LuUsers,
  LuWandSparkles,
  LuX,
} from "react-icons/lu";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/types/auth";

interface NavItem {
  label: string;
  href: string;
  icon: IconType;
  roles?: Role[]; // omit = visible to all authenticated users
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/assignments/dashboard",
        icon: LuGauge,
        roles: ["creator", "reviewer", "admin", "superadmin"],
      },
    ],
  },
  {
    label: "Assignments",
    items: [
      { label: "Create Assignment", href: "/assignments/create", icon: LuClipboardPlus, roles: ["admin", "superadmin"] },
      { label: "All Assignments", href: "/assignments", icon: LuClipboardList, roles: ["admin", "superadmin"] },
      { label: "My Assignments", href: "/assignments/my", icon: LuListChecks, roles: ["creator", "reviewer"] },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Create Template", href: "/templates/create", icon: LuFilePlus2, roles: ["admin", "superadmin"] },
      { label: "All Templates", href: "/templates", icon: LuLayoutList, roles: ["admin", "superadmin"] },
    ],
  },
  {
    label: "Questions",
    items: [
      { label: "Question count", href: "/dashboard", icon: LuLayoutDashboard },
      { label: "Create Question", href: "/questions/create", icon: LuFilePlus2, roles: ["creator", "admin", "superadmin"] },
      { label: "All Questions", href: "/questions", icon: LuFileQuestion },
      { label: "Search Questions", href: "/questions/search", icon: LuSearch },
      { label: "Review Queue", href: "/questions/review", icon: LuClipboardCheck, roles: ["reviewer", "admin", "superadmin"] },
    ],
  },
  {
    label: "Ingestion",
    items: [
      { label: "Import DOCX", href: "/ingestion/docx", icon: LuFileUp, roles: ["admin", "superadmin"] },
      { label: "Flashcards", href: "/ingestion/flashcards", icon: LuFileStack, roles: ["admin", "superadmin"] },
      { label: "Upload JSON", href: "/ingestion/upload-questions", icon: LuFileJson, roles: ["admin", "superadmin"] },
      { label: "AI Question Generator", href: "/ingestion/generate", icon: LuWandSparkles, roles: ["admin", "superadmin"] },
      { label: "Publish Content", href: "/ingestion/publish", icon: LuUpload, roles: ["admin", "superadmin"] },
    ],
  },
  {
    label: "Release",
    items: [{ label: "Sync to Dev/Prod", href: "/release/sync", icon: LuRadioTower, roles: ["admin", "superadmin"] }],
  },
  {
    label: "Users",
    items: [{ label: "All Users", href: "/users", icon: LuUsers, roles: ["admin", "superadmin"] }],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
}

export function Sidebar({ isOpen, onClose, isCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 transition-all lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "lg:w-20" : ""}`}
      >
        <div className={`flex items-center px-5 py-4 ${isCollapsed ? "lg:justify-center lg:px-0" : "justify-between"}`}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center">
              <Image
                src="/acadally_logo.png"
                alt="Acadally"
                width={32}
                height={32}
                className="h-full w-full object-contain"
              />
            </div>
            <div className={isCollapsed ? "lg:hidden" : undefined}>
              <p className="text-sm font-semibold text-white">Acadally CMS</p>
              <p className="text-xs text-slate-400">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>

        <nav className="scrollbar-thin-dark flex-1 overflow-y-auto px-3 py-2">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => !item.roles || (user && item.roles.includes(user.role)));
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className="mb-4">
                <p
                  className={`px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${
                    isCollapsed ? "lg:hidden" : ""
                  }`}
                >
                  {group.label}
                </p>
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      title={isCollapsed ? item.label : undefined}
                      className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isCollapsed ? "lg:justify-center lg:px-2" : ""
                      } ${isActive ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className={isCollapsed ? "lg:hidden" : undefined}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
