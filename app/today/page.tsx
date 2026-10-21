"use client";

/**
 * Today screen — two-state view for the current day's activity plan.
 *
 * State A: `todayPlan === null || todayPlan.date !== today`.
 *   Shown when the user has not yet given their energy level for today.
 *   Renders a greeting, the energy buttons from CHECK_IN.energyOptions, and a
 *   low-day note. Calling `startDay(energy)` stores the plan; the next render
 *   enters State B with no explicit navigation.
 *
 * State B: `todayPlan !== null && todayPlan.date === today`.
 *   Shows the plan's activity cards plus anchor chips, the "Change energy" link
 *   (only while no card has been logged), an end-of-day note when all cards are
 *   done, and the "Make it yours" offer card from the second day onward.
 *
 * Prerequisites assumed by the parent layout: UserDataProvider and FlowProvider
 * wrap this route; the user has been through `app/page.tsx`'s redirect guard
 * (startedAt is set and welcomeBackDue is false by the time Today renders).
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserData } from "@/lib/store/user-store";
import { useFlow } from "@/lib/store/flow-store";
import { getActivities } from "@/lib/repo/activity-repo";
import { getValues } from "@/lib/repo/value-repo";
import { BUDDY, CHECK_IN, TODAY, ONBOARDING } from "@/lib/copy";
import { isMonday, isFirstOfMonth } from "@/lib/domain/day";
import { currentDigestSlot } from "@/lib/domain/digest";
import { weekSummary, monthSummary } from "@/lib/domain/look-back";
import { weekDates } from "@/lib/domain/planner";
import { normaliseSafetyEntries, isSafetySetupDay } from "@/lib/domain/safety-plan";
import ActivityCard from "@/components/ActivityCard";
import type { PlanItem, SharedPlanItem, HomeworkPlanItem, EnergyLevel } from "@/lib/domain/types";

// Module-level: both functions are synchronous in-memory reads that return the
// same array reference on every call. Loading at module level avoids recreating
// the arrays on every re-render.
const activities = getActivities();
const values = getValues();

// Shared class strings (presentation only) — keep the page's markup readable.
const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
const btnPrimary = `inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-medium text-white hover:bg-indigo-700 ${focusRing}`;
const btnSecondary = `inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 ${focusRing}`;
const offerCard =
  "flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50";
const offerTitle = "font-medium text-gray-900 dark:text-gray-100";
const muted = "text-sm text-gray-600 dark:text-gray-400";

export default function TodayPage() {
  const {
    hydrated,
    today,
    startedAt,
    todayPlan,
    log,
    personalisedAt,
    personaliseDismissed,
    wakeTime,
    startDay,
    clearTodayPlan,
    dismissPersonalise,
    recordActivity,
    reviewSeen,
    reviewPreview,
    markReviewSeen,
    digestTimes,
    digestSeenSlot,
    markDigestSeen,
    buddy,
    sharedActivities,
    safetyEntries,
    safetySetupDismissedWeek,
    dismissSafetySetup,
  } = useUserData();

  const flowStore = useFlow();
  const router = useRouter();

  // Prerender safety: wait for hydration before reading localStorage-derived state.
  // The prerendered HTML contains a blank div; the browser fills it after mount.
  if (!hydrated) return <div />;

  // ── Greeting helper ────────────────────────────────────────────────────────
  // Called only after hydration so the prerendered HTML never contains a
  // time-dependent string (avoids React hydration mismatch on a static export).
  function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return TODAY.greetingMorning;
    if (h < 18) return TODAY.greetingAfternoon;
    return TODAY.greetingEvening;
  }

  // ── State A — no plan for today ────────────────────────────────────────────
  const isStateA = todayPlan === null || todayPlan.date !== today;

  if (isStateA) {
    return (
      <div className="flex flex-col gap-6 py-8">
        <div className="flex flex-col gap-2">
          <p className="text-base text-gray-600 dark:text-gray-400">{getGreeting()}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            {CHECK_IN.heading}
          </h1>
        </div>
        <div className="flex flex-col gap-3">
          {CHECK_IN.energyOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => startDay(opt.value as EnergyLevel)}
              className={`min-h-14 w-full rounded-2xl border border-gray-200 bg-white px-5 text-left text-lg font-medium text-gray-900 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:shadow-none dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40 ${focusRing}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{TODAY.lowDayNote}</p>
      </div>
    );
  }

  // ── State B — plan exists for today ───────────────────────────────────────

  function getLogEntry(activityId: string) {
    return log.find((e) => e.date === today && e.activityId === activityId) ?? null;
  }

  // Shared plan items for today — absent in stored blobs written before this
  // feature, so guarded with `?? []`.
  const shared = todayPlan.plan.shared ?? [];
  // Homework (therapist) plan items — plans stored before the therapist-sharing
  // feature lack the key entirely, so never read it bare.
  const homework = todayPlan.plan.homework ?? [];

  // True once any card in today's plan has been completed or skipped — includes
  // shared and homework cards so "Change energy" hides once any commitment is logged.
  const anyLogged =
    todayPlan.plan.activities.some((item) => getLogEntry(item.activityId) !== null) ||
    shared.some((s) => getLogEntry(s.activityId) !== null) ||
    homework.some((h) => getLogEntry(h.activityId) !== null);

  // True when every planned activity, every shared card and every homework card
  // has a log row. Shared and homework cards are keyed by activityId because
  // LogEntry has no sharedId/homeworkId field (concept §2.4 deliberately omitted
  // it). The planner dedup prevents the same activityId from appearing in two
  // lists in a current-day plan; stale stored blobs that predate the dedup accept
  // the remote chance of a double-complete as benign.
  // The non-empty guard keeps an empty plan from ending the day at once. It is
  // relaxed for homework only, because a plan whose sole content is homework is
  // not empty. It is deliberately NOT relaxed for `shared`: a shared-only plan
  // keeps the existing buddy behaviour, which the therapist-sharing feature does
  // not own.
  const allLogged =
    (todayPlan.plan.activities.length > 0 || homework.length > 0) &&
    todayPlan.plan.activities.every((item) => getLogEntry(item.activityId) !== null) &&
    shared.every((s) => getLogEntry(s.activityId) !== null) &&
    homework.every((h) => getLogEntry(h.activityId) !== null);

  // Computed after the hydration guard so `digestTimes` (localStorage-derived)
  // is never read server-side — identical deferral pattern to `getGreeting`.
  // Returns null when no slot is currently active or the current slot has already
  // been seen (markDigestSeen was called). The ternary is defensive; `hydrated`
  // is always true here because we returned early above if it were false.
  const digestSlot = hydrated ? currentDigestSlot(digestTimes, digestSeenSlot, new Date()) : null;

  // ── Review card computations ───────────────────────────────────────────────
  // All date arithmetic uses the local-calendar constructor (new Date(y, m-1, d))
  // to match the parts-based UTC-safe parsing convention in lib/domain/day.ts.
  const mondayDate = weekDates(today)[0];
  const [mondayY, mondayM, mondayD] = mondayDate.split('-').map(Number);
  const lastWeekStartDt = new Date(mondayY, mondayM - 1, mondayD - 7);
  const lastWeekStart = `${lastWeekStartDt.getFullYear()}-${String(lastWeekStartDt.getMonth() + 1).padStart(2, '0')}-${String(lastWeekStartDt.getDate()).padStart(2, '0')}`;
  const [todayY, todayM] = today.split('-').map(Number);
  let prevMonthYear = todayY;
  let prevMonthNum = todayM - 1;
  if (prevMonthNum === 0) { prevMonthNum = 12; prevMonthYear -= 1; }
  const prevMonthKey = `${prevMonthYear}-${String(prevMonthNum).padStart(2, '0')}`;

  const prevWeekData = weekSummary(log, lastWeekStart);
  const prevMonthData = monthSummary(log, prevMonthYear, prevMonthNum);

  // Month card takes precedence when Monday is also the 1st — never two cards at once (concept §2.8).
  const showMonthCard =
    isFirstOfMonth(today) &&
    reviewSeen.month !== prevMonthKey &&
    prevMonthData.activeDays > 0;

  const showWeekCard =
    !showMonthCard &&
    (isMonday(today) || reviewPreview) &&
    reviewSeen.week !== mondayDate &&
    prevWeekData.doneCount > 0;

  /**
   * Starts the activity loop for the given plan item. Resets flow state first
   * because `app/page.tsx` is now a redirect and no longer calls `reset()` on
   * entry — without this reset a second loop would inherit stale moodBefore and
   * outcome, and `/done`'s guard would pass on that stale data (domain note in
   * AppFrameTodayOnboardingMap.md, Part 3 gotcha).
   */
  function handleStart(item: PlanItem): void {
    flowStore.reset();
    flowStore.setEnergy(todayPlan!.energy);
    flowStore.setTaskId(item.activityId);
    flowStore.setTemplateId(item.templateId);
    router.push("/mood-before");
  }

  /**
   * Starts the activity loop for a shared (buddy) plan item. `setTemplateId` is the
   * load-bearing call: `/mood-after` and the skip path in `/task` write
   * `templateId: state.templateId` into the LogEntry and read nothing else, so the
   * plan item's `SHARED_TEMPLATE_ID` is the only trace that this loop came from a
   * shared card. `setSharedId` is informational only — no page under `app/` reads it.
   * The flow store has no combined `startActivity` helper; the individual setters are
   * composed here in the same order as `handleStart`.
   */
  function handleStartShared(s: SharedPlanItem): void {
    flowStore.reset();
    flowStore.setEnergy(todayPlan!.energy);
    flowStore.setTaskId(s.activityId);
    flowStore.setTemplateId(s.templateId);
    flowStore.setSharedId(s.sharedId);
    router.push("/mood-before");
  }

  /**
   * Starts the activity loop for a homework (therapist) plan item. Same contract
   * as `handleStartShared`: `setTemplateId` is the load-bearing call that makes the
   * logged row carry `HOMEWORK_TEMPLATE_ID`, because `/mood-after` and the skip path
   * in `/task` read only `state.templateId`. `setHomeworkId` is informational only.
   */
  function handleStartHomework(h: HomeworkPlanItem): void {
    flowStore.reset();
    flowStore.setEnergy(todayPlan!.energy);
    flowStore.setTaskId(h.activityId);
    flowStore.setTemplateId(h.templateId);
    flowStore.setHomeworkId(h.homeworkId);
    router.push("/mood-before");
  }

  // "Make it yours" card: shown from the second day onward (startedAt < today),
  // only when personalisation has not been completed or dismissed.
  const showPersonaliseOffer =
    personalisedAt === null &&
    !personaliseDismissed &&
    startedAt !== null &&
    startedAt < today;

  // Safety-plan setup card: every rule lives in `isSafetySetupDay`; never tied to points or mood.
  // "Not now" stores this week's Monday, not a forever flag, so the card may return next week.
  // `todayPlan.energy` is safe un-chained here: State B guarantees today's check-in is done.
  const showSafetySetup = isSafetySetupDay({
    todayEnergy: todayPlan.energy,
    startedAt,
    today,
    // hydrate() validates only JSON syntax, so a corrupted stored blob is coerced here.
    entries: normaliseSafetyEntries(safetyEntries),
    dismissedWeek: safetySetupDismissedWeek,
    mondayDate,
    // The digest card is excluded: it is content the user configured, not an offer.
    otherOfferShowing: showMonthCard || showWeekCard || showPersonaliseOffer,
    dayEnded: allLogged,
  });

  return (
    <div className="flex flex-col gap-4 py-6">
      {/* Plan header */}
      <div className="flex min-h-11 items-center justify-between gap-3">
        <p className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          {TODAY.planHeading} <span className="capitalize">{todayPlan.energy}</span>
        </p>

        {/* Change energy — hidden once any card has been logged */}
        {!anyLogged && (
          <button
            onClick={clearTodayPlan}
            className={`min-h-11 shrink-0 rounded-lg px-2 text-sm font-medium text-indigo-700 underline-offset-4 hover:underline dark:text-indigo-300 ${focusRing}`}
          >
            {TODAY.changeEnergyLabel}
          </button>
        )}
      </div>

      {/* Activity cards */}
      {todayPlan.plan.activities.map((item) => {
        const activity = activities.find((a) => a.id === item.activityId) ?? null;
        if (activity === null) return null; // data integrity failure — skip silently

        const firstValueId = activity.valueIds[0] ?? null;
        const valueTag = firstValueId !== null
          ? (values.find((v) => v.id === firstValueId) ?? null)
          : null;

        const logEntry = getLogEntry(item.activityId);

        return (
          <ActivityCard
            key={item.activityId}
            item={item}
            activity={activity}
            valueTag={valueTag}
            logEntry={logEntry}
            onStart={() => handleStart(item)}
          />
        );
      })}

      {/* Homework (therapist) cards — after planned activities, before shared cards.
          Keyed by homeworkId for the same stale-blob reason as the shared block below.
          No low-day note: the planner already leads with the two-minute version on a
          low-energy day (`leadWithTwoMinute`). */}
      {homework.map((h) => {
        const activity = activities.find((a) => a.id === h.activityId) ?? null;
        if (activity === null) return null;
        const firstValueId = activity.valueIds[0] ?? null;
        const valueTag = firstValueId !== null
          ? (values.find((v) => v.id === firstValueId) ?? null)
          : null;
        const logEntry = getLogEntry(h.activityId);
        return (
          <ActivityCard
            key={h.homeworkId}
            item={h}
            activity={activity}
            valueTag={valueTag}
            logEntry={logEntry}
            fromTherapist
            onStart={() => handleStartHomework(h)}
          />
        );
      })}

      {/* Shared (buddy) cards — placed after planned activities, before anchors (concept §2.5).
          Keyed by sharedId because the same activityId could theoretically appear in both
          DayPlan.activities and DayPlan.shared in a stored blob written before the planner
          dedup guard was in place. The low-day note is rendered beside the card in Today's
          JSX rather than inside ActivityCard — it depends on Today's energy-state check and
          must not couple the generic component to this page's business logic. */}
      {shared.map((s) => {
        const activity = activities.find((a) => a.id === s.activityId) ?? null;
        if (activity === null) return null;
        const firstValueId = activity.valueIds[0] ?? null;
        const valueTag = firstValueId !== null
          ? (values.find((v) => v.id === firstValueId) ?? null)
          : null;
        const logEntry = getLogEntry(s.activityId);
        return (
          <div key={s.sharedId} className="flex flex-col gap-2">
            <ActivityCard
              item={s}
              activity={activity}
              valueTag={valueTag}
              logEntry={logEntry}
              withName={buddy?.name}
              onStart={() => handleStartShared(s)}
            />
            {todayPlan!.energy === "low" && buddy !== null && (
              <p className={`px-1 leading-relaxed ${muted}`}>{BUDDY.lowDay.replace("{name}", buddy.name)}</p>
            )}
          </div>
        );
      })}

      {/* Review cards — at most one shown; month card takes precedence when Monday is also 1st */}
      {showMonthCard && (
        <div className={offerCard}>
          <div className="flex flex-col gap-1">
            <p className={offerTitle}>{TODAY.monthReviewCardHeading}</p>
            <p className={muted}>
              {prevMonthData.activeDays}{" "}
              {prevMonthData.activeDays === 1 ? "day" : "days"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={btnPrimary}
              onClick={() => {
                markReviewSeen("month", prevMonthKey);
                router.push("/look-back");
              }}
            >
              {TODAY.lookBackCtaLabel}
            </button>
            <button className={btnSecondary} onClick={() => markReviewSeen("month", prevMonthKey)}>
              {ONBOARDING.notNowLabel}
            </button>
          </div>
        </div>
      )}
      {showWeekCard && (
        <div className={offerCard}>
          <div className="flex flex-col gap-1">
            <p className={offerTitle}>{TODAY.weekReviewCardHeading}</p>
            <p className={muted}>
              {prevWeekData.doneCount}{" "}
              {prevWeekData.doneCount === 1 ? "thing" : "things"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={btnPrimary}
              onClick={() => {
                markReviewSeen("week", mondayDate);
                router.push("/look-back");
              }}
            >
              {TODAY.lookBackCtaLabel}
            </button>
            <button className={btnSecondary} onClick={() => markReviewSeen("week", mondayDate)}>
              {ONBOARDING.notNowLabel}
            </button>
          </div>
        </div>
      )}

      {/* Digest card — shown when a current slot exists and has not yet been seen.
          digestSlot is null when no times are configured, no slot window is active,
          or the user already opened/dismissed the current slot. */}
      {digestSlot !== null && (
        <div className={offerCard}>
          <p className={offerTitle}>{TODAY.digestCardTitle}</p>
          <div className="flex flex-wrap gap-2">
            <button className={btnPrimary} onClick={() => router.push("/digest")}>Read it</button>
            <button className={btnSecondary} onClick={() => markDigestSeen(digestSlot.slotKey)}>
              {ONBOARDING.notNowLabel}
            </button>
          </div>
        </div>
      )}

      {/* "Make it yours" offer — visible from day two onward */}
      {showPersonaliseOffer && (
        <div className={offerCard}>
          <div className="flex flex-wrap gap-2">
            <button className={btnPrimary} onClick={() => router.push("/onboarding/reasons")}>
              {ONBOARDING.offerCta}
            </button>
            <button className={btnSecondary} onClick={dismissPersonalise}>{ONBOARDING.notNowLabel}</button>
          </div>
        </div>
      )}

      {/* Safety-plan setup card — after the other offers and before the anchor row,
          so it never follows the end-of-day sentence. The CTA only navigates; only
          "Not now" dismisses, and only for this week. */}
      {showSafetySetup && (
        <div className={offerCard}>
          <p className="leading-relaxed text-gray-800 dark:text-gray-200">{TODAY.safetySetupText}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/safety/edit" className={btnPrimary}>{TODAY.safetySetupCta}</Link>
            <button className={btnSecondary} onClick={() => dismissSafetySetup(mondayDate)}>
              {ONBOARDING.notNowLabel}
            </button>
          </div>
        </div>
      )}

      {/* Anchor row — wake-time anchor and quick-log chips */}
      <div className="mt-2 flex flex-col gap-2">
        <p className={muted}>
          {TODAY.wakeAnchor} {wakeTime}
        </p>
        <div className="flex flex-wrap gap-2">
          {todayPlan.plan.anchors.map((item) => {
            const activity = activities.find((a) => a.id === item.activityId) ?? null;
            if (activity === null) return null;

            const alreadyLogged = getLogEntry(item.activityId) !== null;

            function handleAnchorTap() {
              if (alreadyLogged) return; // no undo; chip is visual-only after logging
              recordActivity({
                outcome: "done",
                version: "full",
                moodBefore: null,
                moodAfter: null,
                date: today,
                activityId: item.activityId,
                templateId: item.templateId,
              });
            }

            return (
              <button
                key={item.activityId}
                onClick={handleAnchorTap}
                className={`min-h-11 rounded-xl border px-4 py-2 text-left text-sm font-medium transition-colors ${focusRing} ${
                  alreadyLogged
                    ? "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400"
                    : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                }`}
              >
                {activity.title}
                {alreadyLogged && " ✓"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Swap line — offered only while the plan is not yet complete; hidden once
          allLogged because the end sentence already marks the day as done (§2.4). */}
      {!allLogged && (
        <a
          href="/swap"
          className={`self-start rounded-md py-2 text-sm font-medium text-indigo-700 underline-offset-4 hover:underline dark:text-indigo-300 ${focusRing}`}
        >
          {TODAY.swapLine}
        </a>
      )}

      {/* End-of-day note — absolute bottom of State B, after the anchor row and
          swap line, so no content ever follows it (parent §3.3). */}
      {allLogged && (
        <p className="py-6 text-center text-base leading-relaxed text-gray-700 dark:text-gray-300">
          {TODAY.endOfDay}
        </p>
      )}
    </div>
  );
}
