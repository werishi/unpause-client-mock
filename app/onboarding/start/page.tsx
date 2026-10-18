"use client";

/**
 * OnboardingStartPage — third step of the three-step onboarding flow.
 *
 * Renders the suggested template cards (derived from the user's selected
 * reasons) and a wake-time selector. All returned templates are pre-selected;
 * the user may deselect any but the last — the "at least one always selected"
 * invariant is a silent no-op (G10: same pattern as the values cap).
 *
 * Both Next and Skip call commit() before navigating to /onboarding/done.
 * Calling markPersonalised() on Skip is deliberate: the user has seen and
 * implicitly accepted the defaults; "skip" means "don't change the
 * pre-selection", not "leave me unpersonalised".
 *
 * Template fallback: when reasonIds is empty (user skipped the reasons screen),
 * candidateTemplates falls back to the starter template via getTemplates() from
 * template-repo — which is the authoritative list. If no "tpl-starter" id exists
 * in the data, the first template in the library is used instead so the screen
 * is never empty.
 *
 * Prerequisite: UserDataProvider must be mounted above this page (root layout).
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserData } from "@/lib/store/user-store";
import { ONBOARDING } from "@/lib/copy";
import { getTemplatesForReasons } from "@/lib/repo/reason-repo";
import { getTemplates } from "@/lib/repo/template-repo";
import FlowCloseButton from "@/components/FlowCloseButton";

// ─── Wake-time options ────────────────────────────────────────────────────────

/**
 * 05:00 to 12:00 in 30-minute steps (15 values).
 * Derived once at module load; the component reads this constant, never
 * re-derives it on every render.
 */
const WAKE_OPTIONS: string[] = [];
for (let h = 5; h <= 12; h++) {
  WAKE_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 12) WAKE_OPTIONS.push(`${String(h).padStart(2, "0")}:30`);
}
// Results in ["05:00","05:30","06:00",…,"12:00"] — 15 values

// ─── Progress dots ────────────────────────────────────────────────────────────

/**
 * Renders `total` progress indicator dots, with the dot at index `current`
 * shown filled and the rest hollow. Kept file-local: the same pattern appears
 * in the reasons and values pages; extraction to a shared component is deferred
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

export default function OnboardingStartPage() {
  const { reasonIds, wakeTime, setTemplates, setWakeTime, markPersonalised } =
    useUserData();
  const router = useRouter();

  /**
   * Derives the template list once on first render.
   *
   * When reasonIds is non-empty, uses the reason→template mapping from the join
   * table. When reasonIds is empty (user skipped the reasons screen),
   * getTemplatesForReasons returns [] so we fall back to the starter template
   * via getTemplates() — the authoritative library. The data layer guarantees
   * at least one template exists; the slice(0,1) guard is a belt-and-suspenders
   * fallback only.
   *
   * useMemo stabilises the reference so the derived selectedIds initialiser only
   * runs once. reasonIds is the only input that can change this — it is set via
   * setReasons on the previous screen and does not change during this page's
   * lifecycle.
   */
  const candidateTemplates = useMemo(() => {
    if (reasonIds.length > 0) {
      const tpls = getTemplatesForReasons(reasonIds);
      if (tpls.length > 0) return tpls;
    }
    // Fallback: find the starter template by id in the full template library.
    // Using getTemplates() (not getTemplatesForReasons) because "tpl-starter"
    // is a template id, not a reason id. If no starter id exists, take the
    // first template so the screen is never blank.
    const all = getTemplates();
    const starter = all.find((t) => t.id === "tpl-starter");
    return starter ? [starter] : all.slice(0, 1);
  }, [reasonIds]);

  const [selectedIds, setSelectedIds] = useState<string[]>(
    () => candidateTemplates.map((t) => t.id)
  );
  const [wake, setWake] = useState<string>(wakeTime);

  function toggle(id: string): void {
    setSelectedIds((s) => {
      if (!s.includes(id)) return [...s, id];
      // Silent no-op: at least one template must remain selected (G10).
      if (s.length <= 1) return s;
      return s.filter((x) => x !== id);
    });
  }

  function commit(): void {
    // Guard: never call setTemplates([]) — the store does not enforce the
    // minimum, that is a UI concern enforced by the toggle no-op above.
    if (selectedIds.length > 0) setTemplates(selectedIds);
    setWakeTime(wake);
    markPersonalised();
  }

  function handleNext(): void {
    commit();
    router.push("/onboarding/done");
  }

  function handleSkip(): void {
    // Calling commit() here is deliberate — Skip means "keep the pre-selection",
    // not "leave me unpersonalised". See component TSDoc for the reasoning.
    commit();
    router.push("/onboarding/done");
  }

  return (
    <main className="flex flex-col min-h-screen px-4 py-6">
      <div className="flex justify-end">
        <FlowCloseButton />
      </div>

      <h1 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        {ONBOARDING.startHeading}
      </h1>

      <ul role="list" className="mt-6 flex flex-col gap-3">
        {candidateTemplates.map((t) => {
          const isSelected = selectedIds.includes(t.id);
          return (
            <li
              key={t.id}
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => toggle(t.id)}
              className={[
                "cursor-pointer rounded-xl border-2 px-4 py-3 transition-colors",
                isSelected
                  ? "border-indigo-600 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950"
                  : "border-gray-200 bg-white hover:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-500",
              ].join(" ")}
            >
              <span className="block font-semibold text-gray-900 dark:text-gray-100">
                {t.title}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        {ONBOARDING.moveUpNote}
      </p>

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {ONBOARDING.wakeLabel}
          <select
            value={wake}
            onChange={(e) => setWake(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          >
            {WAKE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-8">
        <ProgressDots total={3} current={2} />
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
