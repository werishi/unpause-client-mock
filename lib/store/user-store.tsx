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

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { LogEntry, CheckIn, EnergyLevel } from "@/lib/domain/types";
import { getPersonas, getPersonaSeed } from "@/lib/repo/persona-repo";
import { getTemplatesForReasons } from "@/lib/repo/reason-repo";

// ─── Storage key ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "unpause.demo.v1";

// ─── Internal state type ──────────────────────────────────────────────────────

type UserDataState = {
  personaId: string;
  reasonIds: string[];
  templateIds: string[];
  valueIds: string[];
  log: LogEntry[];
  checkIns: CheckIn[];
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
};

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
  personaId: string;
  reasonIds: string[];
  templateIds: string[];
  valueIds: string[];
  log: LogEntry[];
  checkIns: CheckIn[];
  recordActivity: (entry: LogEntry) => void;
  recordCheckIn: (energy: EnergyLevel) => void;
  setReasons: (ids: string[]) => void;
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
   * Populated once in the mount useEffect with today's UTC date in YYYY-MM-DD
   * format. Passed to getPersonaSeed so it can resolve dayOffset values without
   * calling new Date() internally — keeping getPersonaSeed deterministic and
   * testable. The ref avoids adding `today` as a useEffect dependency, which
   * would rerun the effect on every render.
   */
  const todayRef = useRef<string>("");

  // Mount effect: set todayRef and rehydrate from localStorage.
  // localStorage must never be read at render time (hydration mismatch rule).
  useEffect(() => {
    todayRef.current = new Date().toISOString().slice(0, 10);

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as UserDataState;
        setState(parsed);
      }
    } catch {
      // Corrupt or unavailable storage — keep PER_NEW_SEED.
    }
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
   * Appends a check-in for today. CheckIn shape is `{ date, energy }` (Part 1
   * types.ts) — the date is today's UTC ISO date, matching the planner's
   * Date.UTC arithmetic for consistency.
   */
  function recordCheckIn(energy: EnergyLevel): void {
    const today = new Date().toISOString().slice(0, 10);
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
   * Reads persona fields from getPersonas(), resolves seed history via
   * getPersonaSeed(), and merges them. For "per-new" the seed is empty; the
   * persona's own field values (empty arrays) are used. The `todayRef` is used
   * as the reference date for resolving dayOffset values — it is populated by
   * the mount useEffect, so loadPersona must not be called before the provider
   * has mounted. Calling it on the server (e.g. in a Server Component) would
   * produce an empty string for todayRef.current, but the "use client" directive
   * prevents that path.
   *
   * `valueIds` is read from the raw persona data (present in personas.json)
   * rather than from the Persona TypeScript interface, which omits the field
   * because the planner does not yet consume it. Cast via `unknown` to avoid a
   * type error without widening the Persona interface prematurely.
   */
  function loadPersona(id: string): void {
    const personas = getPersonas();
    const persona = personas.find((p) => p.id === id);
    if (!persona) return;

    const rawValueIds =
      (persona as unknown as { valueIds?: string[] }).valueIds ?? [];

    let log: LogEntry[] = [];
    let checkIns: CheckIn[] = [];

    if (id !== "per-new") {
      const seed = getPersonaSeed(id, todayRef.current);
      log = seed.log as LogEntry[];
      checkIns = seed.checkIns as CheckIn[];
    }

    setState(() => {
      const next: UserDataState = {
        personaId: id,
        reasonIds: persona.reasonIds,
        templateIds: persona.templateIds,
        valueIds: rawValueIds,
        log,
        checkIns,
      };
      persist(next);
      return next;
    });
  }

  /**
   * Clears localStorage and resets state to PER_NEW_SEED.
   * Useful for the demo-reset button on the settings screen.
   */
  function resetDemoData(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable — continue in-memory.
    }
    setState(PER_NEW_SEED);
  }

  // ── Context value ──────────────────────────────────────────────────────────

  const value: UserDataContext = {
    personaId: state.personaId,
    reasonIds: state.reasonIds,
    templateIds: state.templateIds,
    valueIds: state.valueIds,
    log: state.log,
    checkIns: state.checkIns,
    recordActivity,
    recordCheckIn,
    setReasons,
    loadPersona,
    resetDemoData,
  };

  return <UserDataCtx.Provider value={value}>{children}</UserDataCtx.Provider>;
}
