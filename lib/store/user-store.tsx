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
 * localStorage is never read at render time. `useState(buildInitialState())`
 * sets the initial value; the mount `useEffect` reads localStorage and, if a
 * saved blob exists, updates state. A missing or corrupt blob silently falls
 * back to the initial defaults.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import type { LogEntry, CheckIn, EnergyLevel, DayPlan } from "@/lib/domain/types";
import { getPersonas, getPersonaSeed, getPersonaMediaSeed } from "@/lib/repo/persona-repo";
import { addDays } from "@/lib/domain/planner";
import { localDateString, isWelcomeBackDue, latestDate } from "@/lib/domain/day";
import { WELCOME_BACK_GAP_DAYS, coreReducers } from "./core-slice";
import { planReducers } from "./plan-slice";
import type { ActivityOverridePatch } from "./plan-slice";
import {
  grantComebackBonus, setReward, removeReward, markRewardReached,
  dismissRewardOffer, markReviewSeen, setReviewPreview, setPlainVersion,
} from "./look-back-slice";
import {
  reduceSetInterests, reduceSetDigestTimes, reduceMarkDigestSeen,
  reduceSetMediaEstimate, reduceSetMediaBudget, reduceSetMediaMinutesToday,
} from "./digest-slice";
import type { MediaState } from "./digest-slice";
import { reduceMarkCheckInReminderShown, reduceMarkDigestBannerShown } from "./banner-slice";
import {
  setBuddy, removeBuddy, addSharedActivity, removeSharedActivity, dismissBuddyOffer,
} from "./buddy-slice";
import type { SharedActivityItem } from "./buddy-slice";
import { setSafetyEntries, dismissSafetySetup } from "./safety-slice";
import {
  linkTherapist, setShareSwitch, unlinkTherapist, removeHomework, resolveSharing,
  sharingFromPersona,
} from "./sharing-slice";
import type { HomeworkItem } from "./sharing-slice";
import type { ShareType } from "@/lib/domain/sharing";
import { buildInitialState, hydrate } from "./store-state";
import type { UserDataState } from "./store-state";

// Re-exported so page importers reach it from the same path as the store hooks.
// No runtime code added; no circular import — plan-slice does not import from here.
export type { ActivityOverridePatch } from "./plan-slice";

// ─── Storage key ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "unpause.demo.v2";

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

// ─── Bound<R> mapped type ────────────────────────────────────────────────────

/**
 * Strips the first two parameters (`prev` and `ctx`) from each reducer and
 * wraps the remaining args in a void-returning function. Reducers that only
 * declare `prev` (no `ctx`) fall into the `() => void` branch.
 *
 * Module-scope because TypeScript does not allow generic type aliases inside
 * function bodies.
 */
type Bound<R extends Record<string, (prev: any, ...a: any[]) => any>> = {
  [K in keyof R]: R[K] extends (
    prev: any,
    ctx: { today: string },
    ...args: infer A
  ) => any
    ? (...args: A) => void
    : () => void;
};

// ─── Context type ─────────────────────────────────────────────────────────────

export type UserDataContext = {
  // Non-persisted derived state
  hydrated: boolean;
  today: string;
  // Persisted core state
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
  // Persisted plan state
  activityOverrides: Record<string, ActivityOverridePatch>;
  moveUpPutOff: string | null;
  // Persisted look-back state
  comebackGrants: string[];
  reward: { text: string; at: number; setOn: string } | null;
  rewardsReached: { text: string; at: number; reachedOn: string }[];
  rewardOfferDismissed: boolean;
  reviewSeen: { week: string | null; month: string | null };
  reviewPreview: boolean;
  plainVersion: boolean;
  // Core actions (bound reducers)
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
  // Plan actions (bound reducers)
  setActivityOverride: (activityId: string, patch: ActivityOverridePatch) => void;
  clearActivityOverride: (activityId: string) => void;
  putOffMoveUp: (templateId: string) => void;
  // Look-back actions (bound reducers)
  grantComebackBonus: (today: string) => void;
  setReward: (text: string, at: number, today: string) => void;
  removeReward: () => void;
  markRewardReached: (today: string) => void;
  dismissRewardOffer: () => void;
  markReviewSeen: (kind: "week" | "month", key: string) => void;
  setReviewPreview: (value: boolean) => void;
  setPlainVersion: (value: boolean) => void;
  // Persisted digest state
  interests: string[];
  digestTimes: string[];
  digestSeenSlot: string | null;
  media: MediaState;
  mediaMinutesByDate: Record<string, number>;
  // Digest and media actions
  setInterests: (interests: string[]) => void;
  setDigestTimes: (times: string[]) => void;
  markDigestSeen: (slotKey: string) => void;
  setMediaEstimate: (minutes: number) => void;
  setMediaBudget: (minutes: number) => void;
  setMediaMinutesToday: (minutes: number) => void;
  // Persisted banner state (BannerState fields, top-level on UserDataState)
  /**
   * Local day (`"YYYY-MM-DD"`, from `localDateString`) on which the check-in reminder banner last
   * had its moment, or null when it is armed. Equal to today means: do not show it again today.
   */
  checkInReminderShownDay: string | null;
  /**
   * Digest slot key (`"YYYY-MM-DD_HH:MM"`, from `currentDigestSlot`) for which the digest banner
   * was last shown, or null when it is armed. Independent of `digestSeenSlot`.
   */
  digestBannerShownSlot: string | null;
  // Banner actions
  /**
   * Records that the check-in reminder has had its moment on `day`. Persists immediately.
   * Call it at the moment the banner is displayed, or at the moment it is silenced because the
   * welcome-back screen already spoke today, from an effect and never from render.
   */
  markCheckInReminderShown: (day: string) => void;
  /**
   * Records that the digest banner was shown for `slotKey`. Persists immediately. Does not mark
   * the digest seen. Call it at the moment the banner is displayed, from an effect and never from
   * render.
   */
  markDigestBannerShown: (slotKey: string) => void;
  // Persisted buddy state (BuddyState fields, top-level on UserDataState)
  buddy: { name: string; agreedAt: string } | null;
  sharedActivities: SharedActivityItem[];
  buddyOfferDismissed: boolean;
  // Buddy actions (bound reducers from buddy-slice.ts)
  /** Records a buddy agreement. `agreedAt` is generated internally as `new Date().toISOString()`. */
  setBuddy: (name: string) => void;
  /** Removes the buddy and clears all shared activities atomically. */
  removeBuddy: () => void;
  /** Appends a shared activity item. Caller must supply a stable `id`. */
  addSharedActivity: (item: SharedActivityItem) => void;
  /** Removes the shared activity with the given `id`. No-op if id is absent. */
  removeSharedActivity: (id: string) => void;
  /** Sets buddyOfferDismissed permanently. No reset path (anti-nagging rule). */
  dismissBuddyOffer: () => void;
  // Persisted safety-plan state (SafetyState fields, top-level on UserDataState)
  safetyEntries: string[][];
  safetySetupDismissedWeek: string | null;
  // Safety-plan actions (bound reducers from safety-slice.ts)
  /** Replaces all six Stanley-Brown steps' entries at once. Stores copies; does not normalise. */
  setSafetyEntries: (entries: string[][]) => void;
  /** Hides the safety-plan setup card for the week starting `mondayDate` (YYYY-MM-DD) only. */
  dismissSafetySetup: (mondayDate: string) => void;
  // Persisted therapist/sharing state (SharingState fields, top-level on UserDataState)
  therapist: { name: string; linkedOn: string } | null;
  /**
   * Full switch record, already passed through `resolveSharing` — pages never
   * see the raw stored partial, so a missing or corrupt key reads as not shared.
   */
  sharing: Record<ShareType, boolean>;
  homework: HomeworkItem[];
  // Sharing actions (reducers from sharing-slice.ts)
  /**
   * Links a therapist; supplies `linkedOn` as `today`. A blank name is a no-op.
   * `initialSharing` carries the linking step's choices; omitted, all switches are off.
   */
  linkTherapist: (name: string, initialSharing?: Partial<Record<ShareType, boolean>>) => void;
  /** Turns one share type on or off. No-op while no therapist is linked. */
  setShareSwitch: (type: ShareType, on: boolean) => void;
  /** Unlinks the therapist, turns every switch off and drops all homework at once. */
  unlinkTherapist: () => void;
  /** Removes one homework item by id. No-op if the id is absent. */
  removeHomework: (homeworkId: string) => void;
  // Provider functions (not reducers — see module doc)
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
 * (typically in a root layout). State is initialised to `buildInitialState()`
 * so the server prerender and first client render produce identical HTML; the
 * mount effect then rehydrates from localStorage if a saved blob exists.
 */
export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UserDataState>(buildInitialState);
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

  // ── Update and bind helpers ────────────────────────────────────────────────

  /**
   * Single write point for all bound reducers. Runs `fn` over the previous
   * state, persists the result, and schedules a re-render.
   */
  function update(fn: (prev: UserDataState) => UserDataState): void {
    setState((prev) => {
      const next = fn(prev);
      persist(next);
      return next;
    });
  }

  /**
   * Turns each reducer in `reducers` into a void function that calls `update`.
   * `today` from the outer closure is forwarded as `ctx.today` so reducers
   * always receive the session date without a separate prop.
   *
   * The `Bound<R>` return type strips `prev` and `ctx` and exposes only the
   * caller-facing extra arguments.
   */
  function bind<R extends Record<string, (prev: any, ...a: any[]) => any>>(
    reducers: R
  ): Bound<R> {
    const result = {} as Bound<R>;
    for (const key in reducers) {
      const r = reducers[key] as any;
      (result as any)[key] = (...args: any[]) =>
        update((prev) => r(prev, { today }, ...args));
    }
    return result;
  }

  // Mount effect: derive today, rehydrate from localStorage, then set hydrated.
  // localStorage must never be read at render time (hydration mismatch rule).
  useEffect(() => {
    const todayVal = localDateString(new Date());
    setToday(todayVal);

    let raw: string | null = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage unavailable — keep initial state.
    }

    // Remove stale v1 blob; failure here must not abort the rest of the mount.
    try {
      localStorage.removeItem("unpause.demo.v1");
    } catch {
      // Storage unavailable — ignore.
    }

    // hydrate() computes welcomeBackDue from the STORED lastOpenedDate before
    // overwriting it with today — reversing the order suppresses the welcome-back
    // screen (see store-state.ts hydrate doc comment and original line 214–215).
    const result = hydrate(raw, todayVal);
    const hydratedState: UserDataState = {
      ...result.state,
      welcomeBackDue: result.welcomeBackDue,
    };
    setState(hydratedState);
    setHydrated(true);
    persist(hydratedState);
  }, []);

  // ── startDay override ────────────────────────────────────────────────────
  // `bind(coreReducers)` passes only `{ today }` as ctx; `startDay` also needs
  // `sharedActivities` and `homework` in ctx so it can prune past items and build
  // PlanInput.shared / PlanInput.homework; the spread writes both pruned lists back.
  // Wired individually here and overrides the bind-generated binding in the
  // context value so the correct implementation is always called.
  function startDayAction(energy: EnergyLevel): void {
    update((prev) => ({
      ...prev,
      ...coreReducers.startDay(
        prev,
        { today, sharedActivities: prev.sharedActivities, homework: prev.homework },
        energy
      ),
    }));
  }

  // ── LookBack action bindings ──────────────────────────────────────────────
  // These reducers take LookBackState directly (not via the bind helper's ctx
  // pattern) so they are wired individually here and listed explicitly in the
  // value prop below.

  function grantComebackBonusAction(today: string): void {
    setState((prev) => ({ ...prev, ...grantComebackBonus(prev, today) }));
  }
  function setRewardAction(text: string, at: number, today: string): void {
    setState((prev) => ({ ...prev, ...setReward(prev, text, at, today) }));
  }
  function removeRewardAction(): void {
    setState((prev) => ({ ...prev, ...removeReward(prev) }));
  }
  function markRewardReachedAction(today: string): void {
    setState((prev) => ({ ...prev, ...markRewardReached(prev, today) }));
  }
  function dismissRewardOfferAction(): void {
    setState((prev) => ({ ...prev, ...dismissRewardOffer(prev) }));
  }
  function markReviewSeenAction(kind: "week" | "month", key: string): void {
    setState((prev) => ({ ...prev, ...markReviewSeen(prev, kind, key) }));
  }
  function setReviewPreviewAction(value: boolean): void {
    setState((prev) => ({ ...prev, ...setReviewPreview(prev, value) }));
  }
  function setPlainVersionAction(value: boolean): void {
    setState((prev) => ({ ...prev, ...setPlainVersion(prev, value) }));
  }

  // ── Digest action bindings ────────────────────────────────────────────────
  // These reducers take DigestState directly (not via the bind helper's ctx
  // pattern), so they are wired individually and call update() for immediate
  // persistence — the digest fields (interests, budget) need to survive a page
  // refresh without a subsequent core or plan action to trigger persist.

  function setInterestsAction(interests: string[]): void {
    update((prev) => ({ ...prev, ...reduceSetInterests(prev, interests) }));
  }
  function setDigestTimesAction(times: string[]): void {
    update((prev) => ({ ...prev, ...reduceSetDigestTimes(prev, times) }));
  }
  function markDigestSeenAction(slotKey: string): void {
    update((prev) => ({ ...prev, ...reduceMarkDigestSeen(prev, slotKey) }));
  }
  // Banner bindings: same shape as markDigestSeenAction, so a shown-record survives a reload.
  function markCheckInReminderShownAction(day: string): void {
    update((prev) => ({ ...prev, ...reduceMarkCheckInReminderShown(prev, day) }));
  }
  function markDigestBannerShownAction(slotKey: string): void {
    update((prev) => ({ ...prev, ...reduceMarkDigestBannerShown(prev, slotKey) }));
  }
  function setMediaEstimateAction(minutes: number): void {
    update((prev) => ({ ...prev, ...reduceSetMediaEstimate(prev, minutes) }));
  }
  function setMediaBudgetAction(minutes: number): void {
    update((prev) => ({ ...prev, ...reduceSetMediaBudget(prev, minutes) }));
  }
  function setMediaMinutesTodayAction(minutes: number): void {
    update((prev) => ({
      ...prev,
      ...reduceSetMediaMinutesToday(prev, localDateString(new Date()), minutes),
    }));
  }

  // ── Buddy action bindings ─────────────────────────────────────────────────
  // These reducers take BuddyState directly (no ctx arg) so they are wired
  // individually and use update() so the buddy fields are persisted immediately.
  // `setBuddy` generates `agreedAt` here so the reducer stays pure.

  function setBuddyAction(name: string): void {
    update((prev) => ({ ...prev, ...setBuddy(prev, name, new Date().toISOString()) }));
  }
  function removeBuddyAction(): void {
    update((prev) => ({ ...prev, ...removeBuddy(prev) }));
  }
  function addSharedActivityAction(item: SharedActivityItem): void {
    update((prev) => ({ ...prev, ...addSharedActivity(prev, item) }));
  }
  function removeSharedActivityAction(id: string): void {
    update((prev) => ({ ...prev, ...removeSharedActivity(prev, id) }));
  }
  function dismissBuddyOfferAction(): void {
    update((prev) => ({ ...prev, ...dismissBuddyOffer(prev) }));
  }

  // ── Safety-plan action bindings ───────────────────────────────────────────
  // Same pattern as buddy: the reducers take SafetyState directly (no ctx arg),
  // so they cannot go through bind(); each is wired through update() so the
  // safety fields are persisted immediately.
  function setSafetyEntriesAction(entries: string[][]): void {
    update((prev) => ({ ...prev, ...setSafetyEntries(prev, entries) }));
  }
  function dismissSafetySetupAction(mondayDate: string): void {
    update((prev) => ({ ...prev, ...dismissSafetySetup(prev, mondayDate) }));
  }

  // ── Sharing action bindings ───────────────────────────────────────────────
  // Same pattern as buddy: the reducers take SharingState directly (no ctx arg),
  // so they cannot go through bind(); each uses update() so the change persists
  // at once. `linkTherapist` receives `today` here so the reducer stays pure.
  function linkTherapistAction(
    name: string,
    initialSharing?: Partial<Record<ShareType, boolean>>,
  ): void {
    update((prev) => ({ ...prev, ...linkTherapist(prev, name, today, initialSharing) }));
  }
  function setShareSwitchAction(type: ShareType, on: boolean): void {
    update((prev) => ({ ...prev, ...setShareSwitch(prev, type, on) }));
  }
  function unlinkTherapistAction(): void {
    update((prev) => ({ ...prev, ...unlinkTherapist(prev) }));
  }
  function removeHomeworkAction(homeworkId: string): void {
    update((prev) => ({ ...prev, ...removeHomework(prev, homeworkId) }));
  }

  // ── Provider functions ─────────────────────────────────────────────────────
  // loadPersona and resetDemoData stay here rather than becoming reducers
  // because their control flow cannot be expressed as a pure reducer:
  // loadPersona early-returns on an unknown id and must not persist in that
  // case; resetDemoData removes the localStorage key rather than persisting a
  // new blob (concept §2.0). Neither returns "new prev" — they set from scratch.

  /**
   * Loads a demo persona's configuration and seed history into state.
   *
   * For non-new personas: derives startedAt and personalisedAt from the earliest
   * history date, lastOpenedDate from the latest history date, and recomputes
   * welcomeBackDue before writing state. For "per-new" all new fields are reset
   * to their initial defaults.
   *
   * Also replaces the therapist link, sharing switches and homework with the
   * persona's (`sharingFromPersona`); a persona without a therapist loads
   * unlinked, all switches off, no homework.
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

    // Resolve media seed before setState so day-offset arithmetic uses the same
    // `today` that the main seed uses. Null when the persona has no media history
    // (per-new, per-sam, per-lea, per-ayla); defaults from buildInitialState() apply.
    const mediaSeed = getPersonaMediaSeed(id);
    const mediaMinutesByDate: Record<string, number> = {};
    if (mediaSeed) {
      for (const [offsetStr, minutes] of Object.entries(
        mediaSeed.mediaMinutesByDayOffset,
      )) {
        const offset = parseInt(offsetStr, 10);
        mediaMinutesByDate[addDays(today, offset)] = minutes;
      }
    }

    setState((prev) => {
      const next: UserDataState = {
        // Spreads plan-slice defaults (activityOverrides, moveUpPutOff) so new
        // slice fields are never undefined when a persona is loaded.
        ...buildInitialState(),
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
        // LookBack fields reset to defaults; plainVersion is a UI preference, not
        // persona data, so it is preserved across demo-persona switches.
        comebackGrants: [],
        reward: null,
        rewardsReached: [],
        rewardOfferDismissed: false,
        reviewSeen: { week: null, month: null },
        reviewPreview: false,
        plainVersion: prev.plainVersion,
        // Banner records (checkInReminderShownDay, digestBannerShownSlot) are deliberately NOT
        // carried: they come back null from ...buildInitialState(), so a persona switch re-arms
        // both banners. A switched-to persona has not had today's reminder yet; carrying the
        // records would make the switch look like it skipped the notification.
        // Media seed — applied after buildInitialState() so persona-specific values
        // override the empty defaults. Absent when mediaSeed is null; the spread
        // resolves to an empty object and the defaults from buildInitialState() stand.
        ...(mediaSeed
          ? {
              interests: mediaSeed.interests,
              digestTimes: mediaSeed.digestTimes,
              media: {
                estimateMinutes: mediaSeed.estimateMinutes,
                budgetMinutes: mediaSeed.budgetMinutes,
              },
              mediaMinutesByDate,
            }
          : {}),
        // Therapist link, switches and homework. Without this the three fields
        // stay at buildInitialState() defaults and a linked persona loads unlinked.
        ...sharingFromPersona(persona, id, today),
      };
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
    ...state,
    // Deliberately overrides the raw stored partial from the spread: no page may
    // read switches that have not been through resolveSharing.
    sharing: resolveSharing(state.sharing),
    ...bind(coreReducers),
    startDay: startDayAction,
    ...bind(planReducers),
    grantComebackBonus: grantComebackBonusAction,
    setReward: setRewardAction,
    removeReward: removeRewardAction,
    markRewardReached: markRewardReachedAction,
    dismissRewardOffer: dismissRewardOfferAction,
    markReviewSeen: markReviewSeenAction,
    setReviewPreview: setReviewPreviewAction,
    setPlainVersion: setPlainVersionAction,
    setInterests: setInterestsAction,
    setDigestTimes: setDigestTimesAction,
    markDigestSeen: markDigestSeenAction,
    setMediaEstimate: setMediaEstimateAction,
    setMediaBudget: setMediaBudgetAction,
    setMediaMinutesToday: setMediaMinutesTodayAction,
    markCheckInReminderShown: markCheckInReminderShownAction,
    markDigestBannerShown: markDigestBannerShownAction,
    setBuddy: setBuddyAction,
    removeBuddy: removeBuddyAction,
    addSharedActivity: addSharedActivityAction,
    removeSharedActivity: removeSharedActivityAction,
    dismissBuddyOffer: dismissBuddyOfferAction,
    setSafetyEntries: setSafetyEntriesAction,
    dismissSafetySetup: dismissSafetySetupAction,
    linkTherapist: linkTherapistAction,
    setShareSwitch: setShareSwitchAction,
    unlinkTherapist: unlinkTherapistAction,
    removeHomework: removeHomeworkAction,
    loadPersona,
    resetDemoData,
  };

  return <UserDataCtx.Provider value={value}>{children}</UserDataCtx.Provider>;
}
