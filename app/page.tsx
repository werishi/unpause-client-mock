"use client";

/**
 * StartPage — home screen and global reset point for the core loop.
 *
 * This is the only place in the application that calls reset(). Every
 * navigation back to "/" clears the previous run's flow state so the user
 * always begins the next loop with a clean slate — no dedicated reset button
 * is needed anywhere else in the app.
 *
 * Renders inside AppShell's <main> (max-w-md, centred, pt-14 from fixed header)
 * — no additional container, side-padding, or top-padding here.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFlow } from "@/lib/store/flow-store";
import { START_SCREEN } from "@/lib/copy";

export default function StartPage() {
  const router = useRouter();
  const { reset } = useFlow();

  // Clear any previous flow run on every visit to the start screen.
  // Dependency array is intentionally empty: reset is a stable function
  // reference (defined inside FlowProvider with no captured mutable state)
  // and the effect must fire exactly once per mount, not on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    reset();
  }, []);

  return (
    <main className="flex flex-col gap-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        {START_SCREEN.headline}
      </h1>

      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {START_SCREEN.safetyNote}
      </p>

      <button
        type="button"
        onClick={() => router.push("/check-in")}
        className="min-h-[44px] w-full rounded-md bg-blue-600 px-4 text-sm font-semibold
                   text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2
                   focus-visible:outline-offset-2 focus-visible:outline-blue-600
                   dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:outline-blue-400"
      >
        {START_SCREEN.ctaLabel}
      </button>
    </main>
  );
}
