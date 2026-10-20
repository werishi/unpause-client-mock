"use client";

/**
 * OnboardingDonePage — terminal step of the three-step onboarding flow.
 *
 * Confirms the templates the user committed to, previews what the coming week
 * may contain (non-interactive — no day selection, no Edit links), and provides
 * a single exit to /today.
 *
 * The week strip is non-interactive: `onSelect` is a no-op and no `editHref` is
 * passed to PlanActivityRow rows. A new user has no past activity to navigate to
 * and has not yet done any activity, so showing Edit links would be premature.
 * `selected={today}` highlights today's cell only (concept Section 2.7).
 *
 * No FlowCloseButton: the flow is complete; omitting it signals "you're done"
 * rather than "you can bail". No ProgressDots: the user is past the flow.
 *
 * Prerequisite: UserDataProvider must be mounted above this page (root layout).
 * `hydrated` is false on the first SSR pass; guard prevents a hydration mismatch
 * with the store's persisted template IDs.
 */

import { useRouter } from "next/navigation";
import { useUserData } from "@/lib/store/user-store";
import { ONBOARDING, PLAN } from "@/lib/copy";
import { getTemplates, getTemplateItems } from "@/lib/repo/template-repo";
import { getActivities } from "@/lib/repo/activity-repo";
import { weekDates, weekOffers } from "@/lib/domain/planner";
import WeekStrip from "@/components/WeekStrip";
import PlanActivityRow from "@/components/PlanActivityRow";

export default function OnboardingDonePage() {
  const { templateIds, today, hydrated } = useUserData();
  const router = useRouter();

  if (!hydrated) return null;

  // Resolve template titles from the store's persisted template IDs.
  // getTemplates() is synchronous (static JSON import) — no loading state needed.
  const allTemplates = getTemplates();
  const titles = templateIds
    .map((id) => allTemplates.find((t) => t.id === id)?.title)
    .filter((title): title is string => title !== undefined);

  const allItems = templateIds.flatMap((id) => getTemplateItems(id));
  const offers = weekOffers(templateIds, allItems, getActivities());

  return (
    <main className="flex flex-col min-h-screen px-4 py-6">
      <h1 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        {ONBOARDING.doneHeading}
      </h1>

      <ul className="mt-6 flex flex-col gap-2">
        {titles.map((title) => (
          <li
            key={title}
            className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            {title}
          </li>
        ))}
      </ul>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {ONBOARDING.firstWeekHeading}
        </h2>
        <WeekStrip
          dates={weekDates(today)}
          today={today}
          selected={today}
          onSelect={() => {}}
        />
        <h3 className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
          {PLAN.weekOffersHeading}
        </h3>
        {offers.anchors.map((a) => (
          <PlanActivityRow
            key={a.id}
            title={`${PLAN.anchorPrefix}${a.title}`}
            twoMinuteVersion={a.twoMinuteVersion}
          />
        ))}
        {offers.byTemplate
          .flatMap((bt) => bt.activities)
          .map((a) => (
            <PlanActivityRow
              key={a.id}
              title={a.title}
              twoMinuteVersion={a.twoMinuteVersion}
            />
          ))}
      </section>

      <div className="mt-auto pt-8">
        <button
          type="button"
          onClick={() => router.push("/today")}
          className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {ONBOARDING.seeTodayLabel}
        </button>
      </div>
    </main>
  );
}
