/**
 * Data-access layer for activities.
 *
 * This is the only permitted importer of `@/data/activities.json`. Pages and
 * feature modules must use this module as their single import path for both
 * activity data and the `Task` / `Activity` types; importing from `@/data` or
 * relative `data/` paths is banned by the project ESLint rule.
 *
 * Contains no business logic — it is a thin getter over the JSON file. The
 * domain function `suggestTaskForEnergy` in `lib/domain/energy.ts` owns all
 * matching and selection logic; pass `getTasks()` to it rather than calling
 * it here.
 *
 * `Activity extends Task` (see `lib/domain/types.ts`), so casting an
 * `Activity[]` as `Task[]` is structurally sound. `getTasks()` and
 * `getTaskById()` signatures are unchanged so existing callers
 * (`suggestTaskForEnergy`, `tests/energy.test.ts`, check-in page) continue
 * to compile without any modification.
 */

import activitiesJson from "@/data/activities.json";
import type { Task } from "@/lib/domain/energy";
import type { Activity } from "@/lib/domain/types";

export type { Task } from "@/lib/domain/energy";
export type { Activity } from "@/lib/domain/types";

/**
 * Returns the full activity catalogue cast as `Task[]`.
 *
 * The cast is structurally sound because `Activity extends Task`; every
 * activity row carries all `Task` fields. Callers that only need `Task`
 * fields continue to work without change.
 */
export function getTasks(): Task[] {
  return activitiesJson as unknown as Task[];
}

/**
 * Finds a single activity by its `id` field, returning it as `Activity`.
 *
 * Returns `undefined` when no activity with that id exists — callers must
 * guard against that case, for example when resolving a URL param.
 *
 * Return type changed from `Task` to `Activity` so callers can access
 * Activity-specific fields (`category`, `starters`, etc.) without a cast.
 * The underlying data has always been full Activity objects; only the
 * declared return type was narrowed to `Task`.
 *
 * @param id - The activity's `id` string as stored in `data/activities.json`.
 */
export function getTaskById(id: string): Activity | undefined {
  return (activitiesJson as unknown as Activity[]).find((t) => t.id === id);
}

/**
 * Returns the full activity catalogue as `Activity[]`.
 *
 * Prefer this getter over `getTasks()` in slices that need Activity-specific
 * fields (`category`, `valueIds`, `strenuous`, `sourceIds`). The repo layer
 * owns the cast; callers receive a typed `Activity[]` and must not re-import
 * `@/data/activities.json` directly.
 */
export function getActivities(): Activity[] {
  return activitiesJson as unknown as Activity[];
}
