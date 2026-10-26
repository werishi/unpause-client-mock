/**
 * AppShell — server component that wraps every page.
 *
 * Builds the shell chrome — a fixed top bar, the notification banner, the footer
 * disclaimer and the tab bar — and hands it to ShellFrame, which places it
 * around the content area. The top bar is always visible regardless of scroll
 * position so that SafetyPlanLink remains one tap away at all times (concept
 * Section 2.3).
 *
 * The frame itself (layout order, header offset, bare routes, the /login gate)
 * lives in the client component ShellFrame, because the pathname can only be
 * read in a client child. Passing the chrome as props keeps AppShell a server
 * component and the header server-rendered. On bare routes (isBareRoute, e.g.
 * /login) ShellFrame drops all four chrome elements and renders only <main>.
 *
 * Column width is decided in one place, the client component ShellWidth, used
 * for both the header row here and the content column in ShellFrame.
 *
 * This component is mounted once in app/layout.tsx inside
 * NotificationBannerProvider (itself inside FlowProvider). All route pages are
 * rendered as {children} — the shell never unmounts during client-side
 * navigation in the App Router.
 *
 * Import: server component — no "use client" directive.
 */

import NotificationBanner from "@/components/NotificationBanner";
import SafetyPlanLink from "@/components/SafetyPlanLink";
import ShellFrame from "@/components/ShellFrame";
import ShellWidth from "@/components/ShellWidth";
import TabBar from "@/components/TabBar";
import { SHELL, TABS } from "@/lib/copy";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <ShellFrame
      /*
       * Fixed header — z-10 keeps it above page content.
       * The inner row uses ShellWidth so the app name and SafetyPlanLink line up
       * with the content edges, including on the wide routes.
       */
      header={
        <header className="fixed top-0 left-0 right-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 pt-[env(safe-area-inset-top)]">
          <ShellWidth className="flex items-center justify-between h-14">
            <span className="font-semibold text-gray-900 dark:text-gray-100">{SHELL.appName}</span>
            <SafetyPlanLink />
          </ShellWidth>
        </header>
      }
      /*
       * Notification banner — a fixed overlay just under the header (z-20). It
       * overlays <main> instead of pushing it: a taller header or a pushed <main>
       * would mean changing the same fixed calc in two places, and covering the
       * header would hide SafetyPlanLink.
       */
      banner={<NotificationBanner />}
      /*
       * Footer — one-line disclaimer required by the profile Not-a-medical-product
       * invariant (concept Section 2.3). ShellFrame renders it before the tab bar.
       */
      footer={
        <footer className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          {SHELL.footer}
        </footer>
      }
      tabBar={
        <TabBar
          tabs={[
            { href: "/today", label: TABS.todayLabel },
            { href: "/plan", label: TABS.planLabel },
            { href: "/look-back", label: TABS.lookBackLabel },
            { href: "/you", label: TABS.youLabel },
          ]}
        />
      }
    >
      {children}
    </ShellFrame>
  );
}
