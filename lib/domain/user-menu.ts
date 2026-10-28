/**
 * Pure decisions behind the header's user menu: whether it is shown, and whose name it shows.
 *
 * Pure TS, no React and no `lib/copy` import. They live here rather than in the `.tsx` because
 * Vitest runs in node without jsdom, so nothing that renders can be tested in this repo.
 *
 * Why the render rule is `hydrated && (personaId !== NEW_PERSONA_ID || startedAt !== null)`:
 * - `personaId !== "per-new"` alone is wrong because a `per-new` visitor who has finished
 *   `/welcome` is signed in as their own character and must see the menu.
 * - `startedAt !== null` alone is not the rule either: the two terms disagree for a `per-new`
 *   visitor, whose `startedAt` stays null until `/welcome` calls `markStarted()`. Only for
 *   `per-new` does a null `startedAt` mean "not signed in as anyone yet" (still in `/welcome`
 *   or onboarding); a chosen seeded character shows the menu through the first term.
 * - `hydrated` is required because before the store hydrates from localStorage `personaId` is
 *   the `"per-new"` default, and the menu would flash for the wrong person.
 * If the store's default persona id or the moment `markStarted()` is called ever changes, this
 * rule has to be revisited.
 */

import { personaFirstName } from "./persona-name";

/**
 * The persona id of the visitor's own, freshly started character. Defined here for this module
 * only: the repo has no shared constant, and other modules keep their own spelling of it.
 */
export const NEW_PERSONA_ID = "per-new";

/** True when the header shows the user menu; see the file header for why the rule has this shape. */
export function shouldShowUserMenu(s: {
  hydrated: boolean;
  personaId: string;
  startedAt: string | null;
}): boolean {
  return s.hydrated && (s.personaId !== NEW_PERSONA_ID || s.startedAt !== null);
}

/**
 * The name the menu shows for `personaId`.
 *
 * Returns `fallbackName` for the visitor's own character (`per-new`) even when a `displayName`
 * is passed, so the menu and the `/login` Continue card name that visitor the same way. Also
 * returns `fallbackName` for an unknown id (`displayName` undefined) and for a blank first name.
 * The caller passes `LOGIN.continueOwnCharacter` as `fallbackName`.
 */
export function userMenuName(
  personaId: string,
  displayName: string | undefined,
  fallbackName: string,
): string {
  if (personaId === NEW_PERSONA_ID || displayName === undefined) return fallbackName;
  const first = personaFirstName(displayName);
  return first === "" ? fallbackName : first;
}

/**
 * The avatar initial: the first code point of `name`, uppercased, so a surrogate-pair character
 * is not split. `"?"` for an empty or whitespace-only name.
 */
export function userInitial(name: string): string {
  const first = Array.from(name.trim())[0];
  return first === undefined ? "?" : first.toUpperCase();
}
