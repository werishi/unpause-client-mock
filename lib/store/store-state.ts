/**
 * Store state — shared hydration layer for `user-store.tsx`.
 *
 * This file is the only place that:
 *  - defines `UserDataState` (the flat persisted blob type), and
 *  - implements `buildInitialState` and `hydrate` (the two functions the provider calls at mount).
 *
 * No `"use client"` directive. Pure TypeScript — no React, no hooks, no browser APIs.
 *
 * To add a new slice later: (1) create `lib/store/{name}-slice.ts`; (2) add `& {Name}State` to
 * `UserDataState`; (3) add `...{NAME}_DEFAULTS` to `buildInitialState()`'s return and
 * re-allocate any arrays that slice introduces.
 */

import { CoreState, CORE_DEFAULTS, WELCOME_BACK_GAP_DAYS } from './core-slice';
import { PlanState, PLAN_DEFAULTS } from './plan-slice';
import { LookBackState, LOOK_BACK_DEFAULTS } from './look-back-slice';
import { DigestState, DIGEST_DEFAULTS } from './digest-slice';
import { daysBetween } from '@/lib/domain/day';

// ---------------------------------------------------------------------------
// Flat blob type
// ---------------------------------------------------------------------------

/**
 * The complete persisted blob stored under `STORAGE_KEY`. Defined as an intersection of every
 * active slice's state type so that TypeScript enforces all fields are present in the context
 * value and in `buildInitialState()`.
 *
 * **Do not import this type into any `*-slice.ts` file.** Each slice knows only its own state
 * type; slices are composed here, not inside each other.
 */
export type UserDataState = CoreState & PlanState & LookBackState & DigestState;

// ---------------------------------------------------------------------------
// buildInitialState
// ---------------------------------------------------------------------------

/**
 * Returns a fresh `UserDataState` with all slice defaults applied and all array fields freshly
 * allocated.
 *
 * **Why fresh arrays?** `{ ...CORE_DEFAULTS }` is a shallow copy, so
 * `{ ...CORE_DEFAULTS }.log` is the *same array object* as `CORE_DEFAULTS.log`. A push on the
 * returned object would silently mutate the constant, breaking the "no reducer mutates defaults"
 * invariant (test case 8). The explicit array literals below are what prevent that.
 *
 * Called by:
 *  - `hydrate()` as the base for the state merge (gives new slice fields their defaults when the
 *    saved blob predates the slice).
 *  - The provider's mount-effect no-blob branch.
 *  - `resetDemoData()` in the provider.
 */
export function buildInitialState(): UserDataState {
  return {
    ...CORE_DEFAULTS,
    ...PLAN_DEFAULTS,
    ...LOOK_BACK_DEFAULTS,
    ...DIGEST_DEFAULTS,
    // Freshly allocated arrays — do not remove; see doc comment above.
    log: [],
    checkIns: [],
    reasonIds: [],
    templateIds: [],
    valueIds: [],
    // PlanState object fields re-allocated to avoid sharing PLAN_DEFAULTS references.
    activityOverrides: {},
    // LookBackState array and object fields re-allocated to avoid sharing LOOK_BACK_DEFAULTS references.
    comebackGrants: [],
    rewardsReached: [],
    reviewSeen: { week: null, month: null },
    // DigestState array and object fields re-allocated to avoid sharing DIGEST_DEFAULTS references.
    interests: [],
    digestTimes: [],
    mediaMinutesByDate: {},
    media: { estimateMinutes: null, budgetMinutes: null },
  };
}

// ---------------------------------------------------------------------------
// hydrate
// ---------------------------------------------------------------------------

/**
 * Parses a raw localStorage blob and returns the hydrated state plus the welcome-back flag.
 *
 * **Order constraint:** `welcomeBackDue` is computed from `parsed.lastOpenedDate` **before** the
 * merge writes `lastOpenedDate: today`. If the write happened first, `daysBetween(today, today)`
 * is always 0 and the welcome-back screen never shows. This matches the comment in `user-store.tsx`
 * at lines 214–215 and concept §2.0 "order the mount effect must keep".
 *
 * **New slice fields:** the `{ ...buildInitialState(), ...parsed }` spread gives any field that
 * the current code knows about but the saved blob predates its defaults (concept §2.0,
 * "two deliberate behaviour changes").
 *
 * **Error handling:** the entire body is wrapped in try/catch. Corrupt blobs (truncated JSON,
 * wrong field types from an old schema) fall back to a fresh state with `lastOpenedDate: today`
 * and `welcomeBackDue: false`. A null `raw` returns the same fallback without entering the try.
 *
 * @param raw   - Raw JSON string from localStorage, or null if no blob exists.
 * @param today - ISO date string for the current local date (e.g. "2026-10-18").
 */
export function hydrate(
  raw: string | null,
  today: string,
): { state: UserDataState; welcomeBackDue: boolean } {
  const fallback = (): { state: UserDataState; welcomeBackDue: boolean } => ({
    state: { ...buildInitialState(), lastOpenedDate: today },
    welcomeBackDue: false,
  });

  if (raw === null) {
    return fallback();
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed: any = JSON.parse(raw);

    // Compute the gap BEFORE overwriting lastOpenedDate — reversed, the gap is always 0.
    const welcomeBackDue: boolean =
      daysBetween(parsed.lastOpenedDate, today) >= WELCOME_BACK_GAP_DAYS;

    const state: UserDataState = {
      ...buildInitialState(),
      ...parsed,
      lastOpenedDate: today,
    };

    return { state, welcomeBackDue };
  } catch {
    return fallback();
  }
}
