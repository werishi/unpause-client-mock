/**
 * Data-access layer for intake reasons and reason→template mappings.
 *
 * This is the only permitted importer of `@/data/reasons.json` and
 * `@/data/reason-templates.json`. Pages and feature modules must use
 * this module as their single import path; importing from `@/data` or
 * relative `data/` paths is banned by the project ESLint rule.
 *
 * Contains no business logic. The planner in `lib/domain/planner.ts`
 * owns selection and ranking decisions; pass the arrays returned here
 * to it rather than adding logic in this layer.
 */

import reasonsJson from "@/data/reasons.json";
import reasonTemplatesJson from "@/data/reason-templates.json";
import templatesJson from "@/data/templates.json";
import type { Reason, Template } from "@/lib/domain/types";

/**
 * Row shape of `data/reason-templates.json`. The join table carries no `id`
 * field — rows are identified by the (reasonId, templateId) pair. Declaring
 * this alias explicitly prevents a future reader from assuming an `id` is
 * present, which would be a silent runtime miss after the cast.
 */
type ReasonTemplateRow = { reasonId: string; templateId: string; rank: number };

/**
 * Returns all intake reasons in the order stored in `data/reasons.json`
 * (ascending `sortOrder`). The planner and the intake picker both consume
 * this list directly; neither needs to re-sort it.
 */
export function getReasons(): Reason[] {
  return reasonsJson as Reason[];
}

/**
 * Returns the deduplicated, rank-ordered list of templates for a set of
 * selected reason IDs.
 *
 * Deduplication rule: when two reasons both map to the same template, the
 * template's effective rank is the *minimum* rank seen across all matching
 * rows. This ensures that a template offered as rank 1 by any selected reason
 * always precedes a template whose best matching rank is 2 or higher,
 * regardless of reason selection order.
 *
 * Returns an empty array when `reasonIds` is empty — no join-table read is
 * performed in that case.
 *
 * @param reasonIds - Array of `Reason.id` values the user selected.
 */
export function getTemplatesForReasons(reasonIds: string[]): Template[] {
  if (reasonIds.length === 0) return [];

  const rows = reasonTemplatesJson as ReasonTemplateRow[];
  const templates = templatesJson as Template[];

  // Build Map<templateId, minRank> — one pass over filtered rows.
  const minRankById = new Map<string, number>();
  for (const row of rows) {
    if (!reasonIds.includes(row.reasonId)) continue;
    const existing = minRankById.get(row.templateId);
    if (existing === undefined || row.rank < existing) {
      minRankById.set(row.templateId, row.rank);
    }
  }

  // Sort entries by ascending minRank, then resolve each templateId.
  return Array.from(minRankById.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([templateId]) => templates.find((t) => t.id === templateId))
    .filter((t): t is Template => t !== undefined);
}
