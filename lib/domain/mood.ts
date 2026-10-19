/**
 * Mood-based predicates shared by the planner (P7 mood-boost score) and the
 * look-back domain (category pattern and mood history aggregates).
 *
 * Both consumers require the same definition of "rated done" and "followed by a
 * better mood". Keeping a single definition here means a spec change updates one
 * function and both consumers see it immediately. Two independent inline checks
 * would diverge silently: TypeScript cannot detect that two separate arrow
 * functions express the same predicate, so a spec change applied to one would
 * leave the other stale with no build error.
 *
 * The planner previously held these inline at lines 286–299 of planner.ts.
 * The extraction is a safe refactor: `isRatedDone` and `wasFollowedByBetterMood`
 * replicate those expressions exactly; planner.ts now delegates to these functions.
 *
 * No React, Next.js, store or copy imports are allowed in this file
 * (profile layer rule: lib/domain/ must not import React or framework modules).
 */

import type { LogEntry } from './types';

/**
 * Returns `true` when a log entry records a rated completion — outcome "done"
 * with both mood-before and mood-after recorded.
 *
 * `moodBefore != null` (loose-equality, not `!== undefined`) is intentional:
 * the declared type is `number | null | undefined`, where `null` means "the user
 * did not record a mood this session" and `undefined` means the field is absent
 * from an older row that predates mood tracking. Both values mean the entry
 * cannot contribute to a mood calculation, so the `!= null` check excludes both.
 * A strict `!== undefined` would admit `null`, which then casts to `NaN` in
 * numeric comparisons and produces a silently wrong score.
 */
export function isRatedDone(e: LogEntry): boolean {
  return e.outcome === 'done' && e.moodBefore != null && e.moodAfter != null;
}

/**
 * Returns `true` when the entry is a rated completion where the mood after the
 * activity was strictly higher than the mood before it.
 *
 * Calls `isRatedDone` first so the `as number` casts below are safe: the
 * null/undefined guard has already passed and neither value is null or undefined.
 */
export function wasFollowedByBetterMood(e: LogEntry): boolean {
  return isRatedDone(e) && (e.moodAfter as number) > (e.moodBefore as number);
}
