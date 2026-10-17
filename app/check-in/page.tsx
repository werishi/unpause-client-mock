"use client";

/**
 * CheckInPage — first step of the core loop; the user selects their energy level.
 *
 * On selection this page calls planDay to select today's first activity and
 * writes the result into flow state via setTaskId / setTemplateId before
 * navigating to /mood-before. If planDay returns no activities (P12 — the
 * week's plan is complete), the user sees a "plan done" message and cannot
 * advance. This prevents advancing with a null taskId.
 *
 * Renders inside AppShell's <main> — no additional container or padding needed.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFlow } from "@/lib/store/flow-store";
import { useUserData } from "@/lib/store/user-store";
import { planDay, addDays } from "@/lib/domain/planner";
import { getTemplates, getTemplateItems } from "@/lib/repo/template-repo";
import { getActivities } from "@/lib/repo/activity-repo";
import type { EnergyLevel } from "@/lib/domain/energy";
import { CHECK_IN } from "@/lib/copy";

export default function CheckInPage() {
  const router = useRouter();
  const { setEnergy, setTaskId, setTemplateId } = useFlow();
  const store = useUserData();
  const [planDone, setPlanDone] = useState(false);

  function handleEnergySelect(energy: EnergyLevel) {
    setEnergy(energy);

    const today = new Date().toISOString().slice(0, 10);
    const input = {
      templates: getTemplates().filter((t) => store.templateIds.includes(t.id)),
      items: store.templateIds.flatMap((id) => getTemplateItems(id)),
      activities: getActivities(),
      log: store.log.map((e) => typeof e.dayOffset === 'number' ? { ...e, date: addDays(today, e.dayOffset) } : e),
      energy,
      today,
    };

    const result = planDay(input);

    if (result.activities.length === 0) {
      // P12: this week's plan is complete — do not advance the flow.
      setPlanDone(true);
      return;
    }

    setTaskId(result.activities[0].activityId);
    setTemplateId(result.activities[0].templateId);
    store.recordCheckIn(energy);
    router.push("/mood-before");
  }

  if (planDone) {
    return (
      <main className="flex flex-col gap-6 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {CHECK_IN.heading}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your plan for this week is complete. Check back tomorrow.
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        {CHECK_IN.heading}
      </h1>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        {CHECK_IN.instructions}
      </p>

      <div className="flex flex-col gap-3">
        {CHECK_IN.energyOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleEnergySelect(option.value)}
            className="min-h-[44px] w-full flex items-center justify-start px-4 rounded-md
                       border border-gray-200 bg-white text-gray-800 text-sm font-medium
                       hover:bg-gray-50 focus-visible:outline focus-visible:outline-2
                       focus-visible:outline-offset-2 focus-visible:outline-blue-600
                       dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100
                       dark:hover:bg-gray-800 dark:focus-visible:outline-blue-400"
          >
            {option.label}
          </button>
        ))}
      </div>
    </main>
  );
}
