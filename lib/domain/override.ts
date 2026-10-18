/**
 * Pure domain helper for applying user edits to catalogue activities.
 *
 * `withOverride` is the single merge point between catalogue data and user-supplied
 * overrides. It lives here (lib/domain/) rather than in lib/store/ so that any layer —
 * pages, repo, components — can call it. Importing from lib/store/ would invert the
 * dependency direction: the store already imports from lib/domain/ (Activity, LogEntry,
 * etc. from types.ts), so a reverse import would create a circular dependency.
 *
 * The local `ActivityOverridePatch` type mirrors `ActivityOverridePatch` in
 * lib/store/plan-slice.ts. TypeScript's structural typing means a value typed with the
 * store's export passes here without error — the shapes are identical by design.
 * The store's export is the public name; this alias exists only to break the circular
 * dependency at the module boundary.
 */

import type { Activity } from './types';

// Module-private alias — not exported. The store's ActivityOverridePatch is the public
// name; keeping this local prevents a lib/store/ import that would create a cycle.
type ActivityOverridePatch = {
  cue?: string;
  twoMinuteVersion?: string;
  valueTag?: string;
};

/**
 * Returns a new Activity with user-edit fields merged onto the catalogue baseline.
 *
 * Rules:
 * - Empty / whitespace-only `cue` or `twoMinuteVersion` in the patch falls back to the
 *   catalogue value; only a non-empty trimmed string replaces it.
 * - `valueTag === ""` means the user chose "None" → `valueIds: []`.
 * - `valueTag` is a non-empty string → `valueIds: [valueTag]`.
 * - `valueTag === undefined` → `valueIds` unchanged.
 * - Never mutates the input activity; always returns a new object.
 * - `patch === undefined` → returns an object structurally equal to `activity`
 *   (spread copy, no mutations).
 */
export function withOverride(
  activity: Activity,
  patch: ActivityOverridePatch | undefined
): Activity {
  if (!patch) {
    return { ...activity };
  }

  const overrideFields: Partial<Activity> = {};

  if (patch.cue !== undefined) {
    const trimmed = patch.cue.trim();
    overrideFields.cue = trimmed.length > 0 ? trimmed : activity.cue;
  }

  if (patch.twoMinuteVersion !== undefined) {
    const trimmed = patch.twoMinuteVersion.trim();
    overrideFields.twoMinuteVersion =
      trimmed.length > 0 ? trimmed : activity.twoMinuteVersion;
  }

  if (patch.valueTag !== undefined) {
    overrideFields.valueIds =
      patch.valueTag === '' ? [] : [patch.valueTag];
  }

  return { ...activity, ...overrideFields };
}
