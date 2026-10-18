"use client";

/**
 * Durable user state store for the Unpause demo.
 *
 * Owns the persona selection, the active reason/template/value lists, the
 * activity log, and the check-in history. State survives page reloads via
 * localStorage. `FlowProvider` is deliberately memory-only (one session's
 * in-progress flow); adding persistence there would break its hydration
 * invariant. This provider is the separate container that keeps both stores'
 * invariants intact.
 *
 * Hydration rule (from ScaffoldAndCiMap.md): the first render — server
 * prerender and first client render — must produce identical output. Therefore
 * localStorage is never read at render time. `useState(PER_NEW_SEED)` sets the
 * initial value; the mount `useEffect` reads localStorage and, if a saved blob
 * exists, updates state. A missing or corrupt blob silently falls back to
 * PER_NEW_SEED.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import type { LogEntry, CheckIn, EnergyLevel, DayPlan, PlanInput } from "@/lib/domain/types";
import { getPersonas, getPersonaSeed } from "@/lib/repo/persona-repo";
import { getTemplatesForReasons } from "@/lib/repo/reason-repo";
import { localDateString, isWelcomeBackDue, latestDate } from "@/lib/domain/day";
import { planDay, addDays } from "@/lib/domain/planner";
import { getTemplates, getTemplateItems } from "@/lib/repo/template-repo";
import { getActivities } from "@/lib/repo/activity-repo";

// ─── Storage key ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "unpause.demo.v2";

/**
 * Minimum whole-day absence before the "Welcome back" screen is shown.
 * Checked in the mount effect and in loadPersona.
 */
const WELCOME_BACK_GAP_DAYS = 4;

// ─── Internal state type ──────────────────────────────────────────────────────

type UserDataState = {
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

// ─── Per-new seed ─────────────────────────────────────────────────────────────

/**
 * The empty starting state — used on first render and after resetDemoData.
 * "per-new" signals that intake has not been configured yet; callers that
 * receive empty arrays should interpret them as "not configured", not as
 * "data missing" (consistent with persona-repo.ts comment).
 */
const PER_NEW_SEED: UserDataState = {
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

// ─── Initial state factory ───────────────────────────────────────────────────

/**
 * Returns a fresh copy of the mount-default state — the same defaults used
 * when no stored blob exists on mount. Both the mount no-blob branch and
 * `resetDemoData` call this so the two paths stay in sync when a new field is
 * added: add the field once to `PER_NEW_SEED`, and both paths inherit the
 * correct default automatically.
 */
function buildInitialState(): UserDataState {
  return { ...PER_NEW_SEED };
}

// ─── Persist helper ───────────────────────────────────────────────────────────

/**
 * Writes the full state blob to localStorage. The try/catch is required:
 * storage throws in private-browsing mode, on quota exceeded, and in Vitest
 * environments. The app remains fully functional in memory when writes fail.
 */
function persist(s: UserDataState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable — continue in-memory only.
  }
}

// ─── Context type ─────────────────────────────────────────────────────────────

export type UserDataContext = {
  // Non-persisted derived state
  hydrated: boolean;
  today: string;
  // Persisted state
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
  // Actions
  recordActivity: (entry: LogEntry) => void;
  recordCheckIn: (energy: EnergyLevel) => void;
  startDay: (energy: EnergyLevel) => void;
  clearTodayPlan: () => void;
  setReasons: (ids: string[]) => void;
  setValues: (ids: string[]) => void;
  setTemplates: (ids: string[]) => void;
  setWakeTime: (hhmm: string) => void;
  markStarted: () => void;
  markPersonalised: () => void;
  dismissPersonalise: () => void;
  acknowledgeWelcomeBack: () => void;
  loadPersona: (id: string) => void;
  resetDemoData: () => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const UserDataCtx = createContext<UserDataContext | null>(null);

/**
 * Returns the UserDataContext value.
 * Throws when called outside a UserDataProvider — the null default is
 * intentional to make misuse fail loudly at development time rather than
 * silently producing empty arrays.
 */
export function useUserData(): UserDataContext {
  const ctx = useContext(UserDataCtx);
  if (ctx === null) {
    throw new Error("useUserData must be used within UserDataProvider");
  }
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Wraps children with durable user state.
 *
 * Must be placed above any component that calls `useUserData`. The parent is
 * responsible for ensuring the provider is rendered only once in the tree
 * (typically in a root layout). State is initialised to `PER_NEW_SEED` so
 * the server prerender and first client render produce identical HTML; the
 * mount effect then rehydrates from localStorage if a saved blob exists.
 */
export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UserDataState>(PER_NEW_SEED);
  /**
   * today is set once in the mount effect via localDateString(new Date()) so
   * all actions share the same local calendar date for the session. Not in
   * UserDataState because it must never be stale from a previous session.
   */
  const [today, setToday] = useState<string>("");
  /**
   * Becomes true after the mount effect rehydrates from localStorage. Components
   * that depend on the final hydrated state (e.g. Today) wait for this before
   * making routing decisions.
   */
  const [hydrated, setHydrated] = useState<boolean>(false);

  // Mount effect: derive today, rehydrate from localStorage, then set hydrated.
  // localStorage must never be read at render time (hydration mismatch rule).
  useEffect(() => {
    const todayVal = localDateString(new Date());
    setToday(todayVal);

    let parsedOrDefault: UserDataState = buildInitialState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        parsedOrDefault = JSON.parse(raw) as UserDataState;
      }
    } catch {
      // Corrupt or unavailable storage — keep PER_NEW_SEED.
    }

    // Remove stale v1 blob; failure here must not abort the rest of the mount.
    try {
      localStorage.removeItem("unpause.demo.v1");
    } catch {
      // Storage unavailable — ignore.
    }

    // Compute welcomeBackDue BEFORE writing lastOpenedDate; writing first would
    // always produce a gap of zero and suppress the welcome-back screen.
    const welcomeBackDue = isWelcomeBackDue(
      parsedOrDefault.lastOpenedDate,
      todayVal,
      WELCOME_BACK_GAP_DAYS
    );
    setState({ ...parsedOrDefault, welcomeBackDue });

    setHydrated(true);

    // Record today as the last opened date (after the gap check above).
    setState((prev) => {
      const next = { ...prev, lastOpenedDate: todayVal };
      persist(next);
      return next;
    });
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Appends a log entry. The caller sets `id` and `dayOffset: 0` for today.
   * Uses the functional update form so concurrent renders compose correctly.
   */
  function recordActivity(entry: LogEntry): void {
    setState((prev) => {
      const next = { ...prev, log: [...prev.log, entry] };
      persist(next);
      return next;
    });
  }

  /**
   * Appends a check-in for today. Uses the `today` state variable (set in the
   * mount effect via localDateString) so the date is always local, not UTC.
   */
  function recordCheckIn(energy: EnergyLevel): void {
    setState((prev) => {
      const entry: CheckIn = { date: today, energy };
      const next = { ...prev, checkIns: [...prev.checkIns, entry] };
      persist(next);
      return next;
    });
  }

  /**
   * Sets active reasons and derives the rank-1 template per reason.
   *
   * For each `reasonId` in `ids`, calls `getTemplatesForReasons([reasonId])`
   * and takes the first result's id. The collected ids are deduplicated
   * (preserving first-seen order via a Set) and capped at 3. The at-most-3 cap
   * matches the concept's template-count limit and prevents an over-full plan.
   */
  function setReasons(ids: string[]): void {
    const seen = new Set<string>();
    for (const rid of ids) {
      const templates = getTemplatesForReasons([rid]);
      const first = templates[0]?.id;
      if (first && !seen.has(first)) seen.add(first);
    }
    const templateIds = [...seen].slice(0, 3);

    setState((prev) => {
      const next = { ...prev, reasonIds: ids, templateIds };
      persist(next);
      return next;
    });
  }

  /**
   * Loads a demo persona's configuration and seed history into state.
   *
   * For non-new personas: derives startedAt and personalisedAt from the earliest
   * history date, lastOpenedDate from the latest history date, and recomputes
   * welcomeBackDue before writing state. For "per-new" all new fields are reset
   * to their PER_NEW_SEED defaults.
   *
   * `wakeTime` and `valueIds` are cast via `unknown` because the Persona
   * interface omits them (planner does not yet consume them); the cast avoids
   * widening the interface prematurely.
   *
   * Must be called after mount (today state must be set); "use client" prevents
   * the server path.
   */
  function loadPersona(id: string): void {
    const personas = getPersonas();
    const persona = personas.find((p) => p.id === id);
    if (!persona) return;

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
      const earliest = allDates.length > 0
        ? [...allDates].sort()[0]
        : today;
      startedAt = earliest;
      personalisedAt = earliest;
      lastOpenedDate = latestDate([...checkIns.map((c) => c.date), ...log.map((e) => e.date)]);
      welcomeBackDue = isWelcomeBackDue(lastOpenedDate, today, WELCOME_BACK_GAP_DAYS);
      personaliseDismissed = true;
      wakeTime = rawWakeTime;
    }

    setState(() => {
      const next: UserDataState = {
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
      };
      persist(next);
      return next;
    });
  }

  /**
   * Builds today's day plan from the user's active templates and appends a
   * check-in. The check-in is recorded first so Today does not re-ask the
   * energy question on days where planDay returns no activities (empty plan).
   */
  function startDay(energy: EnergyLevel): void {
    // Record the check-in before the plan so an empty-plan day is still marked.
    recordCheckIn(energy);

    const templates = getTemplates().filter((t) => state.templateIds.includes(t.id));
    const items = state.templateIds.flatMap((id) => getTemplateItems(id));
    const activities = getActivities();
    const log = state.log.map((e) =>
      typeof e.dayOffset === "number" ? { ...e, date: addDays(today, e.dayOffset) } : e
    );
    const input: PlanInput = { today, energy, templates, items, activities, log };
    const plan = planDay(input);
    const todayPlan = { date: today, energy, plan };
    setState((prev) => {
      const next = { ...prev, todayPlan };
      persist(next);
      return next;
    });
  }

  /**
   * Clears today's plan so the Today screen returns to State A (energy selection).
   * Callable only before any activity for today has been logged — Today enforces
   * this via the `anyLogged` guard, which hides the "Change energy" button once any
   * card has been completed or skipped.
   */
  function clearTodayPlan(): void {
    setState((prev) => {
      const next = { ...prev, todayPlan: null };
      persist(next);
      return next;
    });
  }

  /** Records the date the user first tapped "Start" (onboarding step 1). */
  function markStarted(): void {
    setState((prev) => {
      const next = { ...prev, startedAt: today };
      persist(next);
      return next;
    });
  }

  /** Stores up to three value ids selected during onboarding. */
  function setValues(ids: string[]): void {
    setState((prev) => {
      const next = { ...prev, valueIds: ids.slice(0, 3) };
      persist(next);
      return next;
    });
  }

  /**
   * Stores up to three template ids. The caller must ensure at least one id is
   * passed — the store does not enforce the minimum (that is a UI concern).
   */
  function setTemplates(ids: string[]): void {
    setState((prev) => {
      const next = { ...prev, templateIds: ids.slice(0, 3) };
      persist(next);
      return next;
    });
  }

  /** Stores the user's preferred wake time as "HH:MM". */
  function setWakeTime(hhmm: string): void {
    setState((prev) => {
      const next = { ...prev, wakeTime: hhmm };
      persist(next);
      return next;
    });
  }

  /** Records today as the date personalisation was completed. */
  function markPersonalised(): void {
    setState((prev) => {
      const next = { ...prev, personalisedAt: today };
      persist(next);
      return next;
    });
  }

  /** Permanently hides the personalise prompt without completing it. */
  function dismissPersonalise(): void {
    setState((prev) => {
      const next = { ...prev, personaliseDismissed: true };
      persist(next);
      return next;
    });
  }

  /** Clears the welcome-back flag after the user has seen the screen. */
  function acknowledgeWelcomeBack(): void {
    setState((prev) => {
      const next = { ...prev, welcomeBackDue: false };
      persist(next);
      return next;
    });
  }

  /**
   * Clears localStorage and resets all user state to mount-default values.
   *
   * Does not reset `today` or `hydrated` — both are re-derived from the system
   * clock on mount and must not be cleared mid-session. The entry redirect at
   * `/` guards on `hydrated`; resetting it here would leave the redirect stuck
   * because the provider does not unmount on navigation, so the mount effect
   * would not re-fire. After this call, the store's `startedAt` is null, which
   * causes the entry redirect to send the user to `/welcome`.
   */
  function resetDemoData(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable — continue in-memory.
    }
    setState(buildInitialState());
  }

  // ── Context value ──────────────────────────────────────────────────────────

  const value: UserDataContext = {
    hydrated,
    today,
    personaId: state.personaId,
    reasonIds: state.reasonIds,
    templateIds: state.templateIds,
    valueIds: state.valueIds,
    log: state.log,
    checkIns: state.checkIns,
    startedAt: state.startedAt,
    personalisedAt: state.personalisedAt,
    personaliseDismissed: state.personaliseDismissed,
    wakeTime: state.wakeTime,
    lastOpenedDate: state.lastOpenedDate,
    welcomeBackDue: state.welcomeBackDue,
    todayPlan: state.todayPlan,
    recordActivity,
    recordCheckIn,
    startDay,
    clearTodayPlan,
    setReasons,
    setValues,
    setTemplates,
    setWakeTime,
    markStarted,
    markPersonalised,
    dismissPersonalise,
    acknowledgeWelcomeBack,
    loadPersona,
    resetDemoData,
  };

  return <UserDataCtx.Provider value={value}>{children}</UserDataCtx.Provider>;
}
