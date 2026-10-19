/**
 * Canonical domain types for Unpause — reasons, activities, templates, values,
 * sources, personas, user history, and planner I/O.
 *
 * All new interfaces live in this single file to prevent the "type split in two"
 * trap: a type defined in both a domain module and a repo module diverges silently
 * the moment either copy is edited (ScaffoldAndCiMap.md, Implementation Gotchas).
 * Repo modules re-export these types the way activity-repo.ts already re-exports
 * Task — callers get a single import path and the type is never declared twice.
 *
 * `Task` and `EnergyLevel` remain in ./energy because suggestTaskForEnergy and its
 * callers (tests/energy.test.ts, app/check-in) keep compiling without import
 * changes. `Activity` extends Task, so this file imports from ./energy rather than
 * re-declaring the base. energy.ts re-exports Activity (step 2) as a type-only
 * export to avoid a runtime circular dependency — nothing in energy.ts calls into
 * types.ts at runtime; the re-export resolves at compile time only.
 */

import { Task, EnergyLevel } from './energy';

// Re-export EnergyLevel so downstream modules can import from types.ts alone
// when they need both EnergyLevel and a type defined here, avoiding a two-path
// import for the same concept.
export type { EnergyLevel };

// ─── Activities ──────────────────────────────────────────────────────────────

/**
 * Named union of the seven activity categories in the catalogue. A named union
 * (rather than `string`) lets ESLint and later slices reference the categories
 * without repeating the string literal list and without importing the full type.
 */
export type ActivityCategory =
  | "anchor"
  | "movement"
  | "routine"
  | "mastery"
  | "pleasant"
  | "social"
  | "media";

/**
 * Extends the core Task type with catalogue fields that the planner and repo
 * layer need. The base fields (id, title, cue, twoMinuteVersion, energyRequired,
 * minutes) remain in Task so suggestTaskForEnergy and its tests keep compiling.
 */
export interface Activity extends Task {
  category: ActivityCategory;
  /** IDs from data/values.json that this activity connects to. */
  valueIds: string[];
  /**
   * True for strength exercises that need a 48-hour rest between sessions (P5).
   * Walks are not strenuous even though they are in the movement category.
   */
  strenuous: boolean;
  /** IDs from data/sources.json that support this activity's inclusion. */
  sourceIds: string[];
  /**
   * Optional list of activity IDs offered as suggested "starter" actions when
   * sharing this activity with a buddy. Absent for activities that have no
   * recommended starter variant.
   */
  starters?: string[];
}

// ─── Lookup tables ───────────────────────────────────────────────────────────

export interface Reason {
  id: string;
  label: string;
  /** Short helper text shown below the label in the intake picker. */
  helper: string;
  /** 1-based display order in the intake picker. */
  sortOrder: number;
  /**
   * When true the picker appends one neutral line under the reason:
   * "If this has been heavy for a while, talking to a doctor or therapist can
   * help alongside Unpause." (concept 2.4, supportPointer)
   */
  supportPointer: boolean;
}

export interface Template {
  id: string;
  title: string;
  /** One-sentence description of the template shown in picker cards. */
  summary: string;
  /** Difficulty level (1 = gentlest). Rendered as "Level N" in picker cards. */
  level: number;
  /** ID of the next template to offer when the user is ready to step up (P9). */
  nextTemplateId?: string;
  /** IDs from data/sources.json that back this template's activity mix. */
  sourceIds: string[];
}

export interface TemplateItem {
  activityId: string;
  templateId: string;
  /**
   * Offer rate: how many times per week this item is suggested. Not a quota —
   * missing the count never creates a deficit or a make-up obligation. (concept 2.6)
   */
  timesPerWeek: number;
  partOfDay: "morning" | "afternoon" | "evening" | "any";
}

export interface Value {
  id: string;
  label: string;
  emoji: string;
}

export interface Source {
  id: string;
  /** Full bibliographic citation. */
  citation: string;
  /** DOI or PubMed URL. Rows marked with a verify note need checking before display. */
  url: string;
  strength: "strong" | "moderate" | "thin" | "design-judgment";
  /**
   * Optional coder note — for example "DOI given from memory; verify before
   * showing in UI" for rows the research agents flagged.
   */
  note?: string;
}

// ─── Personas and history ────────────────────────────────────────────────────

/**
 * A demo persona. wakeTime is an "HH:MM" string — never a Date or minutes — so
 * it round-trips through JSON without a conversion step. Code that uses it (the
 * planner) owns the parsing.
 */
export interface Persona {
  id: string;
  displayName: string;
  wakeTime: string;
  reasonIds: string[];
  templateIds: string[];
  /**
   * Optional buddy linked to this persona. When present the Connection & Buddy
   * feature shows the buddy's name and offers shared activities. Absent for
   * personas that have no buddy configured in the seed data.
   */
  buddy?: { name: string };
  /**
   * Activities this persona has agreed to share with their buddy, keyed by
   * dayOffset (relative to today) so the seed data round-trips through JSON
   * without a date-calculation step. The repo layer resolves dayOffset to an
   * ISO date when reading history. Absent when no shared activities exist.
   */
  sharedActivities?: { activityId: string; dayOffset: number }[];
}

/**
 * One activity the user (or a demo persona) completed or skipped.
 * outcome uses the literal "skip", matching FlowState.outcome — never "skipped"
 * (ScaffoldAndCiMap.md, outcome literal rule). The two spellings compile because
 * TypeScript's structural check does not compare union literals across unrelated
 * types; the mismatch fails silently at runtime in every comparison branch.
 */
export interface LogEntry {
  id?: string;
  personaId?: string;
  activityId: string;
  templateId: string;
  /** ISO "YYYY-MM-DD". Seed data stores dayOffset; persona-repo resolves it here. */
  date: string;
  outcome: "done" | "skip";
  twoMinute?: boolean;
  /**
   * Distinguishes the full-duration version from the two-minute version when
   * both are tracked. "full" means the complete activity was done; "twoMinute"
   * means only the abbreviated version was completed. Added in Part 5 to support
   * offer-rate tracking in the planner (P11). When absent, treat as "full".
   */
  version?: "full" | "twoMinute";
  /** Day offset relative to today used by seed data; persona-repo resolves to `date`. */
  dayOffset?: number;
  moodBefore?: number | null;
  moodAfter?: number | null;
}

/** Recorded when the user completes the energy check-in screen. */
export interface CheckIn {
  /** ISO "YYYY-MM-DD". */
  date: string;
  energy: EnergyLevel;
}

// ─── Planner I/O ─────────────────────────────────────────────────────────────

/**
 * One item in a day plan. partOfDay comes from the TemplateItem row so the
 * Today screen can group anchors by time slot.
 */
export interface PlanItem {
  activityId: string;
  templateId: string;
  partOfDay: "morning" | "afternoon" | "evening" | "any";
  /** True on low-energy days; Today leads with the two-minute version. */
  leadWithTwoMinute: boolean;
  /**
   * True when the last three done rows for this activity were all two-minute
   * completions (P11). Today may show the full version beside the small one;
   * the planner never forces the swap.
   */
  offerFullVersion: boolean;
}

/**
 * A shared plan item — a PlanItem that was agreed with a buddy and therefore
 * carries a stable sharedId. The sharedId is used by the Today screen and the
 * store slice to match incoming buddy confirmations to the correct plan row.
 * DayPlan.shared is optional (`?`) because stored demo blobs written before
 * this feature lack the field; all call sites must guard with `?? []`.
 */
export type SharedPlanItem = PlanItem & { sharedId: string };

/**
 * Output of planDay. activities holds the scored activity slots (1–3 depending
 * on energy, P2). anchors holds anchor-category items eligible today, ordered by
 * partOfDay, returned separately so Today can place them in the rhythm row.
 */
export interface DayPlan {
  /** ISO "YYYY-MM-DD" — the date the plan was computed for. */
  date: string;
  activities: PlanItem[];
  anchors: PlanItem[];
  /**
   * Activities agreed with the buddy for this day. Optional because blobs stored
   * before the Connection & Buddy feature lack this key; call sites must use
   * `todayPlan.plan.shared ?? []` (concept §2.7) — never a required read.
   */
  shared?: SharedPlanItem[];
}

/** Input to the planDay function in lib/domain/planner.ts. */
export interface PlanInput {
  /** ISO "YYYY-MM-DD", supplied by the caller from the browser clock in a useEffect. */
  today: string;
  energy: EnergyLevel;
  /** The user's active templates (at most three after setReasons). */
  templates: Template[];
  /** All TemplateItem rows for the active templates. */
  items: TemplateItem[];
  /** The full activity catalogue. */
  activities: Activity[];
  /** All history rows, resolved to ISO dates by the caller. */
  log: LogEntry[];
  /**
   * Shared activities the user has committed to with their buddy for this plan.
   * Required (not optional) — callers that have no buddy pass an empty array.
   * Each entry carries a stable sharedId (used to match buddy confirmations) and
   * the activityId to place in DayPlan.shared.
   */
  shared: { sharedId: string; activityId: string }[];
}
