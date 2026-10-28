/**
 * You page (/you).
 *
 * Settings-style hub for the current user: an identity header, then the
 * sub-pages grouped into four calm sections of list rows (what matters to you,
 * your people, safety, about this app). The tab bar shows automatically
 * because "/you" matches the TabBar allow-list prefix. From the `xl` breakpoint
 * the four section cards sit on a two-column grid under the full-width header;
 * from `lg` to `xl` they are one column in the 672 px shell column, because the
 * sidebar leaves too little width for two. The column width itself is set by
 * ShellWidth in AppShell.
 *
 * The Therapist & sharing row is deliberately as quiet as the others: no badge,
 * no count, no "set up" prompt. The app works fully without a therapist (concept
 * goal G8), so nothing here may nudge the user towards linking one.
 *
 * The header shows no name and the Buddy row no buddy name: reading the store
 * would turn this page into a client component (YOU.buddyEntry note in
 * lib/copy.ts). All copy on this page lives in YOU (lib/copy.ts), which
 * tests/copy.test.ts scans against tests/banned-words.ts.
 *
 * Server component — no client hooks needed; initial HTML is prerendered
 * for the static export.
 */

import Link from "next/link";
import { YOU } from "@/lib/copy";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";

type IconName =
  | "heart"
  | "sparkles"
  | "clock"
  | "users"
  | "chat"
  | "shield"
  | "info"
  | "play"
  | "chevron"
  | "person";

/** Stroke paths (24px grid) for the page's icons; decorative only. */
const ICON_PATHS: Record<IconName, string> = {
  heart:
    "M21 8.25c0-2.49-2.1-4.5-4.69-4.5-1.93 0-3.6 1.13-4.31 2.73-.72-1.6-2.38-2.73-4.31-2.73C5.1 3.75 3 5.76 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z",
  sparkles:
    "M9.8 15.9 9 18.75l-.8-2.85a4.5 4.5 0 0 0-3.1-3.1L2.25 12l2.85-.8a4.5 4.5 0 0 0 3.1-3.1L9 5.25l.8 2.85a4.5 4.5 0 0 0 3.1 3.1l2.85.8-2.85.8a4.5 4.5 0 0 0-3.1 3.1ZM18.26 8.72 18 9.75l-.26-1.03a3.38 3.38 0 0 0-2.46-2.46L14.25 6l1.03-.26a3.38 3.38 0 0 0 2.46-2.46L18 2.25l.26 1.03a3.38 3.38 0 0 0 2.46 2.46l1.03.26-1.03.26a3.38 3.38 0 0 0-2.46 2.46Z",
  clock: "M12 6v6h4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  users:
    "M15 19.13a9.38 9.38 0 0 0 2.63.37 9.34 9.34 0 0 0 4.12-.95 4.13 4.13 0 0 0-7.53-2.49M15 19.13v-.01c0-1.11-.29-2.16-.78-3.07M15 19.13v.1A12.32 12.32 0 0 1 8.62 21c-2.33 0-4.51-.64-6.37-1.77v-.11a6.38 6.38 0 0 1 11.96-3.07M12 6.38a3.38 3.38 0 1 1-6.75 0 3.38 3.38 0 0 1 6.75 0Zm8.25 2.25a2.63 2.63 0 1 1-5.25 0 2.63 2.63 0 0 1 5.25 0Z",
  chat:
    "M8.63 12a.38.38 0 1 1-.75 0 .38.38 0 0 1 .75 0Zm3.75 0a.38.38 0 1 1-.75 0 .38.38 0 0 1 .75 0Zm3.75 0a.38.38 0 1 1-.75 0 .38.38 0 0 1 .75 0ZM21 12c0 4.56-4.03 8.25-9 8.25a9.76 9.76 0 0 1-2.55-.34 5.97 5.97 0 0 1-3.97 1.34 6.05 6.05 0 0 0 1.13-2.69C4.96 17.13 3 14.76 3 12c0-4.56 4.03-8.25 9-8.25s9 3.69 9 8.25Z",
  shield:
    "M9 12.75 11.25 15 15 9.75m-3-7.04A11.96 11.96 0 0 1 3.6 6 12 12 0 0 0 3 9.75c0 5.59 3.82 10.29 9 11.62 5.18-1.33 9-6.03 9-11.62 0-1.31-.21-2.57-.6-3.75h-.15c-3.2 0-6.1-1.25-8.25-3.29Z",
  info:
    "m11.25 11.25.04-.02a.75.75 0 0 1 1.06.85l-.7 2.84a.75.75 0 0 0 1.06.85l.04-.02M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.01v.01H12v-.01Z",
  play:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM15.91 11.67a.38.38 0 0 1 0 .66l-5.6 3.11a.38.38 0 0 1-.56-.33V8.89c0-.29.31-.47.56-.33l5.6 3.11Z",
  chevron: "m9 5.25 6.75 6.75L9 18.75",
  person:
    "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.12a7.5 7.5 0 0 1 15 0A17.93 17.93 0 0 1 12 21.75c-2.68 0-5.22-.58-7.5-1.63Z",
};

type Row = { href: string; label: string; hint: string; icon: IconName };
type Section = { id: string; heading: string; rows: Row[]; tone?: "safety" };

const SECTIONS: Section[] = [
  {
    id: "matters",
    heading: YOU.sectionMatters,
    rows: [
      { href: "/you/values", label: YOU.valuesEntry, hint: YOU.valuesHint, icon: "heart" },
      { href: "/you/digest", label: YOU.interestsAndDigest, hint: YOU.digestHint, icon: "sparkles" },
      { href: "/you/media", label: YOU.mediaBudget, hint: YOU.mediaHint, icon: "clock" },
    ],
  },
  {
    id: "people",
    heading: YOU.sectionPeople,
    rows: [
      { href: "/you/buddy", label: YOU.buddyEntry, hint: YOU.buddyHint, icon: "users" },
      { href: "/you/therapist", label: YOU.therapistEntry, hint: YOU.therapistHint, icon: "chat" },
    ],
  },
  {
    id: "safety",
    heading: YOU.sectionSafety,
    tone: "safety",
    rows: [
      { href: "/safety/edit", label: YOU.youPageSafetyLabel, hint: YOU.safetyHint, icon: "shield" },
    ],
  },
  {
    id: "about",
    heading: YOU.sectionAbout,
    rows: [
      { href: "/you/about", label: YOU.youPageAboutLabel, hint: YOU.aboutHint, icon: "info" },
      { href: "/you/demo", label: YOU.youPageDemoLabel, hint: YOU.demoHint, icon: "play" },
      // Plain link back to the picker; it clears nothing, the Continue card there leads back in.
      { href: "/login", label: YOU.switchCharacterEntry, hint: YOU.switchCharacterHint, icon: "person" },
    ],
  },
];

/** Inline stroke icon; decorative, hidden from assistive tech. */
function Icon({ name, className }: { name: IconName; className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

export default function YouPage() {
  return (
    <div className="flex flex-col gap-8 py-8">
      <header className="flex items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
          <Icon name="person" className="size-7" />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 lg:text-3xl">{YOU.title}</h1>
          <p className="text-base text-gray-600 dark:text-gray-400">{YOU.subtitle}</p>
        </div>
      </header>

      <div className="flex flex-col gap-8 xl:grid xl:grid-cols-2 xl:items-start xl:gap-8">
        {SECTIONS.map((section) => {
          const chip =
            section.tone === "safety"
              ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
              : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400";
          return (
            <section key={section.id} aria-labelledby={`you-${section.id}`} className="flex flex-col gap-2">
              <h2 id={`you-${section.id}`} className="px-1 text-sm font-medium text-gray-600 dark:text-gray-400 lg:text-base">
                {section.heading}
              </h2>
              <ul className="divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:shadow-none">
                {section.rows.map((row) => (
                  <li key={row.href}>
                    <Link
                      href={row.href}
                      className={`flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${focusRing}`}
                    >
                      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${chip}`}>
                        <Icon name={row.icon} className="size-5" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-base font-medium text-gray-900 dark:text-gray-100">{row.label}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{row.hint}</span>
                      </span>
                      <Icon name="chevron" className="size-5 shrink-0 text-gray-500 dark:text-gray-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
