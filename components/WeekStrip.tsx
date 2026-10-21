"use client";

/**
 * Renders a horizontal seven-cell week strip for the Plan tab.
 *
 * The parent computes the `dates` array (via `weekDates(today)`) and passes
 * it in — this component does no date arithmetic of its own. Each cell is a
 * plain structural button: no dot, tick, fill colour based on log data, or
 * any per-day count. The only state expressed here is whether a cell matches
 * `today` (highlight ring) or `selected` (outline ring). These two classes
 * are deliberately distinct so the states are visually separate when a day
 * that is both today and selected is rendered.
 *
 * Belongs to: Plan feature.
 * Parent responsibility: resolve `today` (local date string) and call
 * `weekDates(today)` before rendering this component.
 */

export interface WeekStripProps {
  /** Seven ISO date strings (YYYY-MM-DD) representing the week to display. */
  dates: string[];
  /** Today's local date string (YYYY-MM-DD). Used only for the today highlight. */
  today: string;
  /** The currently selected date string (YYYY-MM-DD). */
  selected: string;
  /** Called with the date string when the user taps a cell. */
  onSelect: (date: string) => void;
}

const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"] as const;

/**
 * Returns the weekday initial and day-of-month number for a YYYY-MM-DD date
 * string. Uses `T00:00` local-time suffix to avoid UTC-shift on midnight
 * boundaries (without it, `new Date("2026-10-18")` parses as UTC midnight and
 * renders as Oct 17 in UTC-offset timezones).
 */
function parseDayCell(date: string): { initial: string; day: number } {
  const d = new Date(date + "T00:00");
  return {
    initial: WEEKDAY_INITIALS[d.getDay()],
    day: d.getDate(),
  };
}

export default function WeekStrip({
  dates,
  today,
  selected,
  onSelect,
}: WeekStripProps) {
  return (
    // grid-cols-7 + gap-2 leaves ~40 px per cell at 360 px (328 px content),
    // and the gap absorbs the selected ring's 2 px offset without overlap.
    <div className="grid w-full grid-cols-7 gap-2" role="group" aria-label="Week">
      {dates.map((date) => {
        const { initial, day } = parseDayCell(date);
        const isToday = date === today;
        const isSelected = date === selected;

        return (
          <button
            key={date}
            type="button"
            onClick={() => onSelect(date)}
            aria-label={`${initial} ${day}${isToday ? " (today)" : ""}${isSelected ? " (selected)" : ""}`}
            aria-pressed={isSelected}
            className={[
              "flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400",
              // Today: filled background highlight — purely structural, not data-driven.
              // Selected (not today): soft indigo tint. Neither: plain surface.
              isToday
                ? "border-indigo-600 bg-indigo-600 text-white"
                : isSelected
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                  : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800",
              // Selected: distinct outline ring so today+selected is visually separate
              isSelected ? "ring-2 ring-indigo-600 ring-offset-2 ring-offset-white dark:ring-indigo-400 dark:ring-offset-gray-950" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span
              aria-hidden="true"
              className={
                isToday
                  ? "text-xs font-medium uppercase leading-none tracking-wide text-indigo-100"
                  : "text-xs font-medium uppercase leading-none tracking-wide text-gray-600 dark:text-gray-400"
              }
            >
              {initial}
            </span>
            <span aria-hidden="true" className="text-lg font-semibold leading-none tabular-nums">{day}</span>
          </button>
        );
      })}
    </div>
  );
}
