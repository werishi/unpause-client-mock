/**
 * Data-access layer for user values.
 *
 * This is the only permitted importer of `@/data/values.json`. Pages and
 * feature modules must use this module as their single import path; importing
 * from `@/data` or relative `data/` paths is banned by the project ESLint rule.
 *
 * Values are shown in the activity detail UI and in the planner to surface what
 * a user cares about. They are intentionally kept in a separate file from
 * `source-repo.ts` because each serves a different caller; a future slice that
 * adds filtering or sorting to one does not need to touch the other.
 */

import valuesJson from "@/data/values.json";
import type { Value } from "@/lib/domain/types";

/**
 * Returns all values in the order stored in `data/values.json`.
 *
 * The list is intentionally short (8 rows) — callers display it in full
 * without filtering or pagination.
 */
export function getValues(): Value[] {
  return valuesJson as Value[];
}
