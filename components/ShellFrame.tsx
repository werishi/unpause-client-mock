"use client";

/**
 * ShellFrame — the one client component that decides, per route, whether the
 * shell chrome renders and whether the visitor is sent to /login.
 *
 * AppShell (a server component) builds the header, banner, footer and tab bar
 * and hands them in as props; ShellFrame only places them. Receiving the chrome
 * as props rather than importing it keeps AppShell server-side and the header
 * server-rendered, while the pathname — readable only in a client component —
 * is read here.
 *
 * It is mounted exactly once, so there is exactly one gate effect. Wrapping
 * header, banner and footer separately was refused because three wrapper
 * instances would run three redirect effects. A route group was refused by the
 * concept because it would move about 19 route folders.
 *
 * Bare routes (isBareRoute, e.g. /login) render only <main> with no header,
 * banner, footer, tab bar or ShellWidth — the login page sets its own
 * max-w-5xl column.
 */

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import ShellWidth from "@/components/ShellWidth";
import { isBareRoute, isGateExemptRoute } from "@/lib/domain/routes";
import { useGate } from "@/lib/store/use-gate";

interface ShellFrameProps {
  header: React.ReactNode;
  banner: React.ReactNode;
  footer: React.ReactNode;
  tabBar: React.ReactNode;
  children: React.ReactNode;
}

export default function ShellFrame({ header, banner, footer, tabBar, children }: ShellFrameProps) {
  const pathname = usePathname();
  const router = useRouter();
  const bare = isBareRoute(pathname);
  const { ready, accepted } = useGate();

  // Gate: send a visitor without the accepted flag to /login. It waits for
  // `ready` because on the server render and the hydration pass the gate status
  // is unknown, and redirecting on unknown would bounce every accepted visitor
  // through /login.
  // Accepted trade-off: a visitor with no flag who opens a deep link sees that
  // page's prerendered HTML for one frame before the redirect, because static
  // export has no server redirect. Hiding <main> until `ready` was refused: it
  // would blank every page of every returning, accepted visitor on each load,
  // which is the common case.
  useEffect(() => {
    if (ready && !accepted && !isGateExemptRoute(pathname)) router.replace("/login");
  }, [ready, accepted, pathname, router]);

  if (bare) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="w-full flex-1 pt-[env(safe-area-inset-top)]">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {header}

      {banner}

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
       * Footer comes BEFORE the tab bar on purpose: TabBar renders an in-flow
       * spacer the height of the fixed nav, and that spacer has to sit after the
       * footer so the footer clears the bar. On untabbed focused flows TabBar
       * renders nothing and the order is moot.
       */}
      {footer}

      {tabBar}
    </div>
  );
}
