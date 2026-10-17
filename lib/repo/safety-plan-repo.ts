/**
 * Data-access layer for the Stanley-Brown safety plan.
 *
 * This is the only permitted importer of `@/data/safety-plan.json`. Pages
 * and feature modules must use this module; importing from `@/data` or
 * relative `data/` paths is banned by the project ESLint rule (see part 1.2).
 *
 * Contains no business logic — it is a thin getter over the JSON file.
 * `SafetyPlanStep.entries` holds plain strings (no nested objects); the
 * interface must not gain an `isPlaceholder` field or any other property not
 * present in the source JSON, as that would break the cast in `getSafetyPlan`.
 */

import safetyPlanData from "@/data/safety-plan.json";

/** One step in the Stanley-Brown six-step safety plan. */
export interface SafetyPlanStep {
  /** Heading shown above the step content. */
  title: string;
  /** Explanatory prompt shown below the heading. */
  prompt: string;
  /** The user's personalised entries for this step, stored as plain strings. */
  entries: string[];
}

/** The full safety plan — an ordered list of six steps. */
export type SafetyPlan = SafetyPlanStep[];

/**
 * Returns the full safety plan as a typed `SafetyPlan`.
 *
 * The JSON is imported at module load time via `resolveJsonModule`. The cast
 * is safe as long as `data/safety-plan.json` is kept in sync with
 * `SafetyPlanStep` above. The source file holds exactly six steps.
 */
export function getSafetyPlan(): SafetyPlan {
  return safetyPlanData as SafetyPlan;
}
