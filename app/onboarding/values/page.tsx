"use client";

/**
 * OnboardingValuesPage — second step of the three-step onboarding flow.
 *
 * Renders every value as a selectable chip. The hard cap of three chips is
 * enforced with a silent no-op: a fourth tap does nothing and the hint
 * ONBOARDING.valuesHint becomes visible, giving feedback without an error
 * (G10: no mechanism statement, no penalty framing).
 *
 * Next: persists the selection via setValues then navigates to /onboarding/start.
 * Skip: navigates to /onboarding/start without calling setValues, leaving
 *   valueIds as its existing default ([] on a fresh session) — the data layer
 *   tolerates an empty values list.
 *
 * Prerequisite: UserDataProvider must be mounted above this page (root layout).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUserData } from "@/lib/store/user-store";
import { ONBOARDING } from "@/lib/copy";
import { getValues } from "@/lib/repo/value-repo";
import FlowCloseButton from "@/components/FlowCloseButton";

// ─── Progress dots ────────────────────────────────────────────────────────────

/**
 * Renders `total` progress indicator dots, with the dot at index `current`
 * shown filled and the rest hollow. Kept file-local: the same pattern appears
 * in the reasons and start pages; extraction to a shared component is deferred
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

export default function OnboardingValuesPage() {
  const { setValues } = useUserData();
  const router = useRouter();
  // getValues() reads from a static JSON import — synchronous, no loading state needed.
  const allValues = getValues();
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string): void {
    if (selected.includes(id)) {
      setSelected((s) => s.filter((x) => x !== id));
    } else {
      // Silent no-op when three values are already chosen — the hint below the
      // chips gives the user feedback without a disruptive error message (G10).
      if (selected.length >= 3) return;
      setSelected((s) => [...s, id]);
    }
  }

  function handleNext(): void {
    setValues(selected);
    router.push("/onboarding/start");
  }

  function handleSkip(): void {
    // Leaves valueIds unchanged ([] on a fresh session) — no penalty for skipping.
    router.push("/onboarding/start");
  }

  return (
    <main className="flex flex-col min-h-screen px-4 py-6">
      <div className="flex justify-end">
        <FlowCloseButton />
      </div>

      <h1 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        {ONBOARDING.valuesHeading}
      </h1>

      <div className="mt-6 flex flex-wrap gap-2">
        {allValues.map((v) => {
          const isSelected = selected.includes(v.id);
          return (
            <button
              key={v.id}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => toggle(v.id)}
              className={[
                "cursor-pointer rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors",
                isSelected
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950 dark:text-indigo-300"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-500",
              ].join(" ")}
            >
              {v.emoji} {v.label}
            </button>
          );
        })}
      </div>

      {selected.length >= 3 && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {ONBOARDING.valuesHint}
        </p>
      )}

      <div className="mt-8">
        <ProgressDots total={3} current={1} />
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
