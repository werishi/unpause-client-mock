"use client";

import { BUDDY, PLAN } from "@/lib/copy";

/**
 * Renders a single activity row in the Plan tab's template or today-plan list.
 *
 * This is a display-only row — it does NOT import or wrap `ActivityCard`.
 * `ActivityCard` has a required `onStart` prop that would force imperative
 * logic into a display context; wrapping it to satisfy that prop is forbidden.
 *
 * Done state: rendered as muted label text "Done" to the right of the title.
 * Strike-through is deliberately avoided — strike-through visually implies
 * crossed out / failed; a muted label implies completed.
 *
 * Belongs to: Plan feature.
 * Used by: Plan page week offers section (passes `editHref`) and today-plan
 * section (omits `editHref`).
 */

export interface PlanActivityRowProps {
  /** Primary activity title. */
  title: string;
  /** Shorter two-minute variant shown below the title when present. */
  twoMinuteVersion?: string;
  /** When true, appends a muted "Done" label. Never a strikethrough. */
  done?: boolean;
  /**
   * When present, renders a text "Edit" link aligned to the right.
   * Used by the week offers section; omitted for today-plan items.
   */
  editHref?: string;
  /**
   * When present, renders a small "with {name}" badge beside the title.
   * Used by the Plan page when rendering a shared plan item. Optional so all
   * existing callers continue to work unchanged.
   */
  withName?: string;
  /**
   * When true, renders a small "From your therapist" badge beside the title,
   * in the same place as `withName`. Used for a homework plan item. Names no
   * therapist: the plan item stores only ids, so the label stays true on a day
   * the user unlinks.
   */
  fromTherapist?: boolean;
}

// Shared class strings (presentation only). The row carries no border or
// horizontal padding of its own: the Plan page wraps rows in an inset-divided
// list card, while /onboarding/done stacks them bare under a heading.
const pill =
  "rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300";
const donePill =
  "inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400";

export default function PlanActivityRow({
  title,
  twoMinuteVersion,
  done,
  editHref,
  withName,
  fromTherapist,
}: PlanActivityRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      {/* Left: title, optional two-minute version, optional done label */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {/* Done is quieter, never struck through: the title only softens. */}
          <span
            className={
              done
                ? "text-base font-medium leading-snug text-gray-600 dark:text-gray-400"
                : "text-base font-medium leading-snug text-gray-900 dark:text-gray-100"
            }
          >
            {title}
          </span>
          {withName && (
            <span className={pill}>
              {BUDDY.withName.replace("{name}", withName)}
            </span>
          )}
          {fromTherapist && (
            <span className={pill}>
              {PLAN.fromTherapist}
            </span>
          )}
          {done && (
            <span className={donePill}>
              <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <path d="M3.5 8.5l3 3 6-7" />
              </svg>
              Done
            </span>
          )}
        </div>
        {twoMinuteVersion && (
          <span className="flex items-start gap-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mt-1 h-3.5 w-3.5 shrink-0">
              <circle cx="8" cy="8" r="6" />
              <path d="M8 5v3l2 1.5" />
            </svg>
            <span>{twoMinuteVersion}</span>
          </span>
        )}
      </div>

      {/* Right: optional Edit link (week offers only) */}
      {editHref && (
        <a
          href={editHref}
          className="-mr-2 inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-medium text-indigo-700 underline-offset-4 hover:bg-indigo-50 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-indigo-300 dark:hover:bg-indigo-950/40 dark:focus-visible:outline-blue-400"
        >
          Edit
        </a>
      )}
    </div>
  );
}
