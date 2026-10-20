/**
 * Banner slice — persisted records of when each in-app notification banner last had its moment.
 *
 * Owns:
 *  - the local day on which the gentle check-in reminder was shown (or silenced because the
 *    welcome-back screen already spoke that day)
 *  - the digest slot for which the "your digest is ready" banner was shown
 *
 * A record only answers "has this banner already appeared for this day / slot?", so a reload
 * does not show the same banner twice. It is not a count, a streak or a log of missed days, and
 * nothing may read it as one.
 *
 * Slice convention: exports `BannerState`, `BANNER_DEFAULTS`, and two named reducer functions.
 * No React imports; no browser APIs; no "use client" directive. Each reducer is a pure function
 * that returns a new object and never mutates its argument. The day and slot are passed in by
 * the caller rather than computed here from `new Date()`, so both reducers stay deterministic and
 * testable without a clock stub (same pattern as `reduceSetMediaMinutesToday`).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Persisted slice for the two banner shown-records.
 *
 * Both fields live at the top level of `UserDataState` (not nested under a sub-key), because the
 * hydration spread in `store-state.ts` is a single-level `{ ...buildInitialState(), ...parsed }`.
 * A blob saved before this slice existed therefore gains `null` for both fields on load with no
 * migration; a nested object would instead be left undefined.
 *
 * Non-null means "this banner has already had its moment" for the recorded day or slot. `null`
 * (the default after a reset or a persona switch) means the banner is armed again.
 */
export type BannerState = {
  /**
   * Local date on which the check-in reminder was shown or silenced, in the `"YYYY-MM-DD"` format
   * produced by `localDateString` in `lib/domain/day.ts`. Null until the first time.
   *
   * The format is binding: the caller compares this against `localDateString(new Date())`, so any
   * other format would make every day read as not-yet-shown.
   */
  checkInReminderShownDay: string | null;
  /**
   * Digest slot key for which the digest banner was shown, in the `"YYYY-MM-DD_HH:MM"` format
   * (underscore separator) produced by `currentDigestSlot` in `lib/domain/digest.ts`. Null until
   * the first time.
   *
   * Deliberately separate from `DigestState.digestSeenSlot`: showing the banner is not the same as
   * the user having seen or dismissed the digest itself, so the digest card on Today must stay
   * available after the banner has appeared.
   */
  digestBannerShownSlot: string | null;
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/**
 * Initial field values for `BannerState`: both records `null`, so both banners are armed.
 *
 * Holds no arrays or objects, so `buildInitialState()` needs no re-allocation lines for this
 * slice. If a later field adds one, that rule changes (see `DIGEST_DEFAULTS`).
 */
export const BANNER_DEFAULTS: BannerState = {
  checkInReminderShownDay: null,
  digestBannerShownSlot: null,
};

// ---------------------------------------------------------------------------
// Reducers
// ---------------------------------------------------------------------------

/**
 * Records that the check-in reminder has had its moment on the given local day.
 *
 * `day` is a `"YYYY-MM-DD"` string from `localDateString`. Caller: `markCheckInReminderShown` in
 * `user-store.tsx`, invoked from an effect when the reminder is displayed, or when it is silenced
 * because the welcome-back screen already spoke that day.
 */
export function reduceMarkCheckInReminderShown(
  state: BannerState,
  day: string,
): BannerState {
  return { ...state, checkInReminderShownDay: day };
}

/**
 * Records that the digest banner has been shown for the given slot key.
 *
 * Slot key format: `"YYYY-MM-DD_HH:MM"`, shared with `currentDigestSlot` in
 * `lib/domain/digest.ts`. This reducer must never touch `digestSeenSlot` (it cannot, since it
 * only knows `BannerState`, and that must stay so): showing the banner must not mark the digest
 * as seen, or the digest card would disappear from Today before the user opened it.
 */
export function reduceMarkDigestBannerShown(
  state: BannerState,
  slotKey: string,
): BannerState {
  return { ...state, digestBannerShownSlot: slotKey };
}
