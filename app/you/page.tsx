/**
 * You page (/you).
 *
 * Settings-style hub for the current user. Renders navigation links to
 * sub-pages: About Unpause, Values, Interests and digest, Media budget, Buddy,
 * Therapist & sharing, Safety plan and Demo. The tab bar shows automatically
 * because "/you" matches the TabBar allow-list prefix.
 *
 * The Therapist & sharing row is deliberately as quiet as the others: no badge,
 * no count, no "set up" prompt. The app works fully without a therapist (concept
 * goal G8), so nothing here may nudge the user towards linking one.
 *
 * Server component — no client hooks needed; initial HTML is prerendered
 * for the static export.
 */

import Link from "next/link";
import { SHELL, YOU } from "@/lib/copy";

export default function YouPage() {
  return (
    <div className="flex flex-col gap-4 py-6">
      <nav className="flex flex-col gap-3">
        <Link href="/you/about">{YOU.youPageAboutLabel}</Link>
        <Link href="/you/values">{YOU.valuesEntry}</Link>
        <Link href="/you/digest">{YOU.interestsAndDigest}</Link>
        <Link href="/you/media">{YOU.mediaBudget}</Link>
        <Link href="/you/buddy">{YOU.buddyEntry}</Link>
        <Link href="/you/therapist">{YOU.therapistEntry}</Link>
        <Link href="/safety/edit">{YOU.youPageSafetyLabel}</Link>
        <Link href="/you/demo">{YOU.youPageDemoLabel}</Link>
      </nav>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-auto">
        {SHELL.footer}
      </p>
    </div>
  );
}
