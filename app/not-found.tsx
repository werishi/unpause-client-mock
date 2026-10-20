/**
 * NotFoundPage — the 404 page for the App Router.
 *
 * Next.js generates `404.html` from this file during `next build`. The nginx
 * config uses `error_page 404 /404.html`, so without this file a 404 response
 * serves nginx's default page rather than the app shell (Domain Notes, Part 4).
 *
 * Server component: no flow state, hooks or browser APIs needed.
 * `export default` is required by the App Router for `not-found.tsx`.
 */

import Link from "next/link";
import { NOT_FOUND_PAGE } from "@/lib/copy";

export default function NotFoundPage() {
  return (
    <main className="flex flex-col items-center gap-6 py-20 text-center">
      <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
        {NOT_FOUND_PAGE.heading}
      </h1>

      <p className="text-gray-600 dark:text-gray-400">{NOT_FOUND_PAGE.body}</p>

      <Link
        href="/"
        className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
      >
        {NOT_FOUND_PAGE.homeLinkLabel}
      </Link>
    </main>
  );
}
