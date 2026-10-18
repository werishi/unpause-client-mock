/**
 * You page (/you).
 *
 * Settings-style hub for the current user. Renders navigation links to
 * sub-pages: About Unpause, Safety plan, and Demo. The tab bar shows
 * automatically because "/you" matches the TabBar allow-list prefix.
 *
 * Server component — no client hooks needed; initial HTML is prerendered
 * for the static export.
 */

import Link from "next/link";
import { SHELL } from "@/lib/copy";

export default function YouPage() {
  return (
    <div className="flex flex-col gap-4 py-6">
      <nav className="flex flex-col gap-3">
        <Link href="/you/about">About Unpause</Link>
        <Link href="/safety">Safety plan</Link>
        <Link href="/you/demo">Demo</Link>
      </nav>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-auto">
        {SHELL.footer}
      </p>
    </div>
  );
}
