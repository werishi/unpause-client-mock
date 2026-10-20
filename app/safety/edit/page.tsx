"use client";

/**
 * /safety/edit — the only place the safety plan is edited. /safety itself is
 * read-only and links here; so do the You page and the Today card.
 *
 * Thin container: connects SafetyPlanForm (store-unaware) to the user store and
 * decides navigation. Save writes the cleaned entries through
 * setSafetyEntries, which persists immediately, then always goes to /safety so
 * every route in ends at the read-only view. router.push and not router.back(),
 * because the editor has three entry points and they must all land the same.
 *
 * Hydration: returns null until the store has hydrated, so the form (whose
 * draft is seeded by a lazy useState initialiser) only mounts with the real
 * persisted plan. A save before hydration would write six empty arrays over
 * the stored plan. A brief blank frame is accepted here, unlike /safety which
 * stays visible, because nobody opens the editor in distress. Relies on
 * `hydrated` becoming true even when localStorage throws (user-store hydrate).
 *
 * Deliberately absent: autosave, a draft in the store (a second copy of the
 * plan), a "clear my plan" control (destroys a crisis plan in one tap) and a
 * confirmation dialog (a pattern this mock has nowhere else). Leaving without
 * Save discards edits; saving with every line removed returns the plan to the
 * seed demo via mergeSafetyPlan's all-or-nothing rule.
 *
 * Outside /you, so TabBar shows no tab bar here and the header SafetyPlanLink
 * still renders from AppShell (G9).
 */

import { useRouter } from "next/navigation";
import { getSafetyPlan } from "@/lib/repo/safety-plan-repo";
import { useUserData } from "@/lib/store/user-store";
import { SafetyPlanForm } from "@/components/SafetyPlanForm";

// Synchronous read of static seed data — module level, as app/plan/activity.
const steps = getSafetyPlan().map(({ title, prompt }) => ({ title, prompt }));

export default function SafetyEditPage() {
  const router = useRouter();
  const { hydrated, safetyEntries, setSafetyEntries } = useUserData();

  if (!hydrated) return null;

  /**
   * Back to wherever the user came from; a bookmark or fresh tab has no
   * history, so it falls back to /you. `window` is read only in this handler,
   * which keeps the static-export prerender unaffected.
   */
  function handleBack(): void {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/you");
  }

  /** `entries` is already trimmed and capped by entriesFromDraft in the form. */
  function handleSave(entries: string[][]): void {
    setSafetyEntries(entries);
    router.push("/safety");
  }

  return (
    <SafetyPlanForm
      steps={steps}
      initialEntries={safetyEntries}
      onSave={handleSave}
      onBack={handleBack}
    />
  );
}
