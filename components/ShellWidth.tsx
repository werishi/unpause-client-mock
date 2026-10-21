/**
 * ShellWidth — the single place the app shell's column width is decided.
 *
 * Every page sits in a centred, padded column that is `max-w-md` by default.
 * Two routes (see isWideRoute in lib/domain/routes.ts) widen that column to
 * `max-w-4xl` from the `lg` breakpoint up. AppShell is a server component, so
 * the pathname is read here in a client child, the same way TabBar and
 * NotificationBanner read it. Under `output: "export"` each route is
 * prerendered with its own pathname, so the static HTML already carries the
 * right class and nothing reflows on hydration.
 *
 * The header row and the page content both use this component, so the app name
 * and SafetyPlanLink stay aligned with the content edges on wide routes.
 *
 * Deliberately NOT applied to TabBar or NotificationBanner: both are fixed
 * overlays with their own width rules and must keep them.
 *
 * The widening class below is written as one unbroken literal so Tailwind's
 * source scanner emits the utility. These classes carry no colour, so there is
 * no dark-mode twin to maintain.
 *
 * Import: client component ("use client") because it reads usePathname.
 */
"use client";

import { usePathname } from "next/navigation";

import { isWideRoute } from "@/lib/domain/routes";

interface ShellWidthProps {
  children: React.ReactNode;
  /** Extra classes appended after the width classes (layout, padding-top). */
  className?: string;
}

const BASE_CLASSES = "mx-auto w-full max-w-md px-4";

export default function ShellWidth({ children, className }: ShellWidthProps) {
  const pathname = usePathname();
  const classes = [
    BASE_CLASSES,
    isWideRoute(pathname) ? "lg:max-w-4xl" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}
