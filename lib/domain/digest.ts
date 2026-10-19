/**
 * Domain module: interest digest composition.
 *
 * Pure TypeScript — no repo calls inside function bodies. The page calls
 * getDigestItems() and passes the result to buildDigest. This keeps every
 * function deterministic given its inputs, with no hidden state, and lets
 * tests drive the functions with any data without mocking the repo layer.
 *
 * `DigestItem` is imported as a type-only from lib/repo/digest-repo — the
 * published shape from part 1.1. Re-defining it here would create a
 * structurally-identical duplicate that TypeScript unifies silently today but
 * breaks with explicit casts (domain type !== repo type despite same fields).
 */

import type { DigestItem } from '../repo/digest-repo';
import { localDateString } from './day';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Identifies a single digest slot (one scheduled time on one calendar day).
 *
 * `slotKey` is the primary identity used for "seen" tracking; `slotIndex` is
 * needed by buildDigest so rotation differs between users who have different
 * numbers of digest times configured.
 */
export interface DigestSlotInfo {
  /** "YYYY-MM-DD_HH:MM" — underscore separator matches the markDigestSeen
   * action in the digest slice (part 1). Do not change to a space. */
  slotKey: string;
  /** 0-based position of this slot's time in digestTimes. */
  slotIndex: number;
}

/**
 * A digest item with an interest tag assigned by buildDigest.
 *
 * Extends DigestItem rather than wrapping it so the page can spread the item
 * into any component that accepts DigestItem props without an extra cast.
 */
export type AssignedDigestItem = DigestItem & { assignedInterest: string };

// ─── Functions ───────────────────────────────────────────────────────────────

/**
 * Builds a five-item digest slice for the current slot.
 *
 * Rotation is driven by `dayNum` (days since Unix epoch in local time) and
 * `slotIndex` (position of the scheduled time in the user's digestTimes array),
 * so two users with different digest schedules see different item sets at the
 * same wall-clock time. Interest assignment is round-robin across the five
 * items so each position always comes from the same interest category.
 *
 * The day boundary is local (via localDateString), consistent with every other
 * "today" derivation in this codebase (app/today/page.tsx getGreeting comment;
 * concept §2.2).
 *
 * @param interests  - The user's saved interest slugs (e.g. ["indie-game-releases"]).
 * @param items      - Full digest catalogue from getDigestItems().
 * @param slotIndex  - 0-based position of this slot's time in digestTimes.
 * @param now        - The current date/time (local clock, never new Date() here).
 * @returns          - Five AssignedDigestItems, or [] when interests or items is empty.
 */
export function buildDigest(
  interests: string[],
  items: DigestItem[],
  slotIndex: number,
  now: Date
): AssignedDigestItem[] {
  if (interests.length === 0 || items.length === 0) return [];

  // Compute day number in local time. localDateString avoids the UTC-midnight
  // trap (toISOString() returns the previous calendar day in CET after 23:00).
  const dateStr = localDateString(now);
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const dayNum = Math.floor(
    Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr)) / 86_400_000
  );

  const startIdx = ((dayNum * 3 + slotIndex) * 5) % items.length;
  return Array.from({ length: 5 }, (_, i) => ({
    ...items[(startIdx + i) % items.length],
    assignedInterest: interests[i % interests.length],
  }));
}

/**
 * Returns the current digest slot, or null when no new slot is available.
 *
 * A slot is "available" when it is the latest scheduled time at or before now
 * and its slot key has not been recorded as seen. Opening the digest equals
 * seen (the page calls markDigestSeen on mount), so this function returning
 * non-null means the user has a fresh set of items waiting.
 *
 * @param digestTimes     - Sorted ascending "HH:MM" strings (from settings chip order).
 * @param digestSeenSlot  - The last slot key the user opened, or null for first visit.
 * @param now             - The current date/time (local clock).
 */
export function currentDigestSlot(
  digestTimes: string[],
  digestSeenSlot: string | null,
  now: Date
): DigestSlotInfo | null {
  if (digestTimes.length === 0) return null;

  const nowH = now.getHours();
  const nowM = now.getMinutes();
  const dateStr = localDateString(now);

  let lastMatchIndex = -1;
  let lastMatchTime = '';

  for (let i = 0; i < digestTimes.length; i++) {
    const time = digestTimes[i];
    const [hStr, mStr] = time.split(':');
    const h = Number(hStr);
    const m = Number(mStr);
    if (h < nowH || (h === nowH && m <= nowM)) {
      lastMatchIndex = i;
      lastMatchTime = time;
    }
  }

  if (lastMatchIndex === -1) return null;

  const slotKey = `${dateStr}_${lastMatchTime}`;
  if (slotKey === digestSeenSlot) return null;

  return { slotKey, slotIndex: lastMatchIndex };
}

/**
 * Returns the label and day of the next scheduled digest time.
 *
 * Used to fill "Next digest at {time}" copy on the digest end block and the
 * Today dismissal card. Falls back to digestTimes[0] (first slot tomorrow)
 * when all today's times have passed.
 *
 * The fallback to "07:30" fires only when digestTimes is empty — a state the
 * caller should guard against before rendering digest UI, so this value is
 * purely defensive and should never reach the user.
 *
 * @param digestTimes - Sorted ascending "HH:MM" strings from settings.
 * @param now         - The current date/time (local clock).
 */
export function nextDigestTime(
  digestTimes: string[],
  now: Date
): { timeLabel: string; isTomorrow: boolean } {
  const nowH = now.getHours();
  const nowM = now.getMinutes();

  for (const time of digestTimes) {
    const [hStr, mStr] = time.split(':');
    const h = Number(hStr);
    const m = Number(mStr);
    if (h > nowH || (h === nowH && m > nowM)) {
      return { timeLabel: time, isTomorrow: false };
    }
  }

  return { timeLabel: digestTimes[0] ?? '07:30', isTomorrow: true };
}
