"use client";

/**
 * SafetyPage — the Stanley-Brown six-step safety plan, always reachable from
 * the header SafetyPlanLink regardless of flow state. Read-only: the user
 * edits their plan at /safety/edit, never here.
 *
 * Not gated: any gate here contradicts G9 (one tap from every screen) and the
 * spec rule in concept Section 2.4 ("no points, gates, or energy check-in in
 * front of the safety plan"). No flow state is read or written on this page.
 * From the store it reads `safetyEntries` and `hydrated` and nothing else, and
 * it never returns null before hydration — unlike Today and Swap, which do.
 * The page is ungated only as long as no global route guard exists
 * (app/layout.tsx has none; the only redirect is app/page.tsx), so adding a
 * redirect effect or an early return here would break G9.
 *
 * First frame: titles, prompts, intro, disclaimer and the edit link render
 * from the seed while `hydrated` is false, but no entry lines. Showing the
 * seed entries first and swapping to the user's a frame later was refused: a
 * crisis plan whose contacts change under the reader's eyes is worse than one
 * frame with headings only.
 *
 * Entries come from mergeSafetyPlan (lib/domain/safety-plan): all seed entries
 * while the user has written nothing, otherwise only the user's own entries,
 * with `source: "empty"` for steps they left blank. The stored blob is
 * normalised first because hydrate() validates only JSON syntax.
 *
 * No phone numbers or tel:/mailto: links anywhere; entries are plain text.
 * Seed contact entries are placeholders (profile Safety plan invariant: a wrong
 * crisis number in a demo is worse than none). A seed entry carrying the
 * "(placeholder)" marker receives a visible badge; a user's own entry never
 * does, because the badge tells the reader a line is demo text.
 *
 * Two sections:
 *   Crisis block — steps [0, 4, 5] (warning signs, professional contacts,
 *     making environment safer): quick-glance view of the most actionable
 *     steps in a crisis. Relies on mergeSafetyPlan returning six steps in seed
 *     order. Contains no path into a form (parent concept section 3.5).
 *   Full plan — all six steps in Stanley-Brown array order, followed by the
 *     quiet "edit my plan" link.
 *
 * SAFETY_PAGE.disclaimerLine appears prominently before both sections, not
 * buried in a footer (concept Section 2.4, spec 06-safety-plan.md:62).
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSafetyPlan } from "@/lib/repo/safety-plan-repo";
import { useUserData } from "@/lib/store/user-store";
import {
  hasSafetyContent,
  mergeSafetyPlan,
  normaliseSafetyEntries,
} from "@/lib/domain/safety-plan";
import type { ResolvedSafetyStep } from "@/lib/domain/safety-plan";
import { SAFETY_PAGE } from "@/lib/copy";

/** Step indices shown in the crisis block, in display order. */
const CRISIS_STEP_INDICES = [0, 4, 5];

/** Returns true if the entry text carries the "(placeholder)" marker from seed data. */
function isPlaceholder(entry: string): boolean {
  return entry.toLowerCase().includes("(placeholder)");
}

/**
 * Renders one Stanley-Brown step: title, prompt, and the resolved entries.
 *
 * `resolved` is null before the store has hydrated: title and prompt still
 * render (from the seed) but no entry list and no empty-step line, so nothing
 * on screen changes meaning once the user's entries arrive. A `"empty"` step
 * shows SAFETY_PAGE.emptyStepLine. The placeholder badge appears only on
 * `"seed"` steps. No tel:/mailto: links — entries are plain text only.
 */
function PlanStepSection({
  title,
  prompt,
  resolved,
}: {
  title: string;
  prompt: string;
  resolved: ResolvedSafetyStep | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{prompt}</p>
      {resolved !== null && resolved.source === "empty" && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {SAFETY_PAGE.emptyStepLine}
        </p>
      )}
      {resolved !== null && resolved.source !== "empty" && (
        <ul className="flex flex-col gap-1">
          {/* Index keys: the editor allows the same line twice in one step. */}
          {resolved.entries.map((entry, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span aria-hidden="true" className="mt-0.5 shrink-0 text-gray-500 dark:text-gray-400">
                •
              </span>
              <span className="min-w-0 break-words text-gray-800 dark:text-gray-200">
                {entry}
                {resolved.source === "seed" && isPlaceholder(entry) && (
                  <span className="ml-2 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    {SAFETY_PAGE.placeholderBadge}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SafetyPage() {
  const router = useRouter();
  const { hydrated, safetyEntries } = useUserData();

  const seed = getSafetyPlan();
  const entries = normaliseSafetyEntries(safetyEntries);
  const hasContent = hasSafetyContent(entries);
  const merged = hydrated ? mergeSafetyPlan(seed, entries) : null;

  /**
   * Back keeps router.back() so opening /safety from inside a flow returns the
   * user to the same flow step. A bookmark or fresh tab has no history to go
   * back to, so it falls back to Today. `window` is read only inside the click
   * handler, which keeps the static-export server render unaffected.
   */
  function handleBack() {
    if (window.history.length <= 1) {
      router.push("/today");
      return;
    }
    router.back();
  }

  return (
    <main className="flex flex-col gap-8 py-8">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleBack}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {SAFETY_PAGE.backLabel}
        </button>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {SAFETY_PAGE.heading}
        </h1>
      </div>

      <p className="text-gray-700 dark:text-gray-300">{SAFETY_PAGE.intro}</p>

      {/* Disclaimer — must appear prominently, not in a footer (concept Section 2.4) */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        {SAFETY_PAGE.disclaimerLine}
      </div>

      {/* Only once hydrated and only while seed lines are what is shown. */}
      {hydrated && !hasContent && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {SAFETY_PAGE.placeholderNotice}
        </p>
      )}

      {/* Crisis-first block: quick-glance view for the most urgent steps */}
      <section
        aria-label="Quick reference"
        className="flex flex-col gap-6 rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950"
      >
        {CRISIS_STEP_INDICES.map((i) => (
          <PlanStepSection
            key={seed[i].title}
            title={seed[i].title}
            prompt={seed[i].prompt}
            resolved={merged ? merged[i] : null}
          />
        ))}
      </section>

      {/* Full six-step Stanley-Brown plan in fixed array order */}
      <section aria-label="Full safety plan" className="flex flex-col gap-6">
        {seed.map((step, i) => (
          <PlanStepSection
            key={step.title}
            title={step.title}
            prompt={step.prompt}
            resolved={merged ? merged[i] : null}
          />
        ))}
      </section>

      {/* Quiet path to the editor — outside the crisis block by design. */}
      <Link
        href="/safety/edit"
        className="self-start text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        {SAFETY_PAGE.editLinkLabel}
      </Link>
    </main>
  );
}
