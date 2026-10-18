"use client";

/**
 * TaskPage — shows the suggested task and collects the user's outcome.
 *
 * Prerequisites: state.energy !== null AND state.taskId !== null. Either null
 * redirects to /today with router.replace so the back button cannot return
 * here out of order. If getTaskById cannot resolve the id (data mismatch), the
 * same replace fires.
 *
 * Layout adapts to energy level (part 4 task file, step 3):
 *   low    → twoMinuteVersion as main text, task.title as secondary below it.
 *   medium / high → task.title as main text, twoMinuteVersion directly below it.
 * In both cases task.cue is shown above the task block with TASK_SCREEN.cueLabel.
 *
 * Outcome routing:
 *   "I did it" → setOutcome("done") + router.push("/mood-after")
 *   "Skip"     → setOutcome("skip") + router.push("/done")
 *   "skip" is the exact FlowState literal — not "skipped" (part 3.1 FlowState type).
 *
 * Renders inside AppShell's <main> — no additional container or padding needed.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFlow } from "@/lib/store/flow-store";
import { useUserData } from "@/lib/store/user-store";
import { getTaskById } from "@/lib/repo/activity-repo";
import { localDateString } from "@/lib/domain/day";
import { TASK_SCREEN } from "@/lib/copy";

export default function TaskPage() {
  const router = useRouter();
  const { state, setOutcome } = useFlow();
  const store = useUserData();

  // Prerequisite guard: replace so the back button cannot return here out of order.
  useEffect(() => {
    if (state.energy === null || state.taskId === null) {
      router.replace("/today");
    }
  }, [state.energy, state.taskId, router]);

  // Render nothing while the redirect fires to avoid a flash.
  if (state.energy === null || state.taskId === null) {
    return null;
  }

  const task = getTaskById(state.taskId);

  // Guard for a task id that no longer resolves — should not happen with seed data,
  // but the type contract allows undefined and a silent undefined-dereference would crash.
  if (task === undefined) {
    router.replace("/today");
    return null;
  }

  const isLowEnergy = state.energy === "low";

  return (
    <main className="flex flex-col gap-6 py-10">
      {/* Implementation-intention cue — shown above the task text. */}
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {TASK_SCREEN.cueLabel}
        {" "}
        <span className="normal-case text-sm font-normal text-gray-700 dark:text-gray-300">
          {task.cue}
        </span>
      </p>

      {/* Task text block — layout differs by energy level. */}
      <div className="flex flex-col gap-2">
        {isLowEnergy ? (
          <>
            {/* Low energy: lead with the gentler two-minute version. */}
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {task.twoMinuteVersion}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{TASK_SCREEN.twoMinuteLabel}:</span>{" "}
              {task.title}
            </p>
          </>
        ) : (
          <>
            {/* Medium / high energy: lead with the full task title. */}
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {task.title}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{TASK_SCREEN.twoMinuteLabel}:</span>{" "}
              {task.twoMinuteVersion}
            </p>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 mt-2">
        <button
          type="button"
          onClick={() => {
            setOutcome("done");
            router.push("/mood-after");
          }}
          className="min-h-[44px] w-full rounded-md bg-blue-600 px-4 text-sm font-semibold
                     text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2
                     focus-visible:outline-offset-2 focus-visible:outline-blue-600
                     dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:outline-blue-400"
        >
          {TASK_SCREEN.startLabel}
        </button>

        <button
          type="button"
          onClick={() => {
            setOutcome("skip");
            store.recordActivity({
              id: crypto.randomUUID(),
              personaId: store.personaId,
              date: localDateString(new Date()),
              activityId: state.taskId ?? "",
              templateId: state.templateId ?? "",
              outcome: "skip",
              version: "full",
              moodBefore: null,
              moodAfter: null,
            });
            router.push("/done");
          }}
          className="min-h-[44px] w-full rounded-md border border-gray-300 bg-white px-4
                     text-sm font-medium text-gray-700 hover:bg-gray-50
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                     focus-visible:outline-blue-600
                     dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300
                     dark:hover:bg-gray-800 dark:focus-visible:outline-blue-400"
        >
          {TASK_SCREEN.skipLabel}
        </button>
      </div>
    </main>
  );
}
