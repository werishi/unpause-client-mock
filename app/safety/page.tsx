"use client";

/**
 * SafetyPage — the Stanley-Brown six-step safety plan, always reachable from
 * the header SafetyPlanLink regardless of flow state.
 *
 * Not gated: any gate here contradicts G9 (one tap from every screen) and the
 * spec rule in concept Section 2.4 ("no points, gates, or energy check-in in
 * front of the safety plan"). No flow state is read or written on this page.
 *
 * No phone numbers or tel:/mailto: links anywhere. Every contact entry in the
 * seed data is a plain-text placeholder (profile Safety plan invariant: a wrong
 * crisis number in a demo is worse than none). Placeholder entries are detected
 * by the "(placeholder)" marker in their text and receive a visible badge.
 *
 * Two sections:
 *   Crisis block — getSafetyPlan()[0] (warning signs) and the last two steps
 *     (professional contacts + making environment safer): quick-glance view of
 *     the most actionable steps in a crisis.
 *   Full plan — all six steps in Stanley-Brown array order.
 *
 * SAFETY_PAGE.disclaimerLine appears prominently before both sections, not
 * buried in a footer (concept Section 2.4, spec 06-safety-plan.md:62).
 */

import { useRouter } from "next/navigation";
import { getSafetyPlan } from "@/lib/repo/safety-plan-repo";
import type { SafetyPlanStep } from "@/lib/repo/safety-plan-repo";
import { SAFETY_PAGE } from "@/lib/copy";

/** Returns true if the entry text carries the "(placeholder)" marker from seed data. */
function isPlaceholder(entry: string): boolean {
  return entry.toLowerCase().includes("(placeholder)");
}

/**
 * Renders one Stanley-Brown step: title, prompt, and entries list.
 * Entries containing "(placeholder)" receive a badge (SAFETY_PAGE.placeholderBadge).
 * No tel:/mailto: links are rendered — entries are plain text only.
 */
function PlanStepSection({ step }: { step: SafetyPlanStep }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        {step.title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{step.prompt}</p>
      <ul className="flex flex-col gap-1">
        {step.entries.map((entry) => (
          <li key={entry} className="flex items-start gap-2 text-sm">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-gray-400">
              •
            </span>
            <span className="text-gray-800 dark:text-gray-200">
              {entry}
              {isPlaceholder(entry) && (
                <span className="ml-2 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  {SAFETY_PAGE.placeholderBadge}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SafetyPage() {
  const router = useRouter();
  const plan = getSafetyPlan();

  // Crisis block: warning signs (index 0) + professional contacts (index 4) +
  // making environment safer (index 5). These are the most immediately actionable
  // steps when a user is in distress and needs quick visual access.
  const crisisSteps = [plan[0], plan[4], plan[5]];

  return (
    <main className="flex flex-col gap-8 py-8">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
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

      {/* Placeholder notice for all contact sections */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {SAFETY_PAGE.placeholderNotice}
      </p>

      {/* Crisis-first block: quick-glance view for the most urgent steps */}
      <section
        aria-label="Quick reference"
        className="flex flex-col gap-6 rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950"
      >
        {crisisSteps.map((step) => (
          <PlanStepSection key={step.title} step={step} />
        ))}
      </section>

      {/* Full six-step Stanley-Brown plan in fixed array order */}
      <section aria-label="Full safety plan" className="flex flex-col gap-6">
        {plan.map((step) => (
          <PlanStepSection key={step.title} step={step} />
        ))}
      </section>
    </main>
  );
}
