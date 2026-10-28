// /imprint: points to the legal notice of the operator's main site. A bare route,
// so ShellFrame renders it inside its own <main> with no header or tab bar; the shared
// footer follows <main>. This page's root is an <article> and sets its own width and
// padding. Its first row carries the back link and the safety entry, because goal G9
// asks for one tap to /safety from any screen. BackLink is the only client island.
// All text comes from IMPRINT in lib/copy.ts. No name, address or e-mail of the
// operator may appear here: personal data never enters this repo.
import BackLink from "@/components/BackLink";
import SafetyPlanLink from "@/components/SafetyPlanLink";
import { IMPRINT } from "@/lib/copy";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";

/** Imprint page: a one-line operator statement and a link to the full legal notice. */
export default function ImprintPage() {
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink label={IMPRINT.backLabel} />
        <SafetyPlanLink />
      </div>

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
