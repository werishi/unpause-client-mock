"use client";

import type { PlanItem, LogEntry, Activity } from "@/lib/domain/types";
import { TODAY } from "@/lib/copy";

export interface ActivityCardProps {
  item: PlanItem;
  activity: Activity;
  /** First value of the activity, looked up from values data by the parent. null if valueIds is empty. */
  valueTag: { label: string; emoji: string } | null;
  /** Log entry for today with matching activityId, or null if not yet started. */
  logEntry: LogEntry | null;
  onStart: () => void;
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
}: ActivityCardProps) {
  // Collapsed — activity has already been logged today
  if (logEntry !== null) {
    return (
      <div>
        <p>{logEntry.outcome === "done" ? TODAY.doneLine : TODAY.skippedLine}</p>
      </div>
    );
  }

  // Active — no log entry yet for this activity today
  const headline = item.leadWithTwoMinute ? activity.twoMinuteVersion : activity.title;
  const subtitle = item.leadWithTwoMinute ? `or: ${activity.title}` : null;

  return (
    <div>
      <p>{headline}</p>
      {subtitle !== null && <p>{subtitle}</p>}
      <p>{activity.cue}</p>
      {valueTag !== null && (
        <span>
          {valueTag.emoji} {valueTag.label}
        </span>
      )}
      <button onClick={onStart}>{TODAY.startLabel}</button>
    </div>
  );
}
