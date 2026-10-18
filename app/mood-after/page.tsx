"use client";

/**
 * MoodAfterPage — mood rating after the user has completed the suggested task.
 *
 * Prerequisite: state.moodBefore !== null. The user must have rated their mood
 * before the task before arriving here. If moodBefore is null the user navigated
 * out of order; router.replace redirects to /check-in and removes this page from
 * browser history, preventing a back-button loop (static export has no server
 * redirect; replace is the client alternative).
 *
 * On selection: calls setMoodAfter(v), then setOutcome("done"), then navigates
 * to /done. The outcome is set here — not in the done page — because the user
 * has just finished the task at this step. The done page only reads outcome; it
 * never writes it (G4, concept Section 2.2 lines 137–148: no before/after
 * comparison visible to the user).
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { localDateString } from "@/lib/domain/day";
import { useFlow } from "@/lib/store/flow-store";
import { useUserData } from "@/lib/store/user-store";
import MoodRating from "@/components/MoodRating";
import { MOOD_AFTER_PAGE } from "@/lib/copy";

export default function MoodAfterPage() {
  const router = useRouter();
  const { state, setMoodAfter, setOutcome } = useFlow();
  const store = useUserData();

  // Prerequisite guard: moodBefore must be set before rating after.
  // Replace so the back button cannot return the user here out of order.
  useEffect(() => {
    if (state.moodBefore === null) {
      router.replace("/today");
    }
  }, [state.moodBefore, router]);

  // Render nothing while the redirect fires to avoid a transient crash on
  // accessing moodBefore before the effect runs (same pattern as mood-before page).
  if (state.moodBefore === null) {
    return null;
  }

  return (
    <main className="flex flex-col gap-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        {MOOD_AFTER_PAGE.heading}
      </h1>

      <MoodRating
        onSelect={(value) => {
          setMoodAfter(value);
          setOutcome("done");
          store.recordActivity({
            id: crypto.randomUUID(),
            personaId: store.personaId,
            date: localDateString(new Date()),
            dayOffset: 0,
            activityId: state.taskId ?? "",
            templateId: state.templateId ?? "",
            outcome: "done",
            version: "full",
            moodBefore: state.moodBefore ?? null,
            moodAfter: value,
          });
          router.push("/done");
        }}
      />
    </main>
  );
}
