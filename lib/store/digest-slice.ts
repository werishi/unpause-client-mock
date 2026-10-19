/**
 * Digest slice — persisted state for interests, digest timing, and media budget.
 *
 * Owns:
 *  - the user's declared interests (topic ids, drives digest composition)
 *  - the preferred times the digest card should appear on Today (HH:MM strings)
 *  - the last-seen digest slot key (prevents the same slot from showing twice)
 *  - the media usage estimate and confirmed weekly budget (minutes)
 *  - a per-date log of consumed media minutes, keyed by local ISO date string
 *
 * Slice convention: exports `DigestState`, `DIGEST_DEFAULTS`, and six named reducer
 * functions. No React imports; no browser APIs; no "use client" directive.
 * Each reducer is a pure function that returns a new object and never mutates its
 * argument. `reduceSetMediaMinutesToday` receives `today` as an argument (not from
 * `new Date()` inside) so the function stays deterministic and testable without a
 * clock stub — the same pattern used throughout `lib/domain/day.ts`.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The user's media usage estimate and confirmed weekly budget, both in minutes.
 *
 * `estimateMinutes` is set by the estimate chips on /you/media (how much screen
 * time the user thinks they currently spend per day). `budgetMinutes` is the
 * confirmed weekly target, set separately via the "Use this" button and clamped
 * to ≥ 15. The suggestion (`suggestBudget` in `lib/domain/media-budget.ts`) is
 * computed at read time from `estimateMinutes` and is never stored here.
 */
export type MediaState = {
  estimateMinutes: number | null;
  budgetMinutes: number | null;
};

/**
 * Persisted slice for interests, digest timing, and media budget.
 *
 * All five fields live at the top level of `UserDataState` (not nested under a
 * sub-key), because the hydration spread in `store-state.ts` is a single-level
 * `{ ...buildInitialState(), ...parsed }`. A nested key would not be patched by
 * that spread, and an old blob that predates this slice would leave the sub-object
 * undefined rather than filling from defaults.
 */
export type DigestState = {
  /** Topic ids the user has selected; drives `buildDigest` in `lib/domain/digest.ts`. */
  interests: string[];
  /**
   * HH:MM time strings at which the digest card may appear on Today.
   * Empty means the user has not configured digest times yet; the card does not
   * show in that case.
   */
  digestTimes: string[];
  /**
   * Key of the last digest slot the user has seen or dismissed, in the format
   * `"YYYY-MM-DD_HH:MM"` (underscore separator). Null until the first interaction.
   *
   * The underscore format is binding — it matches the key produced by
   * `currentDigestSlot` in `lib/domain/digest.ts`. A mismatch between formats
   * would cause every slot to read as unseen.
   */
  digestSeenSlot: string | null;
  /** Media usage estimate and confirmed weekly budget in minutes. */
  media: MediaState;
  /**
   * Minutes of intentional media consumption logged for each local ISO date.
   * Key: `"YYYY-MM-DD"` string produced by `localDateString`.
   * Value: non-negative integer (minutes logged that day).
   */
  mediaMinutesByDate: Record<string, number>;
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/**
 * Initial field values for `DigestState`.
 *
 * `interests`, `digestTimes`, and `mediaMinutesByDate` are shared array/object
 * references. Every call site that spreads this constant must re-declare those
 * three fields — and `media` — as fresh literals to avoid sharing the constant's
 * reference (same rule as `CORE_DEFAULTS.log` in `store-state.ts`).
 * `buildInitialState()` handles this re-allocation.
 */
export const DIGEST_DEFAULTS: DigestState = {
  interests: [],
  digestTimes: [],
  digestSeenSlot: null,
  media: { estimateMinutes: null, budgetMinutes: null },
  mediaMinutesByDate: {},
};

// ---------------------------------------------------------------------------
// Reducers
// ---------------------------------------------------------------------------

/**
 * Replaces the full interests list.
 *
 * Caller: the /you/digest setup page on every add or remove interaction.
 * The full replacement (not a diff) keeps the reducer simple and lets the page
 * own the staging state.
 */
export function reduceSetInterests(
  state: DigestState,
  interests: string[],
): DigestState {
  return { ...state, interests };
}

/**
 * Replaces the digest times list (HH:MM strings).
 *
 * Caller: the /you/digest setup page's time-picker interactions.
 */
export function reduceSetDigestTimes(
  state: DigestState,
  times: string[],
): DigestState {
  return { ...state, digestTimes: times };
}

/**
 * Records that the user has seen or dismissed the digest for the given slot key.
 *
 * Slot key format: `"YYYY-MM-DD_HH:MM"` (underscore separator). The format is
 * shared with `currentDigestSlot` in `lib/domain/digest.ts` — any change here
 * must be mirrored there or the comparison always returns unseen.
 *
 * Caller: the /digest page's mount effect and Today's "Not now" handler.
 */
export function reduceMarkDigestSeen(
  state: DigestState,
  slotKey: string,
): DigestState {
  return { ...state, digestSeenSlot: slotKey };
}

/**
 * Stores the user's raw daily-screen-time estimate (minutes).
 *
 * The estimate drives `suggestBudget` in `lib/domain/media-budget.ts` at
 * read time. It is never used to compute or validate `budgetMinutes` inside
 * this reducer — that computation is intentionally deferred to the domain layer
 * so that a formula change never requires a migration.
 */
export function reduceSetMediaEstimate(
  state: DigestState,
  minutes: number,
): DigestState {
  return { ...state, media: { ...state.media, estimateMinutes: minutes } };
}

/**
 * Confirms the weekly media budget (minutes), clamped to a minimum of 15.
 *
 * The clamp is a product constraint: 15 minutes is the smallest step-button
 * value on /you/media and the floor below which the budget is not meaningful.
 * Caller: the "Use this" button on /you/media (after the user adjusts localBudget
 * in component-local state and confirms). Not called during adjustment, only on
 * confirmation, so no sub-15 intermediate value is ever written here.
 */
export function reduceSetMediaBudget(
  state: DigestState,
  minutes: number,
): DigestState {
  return {
    ...state,
    media: { ...state.media, budgetMinutes: Math.max(15, minutes) },
  };
}

/**
 * Appends or replaces the media minutes entry for one local date.
 *
 * `today` is passed in as a `"YYYY-MM-DD"` string, not read from `new Date()`
 * inside, so this function is deterministic and unit-testable without a clock
 * stub. Caller: `setMediaMinutesToday` in `user-store.tsx`, which supplies
 * `localDateString(new Date())`.
 */
export function reduceSetMediaMinutesToday(
  state: DigestState,
  today: string,
  minutes: number,
): DigestState {
  return {
    ...state,
    mediaMinutesByDate: { ...state.mediaMinutesByDate, [today]: minutes },
  };
}
