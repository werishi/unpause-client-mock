/**
 * Safety slice — persisted state for the Safety Plan Editor feature.
 *
 * Owns the user's own entries for the six Stanley-Brown safety-plan steps and
 * the week in which the setup card was last dismissed.
 *
 * **Slice convention:** exports exactly `SafetyState`, `SAFETY_DEFAULTS`, and
 * the two named reducer functions. No React imports, no imports from other
 * slices, no imports from `lib/domain/` (one-way layer rule: profile Layers).
 * Each reducer is a pure function that returns a new object and never mutates
 * its first argument.
 *
 * **A separate slice, not fields in `core-slice.ts`.** Every other feature has
 * its own slice, and the safety fields share no reducer with the core state.
 *
 * **No normalisation on write.** Because a slice may not import from
 * `lib/domain/`, `setSafetyEntries` stores exactly what it is given — it does
 * not trim, drop blanks or cap the count. `normaliseSafetyEntries` in
 * `lib/domain/safety-plan.ts` is applied by readers on read instead. A caller
 * that needs normalised data must normalise it itself; the stored array may
 * contain whatever the editor last saved.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Persisted state for the safety plan. Fields are top-level properties on the
 * flat `UserDataState` blob; they must never be nested under a key, or the
 * `hydrate` spread in `store-state.ts` breaks.
 *
 * `safetyEntries[i]` holds the user's entries for Stanley-Brown step `i`
 * (0 to 5), in the same order as the steps in `data/safety-plan.json`. The
 * outer array always has six elements; an inner array may be empty.
 *
 * `safetySetupDismissedWeek` is the ISO local date (YYYY-MM-DD) of the Monday
 * of the week in which the user tapped "Not now" on the setup card, or `null`
 * if they never did.
 */
export type SafetyState = {
  safetyEntries: string[][];
  safetySetupDismissedWeek: string | null;
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/**
 * Initial field values for `SafetyState`: six empty steps, never dismissed.
 *
 * `buildInitialState()` in `store-state.ts` must re-declare `safetyEntries` as
 * a fresh literal with six fresh `[]` inner arrays. `{ ...SAFETY_DEFAULTS }` is
 * a shallow copy, so both the outer array and every inner array would
 * otherwise be the same objects as this constant's — a push into
 * `safetyEntries[0]` would silently mutate the default for every later user.
 */
export const SAFETY_DEFAULTS: SafetyState = {
  safetyEntries: [[], [], [], [], [], []],
  safetySetupDismissedWeek: null,
};

// ---------------------------------------------------------------------------
// Reducers
// ---------------------------------------------------------------------------

/**
 * Replaces all six steps' entries in one write — the editor saves the whole
 * plan at once, never a single step.
 *
 * Stores copies of the outer and inner arrays so that the editor's draft state
 * and the persisted state are never the same array objects; an in-place edit
 * of the draft would otherwise change the stored plan without a save. Does not
 * normalise or trim (see module doc). `safetySetupDismissedWeek` is left
 * untouched.
 */
export function setSafetyEntries(
  state: SafetyState,
  entries: string[][],
): SafetyState {
  return { ...state, safetyEntries: entries.map((step) => [...step]) };
}

/**
 * Records the Monday (YYYY-MM-DD) of the week in which the user tapped
 * "Not now" on the setup card, overwriting any earlier value.
 *
 * This hides the card for the rest of that week only. It is not cleared when
 * the plan gains or loses content, and there is no clear path: the setup
 * gate's other conditions (whether the plan already has content, and whether
 * the current week is a later one) decide whether the card shows again.
 */
export function dismissSafetySetup(
  state: SafetyState,
  mondayDate: string,
): SafetyState {
  return { ...state, safetySetupDismissedWeek: mondayDate };
}
