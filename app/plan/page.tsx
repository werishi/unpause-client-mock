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

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useUserData } from "@/lib/store/user-store";
import { pruneHomeworkItems } from "@/lib/store/sharing-slice";
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

// Shared class strings (presentation only) — same design language as
// app/today/page.tsx, whose constants these mirror.
const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
const btnPrimary = `inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-medium text-white hover:bg-indigo-700 ${focusRing}`;
const btnSecondary = `inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 ${focusRing}`;
const offerCard =
  "flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50";
const offerTitle = "font-medium text-gray-900 dark:text-gray-100";
const muted = "text-sm text-gray-600 dark:text-gray-400";
const sectionHeading = "text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100";
// Rows sit inside one card with inset dividers. `empty:hidden` drops the card
// when every row branch rendered nothing, instead of leaving an empty box.
const listCard =
  "flex flex-col divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white px-4 shadow-sm empty:hidden dark:divide-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:shadow-none";
const calmNote =
  "rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400";

/**
 * Plan tab page. Shows the week strip, the detail for the selected day, and
 * the week-offers section for the user's active templates.
 *
 * Hydration guard: renders `null` until the store's `hydrated` flag is true.
 * The body calls `new Date()` and reads store data that is only correct after
 * the provider has read localStorage, so the prerender and the first client
 * render must both be `null` to stay identical. `hydrated` is false on both
 * and, on initial load, turns true in the same commit a page-local mount flag
 * would have; on client-side navigation it is already true at mount. A
 * page-local mount flag or `useSyncExternalStore` "is client" hook was refused
 * because it would be a second readiness signal beside the store's.
 */
export default function PlanPage() {
  const { log, todayPlan, templateIds, moveUpPutOff, putOffMoveUp, setTemplates, activityOverrides, buddy, sharedActivities, homework, hydrated } = useUserData();
  // `selected` is empty until the user picks a day; `effectiveSelected` falls back to `today`.
  const [selected, setSelected] = useState("");

  if (!hydrated) return null;

  const today = localDateString(new Date());
  // On first render after hydration `selected` is ""; fall back to today so the
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
      dayDetail = <p className={calmNote}>{PLAN.quietDay}</p>;
    } else {
      dayDetail = (
        <div className={listCard}>
          {doneEntries.map((e) => {
            const activity = allActivities.find((a) => a.id === e.activityId);
            if (!activity) {
              return (
                <p key={`${e.date}-${e.activityId}`} className={`py-3 ${muted}`}>{PLAN.noActivity}</p>
              );
            }
            // Apply the user's override so past-day titles and two-minute versions
            // reflect any edits the user made on /plan/activity (part5-activity-edit).
            const merged = withOverride(activity, activityOverrides[e.activityId]);
            return (
              <div key={`${e.date}-${e.activityId}`} className="flex flex-col gap-1 py-3">
                <p className="font-medium leading-snug text-gray-900 dark:text-gray-100">{merged.title}</p>
                {e.version === "twoMinute" && (
                  <p className={`leading-relaxed ${muted}`}>{merged.twoMinuteVersion}</p>
                )}
              </div>
            );
          })}
        </div>
      );
    }
  } else if (
    effectiveSelected === today &&
    (todayPlan === null || todayPlan.date !== today)
  ) {
    // Today before check-in: prompt the user to start their day on the Today
    // screen, where `startDay` will compute and store the plan.
    dayDetail = (
      <div className={offerCard}>
        <p className={offerTitle}>{PLAN.beforeCheckIn}</p>
        <Link href="/today" className={`self-start ${btnPrimary}`}>{PLAN.goToToday}</Link>
      </div>
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
      <div className="flex flex-col gap-3">
        <div className={listCard}>
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
        {/* Homework rows come from the plan fixed at check-in, not from the
            store's `homework`: an item linked or seeded after check-in joins
            the plan at the next check-in (part 2's startDay). */}
        {(todayPlan.plan.homework ?? []).map((h) => {
          const activity = allActivities.find((a) => a.id === h.activityId);
          const isDone = log.some(
            (e) =>
              e.date === today &&
              e.activityId === h.activityId &&
              e.outcome === "done",
          );
          return (
            <PlanActivityRow
              key={h.homeworkId}
              title={activity?.title ?? PLAN.noActivity}
              twoMinuteVersion={activity?.twoMinuteVersion}
              done={isDone}
              fromTherapist
            />
          );
        })}
        {(() => {
          // Look up today's shared activity from the store (not from DayPlan.shared,
          // which covers only the current day's plan blob; sharedActivities spans the
          // whole week). The activity display name is resolved from the in-memory
          // catalogue returned by getActivities() — consistent with how plan rows above
          // resolve their titles.
          const sharedItem = sharedActivities.find((a) => a.date === today);
          if (!sharedItem) return null;
          const sharedActivity = allActivities.find((a) => a.id === sharedItem.activityId);
          return (
            <PlanActivityRow
              title={sharedActivity?.title ?? PLAN.noActivity}
              twoMinuteVersion={sharedActivity?.twoMinuteVersion}
              withName={buddy?.name}
            />
          );
        })()}
        </div>
        {anchors.length > 0 && (
          <p className={`px-1 leading-relaxed ${muted}`}>
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
      </div>
    );
  } else {
    // Future day: no plan has been computed yet for this date, but homework
    // already dated to it is shown. Past items leave the store only at
    // check-in, so the page prunes with the shared helper before matching.
    const futureHomework = pruneHomeworkItems(homework, today).filter(
      (h) => h.date === effectiveSelected,
    );
    dayDetail = (
      <div className="flex flex-col gap-3">
        <p className={calmNote}>{PLAN.futureDay}</p>
        <div className={listCard}>
        {futureHomework.map((h) => {
          const activity = allActivities.find((a) => a.id === h.activityId);
          return (
            <PlanActivityRow
              key={h.homeworkId}
              title={activity?.title ?? PLAN.noActivity}
              twoMinuteVersion={activity?.twoMinuteVersion}
              fromTherapist
            />
          );
        })}
        </div>
      </div>
    );
  }

  return (
    // A <div>, not <main>: AppShell already renders the page's <main>.
    <div className="flex flex-col gap-8 py-6">
      <WeekStrip
        dates={dates}
        today={today}
        selected={effectiveSelected}
        onSelect={setSelected}
      />

      <section className="-mt-2">{dayDetail}</section>

      <section className="flex flex-col gap-4">
        <h2 className={sectionHeading}>{PLAN.weekOffersHeading}</h2>
        {offers.anchors.length > 0 && (
          <p className={`-mt-2 px-1 leading-relaxed ${muted}`}>
            {PLAN.anchorPrefix}{" "}
            {offers.anchors.map((a) => a.title).join(", ")}
          </p>
        )}
        {offers.byTemplate.map((entry) => {
          const template = allTemplates.find((t) => t.id === entry.templateId);
          return (
            <div key={entry.templateId} className="flex flex-col gap-2">
              {template && (
                <h3 className="px-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {template.title}
                </h3>
              )}
              <div className={listCard}>
              {entry.activities.map((activity) => (
                <PlanActivityRow
                  key={activity.id}
                  title={activity.title}
                  twoMinuteVersion={activity.twoMinuteVersion}
                  editHref={`/plan/activity?id=${activity.id}`}
                />
              ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Templates section — shows active templates and links to /plan/templates */}
      <section className="flex flex-col gap-3">
        <h2 className={sectionHeading}>{PLAN.templatesSectionHeading}</h2>
        {activeTemplates.map((t) => (
          <div
            key={t.id}
            className="flex flex-col gap-1.5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:shadow-none"
          >
            <p className="font-medium leading-snug text-gray-900 dark:text-gray-100">{t.title}</p>
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{t.summary}</p>
            <p className="mt-1 self-start rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {PLAN.templateLevel} {t.level}
            </p>
          </div>
        ))}
        <Link href="/plan/templates" className={`self-start ${btnSecondary}`}>{PLAN.changeTemplates}</Link>
      </section>

      {/* Move-up offer — conditional on suggestNextTemplate qualifying and the
          offer not having been dismissed already this week */}
      {moveUpOffer && (() => {
        const currentTitle = allTemplates.find((t) => t.id === moveUpOffer!.currentId)?.title ?? "";
        const nextTpl = allTemplates.find((t) => t.id === moveUpOffer!.nextId);
        return (
          <div className={offerCard}>
            <div className="flex flex-col gap-1">
              <p className={offerTitle}>{PLAN.moveUpOfferText
                .replace("{current}", currentTitle)
                .replace("{next}", nextTpl?.title ?? "")}</p>
              <p className={`leading-relaxed ${muted}`}>{nextTpl?.summary}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={btnPrimary} onClick={() =>
                setTemplates(templateIds.map((id) => id === moveUpOffer!.currentId ? moveUpOffer!.nextId : id))
              }>{PLAN.moveUpButton}</button>
              <button className={btnSecondary} onClick={() => putOffMoveUp(currentWeekStart)}>{PLAN.moveUpDismiss}</button>
            </div>
          </div>
        );
      })()}

      {/* "Changes start next check-in" notice — only when today has a plan */}
      {todayPlan && <p className={`-mt-4 px-1 text-center ${muted}`}>{PLAN.changesNextCheckIn}</p>}
    </div>
  );
}
