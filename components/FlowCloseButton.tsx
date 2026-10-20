/**
 * FlowCloseButton — server component.
 *
 * Renders a "×" close control that points at /today, used on all flow and
 * onboarding screens. /safety is excluded — it uses router.back() instead
 * (ScaffoldAndCiMap.md, Gotchas: safety page back button).
 *
 * The aria-label uses FLOW.closeAriaLabel so screen readers announce "Close"
 * rather than the literal "×" character, which reads as "times" or "multiply".
 */

import Link from "next/link";
import { FLOW } from "@/lib/copy";

export default function FlowCloseButton() {
  return (
    <Link
      href="/today"
      aria-label={FLOW.closeAriaLabel}
      className="inline-flex items-center justify-center w-10 h-10 text-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
    >
      <span aria-hidden="true">×</span>
    </Link>
  );
}
