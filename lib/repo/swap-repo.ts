/**
 * Data-access layer for swap entry seed data.
 *
 * The only permitted importer of `@/data/swaps.json`; pages and feature
 * modules must use this module rather than importing the JSON file directly
 * (profile Dependency rule: pages → lib/repo/ → data/).
 *
 * No business logic lives here — time-of-day filtering and activity selection
 * are responsibilities of the domain layer (`lib/domain/digest.ts`).
 */

import swapsJson from "@/data/swaps.json";

/**
 * One entry in the swap activity pool.
 *
 * `partOfDay` signals when this activity is appropriate; `"any"` matches every
 * time of day and functions as a fallback when no time-specific entry is
 * available. The domain layer filters this pool before picking the one offered
 * swap for the current time of day.
 *
 * `activityId` must resolve in `data/activities.json` — `data-integrity.test.ts`
 * verifies this referential constraint.
 */
export interface SwapEntry {
  id: string;
  activityId: string;
  partOfDay: "morning" | "afternoon" | "evening" | "any";
}

/**
 * Returns every entry in `data/swaps.json` as a typed array.
 *
 * No filtering applied — the domain layer (`lib/domain/digest.ts`) filters by
 * `partOfDay` and selects the offered activity from the result.
 */
export function getSwaps(): SwapEntry[] {
  return swapsJson as unknown as SwapEntry[];
}
