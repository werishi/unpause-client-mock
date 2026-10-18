"use client";

/**
 * OnboardingDonePage — terminal step of the three-step onboarding flow.
 *
 * Confirms the templates the user committed to and provides a single exit to
 * /today. No FlowCloseButton: the flow is complete and omitting it signals
 * "you're done" rather than "you can bail". No ProgressDots: the user is past
 * the flow, not inside it.
 *
 * Template titles are resolved from the store's `templateIds` field via
 * getTemplates() from template-repo — the authoritative library. This avoids
 * calling getTemplatesForReasons with reason IDs when template IDs are what the
 * store holds. IDs present in the store but absent from the library are silently
 * filtered out (should not happen in the demo data, but the guard prevents a
 * blank list item).
 *
 * No seven-day week strip: that requires the Plan screen the child concept
 * designs; a strip with placeholder days would show a plan the planner never
 * made.
 *
 * Prerequisite: UserDataProvider must be mounted above this page (root layout).
 */

import { useRouter } from "next/navigation";
import { useUserData } from "@/lib/store/user-store";
import { ONBOARDING } from "@/lib/copy";
import { getTemplates } from "@/lib/repo/template-repo";

export default function OnboardingDonePage() {
  const { templateIds } = useUserData();
  const router = useRouter();

  // Resolve template titles from the store's persisted template IDs.
  // getTemplates() is synchronous (static JSON import) — no loading state needed.
  const allTemplates = getTemplates();
  const titles = templateIds
    .map((id) => allTemplates.find((t) => t.id === id)?.title)
    .filter((title): title is string => title !== undefined);

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

      <div className="mt-auto pt-8">
        <button
          type="button"
          onClick={() => router.push("/today")}
          className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          {ONBOARDING.seeTodayLabel}
        </button>
      </div>
    </main>
  );
}
