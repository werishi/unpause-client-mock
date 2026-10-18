"use client";

/**
 * ValueChips — reusable chip-button grid for selecting values.
 *
 * Renders each value as a pill button the user taps to toggle. Unselected
 * chips are visually dimmed when the selection cap is reached, signalling
 * the limit without an error state (G10: no mechanism statement, no penalty).
 *
 * When showNone is true, a "None" chip appears after the value chips.
 * It is always enabled (never dimmed) and calls onToggle("") when tapped;
 * its aria-pressed is true only when selectedIds is empty. The parent page
 * decides what "None" means semantically — this component only fires the signal.
 *
 * Used by:
 *   - /onboarding/values (max=3, no showNone)
 *   - /you/values        (max=3, no showNone)
 *   - /plan/activity     (max=1, showNone=true)
 *
 * Parent is expected to have resolved the values list and current selection
 * before rendering; this component does not fetch.
 */

import type { Value } from "@/lib/domain/types";

export interface ValueChipsProps {
  values: Value[];
  selectedIds: string[];
  /** Maximum number of values that may be selected simultaneously. */
  max: number;
  /**
   * Called with the toggled value's id when a chip is tapped.
   * Called with "" when the None chip is tapped (only when showNone is true).
   * The parent owns the toggle logic; this component only fires the signal.
   */
  onToggle: (id: string) => void;
  /**
   * When true, renders a "None" chip after the value chips. Always enabled
   * regardless of the selection cap. aria-pressed when selectedIds is empty.
   */
  showNone?: boolean;
}

export default function ValueChips({
  values,
  selectedIds,
  max,
  onToggle,
  showNone = false,
}: ValueChipsProps) {
  const atCap = selectedIds.length >= max;

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => {
        const isSelected = selectedIds.includes(v.id);
        const dimmed = atCap && !isSelected;
        return (
          <button
            key={v.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onToggle(v.id)}
            className={[
              "cursor-pointer rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors",
              isSelected
                ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950 dark:text-indigo-300"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-500",
              dimmed ? "opacity-40" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {v.emoji} {v.label}
          </button>
        );
      })}

      {showNone && (
        <button
          type="button"
          aria-pressed={selectedIds.length === 0}
          onClick={() => onToggle("")}
          className={[
            "cursor-pointer rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors",
            selectedIds.length === 0
              ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950 dark:text-indigo-300"
              : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-500",
          ].join(" ")}
        >
          None
        </button>
      )}
    </div>
  );
}
