// ─── Types ────────────────────────────────────────────────────────────────

export type Reward = {
  text: string;
  /** pointsTotal() at the time the reward was set — used for bookkeeping only,
   *  never displayed as a target or deficit. Premise: displaying this as "N points
   *  until reward" is the shaming risk in §0 watch point. */
  at: number;
  setOn: string; // ISO date
};

/**
 * Slice state for the Look Back and gentle gamification feature.
 *
 * Owned by this slice; consumed by `user-store.tsx` via `UserDataState`.
 * The parent (`user-store.tsx`) has already resolved hydration before any
 * reducer is called — callers may assume fields are present and typed.
 *
 * Layer note: this file must not import from `lib/domain/` — the one-way
 * layer rule (profile Layers) forbids it. Domain functions (`pointsTotal`,
 * `weekSummary`, etc.) are called by the provider or page layer, which then
 * passes primitive results into these reducers.
 */
export interface LookBackState {
  comebackGrants: string[];   // local ISO dates on which a bonus was granted
  reward: Reward | null;
  rewardsReached: { text: string; at: number; reachedOn: string }[];
  rewardOfferDismissed: boolean;
  reviewSeen: { week: string | null; month: string | null };
  reviewPreview: boolean;
  /**
   * True when the user has chosen the plain layout (no points display).
   * loadPersona does NOT reset this field — it is a UI preference, not persona
   * data. Basis: concept §2.10 "reset clears it; loadPersona keeps it".
   */
  plainVersion: boolean;
}

// ─── Defaults ─────────────────────────────────────────────────────────────

/**
 * Initial field values for `LookBackState`.
 *
 * Uses object and array literals, not a `const` cast of a shared constant,
 * to match the "freshly allocated arrays" pattern in `store-state.ts`
 * (`buildInitialState` doc comment). The arrays here ARE shared references,
 * so every call site that spreads this constant must re-declare `comebackGrants`,
 * `rewardsReached`, and `reviewSeen` as fresh literals — step 2 handles this.
 */
export const LOOK_BACK_DEFAULTS: LookBackState = {
  comebackGrants: [],
  reward: null,
  rewardsReached: [],
  rewardOfferDismissed: false,
  reviewSeen: { week: null, month: null },
  reviewPreview: false,
  plainVersion: false,
};

// ─── Reducers ─────────────────────────────────────────────────────────────

/**
 * Appends today to comebackGrants if not already present for that date.
 *
 * Called by the provider on welcome-back acknowledgement. Idempotent:
 * a second call on the same date returns the input state unchanged.
 */
export function grantComebackBonus(state: LookBackState, today: string): LookBackState {
  if (state.comebackGrants.includes(today)) return state;
  return { ...state, comebackGrants: [...state.comebackGrants, today] };
}

/**
 * Sets a new reward. `at` is the caller-supplied pointsTotal() at the time of
 * setting — stored for bookkeeping, never shown as a deficit.
 *
 * The caller (provider or page) must compute `pointsTotal(log, comebackGrants)`
 * from `lib/domain/look-back.ts` and pass the result here. This slice does not
 * import from `lib/domain/` (one-way layer rule).
 */
export function setReward(
  state: LookBackState, text: string, at: number, today: string
): LookBackState {
  return { ...state, reward: { text, at, setOn: today } };
}

/**
 * Removes the current reward without touching rewardsReached.
 *
 * Use when the user explicitly discards the reward rather than reaching it.
 */
export function removeReward(state: LookBackState): LookBackState {
  return { ...state, reward: null };
}

/**
 * Moves the current reward into rewardsReached and nulls reward.
 * No-op if reward is already null.
 *
 * Called only from `/look-back` (concept §2.6: "reaching is noticed only on
 * `/look-back`"). Calling from Today or welcome-back would fire the
 * acknowledgement before the user has seen the Look Back context.
 */
export function markRewardReached(state: LookBackState, today: string): LookBackState {
  if (!state.reward) return state;
  const reached = { text: state.reward.text, at: state.reward.at, reachedOn: today };
  return { ...state, reward: null, rewardsReached: [...state.rewardsReached, reached] };
}

/**
 * Prevents the reward offer card from showing again on the same device.
 *
 * Persisted in the store blob; resets only on a full demo reset (not on
 * loadPersona, which keeps UI preferences per the LookBackState.plainVersion rule).
 */
export function dismissRewardOffer(state: LookBackState): LookBackState {
  return { ...state, rewardOfferDismissed: true };
}

/**
 * Records that the user has seen the review for a given week or month key.
 * kind "week" also clears reviewPreview (the Monday preview badge on Today).
 *
 * Keys are ISO week strings ("2026-W42") for week and ISO month strings
 * ("2026-10") for month, produced by `weekSummary` / `monthSummary` in
 * `lib/domain/look-back.ts`.
 */
export function markReviewSeen(
  state: LookBackState, kind: "week" | "month", key: string
): LookBackState {
  const reviewSeen =
    kind === "week"
      ? { ...state.reviewSeen, week: key }
      : { ...state.reviewSeen, month: key };
  const reviewPreview = kind === "week" ? false : state.reviewPreview;
  return { ...state, reviewSeen, reviewPreview };
}

/**
 * Sets or clears the Monday review-preview badge on Today.
 *
 * Set to true by the provider on Monday when a new week key is available
 * and the review has not yet been seen. Cleared by markReviewSeen("week", …).
 */
export function setReviewPreview(state: LookBackState, value: boolean): LookBackState {
  return { ...state, reviewPreview: value };
}

/**
 * Persists the plain-version layout preference.
 *
 * Toggled from `app/you/demo/page.tsx`. Unlike most LookBackState fields,
 * this field survives loadPersona — it is a per-device UI preference, not
 * persona data (concept §2.10).
 */
export function setPlainVersion(state: LookBackState, value: boolean): LookBackState {
  return { ...state, plainVersion: value };
}
