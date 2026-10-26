// /imprint: points to the legal notice of the operator's main site. A bare route,
// so ShellFrame renders it inside its own <main> with no header, footer or tab bar;
// this page's root is an <article> and sets its own width and padding.
// All text comes from IMPRINT in lib/copy.ts. No name, address or e-mail of the
// operator may appear here: personal data never enters this repo.
import Link from "next/link";

import { IMPRINT } from "@/lib/copy";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";

/** Imprint page: a one-line operator statement and a link to the full legal notice. */
export default function ImprintPage() {
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <Link
        href="/login"
        className={`self-start text-sm text-gray-600 underline underline-offset-2 dark:text-gray-400 ${focusRing}`}
      >
        {IMPRINT.backLabel}
      </Link>

      <h1 className="text-xl font-semibold">{IMPRINT.heading}</h1>
      <p className="text-sm leading-relaxed">{IMPRINT.body}</p>
      <a
        href={IMPRINT.linkHref}
        rel="noopener noreferrer"
        className={`self-start text-sm underline underline-offset-2 ${focusRing}`}
      >
        {IMPRINT.linkLabel}
      </a>
    </article>
  );
}
