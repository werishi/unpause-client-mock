/**
 * Data-access layer for persona seed data.
 *
 * Provides the five demo personas and their historical seed data (check-ins
 * and log entries). The only permitted importers of `@/data/personas.json`,
 * `@/data/persona-checkins.json`, and `@/data/persona-log.json`; pages and
 * feature modules must use this module rather than importing those files
 * directly (the ESLint `no-restricted-imports` rule allows `@/data` imports
 * only in `lib/repo/**`).
 *
 * `getPersonaSeed` accepts a `today` parameter rather than calling
 * `new Date()` internally so integration tests and the demo-reset flow can
 * pass a fixed date and receive deterministic output.
 */

import personasJson from "@/data/personas.json";
import checkInsJson from "@/data/persona-checkins.json";
import personaLogJson from "@/data/persona-log.json";
import type { Persona, LogEntry, CheckIn, EnergyLevel } from "../domain/types";
import { addDays } from "../domain/planner";

/** Raw shape of a row in `data/persona-checkins.json`. */
type RawCheckIn = {
  id: string;
  personaId: string;
  dayOffset: number;
  energy: EnergyLevel;
};

/** Raw shape of a row in `data/persona-log.json`. */
type RawLogEntry = {
  id: string;
  personaId: string;
  dayOffset: number;
  activityId: string;
  templateId: string;
  outcome: "done" | "skip";
  version?: string;
  moodBefore?: number;
  moodAfter?: number;
};

/**
 * Returns all five demo personas from `data/personas.json`.
 *
 * No transformation is applied — the raw JSON array is cast to `Persona[]`.
 * The `per-new` persona has empty `reasonIds`, `templateIds`, and `valueIds`;
 * a caller that receives empty arrays here should interpret them as "intake not
 * yet configured", not as "data missing".
 */
export function getPersonas(): Persona[] {
  return personasJson as unknown as Persona[];
}

/**
 * Resolves a single persona's historical seed rows to concrete ISO date strings.
 *
 * Reads `data/persona-checkins.json` and `data/persona-log.json`, filters for
 * rows matching `personaId`, then shifts each row's `dayOffset` by `today` to
 * produce a `date` field in `"YYYY-MM-DD"` format. The original `dayOffset`
 * field is preserved on every returned row so the `CheckIn` and `LogEntry`
 * interface shapes remain valid for callers that need both representations.
 *
 * @param personaId - The `per-*` id of the persona whose rows are returned.
 * @param today - The reference date in `"YYYY-MM-DD"` format. Supplied by the
 *   caller rather than read from the system clock so that tests can pass a
 *   fixed date and receive deterministic output; a repo that calls `new Date()`
 *   internally cannot be tested without mocking the global clock.
 */
export function getPersonaSeed(
  personaId: string,
  today: string,
): {
  log: (LogEntry & { date: string })[];
  checkIns: (CheckIn & { date: string })[];
} {
  const filteredCheckIns = (checkInsJson as unknown as RawCheckIn[]).filter(
    (c) => c.personaId === personaId,
  );
  const filteredLog = (personaLogJson as unknown as RawLogEntry[]).filter(
    (e) => e.personaId === personaId,
  );

  // addDays uses consistent UTC arithmetic and avoids the UTC-parse / local-setDate
  // mismatch that caused near-midnight off-by-one errors with new Date(today).setDate().
  return {
    checkIns: filteredCheckIns.map(({ dayOffset, ...rest }) => ({
      ...rest,
      date: addDays(today, dayOffset),
    })) as (CheckIn & { date: string })[],
    log: filteredLog.map(({ dayOffset, ...rest }) => ({
      ...rest,
      date: addDays(today, dayOffset),
    })) as (LogEntry & { date: string })[],
  };
}
