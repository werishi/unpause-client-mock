"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveTab, isTabRoute, normalizePathname } from "@/lib/domain/routes";

interface Tab {
  href: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
}

/**
 * Fixed bottom tab bar — only renders on tabbed routes (see `isTabRoute`).
 * Also renders an in-flow spacer so content above is not hidden behind the bar.
 *
 * The allow-list lives in `lib/domain/routes.ts` and is shared with the notification
 * banner, so the two can never disagree about which routes are tabbed.
 * From `lg` both the bar and its spacer are hidden and DesktopNav takes over, sharing `isActiveTab`.
 */
export default function TabBar({ tabs }: TabBarProps) {
  const raw = usePathname();
  const pathname = normalizePathname(raw);

  if (!isTabRoute(pathname)) return null;

  return (
    <>
      {/*
       * In-flow spacer — height matches the nav bar (3.5rem content + safe-area-inset-bottom).
       * Keeps this component the single source of truth for whether the bar is visible.
       */}
      <div
        aria-hidden="true"
        className="h-[calc(3.5rem+env(safe-area-inset-bottom))] lg:hidden"
      />

      {/*
       * Fixed nav bar — bg-white matches AppShell's header; z-10 keeps it above page content.
       * pb-[env(safe-area-inset-bottom)] lifts the touch targets above the home indicator.
       * min-h-14 ensures the bar is at least 56 px tall on devices with no safe area.
       */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Main tabs"
      >
        <div className="max-w-md mx-auto flex">
          {tabs.map((tab) => {
            const isActive = isActiveTab(pathname, tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex-1 flex items-center justify-center h-14 text-sm font-medium transition-colors ${
                  isActive ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
