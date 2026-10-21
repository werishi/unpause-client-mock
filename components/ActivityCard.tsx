"use client";

import type { PlanItem, LogEntry, Activity } from "@/lib/domain/types";
import { TODAY, BUDDY, PLAN } from "@/lib/copy";

const pill =
  "self-start rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300";

export interface ActivityCardProps {
  item: PlanItem;
  activity: Activity;
  /** First value of the activity, looked up from values data by the parent. null if valueIds is empty. */
  valueTag: { label: string; emoji: string } | null;
  /** Log entry for today with matching activityId, or null if not yet started. */
  logEntry: LogEntry | null;
  onStart: () => void;
  /**
   * When present, renders a "with {name}" label between the title block and the
   * cue line. Used by Today when rendering a shared plan card. Optional so all
   * existing callers (non-shared activities) continue to work unchanged.
   */
  withName?: string;
  /**
   * When true, renders the "From your therapist" label in the same position as
   * `withName`. Used by Today for a homework plan card. The label names no
   * therapist on purpose: the plan item stores only ids, so a name would go
   * stale on a day the user unlinks. Shown in the active state only, like
   * `withName`, because a logged card collapses to one outcome line.
   */
  fromTherapist?: boolean;
}

/**
 * Renders a single activity card in the Today screen's plan list.
 *
 * Two states:
 *   - Collapsed (logEntry is not null): one outcome line. `logEntry.outcome === "done"`
 *     shows TODAY.doneLine; any other value (the literal "skip", per LogEntry.outcome union)
 *     shows TODAY.skippedLine.
 *   - Active (logEntry is null): activity headline, optional subtitle when leadWithTwoMinute
 *     is true, the implementation-intention cue, an optional value chip, and a Start button.
 *     When `activity.leadWithTwoMinute` is true the two-minute version is the headline and
 *     the full title appears below it as "or: <title>" — the word "or:" is a structural
 *     separator, not tone copy, so it is inlined rather than stored in copy.ts.
 *
 * The parent (`app/today/page.tsx`) owns activity and value lookups and passes results in.
 * The component has no hooks.
 */
export default function ActivityCard({
  item,
  activity,
  valueTag,
  logEntry,
  onStart,
  withName,
  fromTherapist,
}: ActivityCardProps) {
  // Collapsed — activity has already been logged today
  if (logEntry !== null) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {logEntry.outcome === "done" ? TODAY.doneLine : TODAY.skippedLine}
        </p>
      </div>
    );
  }

  // Active — no log entry yet for this activity today
  const headline = item.leadWithTwoMinute ? activity.twoMinuteVersion : activity.title;
  const subtitle = item.leadWithTwoMinute ? `or: ${activity.title}` : null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:shadow-none">
      <p className="text-lg font-semibold leading-snug text-gray-900 dark:text-gray-100">{headline}</p>
      {subtitle !== null && <p className="-mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>}
      {withName && (
        <span className={pill}>{BUDDY.withName.replace("{name}", withName)}</span>
      )}
      {fromTherapist && <span className={pill}>{PLAN.fromTherapist}</span>}
      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{activity.cue}</p>
      <div className="mt-1 flex items-center gap-3">
        {valueTag !== null && (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {valueTag.emoji} {valueTag.label}
          </span>
        )}
        <button
          onClick={onStart}
          className="ml-auto min-h-12 rounded-xl bg-indigo-600 px-6 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400"
        >
          {TODAY.startLabel}
        </button>
      </div>
    </div>
  );
}
