/**
 * Look-back aggregate functions for Unpause — lib/domain/look-back.ts
 *
 * All exports are pure functions that derive results from the existing log and
 * activity catalogue on each read. Nothing is stored separately. Rationale:
 * the log is append-only and the only writer is `recordActivity` (concept §2.2);
 * a stored aggregate would need invalidation logic and could silently diverge from
 * the source. Pure derivation keeps every function testable in plain Vitest without
 * mocking the store.
 *
 * No React, Next.js, store or copy imports are allowed in this file (profile layer
 * rule: lib/domain/ must not import React or framework modules). `categoryPatterns`
 * returns structured `{ categoryKey, rank }` results rather than formatted strings
 * so the domain layer stays independent of copy; the page formats labels from
 * `LOOK_BACK.categoryLabels` in lib/copy.ts.
 */

import type { Activity, ActivityCategory, LogEntry } from './types';
import { weekDates } from './planner';

// ─── Public constants ─────────────────────────────────────────────────────────

/** Points awarded for every "done" log entry. */
export const POINTS_PER_DONE = 10;

/**
 * Bonus points granted when the user returns after an absence.
 * Stored in the look-back slice as `comebackGrants` (an array of ISO date strings)
 * so `pointsTotal` can count them without re-computing the gap logic.
 */
export const COMEBACK_BONUS = 10;

/**
 * Minimum cumulative points before the first self-chosen reward is offered.
 * The reward offer must not appear as a deficit or unmet target before this
 * threshold is reached (G10 `GOALS.md:99`; concept §0 watch point).
 */
export const FIRST_REWARD_AT = 50;

// ─── Public types ─────────────────────────────────────────────────────────────

/**
 * One entry in the category-pattern result returned by `categoryPatterns`.
 *
 * The page component formats the friendly label using `LOOK_BACK.categoryLabels`
 * from lib/copy.ts. The domain layer must not import copy (profile layer rule),
 * so the function returns structured keys and the page resolves the label.
 */
export interface PatternResult {
  /**
   * The qualifying category. "media" is excluded structurally before the
   * qualifying checks run — not filtered from the result afterwards — to prevent
   * a future edit to the qualifying rules from accidentally re-including it.
   * Reason for exclusion: G6 and `02-gamification.md:67–68` (screen-time promotion).
   */
  categoryKey: Exclude<ActivityCategory, 'media'>;
  /**
   * 0 = primary pattern (highest completion share), 1 = secondary.
   * At most two results are ever returned; rank is always 0 or 1.
   */
  rank: 0 | 1;
}

// ─── Module-private constants ─────────────────────────────────────────────────

/** Rolling window for category pattern analysis, in calendar days. */
const PATTERN_WINDOW_DAYS = 28;
/** Minimum done entries in the window for a category to qualify (floor 1). */
const PATTERN_MIN_COMPLETIONS = 3;
/** Minimum distinct activity ids in the window (floor 2). */
const PATTERN_MIN_ACTIVITIES = 2;
/** Minimum distinct calendar weeks with a done entry (floor 3). */
const PATTERN_MIN_WEEKS = 2;
/** Minimum share of all done-in-window entries the category must hold (floor 4). */
const PATTERN_MIN_SHARE = 1 / 3;
/** Maximum qualifying categories returned; ranks 0 and 1. */
const PATTERN_MAX_SHOWN = 2;

// ─── Module-private helpers ───────────────────────────────────────────────────

/**
 * Returns a YYYY-MM-DD string that is `n` days after (positive) or before
 * (negative) the given date string, using the local-time constructor to avoid
 * the UTC-midnight trap documented in day.ts.
 *
 * A private copy of planner's module-private `addDays` is kept here rather than
 * importing a module-private symbol from a sibling; the two implementations are
 * equivalent by design.
 */
function addDays(date: string, n: number): string {
  const [y, mo, d] = date.split('-').map(Number);
  const dt = new Date(y, mo - 1, d + n);
  const yr = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const dy = String(dt.getDate()).padStart(2, '0');
  return `${yr}-${m}-${dy}`;
}

// ─── Aggregate functions ──────────────────────────────────────────────────────

/**
 * Number of distinct calendar dates within [from, to] (inclusive) on which the
 * user completed at least one activity (outcome === "done").
 *
 * Skip rows contribute nothing. The result is a count of calendar days, never
 * a streak count — see concept §2.3 and `02-gamification.md:59`.
 */
export function activeDays(log: LogEntry[], from: string, to: string): number {
  const dates = new Set<string>();
  for (const e of log) {
    if (e.outcome === 'done' && e.date >= from && e.date <= to) {
      dates.add(e.date);
    }
  }
  return dates.size;
}

/**
 * Total number of done entries in the log across all dates.
 *
 * Skip rows are not counted. Two-minute completions count the same as full ones
 * (the spec awards full points to the two-minute version; `types.ts:151–158`).
 */
export function doneCount(log: LogEntry[]): number {
  return log.filter((e) => e.outcome === 'done').length;
}

/**
 * Distinct value IDs served by the done entries in the log, derived from the
 * activity catalogue.
 *
 * IMPORTANT: `activities` must be the pre-overridden array. The caller (store
 * selector or page component) must call `withOverride` from
 * `lib/domain/override.ts` before passing activities here. This function does not
 * call `withOverride` internally so it remains free of the override dependency
 * and is testable without override fixture machinery. Passing raw (non-overridden)
 * activities silently ignores the user's value edits and serves stale value IDs.
 *
 * @param log - the full activity log
 * @param activities - pre-overridden activity catalogue
 */
export function valuesServed(log: LogEntry[], activities: Activity[]): string[] {
  const doneIds = new Set(
    log.filter((e) => e.outcome === 'done').map((e) => e.activityId)
  );
  const activityMap = new Map(activities.map((a) => [a.id, a]));
  const values = new Set<string>();
  for (const id of doneIds) {
    const a = activityMap.get(id);
    if (a) {
      for (const v of a.valueIds) values.add(v);
    }
  }
  return Array.from(values).sort();
}

/**
 * Returns up to two category patterns observed in the last 28 days.
 *
 * A category qualifies when it meets all four floors in the rolling window:
 *   1. At least `PATTERN_MIN_COMPLETIONS` (3) done entries.
 *   2. At least `PATTERN_MIN_ACTIVITIES` (2) distinct activity ids (a single
 *      activity in one category is a per-activity verdict in disguise; concept
 *      Rejected Alternatives).
 *   3. Done entries span at least `PATTERN_MIN_WEEKS` (2) distinct calendar
 *      weeks. Week boundaries come from `weekDates` (Monday index 0) so pattern
 *      analysis and planner scoring rest on the same evidence.
 *   4. The category holds at least `PATTERN_MIN_SHARE` (1/3) of all done entries
 *      in the window.
 *
 * `media` is excluded structurally — at the top of the per-category loop, before
 * any qualifying check runs. A post-qualification filter would rely on media
 * never qualifying, which is not guaranteed if future activities add more
 * media-tagged entries. Reason for exclusion: G6 and `02-gamification.md:67–68`.
 *
 * @param log - the full activity log
 * @param activities - activity catalogue (activityId is stable; raw or overridden)
 * @param today - today's local date string (YYYY-MM-DD)
 */
export function categoryPatterns(
  log: LogEntry[],
  activities: Activity[],
  today: string
): PatternResult[] {
  const cutoff = addDays(today, -PATTERN_WINDOW_DAYS);
  const windowDone = log.filter(
    (e) => e.outcome === 'done' && e.date >= cutoff && e.date <= today
  );
  if (windowDone.length === 0) return [];

  const totalInWindow = windowDone.length;
  const activityMap = new Map(activities.map((a) => [a.id, a]));

  const allCategories: ActivityCategory[] = [
    'anchor', 'movement', 'routine', 'mastery', 'pleasant', 'social', 'media',
  ];

  const candidates: Array<{
    categoryKey: Exclude<ActivityCategory, 'media'>;
    count: number;
  }> = [];

  for (const cat of allCategories) {
    // media is excluded structurally — before any qualifying checks run.
    if (cat === 'media') continue;

    const catEntries = windowDone.filter((e) => {
      const a = activityMap.get(e.activityId);
      return a?.category === cat;
    });

    // Floor 1: minimum completions
    if (catEntries.length < PATTERN_MIN_COMPLETIONS) continue;

    // Floor 2: minimum distinct activity ids
    const distinctActivities = new Set(catEntries.map((e) => e.activityId));
    if (distinctActivities.size < PATTERN_MIN_ACTIVITIES) continue;

    // Floor 3: minimum distinct calendar weeks (Monday boundary from weekDates)
    const distinctWeeks = new Set(catEntries.map((e) => weekDates(e.date)[0]));
    if (distinctWeeks.size < PATTERN_MIN_WEEKS) continue;

    // Floor 4: minimum share of total done-in-window entries
    if (catEntries.length / totalInWindow < PATTERN_MIN_SHARE) continue;

    candidates.push({
      categoryKey: cat as Exclude<ActivityCategory, 'media'>,
      count: catEntries.length,
    });
  }

  return candidates
    .sort((a, b) => b.count - a.count)
    .slice(0, PATTERN_MAX_SHOWN)
    .map((c, i) => ({ categoryKey: c.categoryKey, rank: i as 0 | 1 }));
}

/**
 * Cumulative points earned from done entries and comeback grants.
 *
 * Points are always additive — no deductions. Every done entry earns
 * `POINTS_PER_DONE` (10). Each entry in `comebackGrants` adds `COMEBACK_BONUS`
 * (10). Points only go up. The store slice is responsible for granting bonuses
 * and recording them in `comebackGrants`; this function only sums.
 *
 * @param log - the full activity log
 * @param comebackGrants - ISO date strings of days when a comeback bonus was granted
 */
export function pointsTotal(log: LogEntry[], comebackGrants: string[]): number {
  return doneCount(log) * POINTS_PER_DONE + comebackGrants.length * COMEBACK_BONUS;
}

/**
 * Done count and active-day count for a single calendar week.
 *
 * @param log - the full activity log
 * @param weekStart - Monday of the week as YYYY-MM-DD (index 0 from `weekDates`)
 */
export function weekSummary(
  log: LogEntry[],
  weekStart: string
): { doneCount: number; activeDays: number } {
  const dates = weekDates(weekStart);
  const from = dates[0];
  const to = dates[6];
  const weekLog = log.filter((e) => e.date >= from && e.date <= to);
  return {
    doneCount: doneCount(weekLog),
    activeDays: activeDays(weekLog, from, to),
  };
}

/**
 * Active-day count for a calendar month.
 *
 * @param log - the full activity log
 * @param year - four-digit year
 * @param month - 1-based month number (1 = January, 12 = December)
 */
export function monthSummary(
  log: LogEntry[],
  year: number,
  month: number
): { activeDays: number } {
  const mm = String(month).padStart(2, '0');
  const prefix = `${year}-${mm}-`;
  const dates = new Set(
    log
      .filter((e) => e.outcome === 'done' && e.date.startsWith(prefix))
      .map((e) => e.date)
  );
  return { activeDays: dates.size };
}
