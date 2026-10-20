/**
 * Domain constants and pure helpers for the Connection & Buddy feature.
 *
 * This module is pure TypeScript — no React, no store imports — so it may be
 * imported by the planner, the store slice, and any server component alike.
 * The eligible-activity list is a domain constant fixed by the concept (§2.3);
 * the eligible-day helper is a deterministic date calculation that takes `today`
 * as a parameter so tests can pass a fixed date without mocking the clock.
 */

/**
 * Activity IDs whose category makes them suitable for sharing with a buddy.
 * All eight are in the "social" or "pleasant" buckets of the catalogue; the
 * list is fixed by the concept and must not be derived from the catalogue at
 * runtime — the catalogue may grow without every new entry being shareable.
 */
export const SHARED_ACTIVITY_IDS: readonly string[] = [
  "act-message-one",
  "act-call-one",
  "act-meet-in-person",
  "act-group-place",
  "act-shared-time",
  "act-neglected-contact",
  "act-play-together",
  "act-walk-with-someone",
] as const;

/**
 * The template ID used when a shared activity is added to the plan outside
 * any personal template. The store slice and Today screen match on this id
 * to identify shared-plan rows and render them with the buddy chip.
 */
export const SHARED_TEMPLATE_ID = "shared";

/**
 * The template ID that marks a plan item, and the log row written when it is
 * done, as homework set by the user's linked therapist. This is the only place
 * that origin is encoded: never add an origin field to `Activity` (its
 * `sourceIds` mean research citations, not who suggested it).
 */
export const HOMEWORK_TEMPLATE_ID = "therapist";

/**
 * A single date chip as presented in the "pick a day" selector on the buddy
 * screen. `date` is an ISO YYYY-MM-DD string; `label` is a 3-letter English
 * weekday name ("Mon", "Tue", …).
 */
export type DayChip = { date: string; label: string };

/**
 * Returns six DayChip values covering tomorrow through today + 6 days.
 * Today itself is never offered — the concept (§2.5) prescribes future dates
 * only so the user commits to an upcoming activity rather than logging past
 * behaviour.
 *
 * @param today - ISO "YYYY-MM-DD" representing the current day. Passed as a
 *   parameter rather than read from `new Date()` so callers and tests can
 *   supply a fixed date and get a deterministic result.
 */
export function eligibleDays(today: string): DayChip[] {
  const [year, month, day] = today.split("-").map(Number);
  const base = new Date(year, month - 1, day);

  const chips: DayChip[] = [];
  for (let offset = 1; offset <= 6; offset++) {
    const d = new Date(base.getTime());
    d.setDate(base.getDate() + offset);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const isoDate = `${yyyy}-${mm}-${dd}`;

    // toLocaleDateString with "en-GB" and { weekday: "short" } reliably
    // returns the 3-letter English name ("Mon", "Tue", …) on all runtimes
    // that support Intl. If Intl is absent the fallback is the locale default,
    // which is still a short name in practice.
    const label = d.toLocaleDateString("en-GB", { weekday: "short" });

    chips.push({ date: isoDate, label });
  }

  return chips;
}
