"use client";

/**
 * DesktopNav — the persistent left sidebar from `lg` up; it owns everything the sidebar shows.
 * It is present on every non-bare route (ShellFrame drops it on bare routes), but only its tab
 * links follow the `isTabRoute` allow-list: on focused flows it shows the app name and the safety
 * entry with no section links. Keeping the sidebar itself route-independent means the header,
 * main, footer and banner can offset by a constant `lg:pl-56` / `lg:left-56` instead of each
 * calling `isTabRoute` again.
 *
 * Client component because the tab links need `usePathname()` for the active state. The safety
 * entry arrives as the `safetyLink` prop because SafetyPlanLink is a server component and cannot
 * be imported into a client file; AppShell renders it and hands the element in.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveTab, isTabRoute } from "@/lib/domain/routes";
import { SHELL } from "@/lib/copy";

interface Tab {
  href: string;
  label: string;
}

interface DesktopNavProps {
  /** The same four tabs TabBar shows, in the same order (AppShell's NAV_TABS). */
  tabs: Tab[];
  /** A server-rendered `<SafetyPlanLink />`, pinned to the bottom of the sidebar on every route. */
  safetyLink: React.ReactNode;
}

export default function DesktopNav({ tabs, safetyLink }: DesktopNavProps) {
  const pathname = usePathname();

  return (
    <div className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-56 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center h-14 px-4 shrink-0">
        <span className="font-semibold text-gray-900 dark:text-gray-100">{SHELL.appName}</span>
      </div>

      {isTabRoute(pathname) && (
        <nav aria-label="Main tabs" className="flex flex-col gap-1 px-2 py-2">
          {tabs.map((tab) => {
            const active = isActiveTab(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "flex items-center min-h-[44px] px-3 rounded-md text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:focus-visible:outline-indigo-400 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    : "flex items-center min-h-[44px] px-3 rounded-md text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:focus-visible:outline-indigo-400 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      )}

      {/* flex-col so the inline-flex SafetyPlanLink stretches to the full sidebar width. */}
      <div className="mt-auto flex flex-col p-4">{safetyLink}</div>
    </div>
  );
}
