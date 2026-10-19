/**
 * Buddy slice — persisted state for the Connection & Buddy feature.
 *
 * Owns the single optional buddy (name + timestamp), the list of shared
 * planned activities, and the one-time offer-dismissed flag.
 *
 * **Slice convention:** exports exactly `BuddyState`, `BUDDY_DEFAULTS`, and
 * the five named reducer functions. No React imports, no imports from other
 * slices, no imports from `lib/domain/` (one-way layer rule: profile Layers).
 * Each reducer is a pure function that returns a new object and never mutates
 * its first argument.
 *
 * **`removeBuddy` clears both `buddy` and `sharedActivities`.**
 * Concept §2.4 rules out per-buddy history — removing the buddy must also
 * remove every shared activity, not just the name. A subsequent `setBuddy`
 * would otherwise expose the previous buddy's planned activities to the new
 * buddy's view, which violates G11 (user controls what each person sees).
 *
 * **`dismissBuddyOffer` is never reset by `removeBuddy`.**
 * The flag is a UI preference (suppress the offer card once the user has
 * dismissed it); it is independent of whether a buddy is active. Resetting
 * it on `removeBuddy` would reintroduce the nagging behaviour that
 * `04-social-connection.md:81` forbids. Re-entry is via You → Buddy.
 *
 * **`addSharedActivity` is a plain append; no at-most-one enforcement.**
 * That constraint is a UI concern for `/buddy/share`. The reducer stays free
 * of UI logic so it remains straightforwardly testable.
 *
 * **`setBuddy` takes `agreedAt` as a parameter (not `new Date()` inline)**
 * to keep the reducer pure and testable without mocking the clock. The caller
 * (provider) passes `new Date().toISOString()`.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * One scheduled shared activity stored in the buddy slice.
 *
 * `id` is the stable handle for revoke (`removeSharedActivity`). The generation
 * scheme used by `persona-repo.ts` is `sha-{shortName}-{nn}` (e.g. `sha-jonas-01`),
 * matching the `chk-*` / `log-*` naming. Any change to this scheme would orphan
 * stored shared-activity references that existed before the change.
 *
 * `date` is an ISO local-date string (YYYY-MM-DD). The planner uses it to prune
 * past commitments inside `startDay` before building the day plan.
 */
export type SharedActivityItem = {
  id: string;
  activityId: string;
  date: string;
};

/**
 * Persisted state for the buddy feature. Fields are top-level properties on
 * the flat `UserDataState` blob; they must never be nested under a key, or the
 * `hydrate` spread in `store-state.ts` breaks.
 *
 * `buddy.agreedAt` is a full ISO timestamp (from `new Date().toISOString()`),
 * not a local date string. The persona seed in `data/personas.json` stores only
 * `{ name }` without `agreedAt`; `persona-repo.ts` synthesises the timestamp
 * (or the hydration default covers it) when loading the seed. Premise: a fake
 * timestamp in the JSON would mislead editors into thinking it comes from the file.
 */
export type BuddyState = {
  buddy: { name: string; agreedAt: string } | null;
  sharedActivities: SharedActivityItem[];
  buddyOfferDismissed: boolean;
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/**
 * Initial field values for `BuddyState`.
 *
 * `buildInitialState()` in `store-state.ts` must re-declare `sharedActivities`
 * as a fresh `[]` literal to avoid callers sharing this constant's array
 * reference — the same "freshly allocated arrays" rule that applies to all
 * other slices.
 */
export const BUDDY_DEFAULTS: BuddyState = {
  buddy: null,
  sharedActivities: [],
  buddyOfferDismissed: false,
};

// ---------------------------------------------------------------------------
// Reducers
// ---------------------------------------------------------------------------

/**
 * Records a buddy agreement.
 *
 * `agreedAt` must be supplied by the caller as `new Date().toISOString()` so
 * this reducer stays a pure function. The existing `sharedActivities` and
 * `buddyOfferDismissed` are unchanged — establishing a new buddy does not
 * affect the offer flag or any previously scheduled shared activities.
 */
export function setBuddy(
  state: BuddyState,
  name: string,
  agreedAt: string,
): BuddyState {
  return { ...state, buddy: { name, agreedAt } };
}

/**
 * Removes the buddy and clears all shared activities in a single atomic
 * update. Past shared activities that were already completed exist only as
 * `LogEntry` rows and are unaffected. `buddyOfferDismissed` is intentionally
 * left untouched — see module doc.
 */
export function removeBuddy(state: BuddyState): BuddyState {
  return { ...state, buddy: null, sharedActivities: [] };
}

/**
 * Appends one shared activity item. The at-most-one-per-activity constraint
 * is enforced in the UI (`/buddy/share`), not here. The caller is responsible
 * for generating a stable `id` before calling this reducer.
 */
export function addSharedActivity(
  state: BuddyState,
  item: SharedActivityItem,
): BuddyState {
  return { ...state, sharedActivities: [...state.sharedActivities, item] };
}

/**
 * Removes the shared activity with the given `id`. A missing id is a no-op
 * (returns the same state object unchanged) rather than an error, because the
 * UI may call this after a page reload that has already pruned stale entries.
 */
export function removeSharedActivity(state: BuddyState, id: string): BuddyState {
  const next = state.sharedActivities.filter((a) => a.id !== id);
  if (next.length === state.sharedActivities.length) return state;
  return { ...state, sharedActivities: next };
}

/**
 * Sets the one-time offer-dismissed flag permanently.
 *
 * There is no reset path. The anti-nagging rule (`04-social-connection.md:81`)
 * forbids re-showing the offer after dismissal; You → Buddy is the re-entry
 * path for users who change their mind. Adding a reset (e.g. after N days)
 * would require a new concept.
 */
export function dismissBuddyOffer(state: BuddyState): BuddyState {
  return { ...state, buddyOfferDismissed: true };
}
