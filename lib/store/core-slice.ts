/**
 * core-slice.ts
 *
 * Pure-TypeScript reducer slice for the durable user state that does not belong
 * to the plan feature. Provides `CoreState`, its defaults, the persona-load
 * helper, and 12 pure reducer functions. No React imports; no closures over
 * component state. Reducers receive `prev` and a context object `{ today: string }`
 * so they are testable without mounting a provider.
 *
 * `corePersonaState` is not a reducer — it returns `null` for an unknown persona
 * id, which signals the caller (`UserDataProvider.loadPersona`) to abort rather
 * than persist an empty write. A reducer that returns `prev` on failure would
 * hide the error, so this function stays a nullable helper rather than a reducer
 * (concept §2.0: "loadPersona and resetDemoData stay provider functions").
 */

import { getPersonas, getPersonaSeed } from "@/lib/repo/persona-repo";
import { LookBackState, LOOK_BACK_DEFAULTS } from "./look-back-slice";
import { getTemplatesForReasons } from "@/lib/repo/reason-repo";
import { planDay, addDays } from "@/lib/domain/planner";
import { getTemplates, getTemplateItems } from "@/lib/repo/template-repo";
import { getActivities } from "@/lib/repo/activity-repo";
import { isWelcomeBackDue, latestDate } from "@/lib/domain/day";
import type {
  LogEntry,
  CheckIn,
  EnergyLevel,
  DayPlan,
  PlanInput,
} from "@/lib/domain/types";

// ─── CoreState ────────────────────────────────────────────────────────────────

/**
 * Every persisted field from `UserDataState` that is not managed by the plan
 * slice. Matches the shape serialised to localStorage so a hydration round-trip
 * is lossless. Field order mirrors `UserDataState` (user-store.tsx:42–56) to
 * simplify diffing.
 */
export type CoreState = {
  personaId: string;
  reasonIds: string[];
  templateIds: string[];
  valueIds: string[];
  log: LogEntry[];
  checkIns: CheckIn[];
  startedAt: string | null;
  personalisedAt: string | null;
  personaliseDismissed: boolean;
  wakeTime: string;
  lastOpenedDate: string | null;
  welcomeBackDue: boolean;
  todayPlan: { date: string; energy: EnergyLevel; plan: DayPlan } | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Minimum gap in days between sessions that triggers the welcome-back screen.
 * Exported so `store-state.ts`'s `hydrate` function can import it rather than
 * duplicating the number. Was internal at `user-store.tsx:34`; the export here
 * removes the only duplication risk.
 */
export const WELCOME_BACK_GAP_DAYS = 4;

// ─── Defaults ─────────────────────────────────────────────────────────────────

/**
 * The empty per-new starting state — equal to `PER_NEW_SEED` from
 * `user-store.tsx:66–80`. Used as the base for `buildInitialState()` in
 * `store-state.ts`.
 *
 * Do not mutate; `buildInitialState()` shallow-copies and re-allocates arrays.
 * TypeScript strict mode does not enforce immutability of const objects, so
 * this restriction is a convention rather than a compile-time guarantee.
 */
export const CORE_DEFAULTS: CoreState = {
  personaId: "per-new",
  reasonIds: [],
  templateIds: [],
  valueIds: [],
  log: [],
  checkIns: [],
  startedAt: null,
  personalisedAt: null,
  personaliseDismissed: false,
  wakeTime: "08:00",
  lastOpenedDate: null,
  welcomeBackDue: false,
  todayPlan: null,
};

// ─── Persona load helper ──────────────────────────────────────────────────────

/**
 * Computes the full `CoreState` for a demo persona.
 *
 * Returns `null` for an unknown `id` so the provider can abort without
 * persisting an empty write. A reducer that returns `prev` on failure would
 * hide the error silently; `null` forces the caller to decide.
 *
 * Receives `today` as a parameter rather than closing over the provider's
 * `today` state variable, making the computation deterministic for any
 * (id, today) pair.
 *
 * `wakeTime` and `valueIds` are cast via `unknown` because the `Persona`
 * interface does not yet declare them (the planner does not consume them);
 * the cast avoids widening the interface prematurely.
 *
 * Mirrors `loadPersona` (user-store.tsx:299–357) line for line, replacing
 * all references to the provider's `today` state variable with the parameter.
 */
export function corePersonaState(
  id: string,
  today: string
): (CoreState & LookBackState) | null {
  const personas = getPersonas();
  const persona = personas.find((p) => p.id === id);
  if (!persona) return null;

  const rawValueIds =
    (persona as unknown as { valueIds?: string[] }).valueIds ?? [];
  const rawWakeTime =
    (persona as unknown as { wakeTime?: string }).wakeTime ?? "08:00";

  let log: LogEntry[] = [];
  let checkIns: CheckIn[] = [];

  if (id !== "per-new") {
    const seed = getPersonaSeed(id, today);
    log = seed.log as LogEntry[];
    checkIns = seed.checkIns as CheckIn[];
  }

  let startedAt: string | null = null;
  let personalisedAt: string | null = null;
  let lastOpenedDate: string | null = null;
  let welcomeBackDue = false;
  let personaliseDismissed = false;
  let wakeTime = "08:00";

  if (id !== "per-new") {
    const allDates = checkIns.map((c) => c.date);
    const earliest =
      allDates.length > 0 ? [...allDates].sort()[0] : today;
    startedAt = earliest;
    personalisedAt = earliest;
    lastOpenedDate = latestDate([
      ...checkIns.map((c) => c.date),
      ...log.map((e) => e.date),
    ]);
    welcomeBackDue = isWelcomeBackDue(
      lastOpenedDate,
      today,
      WELCOME_BACK_GAP_DAYS
    );
    personaliseDismissed = true;
    wakeTime = rawWakeTime;
  }

  return {
    personaId: id,
    reasonIds: persona.reasonIds,
    templateIds: persona.templateIds,
    valueIds: rawValueIds,
    log,
    checkIns,
    startedAt,
    personalisedAt,
    personaliseDismissed,
    wakeTime,
    lastOpenedDate,
    welcomeBackDue,
    todayPlan: null,
    // LookBack defaults — this is a pure snapshot function; it cannot read current
    // UI preferences, so plainVersion returns its default (false). The provider's
    // loadPersona preserves the live value separately.
    ...LOOK_BACK_DEFAULTS,
    comebackGrants: [],
    rewardsReached: [],
    reviewSeen: { week: null, month: null },
  };
}

// ─── Reducers ─────────────────────────────────────────────────────────────────

/**
 * Pure reducers for `CoreState`.
 *
 * Each function receives `prev` and a context object `{ today: string }` and
 * returns the next state without mutating its inputs. Reducers that do not read
 * `ctx` name the parameter `_ctx`; the leading underscore suppresses unused-
 * variable warnings without omitting it from the signature (TypeScript permits
 * passing extra arguments and a function with fewer params is assignable to a
 * type with more, so both forms are caller-compatible).
 *
 * `startDay` is the key beneficiary of the pure-reducer shape: receiving `prev`
 * and `ctx.today` instead of closing over the provider's `state` and `today`
 * makes it testable as one unit without mounting a provider (test case 10).
 */
export const coreReducers = {
  /**
   * Appends a log entry to `prev.log`. Never mutates the original array.
   */
  recordActivity(
    prev: CoreState,
    _ctx: { today: string },
    entry: LogEntry
  ): CoreState {
    return { ...prev, log: [...prev.log, entry] };
  },

  /**
   * Appends a check-in `{ date: ctx.today, energy }` to `prev.checkIns`.
   * Never mutates the original array.
   */
  recordCheckIn(
    prev: CoreState,
    ctx: { today: string },
    energy: EnergyLevel
  ): CoreState {
    return {
      ...prev,
      checkIns: [...prev.checkIns, { date: ctx.today, energy }],
    };
  },

  /**
   * Sets active reasons and derives the rank-1 template per reason.
   *
   * For each reason id calls `getTemplatesForReasons([id])` and takes the first
   * result's id. The collected template ids are deduplicated (first-seen order
   * via a Set) and capped at 3. Logic mirrors `setReasons` (user-store.tsx:268–282).
   */
  setReasons(
    prev: CoreState,
    _ctx: { today: string },
    ids: string[]
  ): CoreState {
    const seen = new Set<string>();
    for (const rid of ids) {
      const templates = getTemplatesForReasons([rid]);
      const first = templates[0]?.id;
      if (first && !seen.has(first)) seen.add(first);
    }
    const templateIds = [...seen].slice(0, 3);
    return { ...prev, reasonIds: ids, templateIds };
  },

  /**
   * Records a check-in and computes today's plan in a single update — one
   * return, not two. The stored result equals the original two-step call chain
   * (user-store.tsx:364–382) because `planDay` reads only `templateIds` and
   * `log`, not `checkIns`, so inserting the check-in first or last produces the
   * same plan.
   *
   * `dayOffset`-based log entries are resolved to ISO dates before being passed
   * to `planDay`, mirroring user-store.tsx:371–373.
   */
  startDay(
    prev: CoreState,
    ctx: { today: string },
    energy: EnergyLevel
  ): CoreState {
    const templates = getTemplates().filter((t) =>
      prev.templateIds.includes(t.id)
    );
    const items = prev.templateIds.flatMap((id) => getTemplateItems(id));
    const activities = getActivities();
    const log = prev.log.map((e) =>
      typeof e.dayOffset === "number"
        ? { ...e, date: addDays(ctx.today, e.dayOffset) }
        : e
    );
    const input: PlanInput = {
      today: ctx.today,
      energy,
      templates,
      items,
      activities,
      log,
    };
    const plan = planDay(input);
    const todayPlan = { date: ctx.today, energy, plan };
    return {
      ...prev,
      checkIns: [...prev.checkIns, { date: ctx.today, energy }],
      todayPlan,
    };
  },

  /**
   * Sets `todayPlan` to null. Callable only before any activity for today has
   * been logged; the Today page enforces this via its `anyLogged` guard.
   */
  clearTodayPlan(prev: CoreState): CoreState {
    return { ...prev, todayPlan: null };
  },

  /** Sets `startedAt` to `ctx.today`. */
  markStarted(prev: CoreState, ctx: { today: string }): CoreState {
    return { ...prev, startedAt: ctx.today };
  },

  /** Sets `valueIds`, capped at 3. */
  setValues(
    prev: CoreState,
    _ctx: { today: string },
    ids: string[]
  ): CoreState {
    return { ...prev, valueIds: ids.slice(0, 3) };
  },

  /**
   * Sets `templateIds`, capped at 3. Does not enforce a minimum of 1; the
   * start-page guard is the enforcement point (PlanAndTemplatesMap.md,
   * Implementation Gotchas, "at-least-one-template").
   */
  setTemplates(
    prev: CoreState,
    _ctx: { today: string },
    ids: string[]
  ): CoreState {
    return { ...prev, templateIds: ids.slice(0, 3) };
  },

  /** Sets `wakeTime`. */
  setWakeTime(
    prev: CoreState,
    _ctx: { today: string },
    hhmm: string
  ): CoreState {
    return { ...prev, wakeTime: hhmm };
  },

  /** Sets `personalisedAt` to `ctx.today`. */
  markPersonalised(prev: CoreState, ctx: { today: string }): CoreState {
    return { ...prev, personalisedAt: ctx.today };
  },

  /** Sets `personaliseDismissed` to true. */
  dismissPersonalise(prev: CoreState): CoreState {
    return { ...prev, personaliseDismissed: true };
  },

  /** Sets `welcomeBackDue` to false. */
  acknowledgeWelcomeBack(prev: CoreState): CoreState {
    return { ...prev, welcomeBackDue: false };
  },
};
