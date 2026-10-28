/**
 * demo-switch.ts — where the user menu's demo character switch lands after a switch.
 *
 * Pure TS, no React, so it is unit-testable in Vitest's node environment (no jsdom here).
 *
 * The switch stays on the current route only when BOTH halves hold:
 * - `isTabRoute(pathname)`: the route is one of the tab routes. Focused flows (`/task`,
 *   `/mood-before`, `/mood-after`, `/swap`, `/done`), onboarding and sub-routes such as
 *   `/therapist/link` have guards or prerequisites that belonged to the previous character,
 *   so staying there would show the next character a half-built screen.
 * - `entryRouteFor(next) === "/today"`: the next character needs no entry screen. A character
 *   with `welcomeBackDue === true` left on a tab route would have today's check-in reminder
 *   recorded as shown without being seen (`isCheckInReminderSuppressed`, `banners.ts`), and
 *   `welcomeBackDue` clears only on `/welcome-back`.
 *
 * The tab-route test is an allow-list, not a deny-list: a route added later is not on it, so
 * the switch fails closed (routes away to the entry route) instead of failing open (staying on
 * a route whose prerequisites the next character may not meet).
 */

import { entryRouteFor, isTabRoute, type EntryRouteInput } from "./routes";

/**
 * Returns `null` when the switch may stay on `pathname`, otherwise the route to push.
 *
 * `next` must be the state `loadPersona` returned, never values read from a render closure:
 * the closure still holds the previous character's `startedAt` and `welcomeBackDue`, which
 * would skip `/welcome` or `/welcome-back` for the new character.
 *
 * @param pathname - What `usePathname()` returned; raw (`/today/`) or normalized.
 * @param next - The new character's state as returned by `loadPersona`.
 */
export function demoSwitchDestination(pathname: string, next: EntryRouteInput): string | null {
  const entry = entryRouteFor(next);
  if (isTabRoute(pathname) && entry === "/today") return null;
  return entry;
}
