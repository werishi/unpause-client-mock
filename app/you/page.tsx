/**
 * You page (/you).
 *
 * Settings-style hub for the current user. Renders navigation links to
 * sub-pages: About Unpause, Safety plan, Demo, and Buddy. The tab bar shows
 * automatically because "/you" matches the TabBar allow-list prefix.
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
        <Link href="/safety">{YOU.youPageSafetyLabel}</Link>
        <Link href="/you/demo">{YOU.youPageDemoLabel}</Link>
      </nav>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-auto">
        {SHELL.footer}
      </p>
    </div>
  );
}
