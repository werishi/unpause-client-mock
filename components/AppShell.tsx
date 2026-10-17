/**
 * AppShell — server component that wraps every page.
 *
 * Renders a three-part vertical layout: a fixed top bar, a centred content
 * column, and a footer. The top bar is always visible regardless of scroll
 * position so that SafetyPlanLink remains one tap away at all times (concept
 * Section 2.3). The content column has top padding equal to the header height
 * so children start below the fixed bar, not behind it.
 *
 * This component is mounted once in app/layout.tsx inside FlowProvider. All
 * six route pages are rendered as {children} — the shell never unmounts during
 * client-side navigation in the App Router.
 *
 * Import: server component — no "use client" directive.
 */

import SafetyPlanLink from "@/components/SafetyPlanLink";
import { SHELL } from "@/lib/copy";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex flex-col min-h-screen">
      {/*
       * Fixed header — z-10 keeps it above page content.
       * Inner row is max-w-md so the layout matches the content column width.
       */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto flex items-center justify-between px-4 h-14">
          <span className="font-semibold text-gray-900">{SHELL.appName}</span>
          <SafetyPlanLink />
        </div>
      </header>

      {/*
       * Main content area — pt-14 matches the fixed header height (h-14 = 3.5rem).
       * flex-1 ensures the main grows to fill remaining vertical space.
       */}
      <main className="max-w-md mx-auto w-full flex-1 px-4 pt-14">
        {children}
      </main>

      {/*
       * Footer — one-line disclaimer required by the profile Not-a-medical-product
       * invariant (concept Section 2.3).
       */}
      <footer className="py-4 text-center text-sm text-gray-500">
        {SHELL.footer}
      </footer>
    </div>
  );
}
