"use client";
import { useRouter } from "next/navigation";
import { useUserData } from "@/lib/store/user-store";
import { WELCOME, START_SCREEN } from "@/lib/copy";

/**
 * Welcome screen — the first thing a new user sees.
 *
 * Rendered when the root redirect sends users who have no `startedAt` value in
 * the store. Calling `markStarted()` sets `startedAt = today`, which makes the
 * root redirect send all future visits to `/today` instead.
 *
 * No `hydrated` guard is needed: no persisted state is read during render.
 * `markStarted` is only called on the button click, after the component has
 * mounted on the client.
 *
 * The `START_SCREEN.safetyNote` is included here so the non-medical-product
 * disclosure is present from the very first screen the user sees, satisfying
 * the profile's not-a-medical-product invariant (not just on the legacy start
 * screen).
 */
export default function WelcomePage() {
  const router = useRouter();
  const { markStarted } = useUserData();

  function handleStart() {
    markStarted(); // sets startedAt = today in the store
    router.push("/today"); // goes to Today where the first check-in and plan happen
  }

  return (
    // A <div>, not <main>: AppShell already renders the page's <main>. The
    // min-height subtracts the fixed header (3.5rem) and the shell footer
    // (~5.5rem incl. a wrapped line at 360 px) so the block centres in the
    // visible viewport; the tab bar is hidden on /welcome.
    <div className="flex min-h-[calc(100dvh-9rem-env(safe-area-inset-top))] flex-col justify-center gap-8 py-10 text-center">
      <div className="flex flex-col items-center gap-5">
        {/* Decorative pause glyph — presentation only. */}
        <div
          aria-hidden="true"
          className="flex h-20 w-20 items-center justify-center gap-2 rounded-full bg-indigo-50 ring-1 ring-indigo-100 dark:bg-indigo-950/60 dark:ring-indigo-900"
        >
          <span className="h-8 w-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
          <span className="h-8 w-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl dark:text-gray-100">
          {WELCOME.headline}
        </h1>
        <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">{WELCOME.body}</p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm leading-relaxed text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
        <p>{START_SCREEN.safetyNote}</p>
        <p className="font-medium text-gray-700 dark:text-gray-300">{WELCOME.safetyPointer}</p>
      </div>

      <button
        onClick={handleStart}
        className="min-h-12 w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:shadow-none dark:focus-visible:outline-blue-400"
      >
        {WELCOME.ctaLabel}
      </button>
    </div>
  );
}
