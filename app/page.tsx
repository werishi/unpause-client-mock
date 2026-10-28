import Link from "next/link";
import type { Metadata } from "next";
import { INVESTOR } from "@/lib/copy";
import {
  ACCENT,
  AskSection,
  BAND,
  BODY,
  BULLET,
  CARD,
  CARD_HOVER,
  ContactSection,
  FOCUS_RING,
  H2,
  H3,
  LEAD,
  LIST,
  MUTED,
  PAD_X,
  Placeholder,
  RolesSection,
  RULED,
  SECTION,
  StatusSection,
  TeamSection,
} from "@/components/InvestorSections";

/**
 * The page's title and description come from the copy file, so the wording lives next to every
 * other investor string. Exporting `metadata` is only possible because this is a server component.
 */
export const metadata: Metadata = {
  title: INVESTOR.meta.title,
  description: INVESTOR.meta.description,
};

/**
 * Investor landing page at "/": the hero and sections 2 to 6, followed by sections 7 to 12 from
 * `components/InvestorSections.tsx`. It replaced the old client-side redirect to /login, which
 * would have sent every visitor away from this content; the demo is now reached through the
 * hero's primary button. Server component: no hooks, no state, no store. Every visible string is
 * an `INVESTOR.*` read written out in full, because the copy test finds each key by that text.
 * Each section spans the full width and centres its own content through `PAD_X`.
 */
export default function InvestorPage() {
  return (
    <div className="flex w-full flex-col">
      {/*
        Hero. The order is fixed so that the button row ends above 640 px at a 360 px wide
        viewport (G1 mitigation): no min-h-screen, no image, and the mockup notice sits after the
        buttons rather than before them. The funding status stays directly above the buttons.
      */}
      <section
        id="top"
        className={`${PAD_X} flex flex-col bg-[radial-gradient(48rem_30rem_at_85%_0%,var(--color-indigo-100),transparent),linear-gradient(to_bottom,var(--color-indigo-50),var(--color-white))] pb-16 pt-5 dark:bg-[radial-gradient(48rem_30rem_at_85%_0%,color-mix(in_oklab,var(--color-indigo-500)_22%,transparent),transparent),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-indigo-950)_60%,transparent),transparent)] md:pb-20 lg:pb-24`}
      >
        <div className="flex justify-end">
          <Link
            href="/safety"
            className={`text-sm font-medium text-red-600 underline underline-offset-2 dark:text-red-400 ${FOCUS_RING}`}
          >
            {INVESTOR.safetyAndLegal.safetyLinkLabel}
          </Link>
        </div>
        <div className="mt-8 flex max-w-4xl flex-col gap-8 md:mt-16 md:gap-10 lg:mt-24">
          <div className="flex flex-col gap-4 md:gap-6">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white md:text-7xl lg:text-8xl 2xl:text-9xl">
              {INVESTOR.hero.name}
            </h1>
            <p className="text-balance text-2xl font-semibold tracking-tight text-indigo-600 dark:text-indigo-400 md:text-3xl lg:text-4xl 2xl:text-5xl">
              {INVESTOR.hero.tagline}
            </p>
            <p className={`${LEAD} max-w-2xl`}>{INVESTOR.hero.summary}</p>
          </div>
          <div className="flex flex-col items-start gap-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/70 px-3 py-1 text-sm font-medium text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-200">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
              {INVESTOR.hero.status}
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/login"
                className={`group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base 2xl:min-h-14 2xl:px-8 2xl:text-lg font-semibold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700 dark:bg-indigo-600 dark:shadow-indigo-950/40 dark:hover:bg-indigo-700 sm:w-auto ${FOCUS_RING}`}
              >
                {INVESTOR.hero.tryDemoLabel}
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                >
                  →
                </span>
              </Link>
              <a
                href={`mailto:${INVESTOR.placeholders.contactEmail}`}
                className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-base 2xl:min-h-14 2xl:px-8 2xl:text-lg font-semibold text-gray-900 transition-colors hover:bg-gray-50 dark:border-white/15 dark:bg-white/5 dark:text-gray-100 dark:hover:bg-white/10 sm:w-auto ${FOCUS_RING}`}
              >
                {INVESTOR.hero.contactLabel}
              </a>
            </div>
            <p className={`${MUTED} text-sm`}>{INVESTOR.hero.mockupNotice}</p>
          </div>
        </div>
      </section>

      {/*
        Section 2: the problem. The lead, then the two sourced data lines side by side, then the
        three unsupplied figures as an equal-width row of placeholder tiles (grid items stretch).
      */}
      <section id="problem" className={SECTION}>
        <h2 className={H2}>{INVESTOR.problem.heading}</h2>
        <div className="flex flex-col gap-8">
          <p className={`${LEAD} max-w-3xl`}>{INVESTOR.problem.intro}</p>
          <div className="grid gap-6 md:grid-cols-2 md:gap-10">
            <p className={RULED}>{INVESTOR.problem.lonelinessLine}</p>
            <p className={RULED}>{INVESTOR.problem.retentionLine}</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          <Placeholder>{INVESTOR.placeholders.prevalence}</Placeholder>
          <Placeholder>{INVESTOR.placeholders.careGap}</Placeholder>
          <Placeholder>{INVESTOR.placeholders.marketSize}</Placeholder>
        </div>
      </section>

      {/* Section 3: project goals. List items are fixed copy, so the text itself is a stable key. */}
      <section id="goals" className={`${SECTION} ${BAND}`}>
        <h2 className={H2}>{INVESTOR.goals.heading}</h2>
        <ul className="grid gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
          {INVESTOR.goals.items.map((item) => (
            <li key={item} className={`${CARD} flex flex-col gap-4`}>
              <span aria-hidden="true" className={ACCENT} />
              <span className="text-pretty text-base font-medium leading-relaxed text-gray-800 dark:text-gray-100 2xl:text-lg">
                {item}
              </span>
            </li>
          ))}
        </ul>
        <p className="max-w-3xl text-pretty border-l-4 border-indigo-500 pl-5 text-lg font-medium leading-relaxed text-gray-900 dark:border-indigo-400 dark:text-white md:text-xl 2xl:text-2xl">
          {INVESTOR.goals.centreLine}
        </p>
      </section>

      {/* Section 4: the six core ideas; two columns from md, three from lg, one column on phones. */}
      <section id="solution" className={SECTION}>
        <h2 className={H2}>{INVESTOR.solution.heading}</h2>
        <div className="grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {INVESTOR.solution.cards.map((card) => (
            <div key={card.title} className={`${CARD} ${CARD_HOVER} flex flex-col gap-3`}>
              <span aria-hidden="true" className={ACCENT} />
              <p className={H3}>{card.title}</p>
              <p className={BODY}>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/*
        Section 5: the evidence. The caveat card follows the claims list directly, with nothing in
        between, because it limits exactly those claims.
      */}
      <section id="evidence" className={`${SECTION} ${BAND}`}>
        <h2 className={H2}>{INVESTOR.evidence.heading}</h2>
        <ul className="grid gap-6 md:grid-cols-2 md:gap-x-10 md:gap-y-8">
          {INVESTOR.evidence.points.map((point) => (
            <li key={point} className={RULED}>
              {point}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-4">
          <div className={`${CARD} flex flex-col gap-2`}>
            <h3 className={H3}>{INVESTOR.evidence.caveatHeading}</h3>
            <p className={`${BODY} max-w-prose`}>{INVESTOR.evidence.caveat}</p>
          </div>
          <p className={`${MUTED} text-sm`}>{INVESTOR.evidence.notesOffer}</p>
        </div>
      </section>

      {/*
        Section 6: principles and commitments. The not-medical statement is the last text line and
        the crisis link follows it, keeping the safety page reachable (profile invariant).
      */}
      <section id="principles" className={SECTION}>
        <h2 className={H2}>{INVESTOR.principles.heading}</h2>
        <div className="grid gap-8 md:grid-cols-2 md:items-start md:gap-12">
          <ul className={`${LIST} md:pt-6 lg:pt-8`}>
            {INVESTOR.principles.principles.map((principle) => (
              <li key={principle} className={BULLET}>
                {principle}
              </li>
            ))}
          </ul>
          <div className={`${CARD} flex flex-col gap-4`}>
            <h3 className={H3}>{INVESTOR.principles.commitmentsHeading}</h3>
            <ul className={LIST}>
              {INVESTOR.principles.commitments.map((commitment) => (
                <li key={commitment} className={BULLET}>
                  {commitment}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5 md:flex-row md:items-center md:justify-between md:gap-8">
          <p className="text-base font-semibold text-gray-900 dark:text-white 2xl:text-lg">
            {INVESTOR.principles.notMedical}
          </p>
          <Link
            href="/safety"
            className={`shrink-0 text-sm font-medium text-red-600 underline underline-offset-2 dark:text-red-400 ${FOCUS_RING}`}
          >
            {INVESTOR.safetyAndLegal.crisisLinkLabel}
          </Link>
        </div>
      </section>

      <StatusSection />
      <TeamSection />
      <AskSection />
      <RolesSection />
      <ContactSection />
    </div>
  );
}
