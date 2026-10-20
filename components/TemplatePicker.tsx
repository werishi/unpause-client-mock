"use client";

/**
 * TemplatePicker — purely presentational template selection component.
 *
 * Renders a list of template cards, each showing the template's title, summary
 * and level. Enforces the 1–3 selection invariant internally: tapping a
 * selected template when it is the only one selected is a no-op (minimum 1);
 * tapping an unselected template when three are already selected is a no-op
 * (maximum 3). The component calls `onToggle` only when the tap is valid, so
 * callers must not re-add the bounds check in their own handler — a double guard
 * silently prevents `onToggle` from being called at the boundary.
 *
 * No store access. The parent supplies a pre-filtered template list and manages
 * the selected-id state; this component reports toggle events upward only.
 *
 * Used by: app/onboarding/start/page.tsx (initial template choice)
 * and app/plan/templates/page.tsx (post-onboarding template editing).
 */

import type { Template } from "@/lib/domain/types";
import { PLAN } from "@/lib/copy";

interface TemplatePickerProps {
  /** Pre-filtered list of templates to render. */
  templates: Template[];
  /** IDs of currently selected templates. */
  selectedIds: string[];
  /**
   * Called when a valid toggle is requested. Not called when a tap would violate
   * the 1–3 bounds — the component enforces them silently (G10: no error message
   * for the cap; same pattern as the values picker).
   */
  onToggle: (id: string) => void;
}

/**
 * Presentational template card list with built-in 1–3 selection enforcement.
 *
 * @param props.templates  Pre-filtered list of templates to show.
 * @param props.selectedIds  Currently selected template IDs.
 * @param props.onToggle  Called when a valid selection change is requested.
 */
export default function TemplatePicker({
  templates,
  selectedIds,
  onToggle,
}: TemplatePickerProps) {
  function handlePress(id: string): void {
    const isSelected = selectedIds.includes(id);
    // Minimum guard: at least one template must always be selected.
    if (isSelected && selectedIds.length <= 1) return;
    // Maximum guard: no more than three templates may be selected.
    if (!isSelected && selectedIds.length >= 3) return;
    onToggle(id);
  }

  return (
    <div>
      <ul role="list" className="flex flex-col gap-3">
        {templates.map((t) => {
          const isSelected = selectedIds.includes(t.id);
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => handlePress(t.id)}
                className={[
                  "w-full cursor-pointer rounded-xl border-2 px-4 py-3 text-left transition-colors",
                  isSelected
                    ? "border-indigo-600 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950"
                    : "border-gray-200 bg-white hover:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-500",
                ].join(" ")}
              >
                <span className="block font-semibold text-gray-900 dark:text-gray-100">
                  {t.title}
                </span>
                <span className="mt-0.5 block text-sm text-gray-500 dark:text-gray-400">
                  {t.summary}
                </span>
                <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                  {`${PLAN.templateLevel} ${t.level}`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        {PLAN.templatePickerHint}
      </p>
    </div>
  );
}
