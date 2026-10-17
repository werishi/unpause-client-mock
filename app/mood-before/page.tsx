"use client";

/**
 * MoodBeforePage — mood rating before the user starts the suggested task.
 *
 * Prerequisite: state.energy must be set. If it is null the user navigated here
 * out of order; router.replace (not push) redirects to /check-in so the back
 * button does not return to this page (static export has no server redirect;
 * replace is the only way to remove this page from browser history).
 *
 * On selection calls setMoodBefore and navigates to /task.
 *
 * Renders inside AppShell's <main> — no additional container or padding needed.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFlow } from "@/lib/store/flow-store";
import MoodRating from "@/components/MoodRating";
import { MOOD_BEFORE_PAGE } from "@/lib/copy";

export default function MoodBeforePage() {
  const router = useRouter();
  const { state, setMoodBefore } = useFlow();

  // Prerequisite guard: replace so the back button cannot return here out of order.
  useEffect(() => {
    if (state.energy === null) {
      router.replace("/check-in");
    }
  }, [state.energy, router]);

  // Render nothing while the redirect fires to avoid a flash.
  if (state.energy === null) {
    return null;
  }

  return (
    <main className="flex flex-col gap-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        {MOOD_BEFORE_PAGE.heading}
      </h1>

      <MoodRating
        onSelect={(value) => {
          setMoodBefore(value);
          router.push("/task");
        }}
      />
    </main>
  );
}
