"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Tab {
  href: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
}

/**
 * Fixed bottom tab bar — only renders on tabbed routes (/today, /you/*).
 * Also renders an in-flow spacer so content above is not hidden behind the bar.
 *
 * Allow-list rationale: every new route is a focused flow by default; a forgotten
 * allow-list entry hides the tab bar rather than leaking one into a flow (concept 2.2).
 */
export default function TabBar({ tabs }: TabBarProps) {
  const raw = usePathname();
  // trailingSlash: true (next.config.ts) emits /today/ and /you/ — strip the trailing slash
  // before matching, but keep the root "/" intact.
  const pathname = raw !== "/" && raw.endsWith("/") ? raw.slice(0, -1) : raw;

  const isTabbed = pathname === "/today" || pathname.startsWith("/you");

  if (!isTabbed) return null;

  return (
    <>
      {/*
       * In-flow spacer — height matches the nav bar (3.5rem content + safe-area-inset-bottom).
       * Keeps this component the single source of truth for whether the bar is visible.
       */}
      <div
        aria-hidden="true"
        className="h-[calc(3.5rem+env(safe-area-inset-bottom))]"
      />

      {/*
       * Fixed nav bar — bg-white matches AppShell's header; z-10 matches too.
       * pb-[env(safe-area-inset-bottom)] lifts the touch targets above the home indicator.
       * min-h-14 ensures the bar is at least 56 px tall on devices with no safe area.
       */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]"
        aria-label="Main tabs"
      >
        <div className="max-w-md mx-auto flex">
          {tabs.map((tab) => {
            // Today is active on exact match; /you/* is active on prefix match.
            const isActive =
              tab.href === "/today"
                ? pathname === "/today"
                : pathname === tab.href || pathname.startsWith(tab.href + "/");

            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex-1 flex items-center justify-center h-14 text-sm font-medium transition-colors ${
                  isActive ? "text-gray-900" : "text-gray-400"
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
