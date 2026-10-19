"use client";

/**
 * Digest reading page — a focused, tab-bar-free route that shows the five items
 * for the current digest slot, then the end block. The tab bar is absent by design
 * (concept §2.3): showing navigation during a focused reading flow gives an exit to
 * any tab at any moment, which competes with G6 (a visit that ends with the phone
 * put down). TabBar.tsx's allow-list excludes this route by omission; no change there
 * is needed.
 *
 * Opening the digest equals seen — `markDigestSeen` fires in a `useEffect` so that
 * both "Not now" (called from Today before navigation) and opening this page end in
 * the same store state. The double-call is harmless because the action is idempotent.
 * Calling it during render would cause a re-render loop; the effect is the correct site.
 *
 * When `digestItems.length === 0` (interests empty, or slot produced no matches) or
 * `slot === null` (no slot due yet, times not configured, or already seen), only the
 * end block is shown.
 */

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUserData } from "@/lib/store/user-store";
import { useFlow } from "@/lib/store/flow-store";
import {
  currentDigestSlot,
  nextDigestTime,
  buildDigest,
} from "@/lib/domain/digest";
import { getDigestItems } from "@/lib/repo/digest-repo";
import { getActivities } from "@/lib/repo/activity-repo";
import { localDateString } from "@/lib/domain/day";
import { DIGEST } from "@/lib/copy";

export default function DigestPage() {
  const {
    interests,
    digestTimes,
    digestSeenSlot,
    markDigestSeen,
    todayPlan,
    log,
    hydrated,
  } = useUserData();

  const flowStore = useFlow();
  const router = useRouter();

  // Stable repo reads — never change for the lifetime of this page visit.
  const allItems = useMemo(() => getDigestItems(), []);
  const allActivities = useMemo(() => getActivities(), []);

  /**
   * Mark the current slot as seen the moment the page is visible. A "Not now"
   * tap on Today also calls markDigestSeen before navigating here, so a double
   * call is expected and safe — the action writes the same value both times.
   *
   * Deps include digestTimes and digestSeenSlot so the effect re-reads the slot
   * correctly if the store updates, but in practice it fires once after hydration.
   */
  useEffect(() => {
    if (!hydrated) return;
    const slot = currentDigestSlot(digestTimes, digestSeenSlot, new Date());
    if (slot) markDigestSeen(slot.slotKey);
  }, [hydrated, digestTimes, digestSeenSlot, markDigestSeen]);

  if (!hydrated) return null;

  // All computations below are pure; no hooks may appear past this point.
  const now = new Date();
  const slot = currentDigestSlot(digestTimes, digestSeenSlot, now);
  // slot is null when no digest time is configured, or all today's slots are seen.
  // Do NOT call markDigestSeen here — the effect above owns that side effect.

  const digestItems = slot
    ? buildDigest(interests, allItems, slot.slotIndex, now)
    : [];

  const { timeLabel, isTomorrow } = nextDigestTime(digestTimes, now);
  const nextTimeLabel = isTomorrow
    ? `Nothing new until tomorrow at ${timeLabel}.`
    : `Nothing new until your next digest at ${timeLabel}.`;

  // Find the first unlogged plan activity so the end block can offer "Next on your day".
  const nextActivity = (() => {
    if (!todayPlan) return null;
    const todayStr = localDateString(now);
    const loggedToday = new Set(
      log
        .filter((e) => e.date === todayStr && (e.outcome === "done" || e.outcome === "skip"))
        .map((e) => e.activityId)
    );
    return todayPlan.plan.activities.find((a) => !loggedToday.has(a.activityId)) ?? null;
  })();

  const nextActivityTitle = nextActivity
    ? (allActivities.find((a) => a.id === nextActivity.activityId)?.title ??
       "next activity")
    : null;

  /**
   * Mirrors `handleStart` in `app/today/page.tsx` exactly (line 160–165).
   * Flow pages guard on `flowStore.energy`; omitting setEnergy causes an
   * immediate redirect back to Today from mood-before.
   * `setTemplateId(null)` is mandatory — clears any stale template from a
   * prior loop run, because digest-started activities are never template-driven.
   */
  function handleDigestStart(activityId: string, templateId: string | null): void {
    flowStore.reset();
    flowStore.setEnergy(todayPlan!.energy);
    flowStore.setTaskId(activityId);
    flowStore.setTemplateId(templateId);
    router.push("/mood-before");
  }

  const hasItems = digestItems.length > 0;

  return (
    <main className="flex flex-col gap-6 py-6 px-4">
      {hasItems && (
        <Link
          href="/today"
          className="text-sm text-gray-500 dark:text-gray-400 underline-offset-2 hover:underline self-start"
        >
          ← Back to today
        </Link>
      )}

      {hasItems && (
        <section className="flex flex-col gap-6">
          {digestItems.map((item) => (
            <article
              key={item.id}
              className="flex flex-col gap-2 border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0"
            >
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                About: {item.assignedInterest}
              </p>
              <h2 className="text-base font-semibold leading-snug">
                {item.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                A short overview of this topic. More details would appear here in a live version.
                This placeholder text represents two to three sentences of item summary.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{item.source}</p>
            </article>
          ))}
        </section>
      )}

      {/* End block — always rendered */}
      <section className="flex flex-col gap-3 pt-2">
        <h2 className="text-lg font-semibold">{DIGEST.allCaughtUp}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{nextTimeLabel}</p>

        {nextActivity && nextActivityTitle ? (
          <>
            <button
              onClick={() => handleDigestStart(nextActivity.activityId, null)}
              className="text-sm font-medium underline-offset-2 hover:underline text-left"
            >
              Next on your day: {nextActivityTitle}
            </button>
            <Link
              href="/today"
              className="text-sm text-gray-500 dark:text-gray-400 underline-offset-2 hover:underline self-start"
            >
              Back to today
            </Link>
          </>
        ) : (
          <button
            onClick={() => router.push("/today")}
            className="text-sm font-medium underline-offset-2 hover:underline text-left"
          >
            {DIGEST.endCta}
          </button>
        )}
      </section>
    </main>
  );
}
