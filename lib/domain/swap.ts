/**
 * Domain module: swap activity selection.
 *
 * Pure TypeScript — no repo calls inside function bodies. The caller passes
 * entries (from getSwaps()) and activities (from getActivities()) as parameters.
 * This makes pickSwap deterministic and testable without module mocks.
 *
 * "Swap" is a single alternative to scrolling: one activity offered at the
 * moment of the urge, rotated by day so the offer feels fresh over a week.
 * The fallback ("act-swap-window") is low-energy and partOfDay "any", so it
 * always survives the energy and time-of-day filters.
 *
 * `SwapEntry` is imported as type-only from lib/repo/swap-repo — the published
 * shape from part 1.1. `Activity` and `EnergyLevel` come from lib/domain/types
 * because that file re-exports EnergyLevel and is the single import path when
 * both are needed together (types.ts re-export comment, line 22).
 */

import type { SwapEntry } from '../repo/swap-repo';
import type { Activity, EnergyLevel } from './types';
import { isEnergyCompatible } from './energy';
import { localDateString } from './day';

/**
 * Returns the part of day for the given moment using local clock hours.
 *
 * Uses now.getHours() (local time), consistent with every other time-of-day
 * read in this codebase (planner partOrder, mood-before time display).
 * Boundaries: before 12 → morning, 12–17 → afternoon, 18+ → evening.
 */
export function getPartOfDay(now: Date): 'morning' | 'afternoon' | 'evening' {
  const h = now.getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

/**
 * Returns the activityId of the swap activity to offer, or null.
 *
 * Selection pipeline (concept §2.4):
 *   1. Filter entries to those matching the current part of day or "any".
 *      `entry.partOfDay` is a single string (part 1.1 shape), not an array —
 *      the concept §2.4 described `partsOfDay` as an array, but the published
 *      SwapEntry type resolved it to "morning"|"afternoon"|"evening"|"any".
 *   2. Check energy compatibility for each remaining entry's activity.
 *   3. Drop entries whose activityId is in todayActivityIds (plan activity —
 *      logging a swap under a plan id would tick the plan card).
 *   4. Drop entries whose activityId is in loggedTodayIds (already done today).
 *   5. If nothing remains, offer "act-swap-window" unless already logged.
 *      If logged, return null — the swap opportunity for this session is done.
 *   6. Rotate by day: same user, same calendar day → same offer. Day number
 *      computed in local time via localDateString, same rule as buildDigest.
 *
 * @param entries           - Full swap catalogue from getSwaps().
 * @param activities        - Full activity catalogue from getActivities().
 * @param now               - The current date/time (local clock).
 * @param energy            - The user's current energy level from today's plan.
 * @param todayActivityIds  - activityIds in the user's day plan.
 * @param loggedTodayIds    - activityIds already logged today.
 */
export function pickSwap(
  entries: SwapEntry[],
  activities: Activity[],
  now: Date,
  energy: EnergyLevel,
  todayActivityIds: string[],
  loggedTodayIds: string[]
): string | null {
  const partOfDay = getPartOfDay(now);

  // Step 1: time-of-day filter
  const byTime = entries.filter(
    (e) => e.partOfDay === partOfDay || e.partOfDay === 'any'
  );

  // Step 2: energy filter — resolve activity, check compatibility
  const activityMap = new Map<string, Activity>(activities.map((a) => [a.id, a]));
  const byEnergy = byTime.filter((e) => {
    const activity = activityMap.get(e.activityId);
    return activity !== undefined && isEnergyCompatible(activity.energyRequired, energy);
  });

  // Step 3: drop plan activities (logging would tick the plan card)
  const notInPlan = byEnergy.filter((e) => !todayActivityIds.includes(e.activityId));

  // Step 4: drop already-logged activities
  const remaining = notInPlan.filter((e) => !loggedTodayIds.includes(e.activityId));

  if (remaining.length === 0) {
    // Fallback: act-swap-window is low-energy and partOfDay "any" (concept §2.4).
    // If it has already been logged, the swap window for this session is closed.
    return loggedTodayIds.includes('act-swap-window') ? null : 'act-swap-window';
  }

  // Step 6: pick by day rotation — same calendar day → same offer
  const dateStr = localDateString(now);
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const dayNum = Math.floor(
    Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr)) / 86_400_000
  );
  return remaining[dayNum % remaining.length].activityId;
}
