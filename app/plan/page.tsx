"use client";

/**
 * Plan tab — seven-day week strip with day-detail and week-offer sections.
 *
 * Renders three zones:
 * 1. `WeekStrip` — day selector for the current week.
 * 2. Day-detail section — content varies by relationship of `selected` to `today`:
 *    past (done log only), today-before-check-in, today-after-check-in, future.
 * 3. Week-offers section — activities that may come up this week across the
 *    user's active templates, grouped by template.
 *
 * The page never calls `planDay`. Today's plan is read exclusively from
 * `todayPlan` in the store (written by `startDay` on the Today screen).
 * Past-day activity titles are resolved via `withOverride` so user edits from
 * /plan/activity are reflected in the log view (part5-activity-edit).
 *
 * Prerequisites: `UserDataProvider` wraps this route; the root redirect guard
 * in `app/page.tsx` has already verified that `startedAt` is set.
 */

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useUserData } from "@/lib/store/user-store";
import { localDateString } from "@/lib/domain/day";
import { weekDates, weekOffers, suggestNextTemplate } from "@/lib/domain/planner";
import { getActivities } from "@/lib/repo/activity-repo";
import { withOverride } from "@/lib/domain/override";
import { getTemplates, getTemplateItems } from "@/lib/repo/template-repo";
import WeekStrip from "@/components/WeekStrip";
import PlanActivityRow from "@/components/PlanActivityRow";
import { PLAN } from "@/lib/copy";

// Static seed catalogues — synchronous in-memory reads with no side effects.
// Placed at module level so they are not re-created on every re-render,
// matching the same pattern used in app/today/page.tsx.
const allActivities = getActivities();
const allTemplates = getTemplates();

/**
 * Plan tab page. Shows the week strip, the detail for the selected day, and
 * the week-offers section for the user's active templates.
 *
 * Hydration guard: renders `null` until `mounted` is true, so the server
 * prerender (which has no localStorage) never shows stale or incorrect dates.
 */
export default function PlanPage() {
  const { log, todayPlan, templateIds, moveUpPutOff, putOffMoveUp, setTemplates, activityOverrides } = useUserData();
  const [mounted, setMounted] = useState(false);
  // `selected` is empty until mount; `effectiveSelected` falls back to `today`.
  const [selected, setSelected] = useState("");

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const today = localDateString(new Date());
  // On first render after mount `selected` is ""; fall back to today so the
  // current day is pre-selected without a second state update.
  const effectiveSelected = selected || today;
  const dates = weekDates(today);

  // Build week-offers data. Depends on templateIds from the store, so computed
  // per render rather than at module level.
  const allItems = templateIds.flatMap((id) => getTemplateItems(id));
  const offers = weekOffers(templateIds, allItems, allActivities);

  // Active templates for the templates section below.
  const activeTemplates = allTemplates.filter((t) => templateIds.includes(t.id));

  // Move-up offer: shown at most once per week (suppressed when moveUpPutOff
  // equals the current Monday). Only the first qualifying template is offered.
  // `log` is passed as-is so suggestNextTemplate can resolve dayOffset rows
  // using the anchor date — pre-resolving to ISO dates would break persona-seed
  // rows that carry dayOffset rather than date (see map Implementation Gotchas).
  const currentWeekStart = weekDates(today)[0];
  let moveUpOffer: { currentId: string; nextId: string } | null = null;
  if (moveUpPutOff !== currentWeekStart) {
    for (const tid of templateIds) {
      const tpl = allTemplates.find((t) => t.id === tid);
      if (!tpl?.nextTemplateId) continue;
      const items = getTemplateItems(tid);
      // LogEntry.date is always present for user data; dayOffset ?? 0 is a safe
      // default because suggestNextTemplate prefers date over dayOffset when both exist.
      const rawLog = log.map((e) => ({ templateId: e.templateId, dayOffset: e.dayOffset ?? 0, date: e.date }));
      const nextId = suggestNextTemplate(tpl, items, rawLog, today);
      if (nextId) {
        moveUpOffer = { currentId: tid, nextId };
        break;
      }
    }
  }

  // ── Day-detail rendering ────────────────────────────────────────────────

  let dayDetail: ReactNode;

  if (effectiveSelected < today) {
    // Past day: only `outcome === "done"` log rows are shown. Past plans are
    // not stored; showing skipped outcomes or energy ratings would turn the
    // record into an account of the day (G10, G4).
    const doneEntries = log.filter(
      (e) => e.date === effectiveSelected && e.outcome === "done",
    );
    if (doneEntries.length === 0) {
      dayDetail = <p>{PLAN.quietDay}</p>;
    } else {
      dayDetail = (
        <>
          {doneEntries.map((e) => {
            const activity = allActivities.find((a) => a.id === e.activityId);
            if (!activity) {
              return (
                <p key={`${e.date}-${e.activityId}`}>{PLAN.noActivity}</p>
              );
            }
            // Apply the user's override so past-day titles and two-minute versions
            // reflect any edits the user made on /plan/activity (part5-activity-edit).
            const merged = withOverride(activity, activityOverrides[e.activityId]);
            return (
              <div key={`${e.date}-${e.activityId}`}>
                <p>{merged.title}</p>
                {e.version === "twoMinute" && (
                  <p className="text-sm">{merged.twoMinuteVersion}</p>
                )}
              </div>
            );
          })}
        </>
      );
    }
  } else if (
    effectiveSelected === today &&
    (todayPlan === null || todayPlan.date !== today)
  ) {
    // Today before check-in: prompt the user to start their day on the Today
    // screen, where `startDay` will compute and store the plan.
    dayDetail = (
      <>
        <p>{PLAN.beforeCheckIn}</p>
        <Link href="/today">{PLAN.goToToday}</Link>
      </>
    );
  } else if (
    effectiveSelected === today &&
    todayPlan !== null &&
    todayPlan.date === today
  ) {
    // Today after check-in: render the stored plan from `startDay`.
    // `todayPlan.anchors` is defined on DayPlan but may be absent in an
    // older localStorage blob; default to [] as a runtime guard.
    const anchors = todayPlan.plan.anchors ?? [];
    dayDetail = (
      <>
        {todayPlan.plan.activities.map((item) => {
          const activity = allActivities.find((a) => a.id === item.activityId);
          const isDone = log.some(
            (e) =>
              e.date === today &&
              e.activityId === item.activityId &&
              e.outcome === "done",
          );
          return (
            <PlanActivityRow
              key={item.activityId}
              title={activity?.title ?? PLAN.noActivity}
              twoMinuteVersion={activity?.twoMinuteVersion}
              done={isDone}
            />
          );
        })}
        {anchors.length > 0 && (
          <p>
            {PLAN.anchorPrefix}{" "}
            {anchors
              .map(
                (a) =>
                  allActivities.find((x) => x.id === a.activityId)?.title ?? "",
              )
              .filter(Boolean)
              .join(", ")}
          </p>
        )}
      </>
    );
  } else {
    // Future day: no plan has been computed yet for this date.
    dayDetail = <p>{PLAN.futureDay}</p>;
  }

  return (
    <main>
      <WeekStrip
        dates={dates}
        today={today}
        selected={effectiveSelected}
        onSelect={setSelected}
      />

      <section>{dayDetail}</section>

      <section>
        <h2>{PLAN.weekOffersHeading}</h2>
        {offers.anchors.length > 0 && (
          <p>
            {PLAN.anchorPrefix}{" "}
            {offers.anchors.map((a) => a.title).join(", ")}
          </p>
        )}
        {offers.byTemplate.map((entry) => {
          const template = allTemplates.find((t) => t.id === entry.templateId);
          return (
            <div key={entry.templateId}>
              {template && <h3>{template.title}</h3>}
              {entry.activities.map((activity) => (
                <PlanActivityRow
                  key={activity.id}
                  title={activity.title}
                  twoMinuteVersion={activity.twoMinuteVersion}
                  editHref={`/plan/activity?id=${activity.id}`}
                />
              ))}
            </div>
          );
        })}
      </section>

      {/* Templates section — shows active templates and links to /plan/templates */}
      <section>
        <h2>{PLAN.templatesSectionHeading}</h2>
        {activeTemplates.map((t) => (
          <div key={t.id}>
            <p>{t.title}</p>
            <p>{t.summary}</p>
            <p>{PLAN.templateLevel} {t.level}</p>
          </div>
        ))}
        <Link href="/plan/templates">{PLAN.changeTemplates}</Link>
      </section>

      {/* Move-up offer — conditional on suggestNextTemplate qualifying and the
          offer not having been dismissed already this week */}
      {moveUpOffer && (() => {
        const currentTitle = allTemplates.find((t) => t.id === moveUpOffer!.currentId)?.title ?? "";
        const nextTpl = allTemplates.find((t) => t.id === moveUpOffer!.nextId);
        return (
          <div>
            <p>{PLAN.moveUpOfferText
              .replace("{current}", currentTitle)
              .replace("{next}", nextTpl?.title ?? "")}</p>
            <p>{nextTpl?.summary}</p>
            <button onClick={() =>
              setTemplates(templateIds.map((id) => id === moveUpOffer!.currentId ? moveUpOffer!.nextId : id))
            }>{PLAN.moveUpButton}</button>
            <button onClick={() => putOffMoveUp(currentWeekStart)}>{PLAN.moveUpDismiss}</button>
          </div>
        );
      })()}

      {/* "Changes start next check-in" notice — only when today has a plan */}
      {todayPlan && <p>{PLAN.changesNextCheckIn}</p>}
    </main>
  );
}
