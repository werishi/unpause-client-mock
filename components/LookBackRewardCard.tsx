"use client";

/**
 * "Points and your reward" block of the Look Back screen — section (d) of
 * app/look-back/page.tsx, extracted unchanged. Renders the section heading, the
 * points total, and whichever of the offer card, collapsed link, active reward,
 * reached card or inline reward form applies.
 *
 * Caller contract:
 * - `total` is the caller's already-computed `pointsTotal(log, comebackGrants)`.
 * - `justReached` is the page's flag that a reward was just reached; the page owns
 *   the reward-reached logic (render-phase flag plus the `markRewardReached` effect)
 *   because it must run regardless of `plainVersion`, and this card mounts only when
 *   `!plainVersion`.
 * - `onReachedAcknowledged` is called when the user presses "Set the next one".
 * - The card does NOT hide itself when `plainVersion` is true — the page wraps it in
 *   `{!plainVersion && ...}` — and it must be mounted only after hydration.
 * - UserDataProvider is mounted (app/layout.tsx satisfies this).
 *
 * Inline reward form: `showRewardForm` is local `useState<boolean>(false)`. No route
 * change. A focused route /look-back/reward was refused because one reward needs no
 * id and FlowCloseButton always returns to /today (LookBackMap.md § Rejected Alternatives).
 */

import { useState } from "react";
import { useUserData } from "@/lib/store/user-store";
import { FIRST_REWARD_AT } from "@/lib/domain/look-back";
import { LOOK_BACK } from "@/lib/copy";

// Copied verbatim from app/look-back/page.tsx. Duplicated rather than shared because
// every page in this repo holds its class strings page-locally.
const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
const btnPrimary = `inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-medium text-white hover:bg-indigo-700 ${focusRing}`;
const btnSecondary = `inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 ${focusRing}`;
const linkButton = `self-start min-h-11 rounded-md text-sm font-medium text-indigo-700 underline-offset-4 hover:underline dark:text-indigo-300 ${focusRing}`;
const sectionTitle = "text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100";
const eyebrow = "text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300";
const muted = "text-sm text-gray-600 dark:text-gray-400";
const offerTitle = "font-medium text-gray-900 dark:text-gray-100";
const card =
  "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:shadow-none";
const softCard =
  "flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50";
const tileNumber = "text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100";

export default function LookBackRewardCard({
  total,
  justReached,
  onReachedAcknowledged,
}: {
  /** Caller-computed `pointsTotal(log, comebackGrants)`. */
  total: number;
  /** True from the render in which the page saw the reward reached until acknowledged. */
  justReached: boolean;
  /** Called when the user presses "Set the next one"; the page clears `justReached`. */
  onReachedAcknowledged: () => void;
}) {
  const {
    today,
    reward,
    rewardsReached,
    rewardOfferDismissed,
    plainVersion,
    dismissRewardOffer,
    setReward: setRewardAction,
    removeReward,
  } = useUserData();

  const [showRewardForm, setShowRewardForm] = useState<boolean>(false);
  const [localRewardText, setLocalRewardText] = useState<string>("");
  const [chosenLevel, setChosenLevel] = useState<50 | 100 | 200>(50);

  const lastReached =
    rewardsReached.length > 0 ? rewardsReached[rewardsReached.length - 1] : null;

  // Reward card state flags — mutually exclusive by construction given the state
  // machine (offer shown only before any reward set; active shown while reward
  // is set and not yet reached; reached shown via justReached once the store has
  // cleared `reward` — the `reward === null` term hides the one commit in which
  // the render-phase flag is already true but `markRewardReached` has not run, so
  // `lastReached` would still be the previous reward; collapsed shown when the
  // offer was dismissed and no reward is active).
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
  const showReached =
    !plainVersion && justReached && reward === null && lastReached !== null;

  function handleSaveReward() {
    if (!localRewardText.trim()) return;
    // `setRewardAction` signature from part 2 Public Surface: (text, at, today).
    // `at` is the caller-computed target level, not derived in the slice (layer rule:
    // look-back-slice must not import from lib/domain/).
    setRewardAction(localRewardText.trim(), total + chosenLevel, today);
    setShowRewardForm(false);
  }

  /**
   * Opens the inline reward form, resetting its fields only on a closed-to-open
   * transition. Replaces the former reset effect on `showRewardForm`; the
   * `!showRewardForm` guard keeps its semantics, so pressing an opener while the
   * form is already open leaves the typed text and chosen level alone.
   */
  function openRewardForm() {
    if (!showRewardForm) {
      setLocalRewardText("");
      setChosenLevel(50);
    }
    setShowRewardForm(true);
  }

  return (
    <section aria-labelledby="lb-points" className="flex flex-col gap-3">
      <h2 id="lb-points" className={sectionTitle}>
        {LOOK_BACK.pointsHeading}
      </h2>
      <div className={`${card} flex flex-col gap-4 p-4 sm:p-5`}>
        <div className="flex flex-col gap-1">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className={tileNumber}>{total}</span>
            <span className="text-base font-medium text-gray-700 dark:text-gray-300">
              {total === 1
                ? LOOK_BACK.sinceStarted.pointSuffix
                : LOOK_BACK.sinceStarted.pointsSuffix}
            </span>
          </p>
          <p className={`${muted} leading-relaxed`}>{LOOK_BACK.pointsExplanation}</p>
        </div>

        {/* Offer card — yields to the form once it is open, so its buttons are not shown twice */}
        {showOffer && !showRewardForm && (
          <div className={softCard}>
            <div className="flex flex-col gap-1">
              <p className={offerTitle}>{LOOK_BACK.rewardOffer.heading}</p>
              <p className={`${muted} leading-relaxed`}>{LOOK_BACK.rewardOffer.body}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={openRewardForm} className={btnPrimary}>
                {LOOK_BACK.chooseRewardLabel}
              </button>
              <button onClick={() => dismissRewardOffer()} className={btnSecondary}>
                {LOOK_BACK.rewardOffer.dismissLabel}
              </button>
            </div>
          </div>
        )}

        {/* Collapsed link */}
        {showCollapsedLink && !showRewardForm && (
          <button onClick={openRewardForm} className={linkButton}>
            {LOOK_BACK.setRewardLink}
          </button>
        )}

        {/* Active reward */}
        {showActiveReward && reward && (
          <div className={softCard}>
            <div className="flex flex-col gap-1">
              <p className={eyebrow}>{LOOK_BACK.reward.heading}</p>
              <p className="text-lg font-semibold leading-snug text-gray-900 dark:text-gray-100">
                {reward.text}
              </p>
            </div>
            <div className="flex flex-wrap gap-x-4">
              <button onClick={openRewardForm} className={linkButton}>
                {LOOK_BACK.reward.changeLabel}
              </button>
              <button
                onClick={() => removeReward()}
                className={`${linkButton} text-gray-600 dark:text-gray-400`}
              >
                {LOOK_BACK.reward.removeLabel}
              </button>
            </div>
          </div>
        )}

        {/* Reached card */}
        {showReached && lastReached && (
          <div className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/40">
            <div className="flex flex-col gap-1">
              <p className={eyebrow}>{LOOK_BACK.reward.reachedHeading}</p>
              <p className="text-lg font-semibold leading-snug text-gray-900 dark:text-gray-100">
                {lastReached.text}
              </p>
              <p className={muted}>{LOOK_BACK.reward.reachedBody}</p>
            </div>
            <button
              onClick={() => {
                onReachedAcknowledged();
                openRewardForm();
              }}
              className={linkButton}
            >
              {LOOK_BACK.setNextRewardLabel}
            </button>
          </div>
        )}

        {/* Inline reward form */}
        {showRewardForm && (
          <div className={softCard}>
            <div className="flex flex-wrap gap-2">
              {LOOK_BACK.rewardSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={localRewardText === s}
                  onClick={() => setLocalRewardText(s)}
                  className={`min-h-10 rounded-full border px-3 text-sm font-medium transition-colors ${focusRing} ${
                    localRewardText === s
                      ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
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
              className="w-full resize-none rounded-xl border border-gray-300 bg-white p-3 text-base text-gray-900 placeholder:text-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus-visible:outline-blue-400"
            />
            <fieldset className="grid grid-cols-3 gap-2">
              <legend className="sr-only">Reward level</legend>
              {([50, 100, 200] as const).map((offset) => (
                <label
                  key={offset}
                  className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-gray-300 bg-white px-2 text-sm font-medium text-gray-700 transition-colors has-checked:border-indigo-600 has-checked:bg-indigo-50 has-checked:text-indigo-700 has-focus-visible:outline has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:has-checked:border-indigo-400 dark:has-checked:bg-indigo-950/60 dark:has-checked:text-indigo-300 dark:has-focus-visible:outline-blue-400"
                >
                  <input
                    type="radio"
                    name="reward-level"
                    value={offset}
                    checked={chosenLevel === offset}
                    onChange={() => setChosenLevel(offset)}
                    className="sr-only"
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
                className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {LOOK_BACK.rewardOffer.saveLabel}
              </button>
              <button
                type="button"
                onClick={() => setShowRewardForm(false)}
                className={btnSecondary}
              >
                {LOOK_BACK.rewardOffer.dismissLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
