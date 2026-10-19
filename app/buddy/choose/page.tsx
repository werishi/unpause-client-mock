"use client";

/**
 * BuddyChoosePage — focused two-step flow to add a buddy.
 *
 * Renders inside AppShell's main content area (root layout); the TabBar is
 * hidden because /buddy/choose is not in TabBar's pathname allow-list.
 *
 * Step 1 (name entry): text input (maxLength=30) with BUDDY.nameHint below it
 * and a "Next" button. "Next" trims the value and advances to step 2 only when
 * the trimmed length is 1–30. An inline error message is produced synchronously
 * when the guard fails; no query parameters are set, so no Suspense shell is
 * needed (concept §2.6).
 *
 * Step 2 (preview + consent): shows (1) what the buddy would see — a static
 * placeholder because no shared activity exists yet; (2) the fixed never-sees
 * list; (3) BUDDY.notATherapist with a Link to /safety around "safety plan";
 * (4) BUDDY.agree — calls setBuddy then routes to /buddy/share; (5) BUDDY.notNow
 * — routes to /you/buddy without saving.
 *
 * A close (×) button at the top of the page navigates to /you/buddy on both
 * steps, so the user can exit without committing.
 *
 * Redirect guard: if buddy !== null on mount, router.replace("/you/buddy") —
 * the choose flow is unavailable while a buddy already exists. router.replace
 * is used (not redirect() from next/navigation) because this is a static export
 * and the guard fires inside useEffect, not at the server layer.
 *
 * Prerequisite: UserDataProvider is mounted above (app/layout.tsx satisfies this).
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUserData } from "@/lib/store/user-store";
import { BUDDY } from "@/lib/copy";

/** Items the buddy never sees. Static — not driven by copy.ts because they are
 *  structural product rules, not UI strings subject to tone edits. */
const NEVER_SEES = ["Mood ratings", "Points", "Active days", "The rest of your plan"] as const;

export default function BuddyChoosePage() {
  const router = useRouter();
  const { buddy, setBuddy } = useUserData();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Redirect guard: if the user already has a buddy, the choose flow is a dead
  // end. Replace (not push) removes this page from history so Back skips it.
  useEffect(() => {
    if (buddy !== null) {
      router.replace("/you/buddy");
    }
  }, [buddy, router]);

  // Render nothing while the guard redirect fires — avoids a flash of the form.
  if (buddy !== null) {
    return null;
  }

  // ── Step 1 handlers ──────────────────────────────────────────────────────────

  function handleNext() {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 30) {
      setError("Please enter a name between 1 and 30 characters");
      return;
    }
    setError(null);
    setStep(2);
  }

  // ── Step 2 handlers ──────────────────────────────────────────────────────────

  /** Commits the buddy name to the store and continues to the sharing step. */
  function handleAgree() {
    setBuddy(name.trim());
    router.push("/buddy/share");
  }

  /** Exits the flow without saving — buddy state is unchanged. */
  function handleNotNow() {
    router.push("/you/buddy");
  }

  // ── Disclaimer split ─────────────────────────────────────────────────────────
  // BUDDY.notATherapist contains the literal substring "safety plan" which must
  // be wrapped in a Link to /safety. Split once around the token so the text
  // before and after can be rendered as plain spans with the Link between them.
  const trimmedName = name.trim();
  const disclaimer = BUDDY.notATherapist.replace("{name}", trimmedName);
  const safetyToken = "safety plan";
  const splitIdx = disclaimer.indexOf(safetyToken);
  const disclaimerBefore = splitIdx >= 0 ? disclaimer.slice(0, splitIdx) : disclaimer;
  const disclaimerAfter = splitIdx >= 0 ? disclaimer.slice(splitIdx + safetyToken.length) : "";

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 py-6">

      {/* Page header row — close button navigates away without saving */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-900 dark:text-white">
          {step === 1 ? "Choose a buddy" : "What they see"}
        </span>
        <button
          type="button"
          aria-label="Close"
          onClick={() => router.push("/you/buddy")}
          className="text-2xl leading-none text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          ×
        </button>
      </div>

      {/* ── Step 1: name entry ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="buddy-name"
              className="text-sm font-medium text-gray-900 dark:text-white"
            >
              Their name
            </label>
            <input
              id="buddy-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                // Clear the error as soon as the user starts correcting the value.
                if (error) setError(null);
              }}
              maxLength={30}
              placeholder="Name"
              autoFocus
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
            />
            {error !== null && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">{BUDDY.nameHint}</p>
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white dark:bg-white dark:text-gray-900 hover:opacity-90 transition-opacity"
          >
            Next
          </button>
        </div>
      )}

      {/* ── Step 2: preview + consent ──────────────────────────────────────── */}
      {step === 2 && (
        <div className="flex flex-col gap-6">

          {/* What the buddy would see */}
          <section aria-labelledby="buddy-preview-heading">
            <h2
              id="buddy-preview-heading"
              className="font-semibold text-gray-900 dark:text-white mb-3"
            >
              {BUDDY.whatTheyWouldSee.replace("{name}", trimmedName)}
            </h2>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              (No shared activity yet)
            </div>
          </section>

          {/* Never-sees list */}
          <section>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              They never see:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {NEVER_SEES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {/* Disclaimer — "safety plan" is a Link to /safety */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {disclaimerBefore}
            <Link
              href="/safety"
              className="underline text-gray-900 dark:text-white"
            >
              {safetyToken}
            </Link>
            {disclaimerAfter}
          </p>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleAgree}
              className="w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white dark:bg-white dark:text-gray-900 hover:opacity-90 transition-opacity"
            >
              {BUDDY.agree}
            </button>
            <button
              type="button"
              onClick={handleNotNow}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {BUDDY.notNow}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
