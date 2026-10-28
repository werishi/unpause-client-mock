"use client";

/**
 * Look Back screen (/look-back).
 *
 * Renders four summary blocks in the fixed order from concept §2.1:
 *   (a) "Since you started" — indigo hero card (things done, values, rewards enjoyed)
 *   (b) stat tiles: all-time days showing up and "This month"
 *
 * Breakpoints: one column at 360 px; the stat tiles go two-up from `sm`; from `lg`
 * to `xl` the page stays a single 672 px column (only the type and the row gap step
 * up), because the sidebar takes 224 px and two columns there would be about 372 px
 * each, too narrow for the reward form, which needs about 420 px per column. From
 * `xl` the page is a two-column grid inside the 896 px column `ShellWidth` gives this
 * route (864 px content box, so `gap-x-6` leaves exactly 420 px per column), with the
 * header, (a) and (b) spanning both columns and (c) and (d) side by side below.
 * Whenever (c) or (d) would sit alone (plain version, or nothing done yet) it spans
 * both columns too, so no column is left empty. Every grid class is `xl:`-prefixed,
 * so the layouts below `xl` stay single-column.
 *   (c) "What tended to help"
 *   (d) "Points and your reward" — rendered by `LookBackRewardCard`; omitted entirely
 *       when `plainVersion` is true (concept §2.9: omitting avoids a points flash for users
 *       who chose the plain view). The inline reward form lives in that component.
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
} from "@/lib/domain/look-back";
import { withOverride } from "@/lib/domain/override";
import { LOOK_BACK } from "@/lib/copy";
import LookBackRewardCard from "@/components/LookBackRewardCard";

// Module-level: synchronous in-memory reads; stable references across renders.
const activities = getActivities();
const allValues = getValues();

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Visual language copied from app/today/page.tsx (rounded-2xl cards, indigo accent,
// gray neutrals, min-h-12 buttons) so Look back reads as part of the same app.
const pageTitle = "text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 lg:text-3xl";
const sectionTitle = "text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100 lg:text-xl";
const eyebrow = "text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300";
const muted = "text-sm text-gray-600 dark:text-gray-400";
const card =
  "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:shadow-none";
const softCard =
  "flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50";
// Stat tile: number and label side by side at 360 px, stacked once the grid goes two-up.
const tile = `${card} flex items-baseline gap-2 p-4 sm:flex-col sm:items-start sm:gap-1`;
const tileNumber = "text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100";

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
    plainVersion,
    markRewardReached,
  } = useUserData();

  const [justReached, setJustReached] = useState<boolean>(false);

  // Reward reached — handled only on /look-back (concept §2.6), split in two:
  // - The local `justReached` flag is set during render (React's "adjust state
  //   while rendering" pattern), so the lint rule against setState inside an
  //   effect is satisfied. It runs before the hydration guard below, which is
  //   safe because `reachNow` is false until `hydrated` is true. `justReached`
  //   shows the "reached" card until the user dismisses it with "Set the next one".
  // - The store transition stays in the effect: `markRewardReached` updates the
  //   parent provider's state, and calling it during this render would be a
  //   cross-component render update. Premise: it transitions reward → null and
  //   appends to rewardsReached.
  // Note: `markRewardReached` is a new reference on every render (hand-written
  // closure in user-store.tsx). It is included in deps to satisfy the exhaustive-
  // deps rule; the guard `reward !== null && total >= reward.at` makes the body
  // a no-op after the first fire, so repeated effect calls are safe.
  const total = hydrated ? pointsTotal(log, comebackGrants) : 0;
  const reachNow = hydrated && reward !== null && total >= reward.at;
  // Adjust state while rendering: the guard on `!justReached` stops a render loop.
  if (reachNow && !justReached) setJustReached(true);
  useEffect(() => {
    if (hydrated && reward !== null && total >= reward.at) {
      markRewardReached(today);
    }
  }, [hydrated, reward, total, today, markRewardReached]);

  // Hydration guard: render only the heading until the store has rehydrated.
  if (!hydrated) {
    return (
      <div className="flex flex-col gap-6 py-6">
        <h1 className={pageTitle}>{LOOK_BACK.heading}</h1>
      </div>
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

  return (
    <div className="flex flex-col gap-6 py-6 lg:gap-8 xl:grid xl:grid-cols-2 xl:gap-x-6">
      <header className="flex flex-col gap-1 xl:col-span-2">
        <h1 className={pageTitle}>{LOOK_BACK.heading}</h1>
        <p className={muted}>
          {LOOK_BACK.startedOnLabel} {formatStartDate(safeStartedAt, today)}.
        </p>
      </header>

      {/* (a) Since you started — hero summary ───────────────────────────── */}
      <section
        aria-labelledby="lb-since"
        className="flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-5 xl:col-span-2 dark:border-indigo-900/60 dark:bg-indigo-950/40"
      >
        <h2 id="lb-since" className={eyebrow}>
          {LOOK_BACK.sinceStarted.heading}
        </h2>

        {isPerNew ? (
          <p className="text-base leading-relaxed text-gray-800 dark:text-gray-200">
            {LOOK_BACK.perNewMessage}
          </p>
        ) : (
          <>
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-5xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                {count}
              </span>
              <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {count === 1
                  ? LOOK_BACK.sinceStarted.thingDoneSuffix
                  : LOOK_BACK.sinceStarted.thingsDoneSuffix}
              </span>
            </p>

            {servedLabels.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {LOOK_BACK.valuesHeading}
                </p>
                <ul className="flex flex-wrap gap-2">
                  {servedLabels.map((label) => (
                    <li
                      key={label}
                      className="rounded-full bg-white px-3 py-1 text-sm font-medium text-indigo-700 dark:bg-gray-900 dark:text-indigo-300"
                    >
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!plainVersion && rewardsReached.length > 0 && (
              <ul className="flex flex-col gap-1 border-t border-indigo-100 pt-3 dark:border-indigo-900/60">
                {rewardsReached.map((r, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
                    {LOOK_BACK.rewardEnjoyedLabel} <span className="font-medium">{r.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* (b) Stat tiles: all-time days and this month — omitted for per-new ─ */}
      {!isPerNew && (
        <section aria-label={LOOK_BACK.thisMonthHeading} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:col-span-2">
          <div className={tile}>
            <span className={tileNumber}>{totalActiveDays}</span>
            <span className={muted}>
              {totalActiveDays === 1
                ? LOOK_BACK.sinceStarted.activeDaySuffix
                : LOOK_BACK.sinceStarted.activeDaysSuffix}
            </span>
          </div>
          <div className={tile}>
            {monthActiveDays > 0 ? (
              <>
                <span className={tileNumber}>{monthActiveDays}</span>
                <span className={muted}>
                  {monthActiveDays === 1
                    ? LOOK_BACK.monthReview.activeDaySuffix
                    : LOOK_BACK.monthReview.activeDaysSuffix}{" "}
                  · {LOOK_BACK.thisMonthHeading.toLowerCase()}
                </span>
              </>
            ) : (
              <>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {LOOK_BACK.thisMonthHeading}
                </span>
                <span className={muted}>{LOOK_BACK.noActiveDaysThisMonthMessage}</span>
              </>
            )}
          </div>
        </section>
      )}

      {/* (c) What tended to help — omitted for per-new ─────────────────── */}
      {!isPerNew && (
        <section
          aria-labelledby="lb-patterns"
          className={`flex flex-col gap-3${plainVersion ? " xl:col-span-2" : ""}`}
        >
          <h2 id="lb-patterns" className={sectionTitle}>
            {LOOK_BACK.patternsHeading}
          </h2>
          {patterns.length === 0 ? (
            <p className={`${softCard} ${muted}`}>{LOOK_BACK.noPatternsYetMessage}</p>
          ) : (
            <ul className={`${card} divide-y divide-gray-100 py-1 dark:divide-gray-800`}>
              {patterns.map((result) => (
                <li key={result.categoryKey} className="flex items-start gap-3 px-4 py-3">
                  <span
                    aria-hidden="true"
                    className={`mt-2 size-2 shrink-0 rounded-full ${
                      result.rank === 0
                        ? "bg-indigo-600 dark:bg-indigo-400"
                        : "bg-indigo-300 dark:bg-indigo-700"
                    }`}
                  />
                  <p className="text-base leading-relaxed text-gray-800 dark:text-gray-200">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {LOOK_BACK.categoryLabels[result.categoryKey]}
                    </span>{" "}
                    {result.rank === 0 ? LOOK_BACK.patternPrimary : LOOK_BACK.patternSecondary}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* (d) Points and your reward — omitted entirely when plainVersion ─── */}
      {!plainVersion && (
        // Plain block wrapper: spans both columns when (b) and (c) are omitted, so the
        // card never sits alone in the left column; below `xl` it adds no spacing.
        <div className={isPerNew ? "xl:col-span-2" : undefined}>
          <LookBackRewardCard
            total={total}
            justReached={justReached}
            onReachedAcknowledged={() => setJustReached(false)}
          />
        </div>
      )}
    </div>
  );
}
