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
import ActivityCard from "@/components/ActivityCard";
import type { PlanItem, SharedPlanItem, EnergyLevel } from "@/lib/domain/types";

// Module-level: both functions are synchronous in-memory reads that return the
// same array reference on every call. Loading at module level avoids recreating
// the arrays on every re-render.
const activities = getActivities();
const values = getValues();

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
      <main>
        <p>{getGreeting()}</p>
        <h1>{CHECK_IN.heading}</h1>
        {CHECK_IN.energyOptions.map((opt) => (
          <button key={opt.value} onClick={() => startDay(opt.value as EnergyLevel)}>
            {opt.label}
          </button>
        ))}
        <p>{TODAY.lowDayNote}</p>
      </main>
    );
  }

  // ── State B — plan exists for today ───────────────────────────────────────

  function getLogEntry(activityId: string) {
    return log.find((e) => e.date === today && e.activityId === activityId) ?? null;
  }

  // Shared plan items for today — absent in stored blobs written before this
  // feature, so guarded with `?? []`.
  const shared = todayPlan.plan.shared ?? [];

  // True once any card in today's plan has been completed or skipped — includes
  // shared cards so "Change energy" hides once any commitment is logged.
  const anyLogged =
    todayPlan.plan.activities.some((item) => getLogEntry(item.activityId) !== null) ||
    shared.some((s) => getLogEntry(s.activityId) !== null);

  // True when every planned activity and every shared card has a log row.
  // Shared cards are keyed by activityId because LogEntry has no sharedId field
  // (concept §2.4 deliberately omitted it). The planner dedup prevents the same
  // activityId from appearing in both lists in a current-day plan; stale stored
  // blobs that predate the dedup accept the remote chance of a double-complete
  // as benign.
  const allLogged =
    todayPlan.plan.activities.length > 0 &&
    todayPlan.plan.activities.every((item) => getLogEntry(item.activityId) !== null) &&
    shared.every((s) => getLogEntry(s.activityId) !== null);

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
   * Starts the activity loop for a shared (buddy) plan item. Calls `setSharedId`
   * so that `/mood-after` writes `templateId: SHARED_TEMPLATE_ID` on the resulting
   * LogEntry — the only trace that this loop came from a shared card. The flow store
   * has no combined `startActivity` helper; the individual setters are composed here
   * in the same order as `handleStart`, with `setSharedId` added before the push.
   */
  function handleStartShared(s: SharedPlanItem): void {
    flowStore.reset();
    flowStore.setEnergy(todayPlan!.energy);
    flowStore.setTaskId(s.activityId);
    flowStore.setTemplateId(s.templateId);
    flowStore.setSharedId(s.sharedId);
    router.push("/mood-before");
  }

  // "Make it yours" card: shown from the second day onward (startedAt < today),
  // only when personalisation has not been completed or dismissed.
  const showPersonaliseOffer =
    personalisedAt === null &&
    !personaliseDismissed &&
    startedAt !== null &&
    startedAt < today;

  return (
    <main>
      {/* Plan header */}
      <p>
        {TODAY.planHeading} {todayPlan.energy}
      </p>

      {/* Change energy — hidden once any card has been logged */}
      {!anyLogged && (
        <button onClick={clearTodayPlan}>{TODAY.changeEnergyLabel}</button>
      )}

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
          <div key={s.sharedId}>
            <ActivityCard
              item={s}
              activity={activity}
              valueTag={valueTag}
              logEntry={logEntry}
              withName={buddy?.name}
              onStart={() => handleStartShared(s)}
            />
            {todayPlan!.energy === "low" && buddy !== null && (
              <p>{BUDDY.lowDay.replace("{name}", buddy.name)}</p>
            )}
          </div>
        );
      })}

      {/* Review cards — at most one shown; month card takes precedence when Monday is also 1st */}
      {showMonthCard && (
        <div>
          <p>{TODAY.monthReviewCardHeading}</p>
          <p>
            {prevMonthData.activeDays}{" "}
            {prevMonthData.activeDays === 1 ? "day" : "days"}
          </p>
          <button
            onClick={() => {
              markReviewSeen("month", prevMonthKey);
              router.push("/look-back");
            }}
          >
            {TODAY.lookBackCtaLabel}
          </button>
          <button onClick={() => markReviewSeen("month", prevMonthKey)}>
            {ONBOARDING.notNowLabel}
          </button>
        </div>
      )}
      {showWeekCard && (
        <div>
          <p>{TODAY.weekReviewCardHeading}</p>
          <p>
            {prevWeekData.doneCount}{" "}
            {prevWeekData.doneCount === 1 ? "thing" : "things"}
          </p>
          <button
            onClick={() => {
              markReviewSeen("week", mondayDate);
              router.push("/look-back");
            }}
          >
            {TODAY.lookBackCtaLabel}
          </button>
          <button onClick={() => markReviewSeen("week", mondayDate)}>
            {ONBOARDING.notNowLabel}
          </button>
        </div>
      )}

      {/* Digest card — shown when a current slot exists and has not yet been seen.
          digestSlot is null when no times are configured, no slot window is active,
          or the user already opened/dismissed the current slot. */}
      {digestSlot !== null && (
        <div>
          <p>{TODAY.digestCardTitle}</p>
          <button onClick={() => router.push("/digest")}>Read it</button>
          <button onClick={() => markDigestSeen(digestSlot.slotKey)}>
            {ONBOARDING.notNowLabel}
          </button>
        </div>
      )}

      {/* "Make it yours" offer — visible from day two onward */}
      {showPersonaliseOffer && (
        <div>
          <button onClick={() => router.push("/onboarding/reasons")}>
            {ONBOARDING.offerCta}
          </button>
          <button onClick={dismissPersonalise}>{ONBOARDING.notNowLabel}</button>
        </div>
      )}

      {/* Anchor row — wake-time anchor and quick-log chips */}
      <p>
        {TODAY.wakeAnchor} {wakeTime}
      </p>
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
          <button key={item.activityId} onClick={handleAnchorTap}>
            {activity.title}
            {alreadyLogged && " ✓"}
          </button>
        );
      })}

      {/* Swap line — offered only while the plan is not yet complete; hidden once
          allLogged because the end sentence already marks the day as done (§2.4). */}
      {!allLogged && (
        <a href="/swap">{TODAY.swapLine}</a>
      )}

      {/* End-of-day note — absolute bottom of State B, after the anchor row and
          swap line, so no content ever follows it (parent §3.3). */}
      {allLogged && <p>{TODAY.endOfDay}</p>}
    </main>
  );
}
