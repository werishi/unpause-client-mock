/**
 * AppShell — server component that wraps every page.
 *
 * Builds the shell chrome — a fixed top bar, the `lg`-only DesktopNav sidebar,
 * the notification banner, the footer (SiteFooter) and the tab bar — and hands
 * it to ShellFrame, which places it around the content area. SafetyPlanLink is
 * always one tap away (concept Section 2.3): below `lg` it sits in the fixed top
 * bar, from `lg` in the sidebar, which is fixed full-height. From `lg` the app
 * name lives in the sidebar too, so the top bar row only holds UserMenu.
 *
 * The frame itself (layout order, header offset, bare routes, the /login gate)
 * lives in the client component ShellFrame, because the pathname can only be
 * read in a client child. Passing the chrome as props keeps AppShell a server
 * component and the header server-rendered. On bare routes (isBareRoute, e.g.
 * /login) ShellFrame drops the header, sidebar, banner and tab bar but keeps the
 * footer, so the disclaimer and the footer links stay reachable on every route.
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

import DesktopNav from "@/components/DesktopNav";
import NotificationBanner from "@/components/NotificationBanner";
import SafetyPlanLink from "@/components/SafetyPlanLink";
import ShellFrame from "@/components/ShellFrame";
import ShellWidth from "@/components/ShellWidth";
import SiteFooter from "@/components/SiteFooter";
import TabBar from "@/components/TabBar";
import UserMenu from "@/components/UserMenu";
import { SHELL, TABS } from "@/lib/copy";

/** The four main tabs, shared by TabBar (below `lg`) and DesktopNav (from `lg`) so they never drift. */
const NAV_TABS = [
  { href: "/today", label: TABS.todayLabel },
  { href: "/plan", label: TABS.planLabel },
  { href: "/look-back", label: TABS.lookBackLabel },
  { href: "/you", label: TABS.youLabel },
];

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <ShellFrame
      /*
       * Fixed header — z-30, not z-10: the header is a stacking context, so the
       * UserMenu panel inside it can only rise above the z-20 NotificationBanner
       * if the header itself outranks the banner. Safe because the banner starts
       * directly below the header and the two never overlap. The DesktopNav
       * sidebar is z-30 as well; from `lg` the header starts at lg:left-56, so
       * sidebar and header never overlap either.
       * Below `lg` the inner row uses ShellWidth so the app name and
       * SafetyPlanLink line up with the content edges. From `lg` both live in
       * the sidebar (lg:hidden here) and the row only holds UserMenu, pushed
       * right by lg:justify-end. The row is relative so the UserMenu panel
       * (absolute, top-full) hangs from the header bottom edge at full panel
       * width. UserMenu and SafetyPlanLink sit in one right-hand cluster; three
       * direct children under justify-between would centre the trigger.
       */
      header={
        <header className="fixed top-0 left-0 lg:left-56 right-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 pt-[env(safe-area-inset-top)]">
          <ShellWidth className="relative flex items-center justify-between h-14 lg:justify-end">
            <span className="font-semibold text-gray-900 dark:text-gray-100 lg:hidden">{SHELL.appName}</span>
            <div className="flex items-center gap-2">
              <UserMenu />
              <div className="lg:hidden">
                <SafetyPlanLink />
              </div>
            </div>
          </ShellWidth>
        </header>
      }
      /*
       * Sidebar — SafetyPlanLink is created here and passed in as an element
       * because it is a server component and DesktopNav is a client component,
       * which cannot import it; a server-rendered element passed as a ReactNode
       * prop is the supported way across that boundary.
       */
      sidebar={<DesktopNav tabs={NAV_TABS} safetyLink={<SafetyPlanLink />} />}
      /*
       * Notification banner — a fixed overlay just under the header (z-20). It
       * overlays <main> instead of pushing it: a taller header or a pushed <main>
       * would mean changing the same fixed calc in two places, and covering the
       * header would hide SafetyPlanLink.
       */
      banner={<NotificationBanner />}
      /*
       * Footer — SiteFooter is the app's only footer landmark and carries the
       * disclaimer required by the profile Not-a-medical-product invariant. It is
       * built here and nowhere else; ShellFrame places it on every route, bare
       * routes included, and always before the tab bar. No bottom padding for the
       * tab bar goes on it: TabBar's in-flow spacer is the only thing that knows
       * the bar's height.
       */
      footer={<SiteFooter />}
      tabBar={<TabBar tabs={NAV_TABS} />}
    >
      {children}
    </ShellFrame>
  );
}
