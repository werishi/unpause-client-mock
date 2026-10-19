"use client";

/**
 * Look Back screen (/look-back).
 *
 * Renders four summary blocks in the fixed order from concept §2.1:
 *   (a) "Since you started"
 *   (b) "This month"
 *   (c) "What tended to help"
 *   (d) "Points and your reward" — omitted entirely when `plainVersion` is true
 *       (concept §2.9: omitting avoids a points flash for users who chose the plain view).
 *
 * Hydration guard: the page heading renders immediately; all counts wait for
 * `hydrated === true`. Before hydration the store holds seed defaults, so displaying
 * numbers would read as "you have done nothing" — a false, demoralising signal
 * (concept §2.1).
 *
 * Per-new quiet state: when `doneCount(log) === 0` the "This month" and "What tended
 * to help" blocks are omitted entirely. An empty chart reads as failure (concept §2.3).
 *
 * Reward-reached effect: fires on mount when `hydrated && reward !== null &&
 * pointsTotal >= reward.at`. Only fires here — never on Today or welcome-back —
 * so the reward does not interrupt the daily loop (concept §2.6).
 *
 * Inline reward form: `showRewardForm` is local `useState<boolean>(false)`. No route
 * change. A focused route /look-back/reward was refused because one reward needs no
 * id and FlowCloseButton always returns to /today (LookBackMap.md § Rejected Alternatives).
 *
 * Parent requirement: UserDataProvider is mounted (app/layout.tsx satisfies this).
 */

import { useState, useEffect } from "react";
import { useUserData } from "@/lib/store/user-store";
import { getActivities } from "@/lib/repo/activity-repo";
import { getValues } from "@/lib/repo/value-repo";
import {
  activeDays,
  doneCount,
  valuesServed,
  categoryPatterns,
  pointsTotal,
  FIRST_REWARD_AT,
} from "@/lib/domain/look-back";
import { withOverride } from "@/lib/domain/override";
import { LOOK_BACK } from "@/lib/copy";

// Module-level: synchronous in-memory reads; stable references across renders.
const activities = getActivities();
const allValues = getValues();

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Formats startedAt as "{day} {MonthName}", appending the year only when it
 * differs from the current year (derived from `today`).
 */
function formatStartDate(startedAt: string, today: string): string {
  const d = new Date(startedAt);
  const t = new Date(today);
  const day = d.getUTCDate();
  const month = MONTH_NAMES[d.getUTCMonth()];
  const yearSuffix = d.getUTCFullYear() !== t.getUTCFullYear() ? ` ${d.getUTCFullYear()}` : "";
  return `${day} ${month}${yearSuffix}`;
}

export default function LookBackPage() {
  const {
    hydrated,
    today,
    startedAt,
    log,
    activityOverrides,
    comebackGrants,
    reward,
    rewardsReached,
    rewardOfferDismissed,
    plainVersion,
    markRewardReached,
    dismissRewardOffer,
    setReward: setRewardAction,
    removeReward,
  } = useUserData();

  const [showRewardForm, setShowRewardForm] = useState<boolean>(false);
  const [localRewardText, setLocalRewardText] = useState<string>("");
  const [justReached, setJustReached] = useState<boolean>(false);
  const [chosenLevel, setChosenLevel] = useState<50 | 100 | 200>(50);

  // Reward-reached effect — fires only on /look-back (concept §2.6).
  // Premise: `markRewardReached` transitions reward → null and appends to
  // rewardsReached. `justReached` shows the "reached" card until the user
  // dismisses it by clicking "Set the next one".
  // Note: `markRewardReached` is a new reference on every render (hand-written
  // closure in user-store.tsx). It is included in deps to satisfy the exhaustive-
  // deps rule; the guard `reward !== null && total >= reward.at` makes the body
  // a no-op after the first fire, so repeated effect calls are safe.
  const total = hydrated ? pointsTotal(log, comebackGrants) : 0;
  useEffect(() => {
    if (hydrated && reward !== null && total >= reward.at) {
      markRewardReached(today);
      setJustReached(true);
    }
  }, [hydrated, reward, total, today, markRewardReached]);

  // Reset the form fields each time the form opens.
  useEffect(() => {
    if (showRewardForm) {
      setLocalRewardText("");
      setChosenLevel(50);
    }
  }, [showRewardForm]);

  // Hydration guard: render only the heading until the store has rehydrated.
  if (!hydrated) {
    return (
      <main className="flex flex-col gap-4 px-4 py-6">
        <h1 className="text-2xl font-semibold">{LOOK_BACK.heading}</h1>
      </main>
    );
  }

  // Derived values — computed after the hydration guard so they always have
  // real data, never seed defaults.
  const safeStartedAt = startedAt ?? today;
  const firstOfCurrentMonth = today.substring(0, 7) + "-01";
  const isPerNew = doneCount(log) === 0;
  const count = doneCount(log);
  const overriddenActivities = activities.map((a) => withOverride(a, activityOverrides[a.id]));
  const servedValueIds = valuesServed(log, overriddenActivities);
  const servedLabels = servedValueIds
    .map((id) => allValues.find((v) => v.id === id)?.label)
    .filter((l): l is string => l !== undefined)
    .slice(0, 2);
  const totalActiveDays = activeDays(log, safeStartedAt, today);
  const monthActiveDays = activeDays(log, firstOfCurrentMonth, today);
  const patterns = isPerNew ? [] : categoryPatterns(log, activities, today);
  const lastReached =
    rewardsReached.length > 0 ? rewardsReached[rewardsReached.length - 1] : null;

  // Reward card state flags — mutually exclusive by construction given the state
  // machine (offer shown only before any reward set; active shown while reward
  // is set and not yet reached; reached shown via justReached; collapsed shown
  // when the offer was dismissed and no reward is active).
  const showOffer =
    !plainVersion &&
    total >= FIRST_REWARD_AT &&
    reward === null &&
    !rewardOfferDismissed &&
    !justReached;
  const showCollapsedLink =
    !plainVersion && reward === null && rewardOfferDismissed && !justReached;
  const showActiveReward =
    !plainVersion && reward !== null && total < reward.at;
  const showReached = !plainVersion && justReached && lastReached !== null;

  function handleSaveReward() {
    if (!localRewardText.trim()) return;
    // `setRewardAction` signature from part 2 Public Surface: (text, at, today).
    // `at` is the caller-computed target level, not derived in the slice (layer rule:
    // look-back-slice must not import from lib/domain/).
    setRewardAction(localRewardText.trim(), total + chosenLevel, today);
    setShowRewardForm(false);
  }

  return (
    <main className="flex flex-col gap-8 px-4 py-6">
      <h1 className="text-2xl font-semibold">{LOOK_BACK.heading}</h1>

      {/* (a) Since you started ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">{LOOK_BACK.sinceStarted.heading}</h2>
        <p className="text-base">
          {LOOK_BACK.startedOnLabel} {formatStartDate(safeStartedAt, today)}.
        </p>

        {isPerNew ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {LOOK_BACK.perNewMessage}
          </p>
        ) : (
          <>
            <p className="text-base">
              {count}{" "}
              {count === 1
                ? LOOK_BACK.sinceStarted.thingDoneSuffix
                : LOOK_BACK.sinceStarted.thingsDoneSuffix}
              .
            </p>
            <p className="text-base">
              {totalActiveDays}{" "}
              {totalActiveDays === 1
                ? LOOK_BACK.sinceStarted.activeDaySuffix
                : LOOK_BACK.sinceStarted.activeDaysSuffix}
              .
            </p>
            {servedLabels.length > 0 && (
              <p className="text-base">
                {LOOK_BACK.valuesHeading}: {servedLabels.join(", ")}.
              </p>
            )}
            {!plainVersion &&
              rewardsReached.length > 0 &&
              rewardsReached.map((r, i) => (
                <p key={i} className="text-base">
                  {LOOK_BACK.rewardEnjoyedLabel} {r.text}.
                </p>
              ))}
          </>
        )}
      </section>

      {/* (b) This month — omitted under per-new quiet state ──────────────── */}
      {!isPerNew && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">{LOOK_BACK.thisMonthHeading}</h2>
          {monthActiveDays > 0 ? (
            <p className="text-base">
              {monthActiveDays}{" "}
              {monthActiveDays === 1
                ? LOOK_BACK.monthReview.activeDaySuffix
                : LOOK_BACK.monthReview.activeDaysSuffix}
              .
            </p>
          ) : (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {LOOK_BACK.noActiveDaysThisMonthMessage}
            </p>
          )}
        </section>
      )}

      {/* (c) What tended to help — omitted under per-new quiet state ──────── */}
      {!isPerNew && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">{LOOK_BACK.patternsHeading}</h2>
          {patterns.length === 0 ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {LOOK_BACK.noPatternsYetMessage}
            </p>
          ) : (
            patterns.map((result, i) => (
              <p key={i} className="text-base">
                {LOOK_BACK.categoryLabels[result.categoryKey]}{" "}
                {result.rank === 0 ? LOOK_BACK.patternPrimary : LOOK_BACK.patternSecondary}
              </p>
            ))
          )}
        </section>
      )}

      {/* (d) Points and your reward — omitted entirely when plainVersion ─── */}
      {!plainVersion && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">{LOOK_BACK.pointsHeading}</h2>
          <p className="text-base">
            {total}{" "}
            {total === 1
              ? LOOK_BACK.sinceStarted.pointSuffix
              : LOOK_BACK.sinceStarted.pointsSuffix}
            .
          </p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {LOOK_BACK.pointsExplanation}
          </p>

          {/* Offer card */}
          {showOffer && (
            <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
              <p className="text-base font-medium">{LOOK_BACK.rewardOffer.heading}</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {LOOK_BACK.rewardOffer.body}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowRewardForm(true)}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white dark:bg-indigo-500"
                >
                  {LOOK_BACK.chooseRewardLabel}
                </button>
                <button
                  onClick={() => dismissRewardOffer()}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 dark:border-neutral-600 dark:text-neutral-300"
                >
                  {LOOK_BACK.rewardOffer.dismissLabel}
                </button>
              </div>
            </div>
          )}

          {/* Collapsed link */}
          {showCollapsedLink && (
            <button
              onClick={() => setShowRewardForm(true)}
              className="self-start text-sm text-indigo-600 underline dark:text-indigo-400"
            >
              {LOOK_BACK.setRewardLink}
            </button>
          )}

          {/* Active reward */}
          {showActiveReward && reward && (
            <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
              <p className="text-base font-medium">{LOOK_BACK.reward.heading}</p>
              <p className="text-base">{reward.text}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowRewardForm(true)}
                  className="text-sm text-indigo-600 underline dark:text-indigo-400"
                >
                  {LOOK_BACK.reward.changeLabel}
                </button>
                <button
                  onClick={() => removeReward()}
                  className="text-sm text-neutral-500 dark:text-neutral-400"
                >
                  {LOOK_BACK.reward.removeLabel}
                </button>
              </div>
            </div>
          )}

          {/* Reached card */}
          {showReached && lastReached && (
            <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
              <p className="text-base font-medium">{LOOK_BACK.reward.reachedHeading}</p>
              <p className="text-base">{lastReached.text}</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {LOOK_BACK.reward.reachedBody}
              </p>
              <button
                onClick={() => {
                  setJustReached(false);
                  setShowRewardForm(true);
                }}
                className="self-start text-sm text-indigo-600 underline dark:text-indigo-400"
              >
                {LOOK_BACK.setNextRewardLabel}
              </button>
            </div>
          )}

          {/* Inline reward form */}
          {showRewardForm && (
            <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
              <div className="flex flex-wrap gap-2">
                {LOOK_BACK.rewardSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setLocalRewardText(s)}
                    className="rounded-full border border-neutral-300 px-3 py-1 text-sm dark:border-neutral-600"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <textarea
                value={localRewardText}
                onChange={(e) => setLocalRewardText(e.target.value)}
                maxLength={60}
                placeholder={LOOK_BACK.rewardOffer.inputPlaceholder}
                rows={2}
                className="w-full rounded-lg border border-neutral-300 p-3 text-sm dark:border-neutral-600 dark:bg-neutral-800"
              />
              <fieldset className="flex flex-wrap gap-4">
                <legend className="sr-only">Reward level</legend>
                {([50, 100, 200] as const).map((offset) => (
                  <label
                    key={offset}
                    className="flex cursor-pointer items-center gap-1.5 text-sm"
                  >
                    <input
                      type="radio"
                      name="reward-level"
                      value={offset}
                      checked={chosenLevel === offset}
                      onChange={() => setChosenLevel(offset)}
                    />
                    {total + offset} {LOOK_BACK.pointsAbbreviation}
                  </label>
                ))}
              </fieldset>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveReward}
                  disabled={!localRewardText.trim()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-indigo-500"
                >
                  {LOOK_BACK.rewardOffer.saveLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRewardForm(false)}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 dark:border-neutral-600 dark:text-neutral-300"
                >
                  {LOOK_BACK.rewardOffer.dismissLabel}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
