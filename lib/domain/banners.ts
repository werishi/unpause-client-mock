/**
 * When the in-app notification banners appear — pure, clock-free rules.
 *
 * Pure TS: no React, no `Date` reads, no localStorage. The banner component reads the
 * store and the clock and passes plain values in, so the tests can drive every rule with
 * literals. Two banners exist: the check-in reminder (a gentle "your check-in is here when
 * you want it") and the digest banner (the current digest slot is ready to read).
 *
 * Every function is gated first on `hydrated`. Before hydration `today` is `""` and the
 * stored records (`todayPlan`, the shown-day/shown-slot markers) have not loaded, so any
 * answer computed then would be a guess; each function returns `false`/`null` instead.
 */

import { isTabRoute, normalizePathname } from "./routes";

/** Plain store values the check-in reminder rules read. */
export type CheckInReminderInput = {
  hydrated: boolean;
  /** Local date `"YYYY-MM-DD"`; `""` before hydration. */
  today: string;
  /** The store's `todayPlan` (structurally a superset); only `date` is read. */
  todayPlan: { date: string } | null;
  /** `"YYYY-MM-DD"` the person started, or `null` before onboarding (e.g. on `/welcome`). */
  startedAt: string | null;
  /** True while the welcome-back screen is due/showing; flips to false once left. */
  welcomeBackDue: boolean;
  /** Day the reminder was last shown (or recorded as already spoken for). */
  checkInReminderShownDay: string | null;
  /** Raw `usePathname()` value; normalized internally. */
  pathname: string;
};

/** Plain store values the digest banner rule reads. */
export type DigestBannerInput = {
  hydrated: boolean;
  /** Local date `"YYYY-MM-DD"`; `""` before hydration. */
  today: string;
  /** The store's `todayPlan`; used only to detect Today's State B (digest card on screen). */
  todayPlan: { date: string } | null;
  /** Result of `currentDigestSlot(digestTimes, digestSeenSlot, new Date())`. */
  slot: { slotKey: string } | null;
  /** Slot key the digest banner was last shown for. */
  digestBannerShownSlot: string | null;
  /** True while the check-in reminder banner is on screen — one banner at a time. */
  checkInReminderVisible: boolean;
  /** Raw `usePathname()` value; normalized internally. */
  pathname: string;
};

/**
 * Shared eligibility for the check-in reminder (callers gate on `hydrated` first):
 *
 * (a) No check-in yet today: `todayPlan === null || todayPlan.date !== today`. This is the
 *     same test Today uses for "no check-in yet today". Reusing it (rather than, say,
 *     scanning `checkIns`, which also holds persona seed rows) keeps the banner and the
 *     screen it points to from disagreeing.
 * (b) Not already shown today: `checkInReminderShownDay !== today`.
 * (c) Started on an earlier day: `startedAt !== null && startedAt !== today`. `startedAt`
 *     is a `"YYYY-MM-DD"` string (`core-slice.ts` sets it to `ctx.today`; `loadPersona`
 *     sets it to the earliest seeded check-in date), so the string comparison is the
 *     local-date comparison — no parsing. Someone who started today has had no time away
 *     for a reminder to bridge, and before onboarding (`/welcome`, `startedAt === null`)
 *     there is nothing to offer yet.
 */
function isReminderEligible(input: CheckInReminderInput): boolean {
  const { today, todayPlan, startedAt, checkInReminderShownDay } = input;
  const noCheckInToday = todayPlan === null || todayPlan.date !== today;
  const notShownToday = checkInReminderShownDay !== today;
  const startedEarlier = startedAt !== null && startedAt !== today;
  return noCheckInToday && notShownToday && startedEarlier;
}

/**
 * True when the check-in reminder banner should show now:
 * `hydrated` && eligible (see `isReminderEligible`: no check-in today, not shown today,
 * started on an earlier day) && `!welcomeBackDue` && `isTabRoute(pathname)`.
 *
 * - `!welcomeBackDue`: the welcome-back screen is the one voice on that open; see
 *   `isCheckInReminderSuppressed` for how the reminder steps aside.
 * - `isTabRoute`: banners appear only where the tab bar does, never inside a focused flow.
 *
 * Mutually exclusive with `isCheckInReminderSuppressed`. The caller records the showing
 * with `markCheckInReminderShown(today)` so it appears at most once a day.
 */
export function isCheckInReminderDue(input: CheckInReminderInput): boolean {
  if (!input.hydrated) return false;
  return (
    isReminderEligible(input) &&
    !input.welcomeBackDue &&
    isTabRoute(input.pathname)
  );
}

/**
 * True when the reminder would have been due but the welcome-back screen already spoke:
 * `hydrated` && eligible (see `isReminderEligible`) && `welcomeBackDue`. No route test —
 * `pathname` is ignored on purpose.
 *
 * Why it exists: after welcome-back, the reminder must not follow it on Today (two
 * unprompted voices on one open). `welcomeBackDue` flips to `false` once the person leaves
 * that screen, so the "already spoken for today" fact has to be written down while it is
 * still true. The caller answers `true` by calling `markCheckInReminderShown(today)`
 * WITHOUT displaying anything. The route test is skipped because welcome-back itself is
 * not a tab route, and that is exactly where this fact has to be recorded.
 *
 * Mutually exclusive with `isCheckInReminderDue` (they split on `welcomeBackDue`).
 */
export function isCheckInReminderSuppressed(
  input: CheckInReminderInput,
): boolean {
  if (!input.hydrated) return false;
  return isReminderEligible(input) && input.welcomeBackDue;
}

/**
 * Returns the digest slot key the banner should show now, or `null` for "not now".
 *
 * `null` unless all hold:
 * - `hydrated`;
 * - `slot !== null` — a digest slot is current and unread;
 * - `isTabRoute(pathname)` — banners appear only where the tab bar does;
 * - `digestBannerShownSlot !== slot.slotKey` — at most one banner per slot;
 * - `!checkInReminderVisible` — one banner at a time.
 *
 * Also `null` while the Today digest card is on screen:
 * `normalizePathname(pathname) === "/today" && todayPlan !== null && todayPlan.date === today`
 * (State B of Today, `app/today/page.tsx` ~386-394), where a banner would duplicate the card.
 *
 * Every `null` is a plain "not now": this function records nothing, so the banner can
 * still appear later if the person moves to another banner route before opening the
 * digest. The caller records a displayed key via `markDigestBannerShown(slotKey)`.
 */
export function dueDigestBanner(input: DigestBannerInput): string | null {
  const {
    hydrated,
    today,
    todayPlan,
    slot,
    digestBannerShownSlot,
    checkInReminderVisible,
    pathname,
  } = input;
  if (!hydrated || slot === null) return null;
  if (!isTabRoute(pathname)) return null;
  if (digestBannerShownSlot === slot.slotKey) return null;
  if (checkInReminderVisible) return null;
  const todayDigestCardShown =
    normalizePathname(pathname) === "/today" &&
    todayPlan !== null &&
    todayPlan.date === today;
  if (todayDigestCardShown) return null;
  return slot.slotKey;
}
