"use client";

import { BUDDY } from "@/lib/copy";

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
}

export default function PlanActivityRow({
  title,
  twoMinuteVersion,
  done,
  editHref,
  withName,
}: PlanActivityRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      {/* Left: title, optional two-minute version, optional done label */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-normal text-foreground">{title}</span>
          {withName && (
            <span className="text-xs text-muted-foreground">
              {BUDDY.withName.replace("{name}", withName)}
            </span>
          )}
          {done && (
            <span className="text-xs text-muted-foreground">Done</span>
          )}
        </div>
        {twoMinuteVersion && (
          <span className="text-sm text-muted-foreground">
            {twoMinuteVersion}
          </span>
        )}
      </div>

      {/* Right: optional Edit link (week offers only) */}
      {editHref && (
        <a
          href={editHref}
          className="shrink-0 text-sm text-primary hover:underline"
        >
          Edit
        </a>
      )}
    </div>
  );
}
