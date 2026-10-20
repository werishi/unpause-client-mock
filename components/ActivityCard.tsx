"use client";

import type { PlanItem, LogEntry, Activity } from "@/lib/domain/types";
import { TODAY, BUDDY, PLAN } from "@/lib/copy";

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
      {withName && (
        <span>{BUDDY.withName.replace("{name}", withName)}</span>
      )}
      {fromTherapist && <span>{PLAN.fromTherapist}</span>}
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
