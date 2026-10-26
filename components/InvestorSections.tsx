import Link from "next/link";
import { INVESTOR } from "@/lib/copy";

/**
 * Investor page, sections 7 to 12, plus the class constants and the placeholder box shared with
 * `app/page.tsx`. Split out of the page only because the page alone would pass ~400 lines.
 * Server components throughout: no hooks, no state. Every visible string is an `INVESTOR.*` read
 * written out in full, because the copy test finds each key by that exact source text.
 */

/** Copied verbatim from `components/LoginPicker.tsx`, so focus looks the same across pages. */
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:focus-visible:ring-indigo-400 dark:focus-visible:ring-offset-gray-900";

/** Copied verbatim from `components/LoginPicker.tsx`. */
export const MUTED = "text-gray-500 dark:text-gray-400";

export const H2 = "text-xl font-semibold";
export const H3 = "text-base font-semibold";
export const BODY = "text-sm leading-relaxed";
export const LIST = "flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed";
export const CARD =
  "rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900";

/** `FOOTER_LINK` from `app/login/page.tsx`; `FOCUS_RING` is appended at each use site. */
export const LINK = "text-sm text-gray-500 underline underline-offset-2 dark:text-gray-400";

/**
 * The current roadmap step's card. Written without `CARD`'s `bg-white` so the literal carries a
 * single light background and the dark-mode guard sees one matching `dark:bg-` partner.
 */
const CARD_CURRENT =
  "rounded-xl border border-indigo-600 bg-indigo-50 p-4 dark:border-indigo-400 dark:bg-indigo-950";

/**
 * Visible box around any value the author has not supplied yet (names, shares, dates, the contact
 * address). The amber frame and the label are mandatory: a placeholder must never read as real
 * content, which matters most on an investor page.
 */
export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block max-w-full break-words rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
      <span className="block font-semibold uppercase tracking-wide">{INVESTOR.placeholderLabel}</span>
      {children}
    </span>
  );
}

/**
 * Section 7: the roadmap. The highlighted step is `INVESTOR.status.currentStep` (1-based), read
 * from the copy so moving the project forward is a one-value change there. Steps 3 to 5 carry a
 * placeholder date from `roadmapDates`, which holds one entry per step from index 2 onward.
 */
export function StatusSection() {
  return (
    <section id="status" className="flex flex-col gap-3">
      <h2 className={H2}>{INVESTOR.status.heading}</h2>
      <ol className="flex flex-col gap-3">
        {INVESTOR.status.steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCurrent = stepNumber === INVESTOR.status.currentStep;
          const isDone = stepNumber < INVESTOR.status.currentStep;
          return (
            <li
              key={step.title}
              className={isCurrent ? CARD_CURRENT : CARD}
              aria-current={isCurrent ? "step" : undefined}
            >
              <div className="flex flex-col gap-2">
                <p className={`${H3} flex gap-2`}>
                  <span className={MUTED}>{stepNumber}</span>
                  <span>{step.title}</span>
                </p>
                <p className={BODY}>{step.body}</p>
                <div>
                  {isDone ? (
                    <span className={`text-xs font-semibold ${MUTED}`}>
                      {INVESTOR.status.doneLabel}
                    </span>
                  ) : isCurrent ? (
                    <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                      {INVESTOR.status.nowLabel}
                    </span>
                  ) : index >= 2 ? (
                    <Placeholder>{INVESTOR.placeholders.roadmapDates[index - 2]}</Placeholder>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * Section 8: the founder. Name and bio stay placeholders: `lib/copy.ts` records that no personal
 * data of the operator may appear in this repo. The avatar is a CSS circle, not an image.
 */
export function TeamSection() {
  return (
    <section id="team" className="flex flex-col gap-3">
      <h2 className={H2}>{INVESTOR.team.heading}</h2>
      <div className={`${CARD} flex flex-row gap-4`}>
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
        >
          {INVESTOR.team.avatarInitials}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Placeholder>{INVESTOR.placeholders.founderName}</Placeholder>
          <p className={H3}>{INVESTOR.team.role}</p>
          <Placeholder>{INVESTOR.placeholders.founderBio}</Placeholder>
          <p className={`${BODY} ${MUTED}`}>{INVESTOR.team.soloLine}</p>
        </div>
      </div>
    </section>
  );
}

/** Share placeholders in the fixed row order of `INVESTOR.ask.rows`. */
const FUNDS_SHARES = [
  INVESTOR.placeholders.fundsShareDevelopment,
  INVESTOR.placeholders.fundsShareClinical,
  INVESTOR.placeholders.fundsSharePilot,
  INVESTOR.placeholders.fundsShareOperations,
] as const;

/**
 * Section 9: the ask. `table-fixed` plus `break-words` keeps the long placeholder texts inside
 * 360 px; an auto-layout table would widen the page and break the Responsive invariant.
 */
export function AskSection() {
  return (
    <section id="ask" className="flex flex-col gap-3">
      <h2 className={H2}>{INVESTOR.ask.heading}</h2>
      <p className="text-lg font-semibold">{INVESTOR.ask.amountLine}</p>
      <p className={BODY}>{INVESTOR.ask.intro}</p>
      <table className="w-full table-fixed text-left text-sm">
        <thead>
          <tr>
            <th scope="col" className="w-3/5 py-2 font-semibold">
              {INVESTOR.ask.useColumn}
            </th>
            <th scope="col" className="py-2 font-semibold">
              {INVESTOR.ask.shareColumn}
            </th>
          </tr>
        </thead>
        <tbody>
          {INVESTOR.ask.rows.map((row, index) => (
            <tr key={row.label} className="border-t border-gray-200 dark:border-gray-700">
              <td className="break-words py-2 pr-3 align-top">
                <span className="block font-semibold">{row.label}</span>
                <span className="block leading-relaxed">{row.purpose}</span>
              </td>
              <td className="break-words py-2 align-top">
                <Placeholder>{FUNDS_SHARES[index]}</Placeholder>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-col gap-2">
        <p className={H3}>{INVESTOR.ask.runwayLabel}</p>
        <div>
          <Placeholder>{INVESTOR.placeholders.runwayMonths}</Placeholder>
        </div>
      </div>
    </section>
  );
}

/** Section 10: the roles the project is looking for. Single column at every width. */
export function RolesSection() {
  return (
    <section id="roles" className="flex flex-col gap-3">
      <h2 className={H2}>{INVESTOR.roles.heading}</h2>
      <div className="flex flex-col gap-3">
        {INVESTOR.roles.cards.map((card) => (
          <div key={card.title} className={CARD}>
            <p className={H3}>{card.title}</p>
            <p className={`${BODY} mt-1`}>{card.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Section 11: contact. A mailto link to the reserved-domain placeholder address is the only
 * contact mechanism; the Architecture invariant forbids a form or any network call.
 */
export function ContactSection() {
  return (
    <section id="contact" className="flex flex-col gap-3">
      <h2 className={H2}>{INVESTOR.contact.heading}</h2>
      <p className={BODY}>{INVESTOR.contact.body}</p>
      <div>
        <a
          href={`mailto:${INVESTOR.placeholders.contactEmail}`}
          className={`inline-block max-w-full rounded-lg underline underline-offset-2 ${FOCUS_RING}`}
        >
          <Placeholder>{INVESTOR.placeholders.contactEmail}</Placeholder>
        </a>
      </div>
    </section>
  );
}

/**
 * Section 12: disclaimer, crisis note and legal links. The investor page is a bare route with
 * neither the shell footer nor the header's safety link, so both have to live here. The crisis
 * wording is a reference into the shared copy, never retyped.
 */
export function InvestorFooter() {
  return (
    <footer className="flex flex-col gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
      <p className={BODY}>{INVESTOR.safetyAndLegal.disclaimer}</p>
      <p className={BODY}>{INVESTOR.safetyAndLegal.crisisNote}</p>
      <div className="flex flex-wrap gap-4">
        <Link href="/safety" className={`${LINK} ${FOCUS_RING}`}>
          {INVESTOR.safetyAndLegal.safetyLinkLabel}
        </Link>
        <Link href="/privacy" className={`${LINK} ${FOCUS_RING}`}>
          {INVESTOR.safetyAndLegal.privacyLinkLabel}
        </Link>
        <Link href="/imprint" className={`${LINK} ${FOCUS_RING}`}>
          {INVESTOR.safetyAndLegal.imprintLinkLabel}
        </Link>
      </div>
    </footer>
  );
}
