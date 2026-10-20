/**
 * Domain module: the rules of the `/safety/edit` form.
 *
 * Pure TypeScript — no React and no store import. The editor's limits,
 * trimming and six-array shape are product rules, so they live here where
 * Vitest reaches them in node; the React form itself cannot be unit-tested
 * because the repo has no jsdom.
 *
 * Kept separate from ./safety-plan rather than added to it, because that file
 * is the published contract of the safety-plan store part and the editor part
 * must not change it. Imports only `normaliseSafetyEntries` and
 * `SAFETY_STEP_COUNT` from there.
 *
 * Two directions, two rules: `draftFromEntries` turns stored entries into the
 * form's editable state and never trims (a half-typed entry must survive a
 * reload untouched); `entriesFromDraft` turns the form's state back into
 * entries to save and does all trimming and blank removal.
 */

import { normaliseSafetyEntries, SAFETY_STEP_COUNT } from './safety-plan';

/**
 * Maximum number of entries the editor allows in one step.
 *
 * A crisis plan is read by someone in distress, and a step holding a dozen
 * lines stops being readable at a glance. The number mirrors the seed data in
 * data/safety-plan.json, whose steps hold a handful of one-line entries.
 */
export const SAFETY_MAX_ENTRIES_PER_STEP = 5;

/**
 * Maximum length in characters of one entry.
 *
 * Same reason as `SAFETY_MAX_ENTRIES_PER_STEP`: a paragraph in a crisis plan is
 * not readable at a glance. 120 characters comfortably holds the seed's
 * longest one-line entries.
 */
export const SAFETY_MAX_ENTRY_LENGTH = 120;

/**
 * Builds the editor's initial form state from the stored entries blob.
 *
 * Normalises first, because the store's `hydrate()` validates only JSON
 * syntax and the blob may have any shape. Each step is then capped to
 * `SAFETY_MAX_ENTRIES_PER_STEP` entries of at most `SAFETY_MAX_ENTRY_LENGTH`
 * characters — the caps exist so that data the editor itself could never have
 * produced (a hand-edited or corrupted blob) cannot give the form a state its
 * own limits forbid. A step with no entries becomes `[""]`, so the form always
 * shows one empty row to type into.
 *
 * Does not trim: altering a half-typed entry on load would be surprising, and
 * trimming is a save-time rule owned by `entriesFromDraft`. The result is
 * fresh arrays; mutating it never touches the input.
 */
export function draftFromEntries(entries: unknown): string[][] {
  const base = normaliseSafetyEntries(entries);
  const draft: string[][] = [];
  for (let i = 0; i < SAFETY_STEP_COUNT; i++) {
    const step = (base[i] ?? [])
      .slice(0, SAFETY_MAX_ENTRIES_PER_STEP)
      .map((e) => e.slice(0, SAFETY_MAX_ENTRY_LENGTH));
    draft.push(step.length > 0 ? step : [""]);
  }
  return draft;
}

/**
 * Turns the editor's form state into the entries to save.
 *
 * Normalises first, so a short or malformed draft still yields exactly
 * `SAFETY_STEP_COUNT` arrays and index `i` keeps meaning seed step `i`. Each
 * entry is trimmed, cut to `SAFETY_MAX_ENTRY_LENGTH`, and trimmed again at the
 * end so the cut never leaves a trailing space; empty entries are dropped.
 * Blank rows are removed before the `SAFETY_MAX_ENTRIES_PER_STEP` cap, so a
 * blank row never costs a real entry its slot.
 *
 * A draft of only blanks yields six empty arrays, for which
 * `hasSafetyContent` is false — saving an emptied form therefore returns the
 * user to the seed demo plan. The result is always fresh arrays, never the
 * input's own.
 */
export function entriesFromDraft(draft: string[][]): string[][] {
  return normaliseSafetyEntries(draft).map((step) =>
    step
      .map((e) => e.trim().slice(0, SAFETY_MAX_ENTRY_LENGTH).trimEnd())
      .filter((e) => e.length > 0)
      .slice(0, SAFETY_MAX_ENTRIES_PER_STEP)
  );
}
