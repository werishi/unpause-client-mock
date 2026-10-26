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
import personaMediaJson from "@/data/persona-media.json";
import type { Persona, CharacterCard, LogEntry, CheckIn, EnergyLevel } from "../domain/types";
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
 * Shape of a single persona's media seed entry in `data/persona-media.json`.
 *
 * `interests` and `digestTimes` are copied directly into store state when the
 * persona is loaded; the domain layer uses them to compose the digest and to
 * decide when to surface the digest card. `estimateMinutes` and `budgetMinutes`
 * populate `media` in the store. `mediaMinutesByDayOffset` uses integer-string
 * keys matching the log-seed convention (day 0 = today, negative = past days);
 * `loadPersona` in `user-store.tsx` converts these to absolute ISO date strings
 * using `addDays` before writing them to `mediaMinutesByDate`.
 *
 * Only personas with deliberate media history have an entry here; `null` from
 * `getPersonaMediaSeed` means the persona keeps the store defaults (empty
 * interests, null estimate/budget, no logged minutes).
 */
export interface PersonaMediaSeed {
  interests: string[];
  digestTimes: string[];
  estimateMinutes: number;
  budgetMinutes: number;
  mediaMinutesByDayOffset: Record<string, number>;
}

/**
 * Returns the media seed for a given persona id, or `null` if none is defined.
 *
 * Called by `loadPersona` in `user-store.tsx` after the main persona seed is
 * applied, so that interests, digest times, and the weekly media log are
 * initialised together with the rest of the persona state.
 *
 * @param id - The `per-*` id of the persona.
 */
export function getPersonaMediaSeed(id: string): PersonaMediaSeed | null {
  return (personaMediaJson as Record<string, PersonaMediaSeed>)[id] ?? null;
}

/**
 * Returns all demo personas from `data/personas.json`.
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
 * Returns the personas shown as character cards on the login screen, in seed order.
 *
 * Two exclusions: `per-new` (the fresh start, not a character) and any persona without
 * a `profile`. A missing profile is dropped silently rather than thrown, because a throw
 * here would blank the whole login page; the persona-repo test catches a silent drop.
 */
export function getCharacterCards(): CharacterCard[] {
  return getPersonas()
    .filter((p) => p.id !== "per-new")
    .filter((p): p is CharacterCard => p.profile !== undefined);
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
  sharedActivities: { id: string; activityId: string; date: string }[];
} {
  const filteredCheckIns = (checkInsJson as unknown as RawCheckIn[]).filter(
    (c) => c.personaId === personaId,
  );
  const filteredLog = (personaLogJson as unknown as RawLogEntry[]).filter(
    (e) => e.personaId === personaId,
  );

  // Resolve the persona's sharedActivities from personas.json. Each raw entry
  // carries only { activityId, dayOffset } — no id — so IDs are generated here
  // following the same prefix-name-sequence convention as the checkin/log seed
  // files (e.g., "sha-jonas-01"). The short name is the personaId with "per-"
  // stripped, which matches how checkin IDs like "chk-jonas-01" are formed.
  // Absent or empty sharedActivities always yields [] — no optional-chaining
  // errors and no difference in store shape for personas that have no buddy.
  const persona = (personasJson as unknown as Persona[]).find(
    (p) => p.id === personaId,
  );
  const shortName = personaId.slice(4); // strips "per-" prefix, e.g. "per-jonas" → "jonas"
  const sharedActivities = (persona?.sharedActivities ?? []).map(
    ({ activityId, dayOffset }, i) => ({
      id: `sha-${shortName}-${String(i + 1).padStart(2, "0")}`,
      activityId,
      date: addDays(today, dayOffset),
    }),
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
    sharedActivities,
  };
}
