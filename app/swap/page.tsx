"use client";

/**
 * Swap page — channels a scrolling urge into one five-minute activity.
 *
 * Belongs to the DigestAndMedia feature. Reads `todayPlan` from the user store
 * to determine the energy level for the flow loop and calls `pickSwap` to
 * select the single offered activity. The parent layout is expected to have
 * resolved the plan; without a non-null `todayPlan` the page replaces to
 * `/today` (replace, not push — Back must not return to a no-plan swap screen).
 *
 * Does not appear in the tab-bar allow-list; `/swap` is a focused flow route
 * (concept §2.4: browsing alternatives is itself scrolling, so no tab bar and
 * no list of options is shown).
 *
 * Sets `flowStore.energy` from `todayPlan.energy` before navigating to
 * `/mood-before`. This is required because `/mood-before` (line 29) and
 * `/task` (line 40) both redirect to `/today` when `flowStore.energy` is null.
 */

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUserData } from "@/lib/store/user-store";
import { useFlow } from "@/lib/store/flow-store";
import { pickSwap, getPartOfDay } from "@/lib/domain/swap";
import { getSwaps } from "@/lib/repo/swap-repo";
import { getActivities } from "@/lib/repo/activity-repo";
import { localDateString } from "@/lib/domain/day";
import { SWAP } from "@/lib/copy";

export default function SwapPage() {
  const {
    hydrated,
    todayPlan,
    log,
    interests,
  } = useUserData();

  const flowStore = useFlow();
  const router = useRouter();

  // Replace (not push) so pressing Back after a failed guard does not loop
  // back to a swap screen that has no plan to offer an activity from.
  useEffect(() => {
    if (hydrated && !todayPlan) {
      router.replace("/today");
    }
  }, [hydrated, todayPlan, router]);

  const swapEntries = useMemo(() => getSwaps(), []);
  const allActivities = useMemo(() => getActivities(), []);

  if (!hydrated) return null;
  if (!todayPlan) return null;

  const now = new Date();
  const todayStr = localDateString(now);

  const loggedTodayIds = log
    .filter((e) => e.date === todayStr)
    .map((e) => e.activityId);

  const todayActivityIds = todayPlan.plan.activities.map((a) => a.activityId);

  const swapActivityId = pickSwap(
    swapEntries,
    allActivities,
    now,
    todayPlan.energy,
    todayActivityIds,
    loggedTodayIds
  );

  const swapActivity = swapActivityId
    ? allActivities.find((a) => a.id === swapActivityId) ?? null
    : null;

  /**
   * Mirrors `handleStart` in `app/today/page.tsx` exactly.
   *
   * Order is load-bearing:
   *   1. `reset()` clears stale moodBefore/outcome from any prior loop run.
   *   2. `setEnergy` feeds the energy guard in `/mood-before` and `/task`.
   *   3. `setTaskId` tells `/task` which activity to resolve.
   *   4. `setTemplateId(null)` clears any stale template id — swaps are never
   *      template-driven, and a stale id would cause `/task` to pre-populate
   *      the wrong template.
   */
  function handleSwapStart(activityId: string) {
    flowStore.reset();
    flowStore.setEnergy(todayPlan!.energy);
    flowStore.setTaskId(activityId);
    flowStore.setTemplateId(null);
    router.push("/mood-before");
  }

  if (swapActivity !== null) {
    return (
      <main>
        <h1>{SWAP.title}</h1>
        <p>{SWAP.leadIn}</p>
        <h2>{swapActivity.title}</h2>
        <p>{swapActivity.cue}</p>
        <p>5 minutes</p>

        <button onClick={() => handleSwapStart(swapActivity.id)}>
          {SWAP.startButton}
        </button>

        <button onClick={() => router.push("/today")}>
          {SWAP.skipLink}
        </button>

        {interests.length === 0 && (
          <p>
            <Link href="/you/digest">{SWAP.setupLink}</Link>
          </p>
        )}
      </main>
    );
  }

  // No swap available for this time of day / energy combination.
  return (
    <main>
      <p>{"That was your swap for now."}</p>
      <Link href="/today">Back to today</Link>
    </main>
  );
}
