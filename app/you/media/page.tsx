"use client";

/**
 * Media budget page (/you/media).
 *
 * Two UI modes controlled by `showEstimate` local state:
 * - Estimate mode: shown when `media.estimateMinutes === null` (first visit) or
 *   when the user taps "Change my estimate". The user picks their typical daily
 *   screen time from preset chips.
 * - Budget mode: shown once an estimate is set. Displays an adjustable budget,
 *   a self-report chip row for today, and a neutral 7-day bar chart.
 *
 * `showEstimate` starts true and flips to false on the first hydrated render
 * (render-phase seeding guarded by `seeded`, the same idiom as
 * app/plan/templates/page.tsx) when the store has an estimate — the store's `estimateMinutes === null` is the natural
 * first-visit signal (concept §2.5, DigestAndMediaMap Domain Notes Part 3).
 *
 * `localBudget` holds the step-adjusted value before the user confirms with
 * "Use this". Only that tap writes to the store via `setMediaBudget`, which
 * clamps to ≥ 15 min. Intermediate local values below 15 are prevented by the
 * "−15 min" disabled guard.
 */

import { useState } from "react";
import Link from "next/link";
import { useUserData } from "@/lib/store/user-store";
import {
  suggestBudget,
  weekEntries,
  daysWithinBudget,
  isOverBudgetToday,
} from "@/lib/domain/media-budget";
import { localDateString } from "@/lib/domain/day";
import { MEDIA_BUDGET } from "@/lib/copy";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Preset daily screen-time estimate chips in minutes. */
const ESTIMATE_CHIPS = [30, 60, 120, 180, 240] as const;

/** Preset self-report chips for today's media minutes. */
const TODAY_CHIPS = [15, 60, 120, 180] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formats a minute count as a human-readable duration string.
 * Under 60 min → "X min"; at or above → "X hr [Y min]".
 * 60 → "1 hr", 75 → "1 hr 15 min", 120 → "2 hrs".
 */
function formatMinutes(n: number): string {
  if (n < 60) return `${n} min`;
  const hrs = Math.floor(n / 60);
  const mins = n % 60;
  const hrLabel = hrs === 1 ? "1 hr" : `${hrs} hrs`;
  return mins === 0 ? hrLabel : `${hrLabel} ${mins} min`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MediaBudgetPage() {
  const {
    media,
    mediaMinutesByDate,
    setMediaEstimate,
    setMediaBudget,
    setMediaMinutesToday,
    hydrated,
    todayPlan,
  } = useUserData();

  /**
   * When true, show the estimate chip grid.
   * Initialised true; flipped false on the first hydrated render when the store
   * has an estimate. Also flipped true by "Change my estimate".
   * Deliberately local state, not derived from `media.estimateMinutes`: with no
   * estimate at load it stays true until an estimate chip sets it, and a derived
   * value would instead react to every store change and alter that flow.
   */
  const [showEstimate, setShowEstimate] = useState(true);

  /**
   * Step-adjusted budget value before the user confirms with "Use this".
   * Seeded from `media.budgetMinutes ?? suggestBudget(estimate)` on the first
   * hydrated render; 15 is the store clamp floor and a safe default.
   */
  const [localBudget, setLocalBudget] = useState(15);

  /** True once local state has been seeded from the store; makes the seed write-once. */
  const [seeded, setSeeded] = useState(false);

  /**
   * Seed local state from the store on the first hydrated render (render-phase
   * set-state, which React re-renders immediately before committing). The
   * `seeded` flag makes it write-once: a seed, not a subscription. Must stay
   * after all hooks and before the `!hydrated` guard, or it would never run.
   */
  if (hydrated && !seeded) {
    setSeeded(true);
    const est = media.estimateMinutes;
    if (est !== null) {
      setShowEstimate(false);
      setLocalBudget(media.budgetMinutes ?? suggestBudget(est));
    }
  }

  // Guard after all hooks — prevents rendering stale defaults before
  // localStorage loads (same pattern as digest/page.tsx).
  if (!hydrated) return null;

  const today = localDateString(new Date());

  // Budget-section values; computed at render time so a formula change to
  // suggestBudget() takes effect without a migration (concept §2.5).
  const suggested =
    media.estimateMinutes !== null ? suggestBudget(media.estimateMinutes) : 15;
  const budgetForScale = media.budgetMinutes ?? suggested;
  const entries = weekEntries(mediaMinutesByDate, today);
  const count = daysWithinBudget(entries, budgetForScale);
  const overToday =
    media.budgetMinutes !== null &&
    isOverBudgetToday(mediaMinutesByDate, today, media.budgetMinutes);

  return (
    <div className="flex flex-col gap-6 py-6">
      <Link
        href="/you"
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        ← You
      </Link>

      <h1 className="text-xl font-semibold">{MEDIA_BUDGET.title}</h1>

      {/* ── Estimate mode ─────────────────────────────────────────────────── */}
      {showEstimate && (
        <div className="flex flex-col gap-4">
          <p className="font-medium">{MEDIA_BUDGET.estimateLabel}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {MEDIA_BUDGET.estimatePrompt}
          </p>
          <div className="flex flex-wrap gap-2">
            {ESTIMATE_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => {
                  setMediaEstimate(chip);
                  const sugg = suggestBudget(chip);
                  setLocalBudget(media.budgetMinutes ?? sugg);
                  setShowEstimate(false);
                }}
                className={[
                  "px-4 py-2 rounded-full border text-sm",
                  media.estimateMinutes === chip
                    ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-transparent"
                    : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
                ].join(" ")}
              >
                {formatMinutes(chip)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Budget mode ───────────────────────────────────────────────────── */}
      {!showEstimate && media.estimateMinutes !== null && (
        <div className="flex flex-col gap-6">
          {/* Budget display and step controls */}
          <div className="flex flex-col gap-2">
            <p className="text-lg font-medium">
              A gentle start: {formatMinutes(localBudget)} a day
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {MEDIA_BUDGET.budgetPrompt}
            </p>
            <div className="flex gap-3 items-center mt-2">
              <button
                onClick={() => setLocalBudget(localBudget - 15)}
                disabled={localBudget <= 15}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                −15 min
              </button>
              <button
                onClick={() => setMediaBudget(localBudget)}
                className="px-4 py-2 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-300"
              >
                Use this
              </button>
              <button
                onClick={() => setLocalBudget(localBudget + 15)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                +15 min
              </button>
            </div>
            <button
              onClick={() => setShowEstimate(true)}
              className="text-sm text-gray-500 dark:text-gray-400 underline text-left mt-1 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Change my estimate
            </button>
          </div>

          {/* Self-report: how much media today */}
          <div className="flex flex-col gap-3">
            <p className="font-medium">Roughly how much today?</p>
            <div className="flex flex-wrap gap-2">
              {TODAY_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => setMediaMinutesToday(chip)}
                  className={[
                    "px-4 py-2 rounded-full border text-sm",
                    mediaMinutesByDate[today] === chip
                      ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-transparent"
                      : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
                  ].join(" ")}
                >
                  {formatMinutes(chip)}
                </button>
              ))}
            </div>
          </div>

          {/* Week summary — bars + sentence */}
          <div className="flex flex-col gap-3">
            <p className="font-semibold">{MEDIA_BUDGET.weekTitle}</p>

            {/*
             * Seven bars; today is index 0 in entries, so reverse for
             * left-to-right display with today on the right.
             * Height proportional to minutes / budgetForScale (capped at 100%).
             * Null entry → small empty outline at bar-floor height.
             * All bars same neutral colour — no red/green (G10 non-shaming).
             */}
            <div className="flex items-end gap-1 h-24">
              {[...entries].reverse().map((e) => {
                const pct =
                  e.minutes === null
                    ? null
                    : Math.round(
                        Math.min(e.minutes / Math.max(budgetForScale, 1), 1) * 100
                      );
                return (
                  <div key={e.date} className="flex-1 h-full flex flex-col justify-end">
                    {pct === null ? (
                      <div className="w-full h-3 border border-gray-200 dark:border-gray-700 rounded-sm" />
                    ) : (
                      <div
                        className="w-full bg-gray-400 dark:bg-gray-500 rounded-t-sm"
                        style={{ height: `${Math.max(pct, 4)}%` }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              {count === 0
                ? MEDIA_BUDGET.noEstimate
                : `${count} of 7 days within your intention.`}
            </p>
          </div>

          {/* Over-budget today — warm tone, no red, no "exceeded" wording (G10) */}
          {overToday && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {MEDIA_BUDGET.overBudget}
            </p>
          )}

          {/*
           * Swap link — only when a plan exists for today.
           * When todayPlan is null there is no plan and /swap would bounce
           * (concept §2.5; DigestAndMediaMap Domain Notes Part 3).
           */}
          {todayPlan !== null && (
            <Link
              href="/swap"
              className="text-sm text-gray-500 dark:text-gray-400 underline hover:text-gray-700 dark:hover:text-gray-200"
            >
              {MEDIA_BUDGET.linkToSwap}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
