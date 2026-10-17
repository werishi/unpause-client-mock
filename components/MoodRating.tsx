"use client";

/**
 * MoodRating — five-button mood selector for before/after activity ratings.
 *
 * Renders five buttons in a vertical column, one per mood value 1–5. Labels
 * come from COPY.MOOD_RATING.labels (index 0 → value 1). The component does
 * not track selection state; the calling page owns state and calls setMoodBefore
 * or setMoodAfter via useFlow.
 *
 * Each button has min-h-[44px] w-full to satisfy the 44 px tap-target invariant
 * at all screen widths including the 360 px minimum. Wrapped in role="group" for
 * accessibility; button text is the visible label, so no aria-label override is
 * needed.
 *
 * @param onSelect Called with the numeric mood value (1–5) on button click.
 */

import { MOOD_RATING } from "@/lib/copy";

interface MoodRatingProps {
  /** Called with the selected mood value when a button is clicked. */
  onSelect: (value: 1 | 2 | 3 | 4 | 5) => void;
}

export default function MoodRating({ onSelect }: MoodRatingProps) {
  const values = [1, 2, 3, 4, 5] as const;

  return (
    <div role="group" className="flex flex-col gap-2 w-full">
      {values.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          className="min-h-[44px] w-full flex items-center justify-start px-4 rounded-md
                     border border-gray-200 bg-white text-gray-800 text-sm font-medium
                     hover:bg-gray-50 focus-visible:outline focus-visible:outline-2
                     focus-visible:outline-offset-2 focus-visible:outline-blue-600
                     dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100
                     dark:hover:bg-gray-800 dark:focus-visible:outline-blue-400"
        >
          {MOOD_RATING.labels[value - 1]}
        </button>
      ))}
    </div>
  );
}
