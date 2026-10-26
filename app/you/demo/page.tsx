"use client";

/**
 * Demo page (/you/demo).
 *
 * Holds the reset action, the plain-version and review-preview toggles, and the
 * notification replay row. It no longer loads personas: the character picker
 * lives only on /login, and this page links there ("Switch character") so the
 * two pickers cannot drift apart.
 *
 * Reset wipes all saved data (including the safety plan and any therapist link,
 * which `DEMO.replacesDataNote` tells reviewers), turns the plain version off,
 * and navigates to `/login`. Not `/`, because `/` is the investor landing page
 * and so the wrong place for someone who just reset the demo; not `entryRouteFor(...)`, because on the fresh state that
 * returns `/welcome` and skips the picker. `resetDemoData` never touches the
 * acceptance flag (`unpause.gate.v1`), so the visitor lands on the picker, not
 * on a gate. The reset button and the link are not gated on `hydrated`: neither
 * depends on `today` or on the store having mounted.
 *
 * The replay row (inside the hydrated-gated toggle list) lets a presenter show
 * the check-in or digest banner again on demand via `requestReplay`; it writes
 * no stored state and does not navigate, so the viewer stays on this page.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserData } from "@/lib/store/user-store";
import { useNotificationBanner } from "@/lib/store/notification-banner-store";
import { DEMO, LOOK_BACK } from "@/lib/copy";

export default function DemoPage() {
  const {
    hydrated,
    resetDemoData,
    plainVersion,
    setPlainVersion,
    reviewPreview,
    setReviewPreview,
  } = useUserData();
  const { requestReplay } = useNotificationBanner();
  const router = useRouter();

  const handleReset = () => {
    resetDemoData();
    setPlainVersion(false);
    router.push("/login");
  };

  return (
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-xl font-semibold">{DEMO.heading}</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">{DEMO.replacesDataNote}</p>

      <Link
        href="/login"
        className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400"
      >
        {DEMO.switchCharacterLabel}
      </Link>

      {/*
       * Demo toggles — disabled until hydrated to avoid pre-hydration overwrites.
       * plainVersion hides points and rewards site-wide (Open Direction Question 7).
       * reviewPreview forces the week review card to show on Today on non-Monday days.
       */}
      <ul
        className={`flex flex-col gap-2${!hydrated ? " pointer-events-none opacity-50" : ""}`}
        aria-disabled={!hydrated}
      >
        <li className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
          <span className="text-sm">{DEMO.plainVersionLabel}</span>
          <button
            onClick={() => setPlainVersion(!plainVersion)}
            aria-pressed={plainVersion}
            className={`w-10 h-6 rounded-full transition-colors ${
              plainVersion
                ? "bg-indigo-600 dark:bg-indigo-500"
                : "bg-gray-300 dark:bg-gray-500"
            }`}
            aria-label={DEMO.plainVersionLabel}
          />
        </li>
        <li className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
          <span className="text-sm">{LOOK_BACK.reviewPreviewLabel}</span>
          <button
            onClick={() => setReviewPreview(!reviewPreview)}
            aria-pressed={reviewPreview}
            className={`w-10 h-6 rounded-full transition-colors ${
              reviewPreview
                ? "bg-indigo-600 dark:bg-indigo-500"
                : "bg-gray-300 dark:bg-gray-500"
            }`}
            aria-label={LOOK_BACK.reviewPreviewLabel}
          />
        </li>
        {/*
         * Replay row — one-shot actions, not a pill switch, because replaying a
         * banner is an action rather than a setting (concept 2.8). `disabled` is
         * set explicitly because the <ul>'s pointer-events-none does not stop
         * keyboard activation before hydration.
         */}
        <li className="flex flex-col gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
          <span className="text-sm">{DEMO.replayHeading}</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => requestReplay("checkIn")}
              disabled={!hydrated}
              className="rounded-full border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700"
            >
              {DEMO.replayCheckInLabel}
            </button>
            <button
              type="button"
              onClick={() => requestReplay("digest")}
              disabled={!hydrated}
              className="rounded-full border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700"
            >
              {DEMO.replayDigestLabel}
            </button>
          </div>
        </li>
      </ul>

      <button
        onClick={handleReset}
        className="text-sm text-red-600 dark:text-red-400 underline self-start"
      >
        {DEMO.resetLabel}
      </button>
    </div>
  );
}
