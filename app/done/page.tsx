"use client";

/**
 * DonePage — closing screen of the core loop.
 *
 * Prerequisite: state.outcome !== null. If null the user navigated out of
 * order; router.replace redirects to / and removes this page from history.
 *
 * Reads state.outcome to select between two copy constants:
 *   "done"  → DONE_SCREEN.doneText  (user completed the task)
 *   "skip"  → DONE_SCREEN.skipText  (user skipped)
 * The sentence depends only on outcome — never on state.moodBefore or
 * state.moodAfter and never on any mood delta (G4, concept Section 2.2 lines
 * 137–148). This page does not read the mood fields at all; they are stored in
 * FlowState for future analytics use only.
 *
 * One button navigates home via router.push("/") and restarts the flow.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFlow } from "@/lib/store/flow-store";
import { DONE_SCREEN } from "@/lib/copy";

export default function DonePage() {
  const router = useRouter();
  const { state } = useFlow();

  // Prerequisite guard: outcome must be set before this page is reachable.
  // Replace so the back button does not return the user to this screen without
  // a valid outcome in state.
  useEffect(() => {
    if (state.outcome === null) {
      router.replace("/");
    }
  }, [state.outcome, router]);

  if (state.outcome === null) {
    return null;
  }

  // Select sentence by outcome. "done" and "skip" are the only non-null values
  // in FlowState; the fallback branch is unreachable but required by TypeScript
  // because the type is a union, not a literal narrowed by exhaustion.
  const sentence =
    state.outcome === "done"
      ? DONE_SCREEN.doneText
      : state.outcome === "skip"
        ? DONE_SCREEN.skipText
        : DONE_SCREEN.doneText;

  return (
    <main className="flex flex-col items-center gap-8 py-16 text-center">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        {DONE_SCREEN.heading}
      </h1>

      <p className="max-w-sm text-lg text-gray-700 dark:text-gray-300">{sentence}</p>

      <button
        type="button"
        onClick={() => router.push("/")}
        className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
      >
        {DONE_SCREEN.backToStartLabel}
      </button>
    </main>
  );
}
