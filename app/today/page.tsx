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
import { CHECK_IN, TODAY, ONBOARDING } from "@/lib/copy";
import ActivityCard from "@/components/ActivityCard";
import type { PlanItem, EnergyLevel } from "@/lib/domain/types";

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

  // True once any card in today's plan has been completed or skipped.
  // The "Change energy" button is hidden after this point — re-planning would
  // remove an activity the user already finished (concept 2.4).
  const anyLogged = todayPlan.plan.activities.some(
    (item) => getLogEntry(item.activityId) !== null
  );

  // True when every activity in today's plan has a log row.
  const allLogged =
    todayPlan.plan.activities.length > 0 &&
    todayPlan.plan.activities.every(
      (item) => getLogEntry(item.activityId) !== null
    );

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

      {/* End-of-day note */}
      {allLogged && <p>{TODAY.endOfDay}</p>}

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
    </main>
  );
}
