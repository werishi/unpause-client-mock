"use client";

/**
 * OnboardingReasonsPage — first step of the three-step onboarding flow.
 *
 * Renders every intake reason as a selectable row. The user taps rows to toggle
 * selection; any number may be chosen. When at least one selected reason carries
 * `supportPointer: true`, a neutral professional-help nudge is shown below the
 * list (ONBOARDING.supportPointer — not a crisis line; the shell header covers
 * crisis separately via the safety plan link).
 *
 * Next: persists the selection via setReasons (which also derives templateIds
 *   in the store) then navigates to /onboarding/values.
 * Skip: navigates to /onboarding/values without calling setReasons, leaving
 *   reasonIds as [] so the start screen falls back to tpl-starter.
 *
 * Prerequisite: UserDataProvider must be mounted above this page (root layout).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUserData } from "@/lib/store/user-store";
import { ONBOARDING } from "@/lib/copy";
import { getReasons } from "@/lib/repo/reason-repo";
import FlowCloseButton from "@/components/FlowCloseButton";

// ─── Progress dots ────────────────────────────────────────────────────────────

/**
 * Renders `total` progress indicator dots, with the dot at index `current`
 * shown filled and the rest hollow. Kept file-local: the same pattern appears
 * in the values and start pages; extraction to a shared component is deferred
 * to the docs part (Part 5) to avoid a coupling the orchestrator has not yet
 * approved.
 */
function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-2 justify-center" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={
            i === current
              ? "w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400"
              : "w-2.5 h-2.5 rounded-full border-2 border-gray-400 dark:border-gray-500"
          }
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingReasonsPage() {
  const { setReasons } = useUserData();
  const router = useRouter();
  // getReasons() reads from a static JSON import — synchronous, no loading state needed.
  const allReasons = getReasons();
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string): void {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  }

  const showSupportPointer = allReasons
    .filter((r) => selected.includes(r.id))
    .some((r) => r.supportPointer);

  function handleNext(): void {
    setReasons(selected);
    router.push("/onboarding/values");
  }

  function handleSkip(): void {
    // Leaves reasonIds as [] in the store so the start screen falls back to
    // tpl-starter rather than a user-selected template.
    router.push("/onboarding/values");
  }

  return (
    <main className="flex flex-col min-h-screen px-4 py-6">
      <div className="flex justify-end">
        <FlowCloseButton />
      </div>

      <h1 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        {ONBOARDING.reasonsHeading}
      </h1>

      <ul role="list" className="mt-6 flex flex-col gap-3">
        {allReasons.map((r) => {
          const isSelected = selected.includes(r.id);
          return (
            <li
              key={r.id}
              role="button"
              aria-pressed={isSelected}
              onClick={() => toggle(r.id)}
              className={[
                "cursor-pointer rounded-xl border-2 px-4 py-3 transition-colors",
                isSelected
                  ? "border-indigo-600 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950"
                  : "border-gray-200 bg-white hover:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-500",
              ].join(" ")}
            >
              <span className="block font-semibold text-gray-900 dark:text-gray-100">
                {r.label}
              </span>
              <span className="block text-sm text-gray-500 dark:text-gray-400">
                {r.helper}
              </span>
            </li>
          );
        })}
      </ul>

      {showSupportPointer && (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          {ONBOARDING.supportPointer}
        </p>
      )}

      <div className="mt-8">
        <ProgressDots total={3} current={0} />
      </div>

      <div className="mt-auto pt-8 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleNext}
          className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          {ONBOARDING.nextLabel}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          className="text-sm text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {ONBOARDING.skipLabel}
        </button>
      </div>
    </main>
  );
}
