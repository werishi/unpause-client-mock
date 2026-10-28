import { INVESTOR } from "@/lib/copy";

/**
 * Investor page, sections 7 to 11, plus the class constants and the placeholder box shared with
 * `app/page.tsx`. Split out of the page only because the page alone would pass ~400 lines.
 * Server components throughout: no hooks, no state. Every visible string is an `INVESTOR.*` read
 * written out in full, because the copy test finds each key by that exact source text.
 *
 * Layout model (2026-10-26 redesign): every section is full width, so a band background reaches
 * both edges of the viewport, and `PAD_X` centres a 72 rem (84 rem from 2xl) content column inside
 * it through padding alone. That keeps one DOM with no inner wrapper per section, and long text is
 * held to a readable measure by its own `max-w-*` rather than by the column.
 */

/** Copied verbatim from `components/LoginPicker.tsx`, so focus looks the same across pages. */
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:focus-visible:ring-indigo-400 dark:focus-visible:ring-offset-gray-900";

/** Copied verbatim from `components/LoginPicker.tsx`. */
export const MUTED = "text-gray-500 dark:text-gray-400";

/**
 * Horizontal padding that centres the content column inside a full-width section: the gutter is
 * `max(2rem, (100% - 72rem) / 2)`, and `100%` is the page width because percentage padding
 * resolves against the containing block. Never add a second `px-*` beside it.
 */
export const PAD_X =
  "px-4 md:px-[max(2rem,calc((100%_-_72rem)/2))] 2xl:px-[max(2rem,calc((100%_-_84rem)/2))]";

/** One page section: centred column, vertical rhythm, and the gap between its header and body. */
export const SECTION = `${PAD_X} flex flex-col gap-8 py-16 md:gap-12 md:py-20 lg:py-24`;

/** Tinted full-width band for alternate sections; cards stay legible on it in both themes. */
export const BAND =
  "border-y border-gray-100 bg-gray-50 dark:border-white/5 dark:bg-gray-900/60";

export const H2 =
  "text-balance text-2xl font-semibold tracking-tight text-gray-900 dark:text-white md:text-3xl lg:text-4xl 2xl:text-5xl";
export const H3 = "text-lg font-semibold tracking-tight text-gray-900 dark:text-white 2xl:text-xl";
export const BODY = "text-pretty text-base leading-relaxed text-gray-600 dark:text-gray-300 2xl:text-lg";
/** Opening paragraph of a section, one step above `BODY`. */
export const LEAD =
  "text-pretty text-lg leading-relaxed text-gray-700 dark:text-gray-200 md:text-xl 2xl:text-2xl";
export const LIST = "flex flex-col gap-3";
/** List item with an indigo dot centred on the first line (26 px line, 6 px dot). */
export const BULLET =
  "relative max-w-prose pl-6 text-base leading-relaxed text-gray-600 before:absolute before:left-0 before:top-[0.625em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-indigo-500 dark:text-gray-300 dark:before:bg-indigo-400 2xl:text-lg";
/** Indigo stat line: a body paragraph behind a left rule. */
export const RULED = `${BODY} max-w-prose border-l-2 border-indigo-500 pl-5 dark:border-indigo-400`;
export const CARD =
  "rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none lg:p-8";
/** Lift on hover for the card grids; no motion when the visitor asks for reduced motion. */
export const CARD_HOVER =
  "transition duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:hover:border-indigo-400/40";
/** Short decorative bar at the top of a card; carries no text. */
export const ACCENT = "block h-1 w-10 rounded-full bg-indigo-500 dark:bg-indigo-400";

/**
 * The current roadmap step's card. Written without `CARD`'s `bg-white` so the literal carries a
 * single light background and the dark-mode guard sees one matching `dark:bg-` partner.
 */
const CARD_CURRENT =
  "rounded-2xl border border-indigo-500 bg-indigo-50 p-6 shadow-sm ring-4 ring-indigo-500/10 dark:border-indigo-400/60 dark:bg-indigo-950/60 dark:ring-indigo-400/10 lg:p-8";

const STEP_NUMBER =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-300 text-sm font-semibold text-gray-500 dark:border-white/15 dark:text-gray-400";
const STEP_NUMBER_CURRENT =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white dark:bg-indigo-600";

/**
 * Visible box around any value the author has not supplied yet (names, shares, dates, the contact
 * address). The amber frame, the dashed edge and the label are mandatory: a placeholder must never
 * read as real content, which matters most on an investor page.
 */
export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block max-w-full break-words rounded-lg border border-dashed border-amber-400 bg-amber-50 px-2.5 py-2 text-left sm:px-3 text-xs leading-relaxed text-amber-900 dark:border-amber-600/70 dark:bg-amber-950/60 dark:text-amber-200">
      <span className="mb-0.5 block font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
        {INVESTOR.placeholderLabel}
      </span>
      {children}
    </span>
  );
}

/**
 * Section 7: the roadmap. The highlighted step is `INVESTOR.status.currentStep` (1-based), read
 * from the copy so moving the project forward is a one-value change there. Steps 3 to 5 carry a
 * placeholder date from `roadmapDates`, which holds one entry per step from index 2 onward.
 *
 * Every width shows the five steps as full-width rows: title | body from md, title | body | status
 * from lg. The five-card row this replaced squeezed the DiGA step into a 134 px column (12 lines)
 * at 1024 px; a row keeps the body near 450 px there and never becomes a narrow lone column.
 */
export function StatusSection() {
  return (
    <section id="status" className={`${SECTION} ${BAND}`}>
      <h2 className={H2}>{INVESTOR.status.heading}</h2>
      <ol className="flex flex-col gap-4">
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
              <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] md:gap-x-8 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,13rem)] lg:items-start">
                <p className={`${H3} flex items-center gap-3`}>
                  <span className={isCurrent ? STEP_NUMBER_CURRENT : STEP_NUMBER}>
                    {stepNumber}
                  </span>
                  <span>{step.title}</span>
                </p>
                <p className={`${BODY} max-w-prose md:pt-0.5`}>{step.body}</p>
                <div className="md:pl-11 lg:justify-self-end lg:pl-0">
                  {isDone ? (
                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-white/10 dark:text-gray-300">
                      {INVESTOR.status.doneLabel}
                    </span>
                  ) : isCurrent ? (
                    <span className="inline-flex rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white dark:bg-indigo-600">
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
    <section id="team" className={SECTION}>
      <h2 className={H2}>{INVESTOR.team.heading}</h2>
      <div className={`${CARD} flex flex-col gap-5 sm:flex-row sm:gap-6 md:max-w-3xl`}>
        <div
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xl font-semibold text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
        >
          {INVESTOR.team.avatarInitials}
        </div>
        <div className="flex min-w-0 flex-col items-start gap-3">
          <Placeholder>{INVESTOR.placeholders.founderName}</Placeholder>
          <p className={H3}>{INVESTOR.team.role}</p>
          <Placeholder>{INVESTOR.placeholders.founderBio}</Placeholder>
          <p className={`text-sm ${MUTED}`}>{INVESTOR.team.soloLine}</p>
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
 * 360 px; an auto-layout table would widen the page and break the Responsive invariant. The
 * `minmax(0, …)` tracks keep an unbreakable placeholder from widening a column.
 */
export function AskSection() {
  return (
    <section
      id="ask"
      className={`${SECTION} ${BAND} lg:grid lg:grid-cols-2 lg:gap-x-10 xl:gap-x-12`}
    >
      <h2 className={`${H2} lg:col-span-2`}>{INVESTOR.ask.heading}</h2>
      <div className="flex flex-col justify-between gap-8 rounded-2xl bg-[radial-gradient(32rem_22rem_at_0%_0%,color-mix(in_oklab,var(--color-white)_16%,transparent),transparent),linear-gradient(135deg,var(--color-indigo-600),var(--color-indigo-800))] p-6 text-white shadow-lg shadow-indigo-600/20 dark:bg-[radial-gradient(32rem_22rem_at_0%_0%,color-mix(in_oklab,var(--color-white)_12%,transparent),transparent),linear-gradient(135deg,var(--color-indigo-600),var(--color-indigo-950))] dark:shadow-none sm:p-8 lg:p-10">
        <p className="text-4xl font-semibold tracking-tight md:text-5xl lg:text-4xl xl:text-5xl">
          {INVESTOR.ask.amountLine}
        </p>
        <p className="text-lg leading-relaxed text-indigo-100 md:text-xl">{INVESTOR.ask.intro}</p>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-2 pt-5 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:px-6 sm:pt-6 lg:px-8 lg:pt-7">
        <table className="w-full table-fixed text-left">
          <thead>
            <tr>
              <th
                scope="col"
                className={`w-[55%] pb-3 text-xs font-semibold uppercase tracking-wider sm:w-3/5 ${MUTED}`}
              >
                {INVESTOR.ask.useColumn}
              </th>
              <th scope="col" className={`pb-3 text-xs font-semibold uppercase tracking-wider ${MUTED}`}>
                {INVESTOR.ask.shareColumn}
              </th>
            </tr>
          </thead>
          <tbody>
            {INVESTOR.ask.rows.map((row, index) => (
              <tr key={row.label} className="border-t border-gray-200 dark:border-white/10">
                <td className="break-words py-4 pr-4 align-top">
                  <span className="block font-semibold text-gray-900 dark:text-white">{row.label}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {row.purpose}
                  </span>
                </td>
                <td className="break-words py-4 align-top">
                  <Placeholder>{FUNDS_SHARES[index]}</Placeholder>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6 lg:col-start-2">
        <p className={H3}>{INVESTOR.ask.runwayLabel}</p>
        <Placeholder>{INVESTOR.placeholders.runwayMonths}</Placeholder>
      </div>
    </section>
  );
}

/** Section 10: the roles the project is looking for. One column on a phone, three from tablet width up. */
export function RolesSection() {
  return (
    <section id="roles" className={SECTION}>
      <h2 className={H2}>{INVESTOR.roles.heading}</h2>
      <div className="grid gap-4 md:grid-cols-3 md:gap-6">
        {INVESTOR.roles.cards.map((card) => (
          <div key={card.title} className={`${CARD} ${CARD_HOVER} flex flex-col gap-3`}>
            <span aria-hidden="true" className={ACCENT} />
            <p className={H3}>{card.title}</p>
            <p className={BODY}>{card.body}</p>
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
    <section
      id="contact"
      className={`${SECTION} border-y border-indigo-100 bg-indigo-50 dark:border-indigo-400/10 dark:bg-indigo-950/40`}
    >
      <div className="flex flex-col gap-4 md:items-center md:text-center">
        <h2 className={H2}>{INVESTOR.contact.heading}</h2>
        <p className={`${LEAD} max-w-2xl`}>{INVESTOR.contact.body}</p>
      </div>
      <div className="md:text-center">
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
