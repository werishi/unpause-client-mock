/**
 * Local-date arithmetic helpers.
 *
 * All functions accept their date values as parameters so callers do not need
 * to mock the clock in tests.  No React, Next, store or repo imports are
 * allowed in this file (profile layer rule: `lib/domain/` must not import
 * React or any framework module).
 *
 * The `localDateString` function exists because `new Date().toISOString()` is
 * UTC: a 00:30 browser-local check-in in Berlin returns the previous calendar
 * day as the date string.  Every site in the app that produces a "today"
 * string must call `localDateString(new Date())` instead.
 */

/**
 * Returns the browser's local calendar date as "YYYY-MM-DD".
 *
 * Use this everywhere a "today" string is produced from `new Date()`.
 * Never use `new Date().toISOString().slice(0, 10)` — that is UTC, not local,
 * and produces the previous calendar day for any session that begins between
 * local midnight and UTC midnight (e.g. Europe/Berlin in winter).
 */
export function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Number of whole calendar days between two "YYYY-MM-DD" strings.
 *
 * Always non-negative: `|b − a|`.  The strings are parsed as UTC calendar
 * dates via `Date.UTC` so the result is stable regardless of the browser's
 * local timezone — there is no "T00:00:00" local-midnight ambiguity when the
 * input is already a pure date string and arithmetic is done in UTC.
 */
export function daysBetween(a: string, b: string): number {
  const toUtcMs = (s: string): number => {
    const [y, mo, d] = s.split("-").map(Number);
    return Date.UTC(y, mo - 1, d);
  };
  return Math.floor(Math.abs(toUtcMs(b) - toUtcMs(a)) / 86_400_000);
}

/**
 * Returns `true` when the user was last seen at least `gap` days before today.
 *
 * The mount effect and `loadPersona` both check this *before* writing the new
 * `lastOpenedDate`.  If the write happened first, `daysBetween(today, today)`
 * would always be 0 and the welcome-back screen would never appear.
 *
 * @param lastOpened - stored "YYYY-MM-DD" from the previous session, or `null`
 *   for a first-time user (returns `false`).
 * @param today - today's local date string, produced by `localDateString(new Date())`.
 * @param gap - minimum number of days absent before the screen is shown
 *   (`WELCOME_BACK_GAP_DAYS = 4`).
 */
export function isWelcomeBackDue(
  lastOpened: string | null,
  today: string,
  gap: number
): boolean {
  if (lastOpened === null) return false;
  return daysBetween(lastOpened, today) >= gap;
}

/**
 * Returns the latest date string from a non-empty array, or `null` for an
 * empty one.
 *
 * ISO 8601 "YYYY-MM-DD" strings sort lexicographically in date order, so a
 * descending sort and `[0]` is both correct and allocation-cheap.
 */
export function latestDate(dates: string[]): string | null {
  if (dates.length === 0) return null;
  return [...dates].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))[0];
}

/**
 * Returns `true` when the YYYY-MM-DD date string falls on a Monday.
 *
 * Parts are parsed from the string and passed to `new Date(year, month - 1, day)`
 * (local-time constructor), not to `new Date(isoString)`. `new Date(isoString)`
 * parses at UTC midnight and shifts the calendar day for any session between
 * local midnight and UTC midnight — the same UTC-trap documented for
 * `localDateString` above. The local-time constructor always produces the correct
 * calendar day regardless of the browser's timezone.
 *
 * `Date.prototype.getDay()` returns 1 for Monday (0 = Sunday, 1 = Monday,
 * …, 6 = Saturday).
 */
export function isMonday(date: string): boolean {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).getDay() === 1;
}

/**
 * Returns `true` when the YYYY-MM-DD date string is the first day of its month.
 *
 * Uses the same parts-based parsing as `isMonday` to avoid the UTC midnight trap
 * (see `localDateString` above): `day` is read directly from the string rather
 * than from a `Date` constructed with an ISO string.
 */
export function isFirstOfMonth(date: string): boolean {
  const [, , day] = date.split('-').map(Number);
  return day === 1;
}

/**
 * Formats a "YYYY-MM-DD" string as a short display label, e.g. "20 Oct 2026".
 *
 * This is the app's single date formatter for printed dates (therapist hub,
 * share preview). It builds the date with the local-time constructor, as
 * `isMonday` does, because `new Date(iso).toLocaleDateString()` parses at UTC
 * midnight and shows the previous day in any timezone west of UTC.
 * The locale is fixed to "en-GB" so the label does not follow the browser
 * locale; the mockup's copy is English-only.
 */
export function formatDayLabel(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
