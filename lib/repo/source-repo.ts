/**
 * Data-access layer for evidence sources.
 *
 * This is the only permitted importer of `@/data/sources.json`. Pages and
 * feature modules must use this module as their single import path; importing
 * from `@/data` or relative `data/` paths is banned by the project ESLint rule.
 *
 * Sources are shown in the evidence panel and the plan library for transparency.
 * They are intentionally kept in a separate file from `value-repo.ts` because
 * each serves a different caller; a future slice that adds filtering or sorting
 * to one does not need to touch the other.
 */

import sourcesJson from "@/data/sources.json";
import type { Source } from "@/lib/domain/types";

/**
 * Returns all evidence sources in the order stored in `data/sources.json`
 * (31 rows). The evidence panel and plan library both display sources by
 * template or activity foreign key; callers filter the returned array rather
 * than requesting a pre-filtered subset.
 */
export function getSources(): Source[] {
  return sourcesJson as Source[];
}
