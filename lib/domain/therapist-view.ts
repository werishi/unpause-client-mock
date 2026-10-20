/**
 * Domain module: the therapist preview projection.
 *
 * One pure function, `projectTherapistView`, decides everything the therapist
 * preview shows, so the page renders `view.sections` in array order and has
 * nothing left to filter. "A switched-off type is absent" is therefore true by
 * construction and unit-tested in node without a DOM (the profile excludes
 * React files from unit tests).
 *
 * The output shape is deliberately narrow. Nothing that could be misread as a
 * score, a band, a trend or a record of what the user did not do exists in it
 * (no averages, no skip rows, no streaks), so a later page cannot render one by
 * accident. Every rule below fails toward sharing less: an unknown activity id,
 * a corrupt switch value or a future-dated row is left out rather than shown.
 *
 * Pure TypeScript — no React, no store and no copy imports. `SafetyPlan` is
 * imported type-only from lib/repo/safety-plan-repo, following the precedent
 * in safety-plan.ts: the repo owns the seed JSON's shape.
 */

import type { SafetyPlan } from "../repo/safety-plan-repo";
import { SHARE_TYPES, type ShareType } from "./sharing";
import { addDays } from "./planner";
import { isRatedDone } from "./mood";
import {
  activeDays,
  valuesServed,
  categoryPatterns,
  type PatternResult,
} from "./look-back";
import {
  normaliseSafetyEntries,
  hasSafetyContent,
  mergeSafetyPlan,
} from "./safety-plan";
import type { Activity, LogEntry } from "./types";

export type { PatternResult };

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * The preview window in days, counted back from `today` and including it
 * (`from = addDays(today, -13)`). Fixed by concept §2.5. The only place the
 * number lives: pages substitute it into copy, so no string holds a digit.
 */
export const THERAPIST_VIEW_DAYS = 14;

/** The weekSummary section's own window, same counting rule (includes today). */
export const WEEK_SUMMARY_DAYS = 7;

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Everything the projector reads and nothing else.
 *
 * `activities` must be the catalogue after `withOverride`, so titles and value
 * ids are the user's own. `safetySeed` is `getSafetyPlan()`. `sharing` is the
 * raw switch record; the projector applies its own strict test to it.
 */
export interface TherapistViewInput {
  therapist: { name: string } | null;
  sharing: Partial<Record<ShareType, boolean>>;
  log: LogEntry[];
  safetyEntries: string[][];
  activities: Activity[];
  safetySeed: SafetyPlan;
}

/** One rated completion, with the user's own 1–5 values exactly as stored. */
export interface MoodRatingRow {
  date: string;
  activityId: string;
  title: string;
  moodBefore: number;
  moodAfter: number;
}

/** One day with at least one done activity; titles in log order. */
export interface ActivityLogDay {
  date: string;
  titles: string[];
}

/** One safety-plan step the user wrote at least one line in. */
export interface SafetyPlanViewStep {
  title: string;
  entries: string[];
}

/** One switched-on share type, discriminated on `type`. */
export type TherapistSection =
  | { type: "moodRatings"; rows: MoodRatingRow[] }
  | { type: "activityLog"; days: ActivityLogDay[] }
  | {
      type: "weekSummary";
      /** First day of the 7-day window (inclusive). */
      from: string;
      /** Last day of the 7-day window — always `today`. */
      to: string;
      activeDays: number;
      valueIds: string[];
      patterns: PatternResult[];
    }
  | { type: "safetyPlan"; empty: boolean; steps: SafetyPlanViewStep[] };

/**
 * The whole preview. `from`/`to` are the 14-day window bounds (`to === today`).
 * `sections` holds one entry per switched-on type in `SHARE_TYPES` order, and
 * is empty when no therapist is linked or nothing is switched on.
 */
export interface TherapistView {
  from: string;
  to: string;
  sections: TherapistSection[];
}

// ─── Projection ──────────────────────────────────────────────────────────────

/**
 * Projects the user's data into what a linked therapist may see.
 *
 * Returns no sections when `input.therapist === null`, whatever `sharing`
 * says: part 1 already forbids a switch on without a therapist, but this is
 * the last line before the screen, and "sharing with nobody" must not render
 * a section even if a stale blob or a future caller breaks that invariant.
 *
 * Sections are built by iterating `SHARE_TYPES`, so output order is the
 * constant's fixed order, not the order the user switched things on. The
 * `never` default makes a new entry in `SHARE_TYPES` fail to compile until
 * its projector exists here.
 *
 * Pure: reads `input` and `today` only, never mutates the input, and every
 * returned array and object is freshly built.
 */
export function projectTherapistView(
  input: TherapistViewInput,
  today: string
): TherapistView {
  const from = addDays(today, -(THERAPIST_VIEW_DAYS - 1));
  const to = today;
  const sections: TherapistSection[] = [];
  if (input.therapist === null) return { from, to, sections };

  for (const type of SHARE_TYPES) {
    // Strict `=== true`, the same one-line test as `resolveSharing` in
    // lib/store/sharing-slice.ts, repeated because lib/domain may not import
    // the store. A corrupt value such as "yes" reads as not shared.
    if (input.sharing[type] !== true) continue;
    switch (type) {
      case "moodRatings":
        sections.push(projectMoodRatings(input, from, to));
        break;
      case "activityLog":
        sections.push(projectActivityLog(input, from, to));
        break;
      case "weekSummary":
        sections.push(projectWeekSummary(input, today));
        break;
      case "safetyPlan":
        sections.push(projectSafetyPlan(input));
        break;
      default: {
        const unhandled: never = type;
        void unhandled;
      }
    }
  }
  return { from, to, sections };
}

// ─── Private projectors ──────────────────────────────────────────────────────

/** ISO strings compare lexically in date order, so plain string comparison is safe. */
function inWindow(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

/** Newest date first. `Array.prototype.sort` is stable, so one date keeps log order. */
function byDateDesc(a: { date: string }, b: { date: string }): number {
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
}

function titleMap(activities: Activity[]): Map<string, string> {
  return new Map(activities.map((a) => [a.id, a.title]));
}

/**
 * Rated completions in the window, newest first, values as stored.
 *
 * A row whose activity id is not in the catalogue is omitted: a raw id such
 * as `act-dishes` on screen is worse than a missing row, and omission errs
 * toward sharing less. No averaging, rounding or derived field of any kind.
 */
function projectMoodRatings(
  input: TherapistViewInput,
  from: string,
  to: string
): TherapistSection {
  const titles = titleMap(input.activities);
  const rows: MoodRatingRow[] = [];
  for (const e of input.log) {
    if (!isRatedDone(e) || !inWindow(e.date, from, to)) continue;
    const title = titles.get(e.activityId);
    // isRatedDone is a boolean, not a type predicate, so the null check is
    // repeated here to narrow without an `as number` cast.
    if (title === undefined || e.moodBefore == null || e.moodAfter == null) {
      continue;
    }
    rows.push({
      date: e.date,
      activityId: e.activityId,
      title,
      moodBefore: e.moodBefore,
      moodAfter: e.moodAfter,
    });
  }
  rows.sort(byDateDesc);
  return { type: "moodRatings", rows };
}

/**
 * Done activities in the window grouped by day, newest day first.
 *
 * Skip rows never appear and a day with only skips yields no entry (concept
 * §2.6, spec 05 Implication 6): showing a therapist what the user did not do
 * turns sharing into a record of failure and teaches the user to keep the
 * switch off. Homework completions are ordinary done rows and appear as such.
 */
function projectActivityLog(
  input: TherapistViewInput,
  from: string,
  to: string
): TherapistSection {
  const titles = titleMap(input.activities);
  const byDate = new Map<string, string[]>();
  for (const e of input.log) {
    if (e.outcome !== "done" || !inWindow(e.date, from, to)) continue;
    const title = titles.get(e.activityId);
    if (title === undefined) continue;
    const day = byDate.get(e.date);
    if (day) day.push(title);
    else byDate.set(e.date, [title]);
  }
  const days: ActivityLogDay[] = Array.from(byDate, ([date, t]) => ({
    date,
    titles: t,
  }));
  days.sort(byDateDesc);
  return { type: "activityLog", days };
}

/**
 * The past week's summary, with all three figures computed over the 7-day log.
 *
 * `categoryPatterns` has its own 28-day cutoff; passing it the full log would
 * let a section described as "your past week" reveal four weeks of category
 * behaviour. Accepted consequence: patterns need two calendar weeks and three
 * completions, so they qualify only when the 7 days straddle a Monday and the
 * data is dense — usually the list is empty and the page omits it. Do not
 * widen the log to compensate.
 */
function projectWeekSummary(
  input: TherapistViewInput,
  today: string
): TherapistSection {
  const weekFrom = addDays(today, -(WEEK_SUMMARY_DAYS - 1));
  const weekLog = input.log.filter((e) => inWindow(e.date, weekFrom, today));
  return {
    type: "weekSummary",
    from: weekFrom,
    to: today,
    activeDays: activeDays(weekLog, weekFrom, today),
    valueIds: valuesServed(weekLog, input.activities),
    patterns: categoryPatterns(weekLog, input.activities, today).map((p) => ({
      ...p,
    })),
  };
}

/**
 * Only the steps the user wrote lines in; no date window (a plan has no dates).
 *
 * Filtered to `source === "user"` because `mergeSafetyPlan` falls back to the
 * seed's placeholder lines, including placeholder crisis contacts, when the
 * user wrote nothing. Those must never reach a therapist as the user's own
 * words, and the crisis-line block is not user data (concept §2.6).
 */
function projectSafetyPlan(input: TherapistViewInput): TherapistSection {
  const entries = normaliseSafetyEntries(input.safetyEntries);
  if (!hasSafetyContent(entries)) {
    return { type: "safetyPlan", empty: true, steps: [] };
  }
  const steps: SafetyPlanViewStep[] = mergeSafetyPlan(input.safetySeed, entries)
    .filter((s) => s.source === "user" && s.entries.length > 0)
    .map((s) => ({ title: s.title, entries: [...s.entries] }));
  return { type: "safetyPlan", empty: false, steps };
}
