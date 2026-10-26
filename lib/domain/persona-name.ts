/**
 * Reads a persona's first name out of its seed `displayName`.
 *
 * Pure TS, no React. It exists because the persona seed has no separate `name` field and
 * `displayName` must stay unchanged (the demo page and other callers read it whole), so a
 * card title that needs only the name derives it here instead.
 */

/**
 * The text before the first comma of `displayName`, trimmed: `"Jonas, two weeks in"`
 * gives `"Jonas"`, and `"Noor"` gives `"Noor"`.
 *
 * Relies on the seed convention that every `displayName` is a single first name,
 * optionally followed by a comma and prose; `tests/data-integrity.test.ts` pins that
 * convention for every character card.
 */
export function personaFirstName(displayName: string): string {
  return displayName.split(",")[0].trim();
}
