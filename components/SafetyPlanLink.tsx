/**
 * SafetyPlanLink — always-visible safety-plan entry point in the app top bar.
 *
 * Server component (no interactivity, no "use client" needed). Renders a
 * Next.js Link styled as a clearly labelled button. The destination /safety is
 * fixed and never overridden by callers — the profile safety-plan invariant
 * requires this link to be present and unambiguous.
 *
 * Minimum height 44 px satisfies the profile Responsive invariant (tap-target
 * size at 360 px minimum viewport width).
 *
 * No props. Text comes from COPY.SAFETY_PLAN_LINK.label in lib/copy.ts.
 */

import Link from "next/link";
import { SAFETY_PLAN_LINK } from "@/lib/copy";

export default function SafetyPlanLink() {
  return (
    <Link
      href="/safety"
      className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-md
                 bg-red-600 text-white font-medium text-sm
                 hover:bg-red-700 focus-visible:outline focus-visible:outline-2
                 focus-visible:outline-offset-2 focus-visible:outline-red-600
                 dark:focus-visible:outline-red-400"
    >
      {SAFETY_PLAN_LINK.label}
    </Link>
  );
}
