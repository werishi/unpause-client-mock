/**
 * Sharing slice — persisted state for Therapist Access and Sharing.
 *
 * Owns the single optional linked therapist (name + local link date), one
 * on/off switch per `ShareType`, and the list of therapist-set homework items.
 * Serves concept goals G8 (the app works fully without a therapist; with one it
 * supports therapy through sharing the user controls) and G11 (the user decides
 * what is shared).
 *
 * **Slice convention:** exports `SharingState`, `SHARING_DEFAULTS` and named
 * pure reducers, following `buddy-slice.ts`. No React, no `"use client"`, no
 * `localStorage`, no `new Date()` — `today` and `linkedOn` are parameters, and
 * the provider supplies them. Never imports `store-state.ts` or another slice;
 * slices are composed in `store-state.ts` only. Imports from `lib/domain/` are
 * allowed (core-slice already imports `lib/domain/planner`).
 *
 * **Failure direction is always "share less".** Wherever a value is missing,
 * corrupt or ambiguous, the answer is "not shared". That is why every read of
 * the switches goes through `resolveSharing` (strict `=== true`), and why
 * `setShareSwitch` refuses while no therapist is linked.
 *
 * **Why `resolveSharing` iterates `SHARE_TYPES` instead of trusting the
 * stored object.** `sharing` is a nested object inside the flat blob, and
 * `hydrate()` merges only at the top level. A blob saved when `SHARE_TYPES`
 * had fewer entries therefore lacks the newer keys (the nested-object trap
 * documented in `digest-slice.ts`). Rebuilding the record from the list fills
 * every missing key with `false` and drops unknown keys. The stored partial is
 * kept as stored; it is resolved on read, not migrated.
 *
 * **Invariant: no switch on and no homework standing without a therapist.**
 * Enforced in the reducers (`setShareSwitch`, `unlinkTherapist`) and in the
 * persona translation (`sharingFromPersona`), not left to each page, so a stale
 * tab or a future caller cannot create "sharing with nobody".
 *
 * Fields are top-level on `UserDataState`. Nesting them under one key would
 * defeat `hydrate`'s top-level spread and make old blobs lose these defaults,
 * which would force a storage migration this target must not have.
 */

import { SHARE_TYPES } from "@/lib/domain/sharing";
import type { ShareType } from "@/lib/domain/sharing";
import type { Persona } from "@/lib/domain/types";
import { addDays } from "@/lib/domain/planner";

export { SHARE_TYPES } from "@/lib/domain/sharing";
export type { ShareType } from "@/lib/domain/sharing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * One standing homework task set by the linked therapist.
 *
 * `homeworkId` is the stable handle for `removeHomework` and for matching a
 * plan card to its standing item. Seeded ids follow `hw-{shortName}-{nn}`
 * (persona id without the `per-` prefix, two-digit running number from 01),
 * matching the `sha-*` / `chk-*` naming. `date` is an ISO local date
 * (`YYYY-MM-DD`); items before today are pruned in `startDay`.
 */
export type HomeworkItem = {
  homeworkId: string;
  activityId: string;
  date: string;
};

/**
 * Persisted therapist/sharing state. All three fields are top-level on the
 * flat `UserDataState` blob.
 *
 * `therapist.linkedOn` is a local `YYYY-MM-DD` date, not a timestamp: the
 * therapist preview counts days from it, and a date has no timezone to drift.
 * `sharing` may be stored partial (see module doc); read it only through
 * `resolveSharing`.
 */
export type SharingState = {
  therapist: { name: string; linkedOn: string } | null;
  sharing: Partial<Record<ShareType, boolean>>;
  homework: HomeworkItem[];
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/**
 * Initial values: no therapist, every switch off, no homework — a user who
 * never links a therapist sees no change at all.
 *
 * Never spread this constant's `sharing` or `homework` into state; that would
 * share references and let one reducer mutate the defaults. Call
 * `resolveSharing({})` and use a fresh `[]` instead, as `buildInitialState()`
 * in `store-state.ts` does.
 */
export const SHARING_DEFAULTS: SharingState = {
  therapist: null,
  sharing: {
    moodRatings: false,
    activityLog: false,
    weekSummary: false,
    safetyPlan: false,
  },
  homework: [],
};

/**
 * How many days before `today` a seeded persona's therapist link is dated.
 * Concept §2.9: the persona has been linked for two weeks so that the 14-day
 * therapist preview window has history behind it.
 */
export const PERSONA_LINKED_DAYS_AGO = 14;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Returns a NEW full switch record with one entry per `SHARE_TYPES` key, each
 * `true` only when the stored value is exactly `true`. Missing keys, unknown
 * keys and corrupt values (e.g. `"yes"`) all read as "not shared". Every read
 * of switches anywhere in the app goes through this.
 */
export function resolveSharing(
  s: Partial<Record<ShareType, boolean>> | null | undefined,
): Record<ShareType, boolean> {
  const out = {} as Record<ShareType, boolean>;
  for (const type of SHARE_TYPES) {
    out[type] = s?.[type] === true;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Reducers
// ---------------------------------------------------------------------------

/**
 * Links a therapist. `name` is trimmed; an empty result returns the same
 * `state` object unchanged. `linkedOn` is the caller's local date (the
 * provider passes `today`). `sharing` becomes `resolveSharing(initialSharing)`
 * — all off unless the linking step passed choices — never the raw argument,
 * so the stored record is always full. `homework` is unchanged.
 */
export function linkTherapist(
  state: SharingState,
  name: string,
  linkedOn: string,
  initialSharing?: Partial<Record<ShareType, boolean>>,
): SharingState {
  const trimmed = name.trim();
  if (trimmed === "") return state;
  return {
    ...state,
    therapist: { name: trimmed, linkedOn },
    sharing: resolveSharing(initialSharing),
  };
}

/**
 * Turns one share type on or off. Returns the same `state` while no therapist
 * is linked (no switch may be on without one) or when the value would not
 * change. Otherwise stores a full record built from `resolveSharing`.
 */
export function setShareSwitch(
  state: SharingState,
  type: ShareType,
  on: boolean,
): SharingState {
  if (state.therapist === null) return state;
  const current = resolveSharing(state.sharing);
  if (current[type] === on) return state;
  return { ...state, sharing: { ...current, [type]: on } };
}

/**
 * Unlinks the therapist, turns every switch off and empties `homework` in one
 * step. Standing homework belongs to the therapist; with no therapist it has no
 * owner, and leaving it would keep "From your therapist" cards for nobody.
 */
export function unlinkTherapist(state: SharingState): SharingState {
  return {
    ...state,
    therapist: null,
    sharing: resolveSharing({}),
    homework: [],
  };
}

/**
 * Removes the homework item with `homeworkId`. An unknown id returns the same
 * `state` — a page reload may already have pruned it.
 */
export function removeHomework(
  state: SharingState,
  homeworkId: string,
): SharingState {
  const next = state.homework.filter((h) => h.homeworkId !== homeworkId);
  if (next.length === state.homework.length) return state;
  return { ...state, homework: next };
}

/**
 * Keeps items dated today or later (ISO dates compare lexically). Array-level
 * so `coreReducers.startDay` can call it the same way it filters
 * `sharedActivities`, without a full `SharingState`. Always returns a new array.
 */
export function pruneHomeworkItems(
  items: HomeworkItem[],
  today: string,
): HomeworkItem[] {
  return items.filter((h) => h.date >= today);
}

/**
 * State-level wrapper around `pruneHomeworkItems`; returns the same `state`
 * when nothing was removed.
 */
export function pruneHomework(state: SharingState, today: string): SharingState {
  const next = pruneHomeworkItems(state.homework, today);
  if (next.length === state.homework.length) return state;
  return { ...state, homework: next };
}

// ---------------------------------------------------------------------------
// Persona seeding
// ---------------------------------------------------------------------------

/**
 * Translates a persona row into the three store fields. Used by `loadPersona`,
 * whose state starts from `buildInitialState()`, so without this a persona
 * carrying a therapist would load with none.
 *
 * Without `seed.therapist` it returns fresh defaults and ignores `seed.sharing`
 * and `seed.homework` (no switches or homework without a therapist). With one,
 * `linkedOn` is `PERSONA_LINKED_DAYS_AGO` days before `today`, the switches
 * are resolved, and each homework entry becomes
 * `{ homeworkId: "hw-{shortName}-{nn}", activityId, date: today + dayOffset }`
 * in seed order.
 */
export function sharingFromPersona(
  seed: Pick<Persona, "therapist" | "sharing" | "homework">,
  personaId: string,
  today: string,
): SharingState {
  if (seed.therapist === undefined) {
    return { therapist: null, sharing: resolveSharing({}), homework: [] };
  }
  const shortName = personaId.replace(/^per-/, "");
  const homework: HomeworkItem[] = (seed.homework ?? []).map((h, i) => ({
    homeworkId: `hw-${shortName}-${String(i + 1).padStart(2, "0")}`,
    activityId: h.activityId,
    date: addDays(today, h.dayOffset),
  }));
  return {
    therapist: {
      name: seed.therapist.name,
      linkedOn: addDays(today, -PERSONA_LINKED_DAYS_AGO),
    },
    sharing: resolveSharing(seed.sharing),
    homework,
  };
}
