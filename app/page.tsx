import Link from "next/link";
import type { Metadata } from "next";
import { INVESTOR } from "@/lib/copy";
import {
  AskSection,
  BODY,
  CARD,
  ContactSection,
  FOCUS_RING,
  H2,
  H3,
  InvestorFooter,
  LIST,
  MUTED,
  Placeholder,
  RolesSection,
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
 */
export default function InvestorPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-6 lg:py-12">
      {/*
        Hero. The order is fixed so that the button row ends above 640 px at a 360 px wide
        viewport (G1 mitigation): no min-h-screen, no image, no padding beyond the root's py-6,
        and the mockup notice sits after the buttons rather than before them.
      */}
      <section id="top" className="flex flex-col gap-4">
        <div className="flex justify-end">
          <Link
            href="/safety"
            className={`text-sm font-medium text-red-600 underline underline-offset-2 dark:text-red-400 ${FOCUS_RING}`}
          >
            {INVESTOR.safetyAndLegal.safetyLinkLabel}
          </Link>
        </div>
        <h1 className="text-3xl font-semibold">{INVESTOR.hero.name}</h1>
        <p className="text-lg">{INVESTOR.hero.tagline}</p>
        <p className={BODY}>{INVESTOR.hero.summary}</p>
        <p className={`${MUTED} text-sm font-medium`}>{INVESTOR.hero.status}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className={`inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 sm:w-auto ${FOCUS_RING}`}
          >
            {INVESTOR.hero.tryDemoLabel}
          </Link>
          <a
            href={`mailto:${INVESTOR.placeholders.contactEmail}`}
            className={`inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 sm:w-auto ${FOCUS_RING}`}
          >
            {INVESTOR.hero.contactLabel}
          </a>
        </div>
        <p className={`${MUTED} text-sm`}>{INVESTOR.hero.mockupNotice}</p>
      </section>

      {/* Section 2: the problem, with the three unsupplied figures as visible placeholders. */}
      <section id="problem" className="flex flex-col gap-3">
        <h2 className={H2}>{INVESTOR.problem.heading}</h2>
        <p className={BODY}>{INVESTOR.problem.intro}</p>
        <p className={BODY}>{INVESTOR.problem.lonelinessLine}</p>
        <p className={BODY}>{INVESTOR.problem.retentionLine}</p>
        <div className="flex flex-col items-start gap-2">
          <Placeholder>{INVESTOR.placeholders.prevalence}</Placeholder>
          <Placeholder>{INVESTOR.placeholders.careGap}</Placeholder>
          <Placeholder>{INVESTOR.placeholders.marketSize}</Placeholder>
        </div>
      </section>

      {/* Section 3: project goals. List items are fixed copy, so the text itself is a stable key. */}
      <section id="goals" className="flex flex-col gap-3">
        <h2 className={H2}>{INVESTOR.goals.heading}</h2>
        <ul className={LIST}>
          {INVESTOR.goals.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className={`${BODY} font-medium`}>{INVESTOR.goals.centreLine}</p>
      </section>

      {/* Section 4: the six core ideas; two columns from lg only, one column on phones. */}
      <section id="solution" className="flex flex-col gap-3">
        <h2 className={H2}>{INVESTOR.solution.heading}</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {INVESTOR.solution.cards.map((card) => (
            <div key={card.title} className={CARD}>
              <p className="text-sm font-semibold">{card.title}</p>
              <p className={BODY}>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/*
        Section 5: the evidence. The caveat card follows the claims list directly, with nothing in
        between, because it limits exactly those claims.
      */}
      <section id="evidence" className="flex flex-col gap-3">
        <h2 className={H2}>{INVESTOR.evidence.heading}</h2>
        <ul className={LIST}>
          {INVESTOR.evidence.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <div className={CARD}>
          <h3 className={H3}>{INVESTOR.evidence.caveatHeading}</h3>
          <p className={BODY}>{INVESTOR.evidence.caveat}</p>
        </div>
        <p className={`${MUTED} text-sm`}>{INVESTOR.evidence.notesOffer}</p>
      </section>

      {/*
        Section 6: principles and commitments. The not-medical statement is the last text line and
        the crisis link follows it, keeping the safety page reachable (profile invariant).
      */}
      <section id="principles" className="flex flex-col gap-3">
        <h2 className={H2}>{INVESTOR.principles.heading}</h2>
        <ul className={LIST}>
          {INVESTOR.principles.principles.map((principle) => (
            <li key={principle}>{principle}</li>
          ))}
        </ul>
        <h3 className={H3}>{INVESTOR.principles.commitmentsHeading}</h3>
        <ul className={LIST}>
          {INVESTOR.principles.commitments.map((commitment) => (
            <li key={commitment}>{commitment}</li>
          ))}
        </ul>
        <p className={`${BODY} font-semibold`}>{INVESTOR.principles.notMedical}</p>
        <div>
          <Link
            href="/safety"
            className={`text-sm font-medium text-red-600 underline underline-offset-2 dark:text-red-400 ${FOCUS_RING}`}
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
      <InvestorFooter />
    </div>
  );
}
