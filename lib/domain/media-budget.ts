/**
 * Domain module: media budget helpers.
 *
 * Pure TypeScript — no repo calls, no new Date(). All time-dependent functions
 * take `today` as a caller-supplied "YYYY-MM-DD" string so they are testable
 * without freezing the system clock. The formula and the week-window shape are
 * derived from concept §2.5.
 */

/**
 * Suggests a daily media budget in minutes.
 *
 * Formula: 75 % of the user's screen-time estimate, rounded down to the
 * nearest 15-minute block, with a floor of 15 minutes.
 * Verified against the five preset chip values: 30→15, 60→45, 120→90,
 * 180→135, 240→180.
 *
 * This function is stateless — its result is never written to the store.
 * The page computes it at render time from media.estimateMinutes so that a
 * future change to the percentage changes only this function, not stored data
 * (concept §2.5: "computed at read time so a later change to the cut cannot
 * leave stale numbers").
 *
 * Callers guard that estimateMinutes is one of the five preset values; the
 * formula is correct for any positive integer, so no input validation is
 * added here.
 */
export function suggestBudget(estimateMinutes: number): number {
  return Math.max(15, Math.floor((estimateMinutes * 0.75) / 15) * 15);
}

/**
 * Returns the 7-day media usage window ending today.
 *
 * Index 0 = today, index 6 = 6 days ago. `minutes` is `null` for any day
 * that has no entry in mediaMinutesByDate — days without an entry are unknown,
 * not zero, and the bar chart renders them as empty outlines (concept §2.5:
 * "days without an entry drawn as an empty outline"). Including them in
 * daysWithinBudget would inflate the count.
 *
 * Arithmetic is done in UTC milliseconds (same approach as daysBetween in
 * day.ts and getPersonaSeed in persona-repo.ts): `today` is parsed as a UTC
 * midnight date, and each offset subtracts exactly one day's worth of
 * milliseconds. The date string for each offset is then read back with
 * getUTCFullYear/Month/Date to avoid the local-timezone shift.
 *
 * @param mediaMinutesByDate - The store's mediaMinutesByDate keyed by "YYYY-MM-DD".
 * @param today              - "YYYY-MM-DD" from localDateString(new Date()) at the
 *                             call site. Kept as a parameter so this function is
 *                             testable without a clock mock.
 */
export function weekEntries(
  mediaMinutesByDate: Record<string, number>,
  today: string
): Array<{ date: string; minutes: number | null }> {
  const [yearStr, monthStr, dayStr] = today.split('-');
  const todayUtcMs = Date.UTC(
    Number(yearStr),
    Number(monthStr) - 1,
    Number(dayStr)
  );

  return Array.from({ length: 7 }, (_, i) => {
    const ms = todayUtcMs - i * 86_400_000;
    const d = new Date(ms);
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const dateString = `${y}-${mo}-${dd}`;
    const minutes = mediaMinutesByDate[dateString] ?? null;
    return { date: dateString, minutes };
  });
}

/**
 * Counts days in a week window that have an entry within the budget.
 *
 * Days with `minutes: null` are not counted — they are unknown, not within
 * budget. Including them would overstate how often the user stayed within
 * budget (concept §2.5).
 *
 * @param entries        - Typically the result of weekEntries().
 * @param budgetMinutes  - The user's confirmed daily budget.
 */
export function daysWithinBudget(
  entries: Array<{ minutes: number | null }>,
  budgetMinutes: number
): number {
  return entries.filter((e) => e.minutes !== null && e.minutes <= budgetMinutes).length;
}

/**
 * Returns true when today's logged media time exceeds the budget.
 *
 * Used by the /you/media page to decide whether to show the over-budget
 * sentence. Returns false when today has no entry (no media logged is not
 * over-budget — the user is fine, they just haven't logged anything yet).
 *
 * @param mediaMinutesByDate - The store's mediaMinutesByDate record.
 * @param today              - "YYYY-MM-DD" from localDateString(new Date()).
 * @param budgetMinutes      - The user's confirmed daily budget.
 */
export function isOverBudgetToday(
  mediaMinutesByDate: Record<string, number>,
  today: string,
  budgetMinutes: number
): boolean {
  const used = mediaMinutesByDate[today];
  return used !== undefined && used > budgetMinutes;
}
