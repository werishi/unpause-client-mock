/**
 * Data-access layer for activity templates and template items.
 *
 * This is the only permitted importer of `@/data/templates.json` and
 * `@/data/template-items.json`. Pages and feature modules must use
 * this module as their single import path; importing from `@/data` or
 * relative `data/` paths is banned by the project ESLint rule.
 *
 * Contains no business logic. The planner owns selection and scheduling
 * decisions; callers pass `getTemplateItems(id)` into it rather than
 * adding logic here.
 */

import templatesJson from "@/data/templates.json";
import templateItemsJson from "@/data/template-items.json";
import type { Template, TemplateItem } from "@/lib/domain/types";

/**
 * Returns the full template library (14 templates) as `Template[]`.
 *
 * Used by the plan library page to list all available templates and by
 * `reason-repo.ts` to resolve IDs returned from the join table. The
 * order is the canonical JSON order — callers that need a different order
 * (e.g. alphabetical for display) sort after this call.
 */
export function getTemplates(): Template[] {
  return templatesJson as Template[];
}

/**
 * Returns the activity schedule for one template.
 *
 * The cast covers the full array before filtering so that TypeScript's
 * structural check runs against the `TemplateItem` interface on every row,
 * not just the rows that match the given `templateId`. A missing required
 * field in any row is therefore caught at compile time regardless of which
 * template is requested.
 *
 * The result preserves the JSON order, which is the canonical recipe order
 * the planner and UI consume. No re-sort is applied here.
 *
 * @param templateId - The `Template.id` whose items are needed.
 */
export function getTemplateItems(templateId: string): TemplateItem[] {
  return (templateItemsJson as TemplateItem[]).filter(
    (item) => item.templateId === templateId,
  );
}
