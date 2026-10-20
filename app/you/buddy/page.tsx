"use client";

/**
 * Buddy management page (/you/buddy).
 *
 * Rendered under the You tab — the tab bar is visible automatically because
 * this path starts with /you/ and TabBar.tsx gates on that prefix.
 *
 * Two states: empty (no buddy set) and with-buddy. The parent UserDataProvider
 * (lib/store/user-store.tsx) has already mounted and hydrated before this page
 * renders, so `buddy` and `sharedActivities` are available on first render
 * without a loading guard.
 *
 * Empty state: introductory copy from BUDDY.emptyState and a link to
 * /buddy/choose where the user enters a name.
 *
 * With-buddy state:
 *   1. The buddy's name as the page heading.
 *   2. A "What {name} would see" preview: the upcoming shared activity title
 *      and the day of the week (e.g. "A walk together — Thursday"), or "—" if
 *      no upcoming shared activity exists. upcomingShared filters
 *      sharedActivities to items whose date >= today (ISO comparison).
 *   3. The fixed never-sees list: mood ratings, points, active days, the rest
 *      of the plan. These are descriptive labels for existing features and
 *      carry no therapeutic claim, so they are not copy-exported.
 *   4. The BUDDY.notATherapist disclaimer with "safety plan" rendered as an
 *      inline Link to /safety. The string is split on the literal substring
 *      "safety plan" so the surrounding sentence is preserved exactly.
 *   5. Contextual action: if an upcoming shared activity exists, a "Remove it"
 *      button (removeSharedActivity); otherwise a "Plan something together"
 *      link to /buddy/share.
 *   6. A "Stop having a buddy" button (removeBuddy) at the bottom.
 *
 * No score, count or history is shown here (constraint from concept §2.4).
 */

import Link from "next/link";
import { useUserData } from "@/lib/store/user-store";
import { getTaskById } from "@/lib/repo/activity-repo";
import { BUDDY } from "@/lib/copy";

export default function BuddyPage() {
  const { buddy, sharedActivities, removeBuddy, removeSharedActivity } =
    useUserData();

  const today = new Date().toISOString().slice(0, 10);
  const upcomingShared = sharedActivities.filter((a) => a.date >= today);

  // ── Empty state ──────────────────────────────────────────────────────────────

  if (!buddy) {
    return (
      <div className="flex flex-col gap-6 py-6">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {BUDDY.emptyState}
        </p>
        <Link
          href="/buddy/choose"
          className="rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white text-center"
        >
          {BUDDY.chooseSomeone}
        </Link>
      </div>
    );
  }

  // ── With-buddy state ─────────────────────────────────────────────────────────

  const sharedItem = upcomingShared[0];
  const sharedActivity = sharedItem
    ? getTaskById(sharedItem.activityId)
    : undefined;
  const sharedDayLabel = sharedItem
    ? new Date(sharedItem.date).toLocaleDateString("en-GB", { weekday: "long" })
    : undefined;

  // Split "safety plan" out of the disclaimer so it can be an inline Link.
  // BUDDY.notATherapist contains exactly one occurrence of the substring.
  const notATherapistText = BUDDY.notATherapist.replace("{name}", buddy.name);
  const safetyPlanParts = notATherapistText.split("safety plan");

  return (
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-xl font-semibold">{buddy.name}</h1>

      {/* ── What they would see preview ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {BUDDY.whatTheyWouldSee.replace("{name}", buddy.name)}
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {sharedActivity && sharedDayLabel
            ? `${sharedActivity.title} — ${sharedDayLabel}`
            : "—"}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          They never see:
        </p>
        <ul className="flex flex-col gap-1 pl-4 list-disc text-sm text-gray-500 dark:text-gray-400">
          <li>Mood ratings</li>
          <li>Points</li>
          <li>Active days</li>
          <li>The rest of your plan</li>
        </ul>
      </section>

      {/* ── Not-a-therapist disclaimer with inline safety plan link ── */}
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {safetyPlanParts[0]}
        <Link href="/safety" className="underline">
          safety plan
        </Link>
        {safetyPlanParts[1]}
      </p>

      {/* ── Shared-activity action (contextual) ── */}
      {sharedItem ? (
        <button
          onClick={() => removeSharedActivity(sharedItem.id)}
          className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-left"
        >
          {BUDDY.removeIt}
        </button>
      ) : (
        <Link
          href="/buddy/share"
          className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-center block"
        >
          {BUDDY.planTogether}
        </Link>
      )}

      {/* ── Remove buddy ── */}
      <button
        onClick={() => removeBuddy()}
        className="text-sm text-red-600 dark:text-red-400 underline self-start"
      >
        {BUDDY.stopHavingBuddy}
      </button>
    </div>
  );
}
