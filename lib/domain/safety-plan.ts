/**
 * Domain module: the user's own safety plan and the Today setup-card gate.
 *
 * Pure TypeScript — no React, no store, and no runtime import from lib/repo.
 * `SafetyPlan` is imported type-only from lib/repo/safety-plan-repo, following
 * the precedent in digest.ts and swap.ts: the repo owns the seed JSON's shape,
 * and a structurally identical duplicate here would drift from it silently.
 *
 * Every rule about combining the seed plan with the user's entries, and about
 * when Today may offer to set the plan up, lives here so `/safety`,
 * `/safety/edit` and Today share one definition and the rules are unit-tested
 * in node without rendering anything.
 *
 * The user's entries are addressed by step index (`entries[i]` belongs to seed
 * step `i`), because `SafetyPlanStep` has no id and its header forbids adding
 * properties. The order of steps in data/safety-plan.json is therefore
 * load-bearing — see the header of lib/repo/safety-plan-repo.ts.
 *
 * Goal G9: the safety plan stays outside points, budgets and check-ins. No
 * function here reads mood ratings, points or check-in results; the setup gate
 * reads only `todayEnergy`, which is the user's own planning input.
 */

import type { SafetyPlan } from '../repo/safety-plan-repo';
import type { EnergyLevel } from './energy';
import { daysBetween } from './day';

// ─── Types and constants ─────────────────────────────────────────────────────

/**
 * Number of steps in the Stanley-Brown safety plan.
 *
 * Fixed by the method itself and by data/safety-plan.json, which holds exactly
 * six steps. `normaliseSafetyEntries` always returns this many arrays so that
 * index `i` lines up with seed step `i` even when the stored blob is short.
 */
export const SAFETY_STEP_COUNT = 6;

/**
 * Where a resolved step's entries came from.
 *
 * `/safety` shows the placeholder badge only for `"seed"`, so the user can
 * always tell placeholder lines (including placeholder crisis numbers) from
 * lines they wrote. `"empty"` marks a step the user left blank while filling
 * in others — it shows no entries rather than falling back to the seed.
 */
export type SafetyStepSource = "seed" | "user" | "empty";

/**
 * One step as the pages render it: the seed's heading and prompt, plus the
 * entries chosen by `mergeSafetyPlan`. `entries` is empty when
 * `source === "empty"`.
 */
export interface ResolvedSafetyStep {
  title: string;
  prompt: string;
  entries: string[];
  source: SafetyStepSource;
}

/**
 * Minimum number of days since `startedAt` before Today may offer the setup
 * card. The first week is for getting used to planning; a safety-plan prompt
 * on day one would read as an alarm rather than an invitation.
 */
export const SAFETY_SETUP_MIN_DAYS = 7;

/**
 * Inputs to `isSafetySetupDay`.
 *
 * Named fields rather than positional parameters because three of them are
 * date strings and two are booleans — swapped arguments would compile and
 * silently change when the card appears.
 */
export interface SafetySetupInput {
  /** Energy the user chose at this morning's check-in; `null` before it. */
  todayEnergy: EnergyLevel | null;
  /** "YYYY-MM-DD" the user started using the app, or `null` if unknown. */
  startedAt: string | null;
  /** Today's local "YYYY-MM-DD" (from `localDateString`). */
  today: string;
  /** The user's stored entries, as read from the store; may be malformed. */
  entries: string[][];
  /** Monday "YYYY-MM-DD" of the week the user dismissed the card, or `null`. */
  dismissedWeek: string | null;
  /** Monday "YYYY-MM-DD" of the current week. */
  mondayDate: string;
  /** True when another offer card is already showing on Today. */
  otherOfferShowing: boolean;
  /** True once the end-of-day sentence has been shown. */
  dayEnded: boolean;
}

// ─── Functions ───────────────────────────────────────────────────────────────

/**
 * Coerces a stored entries blob into exactly `SAFETY_STEP_COUNT` arrays of
 * strings.
 *
 * The blob comes from localStorage, which a previous app version, a manual
 * edit or a truncated write can leave in any shape. Index `i` must keep
 * meaning "seed step `i`", so a missing or non-array position becomes `[]`,
 * non-string elements are dropped, and positions beyond the sixth are
 * discarded. Never throws and is idempotent.
 *
 * Does not trim: trimming and dropping blanks is a save-time concern of the
 * editor and a render-time concern of `mergeSafetyPlan`. This function only
 * guarantees shape, so the editor can round-trip what the user is typing.
 */
export function normaliseSafetyEntries(value: unknown): string[][] {
  const result: string[][] = [];
  for (let i = 0; i < SAFETY_STEP_COUNT; i++) {
    const step: unknown = Array.isArray(value) ? value[i] : undefined;
    result.push(
      Array.isArray(step)
        ? step.filter((e): e is string => typeof e === "string")
        : []
    );
  }
  return result;
}

/**
 * Returns true when at least one entry in any step has non-whitespace text.
 *
 * This is the single definition of "the user has written a plan", shared by
 * `mergeSafetyPlan` (which switches from seed to user entries on it) and by
 * `isSafetySetupDay` (which stops offering setup on it), so the two can never
 * disagree. Expects already-normalised input; callers holding raw store data
 * pass it through `normaliseSafetyEntries` first.
 */
export function hasSafetyContent(entries: string[][]): boolean {
  return entries.some((step) => step.some((e) => e.trim().length > 0));
}

/**
 * Combines the seed plan with the user's entries into the steps the pages
 * render.
 *
 * All-or-nothing at plan level: when the user has written nothing, every step
 * shows the seed entries (`source: "seed"`, with the placeholder badge); once
 * the user has written anything, every step shows only the user's entries
 * (`"user"`, or `"empty"` for a step they left blank). Per-step fallback to
 * the seed was refused because placeholder crisis lines must never mix with
 * user lines: a user who wrote their own contacts in step 4 but not step 5
 * would see placeholder crisis services beside their own people, and in a
 * crisis nobody can tell which lines are real.
 *
 * Whitespace-only entries count as absent in both branches, so the gate
 * (`hasSafetyContent`) and the rendering agree on what "content" means.
 * Seed entries are copied so a caller cannot mutate the repo's imported JSON.
 * Titles and prompts always come from the seed; the user edits entries only.
 */
export function mergeSafetyPlan(
  seed: SafetyPlan,
  entries: string[][]
): ResolvedSafetyStep[] {
  const user = normaliseSafetyEntries(entries);
  const cleaned = user.map((step) =>
    step.map((e) => e.trim()).filter((e) => e.length > 0)
  );

  if (!hasSafetyContent(cleaned)) {
    return seed.map((step): ResolvedSafetyStep => ({
      title: step.title,
      prompt: step.prompt,
      entries: [...step.entries],
      source: "seed",
    }));
  }

  return seed.map((step, i): ResolvedSafetyStep => {
    const own = cleaned[i] ?? [];
    return {
      title: step.title,
      prompt: step.prompt,
      entries: own,
      source: own.length > 0 ? "user" : "empty",
    };
  });
}

/**
 * Returns true when Today may show the "set up your safety plan" card.
 *
 * Every condition must hold; they are checked cheapest first and the function
 * returns at the first failure:
 *
 * 1. The morning check-in is done (`todayEnergy !== null`). Before it, Today
 *    shows an empty state and there is no energy value to read.
 * 2. The first week has passed. `startedAt < today` is checked as well because
 *    `daysBetween` is absolute, so a `startedAt` in the future (clock change,
 *    demo persona) would otherwise pass.
 * 3. The user planned a medium or high energy day. A calm day is read from the
 *    user's own planning input, never from a mood rating — goal G9 requires the
 *    card to stay unconnected to check-in results.
 * 4. The user has not written a plan yet. `entries` is normalised first so a
 *    corrupted stored blob reads as "no content" instead of throwing.
 * 5. The user has not dismissed the card this week.
 * 6. No other offer card is showing — Today never shows two cards at once.
 * 7. The end-of-day sentence has not appeared — no new suggestion after it.
 */
export function isSafetySetupDay(input: SafetySetupInput): boolean {
  const { todayEnergy, startedAt, today } = input;
  if (todayEnergy === null) return false;
  if (
    startedAt === null ||
    !(startedAt < today) ||
    daysBetween(startedAt, today) < SAFETY_SETUP_MIN_DAYS
  ) {
    return false;
  }
  if (todayEnergy !== "medium" && todayEnergy !== "high") return false;
  if (hasSafetyContent(normaliseSafetyEntries(input.entries))) return false;
  if (input.dismissedWeek === input.mondayDate) return false;
  if (input.otherOfferShowing) return false;
  if (input.dayEnded) return false;
  return true;
}
