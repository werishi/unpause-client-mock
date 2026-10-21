/**
 * AppShell — server component that wraps every page.
 *
 * Renders a vertical layout: a fixed top bar, the content area, the footer
 * disclaimer, and the tab bar last. The top bar is always visible regardless of
 * scroll position so that SafetyPlanLink remains one tap away at all times
 * (concept Section 2.3). The content column has top padding equal to the header
 * height so children start below the fixed bar, not behind it.
 *
 * Column width is decided in one place, the client component ShellWidth, which
 * AppShell uses for both the header row and the content column. AppShell itself
 * stays a server component because the pathname can only be read in a client
 * child.
 *
 * This component is mounted once in app/layout.tsx inside
 * NotificationBannerProvider (itself inside FlowProvider), and renders the
 * client NotificationBanner directly below the header. All route pages are
 * rendered as {children} — the shell never unmounts during client-side
 * navigation in the App Router.
 *
 * Import: server component — no "use client" directive.
 */

import NotificationBanner from "@/components/NotificationBanner";
import SafetyPlanLink from "@/components/SafetyPlanLink";
import ShellWidth from "@/components/ShellWidth";
import TabBar from "@/components/TabBar";
import { SHELL, TABS } from "@/lib/copy";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex flex-col min-h-screen">
      {/*
       * Fixed header — z-10 keeps it above page content.
       * The inner row uses ShellWidth so the app name and SafetyPlanLink line up
       * with the content edges, including on the wide routes.
       */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 pt-[env(safe-area-inset-top)]">
        <ShellWidth className="flex items-center justify-between h-14">
          <span className="font-semibold text-gray-900 dark:text-gray-100">{SHELL.appName}</span>
          <SafetyPlanLink />
        </ShellWidth>
      </header>

      {/*
       * Notification banner — a fixed overlay just under the header (z-20). It
       * overlays <main> instead of pushing it: a taller header or a pushed <main>
       * would mean changing the same fixed calc in two places, and covering the
       * header would hide SafetyPlanLink.
       */}
      <NotificationBanner />

      {/*
       * Main content area — flex-1 grows <main> to fill the remaining vertical
       * space, which pushes the footer to the bottom of short pages. The top
       * padding sits on the ShellWidth div (3.5rem = the h-14 header, plus the
       * safe-area inset) so content starts below the fixed header.
       */}
      <main className="flex-1 w-full">
        <ShellWidth className="pt-[calc(3.5rem+env(safe-area-inset-top))]">{children}</ShellWidth>
      </main>

      {/*
       * Footer — one-line disclaimer required by the profile Not-a-medical-product
       * invariant (concept Section 2.3). It comes BEFORE TabBar on purpose:
       * TabBar renders an in-flow spacer the height of the fixed nav, and that
       * spacer has to sit after the footer so the footer clears the bar. On
       * untabbed focused flows TabBar renders nothing and the order is moot.
       */}
      <footer className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
        {SHELL.footer}
      </footer>

      <TabBar
        tabs={[
          { href: "/today", label: TABS.todayLabel },
          { href: "/plan", label: TABS.planLabel },
          { href: "/look-back", label: TABS.lookBackLabel },
          { href: "/you", label: TABS.youLabel },
        ]}
      />
    </div>
  );
}
