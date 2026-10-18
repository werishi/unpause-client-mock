/**
 * Plan slice — persisted state for the /plan tab.
 *
 * Owns:
 *  - per-activity display overrides (cue, two-minute version, value tag) keyed by activity id
 *  - the "move-up" put-off token: the Monday ISO date of the week the user dismissed the offer
 *
 * Slice convention: exports exactly three names — `PlanState`, `PLAN_DEFAULTS`, `planReducers`.
 * No imports from other slice files; no React imports. Each reducer is a pure function that
 * returns a new object; it never mutates `prev` or any of its nested objects.
 *
 * `ActivityOverridePatch` is defined here (not in `lib/domain/types.ts`) because it is a
 * UI-personalisation shape with no domain logic. Placing it in domain types would blur the
 * layer boundary (Domain Notes Part 1). It is re-exported from `user-store.tsx` so that page
 * importers reach it from the same path as the store hooks — `user-store.tsx` never imports from
 * its own re-export, so there is no cycle.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Fields a user may override on a catalogue activity for personal display.
 * Defined in the store layer (not domain/types.ts) — see module doc.
 */
export type ActivityOverridePatch = {
  cue?: string;
  twoMinuteVersion?: string;
  valueTag?: string;
};

/**
 * Persisted slice for the Plan tab. Both fields are top-level properties on the flat blob
 * (`UserDataState`); they must never be nested under a key, or the hydration spread breaks.
 */
export type PlanState = {
  activityOverrides: Record<string, ActivityOverridePatch>;
  moveUpPutOff: string | null;
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/**
 * Initial values for `PlanState`. `buildInitialState()` in `store-state.ts` does not spread this
 * directly into the returned object — it re-allocates the `activityOverrides` record to prevent
 * callers from accidentally sharing the constant's reference.
 */
export const PLAN_DEFAULTS: PlanState = {
  activityOverrides: {},
  moveUpPutOff: null,
};

// ---------------------------------------------------------------------------
// Reducers
// ---------------------------------------------------------------------------

/**
 * Pure reducers over `PlanState`. Each has the signature
 * `(prev: PlanState, ctx: { today: string }, ...args) => PlanState`.
 *
 * The `ctx` parameter must be present even when unused because `bind()` in the provider always
 * passes it (typed by the `Bound<R>` mapped type in `user-store.tsx`).
 *
 * None of these functions mutates `prev` or `prev.activityOverrides`.
 */
export const planReducers = {
  /**
   * Stores or replaces the override patch for one activity.
   * Caller: the /plan/activity edit screen's save action.
   */
  setActivityOverride(
    prev: PlanState,
    _ctx: { today: string },
    activityId: string,
    patch: ActivityOverridePatch,
  ): PlanState {
    return {
      ...prev,
      activityOverrides: { ...prev.activityOverrides, [activityId]: patch },
    };
  },

  /**
   * Removes the override for one activity, reverting it to catalogue defaults.
   * Caller: the /plan/activity edit screen's "reset to default" action.
   */
  clearActivityOverride(
    prev: PlanState,
    _ctx: { today: string },
    activityId: string,
  ): PlanState {
    const newObj = { ...prev.activityOverrides };
    delete newObj[activityId];
    return { ...prev, activityOverrides: newObj };
  },

  /**
   * Records that the user put off the move-up offer for this week.
   * `templateId` is stored as the offer token; the Plan tab hides the offer when
   * `moveUpPutOff` equals the current `weekDates(today)[0]` (Monday ISO date).
   *
   * Premise: at most one move-up offer is active at a time (only two template pairs have a
   * `nextTemplateId`), so a single string is sufficient — no set needed.
   */
  putOffMoveUp(
    prev: PlanState,
    _ctx: { today: string },
    templateId: string,
  ): PlanState {
    return { ...prev, moveUpPutOff: templateId };
  },
};
