"use client";

/**
 * /you/digest — interests and digest-time setup page.
 *
 * Lets the user maintain up to five interest topics and choose up to three
 * preferred digest reading times. Each interaction writes to the store
 * immediately (no Save button), following the same pattern as /you/values
 * (setInterests / setDigestTimes via useUserData).
 *
 * The tab bar remains visible because this route is under /you, matching the
 * TabBar allow-list prefix `/you*` (TabBar.tsx line 34). No tab-bar exclusion
 * needed — the setup page is a discoverable settings sub-page, not a focused
 * flow like /you/values.
 *
 * Hydration pattern: local state is initialised empty so the server prerender
 * and the first client render agree. A render-phase seeding block, guarded by a
 * `seeded` flag, copies the store values into local state on the first render
 * where `hydrated` is true. It sits after all hooks and before the
 * `if (!hydrated) return null` guard (Rules of Hooks keeps the guard after the
 * hooks; the block must precede the guard or it would never run). It replaced a
 * `useEffect` seed because React's set-state-in-effect lint rule rejects that
 * shape and it cost one extra empty commit. This is the same pattern used
 * in app/plan/templates/page.tsx (the source of truth for this repo's hydration
 * idiom); it differs from app/you/values/page.tsx, which skips the guard and
 * therefore flashes defaults on cold load.
 *
 * Premise: UserDataProvider is mounted in app/layout.tsx, so useUserData() is
 * always valid here.
 */

import { useState } from "react";
import { useUserData } from "@/lib/store/user-store";
import { DIGEST } from "@/lib/copy";
import Link from "next/link";

/** Four preset digest reading times shown as selectable chips (file-scoped to avoid re-creation per render). */
const PRESET_TIMES = ["07:30", "12:30", "18:00", "20:30"];

export default function DigestSetupPage() {
  const { interests, digestTimes, setInterests, setDigestTimes, hydrated } =
    useUserData();

  /**
   * Local mirrors of the store values. Initialised as empty arrays / empty string
   * so SSR and the first CSR agree; the seeding block below corrects them on the
   * first render after the store has loaded from localStorage.
   */
  const [localInterests, setLocalInterests] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [localTimes, setLocalTimes] = useState<string[]>([]);
  /** True once local state has been seeded from the store; makes the seed write-once. */
  const [seeded, setSeeded] = useState(false);

  /**
   * Seed local state from the store on the first hydrated render (render-phase
   * set-state, which React re-renders immediately before committing). The
   * `seeded` flag makes it write-once, so later store changes do not overwrite
   * local edits: this is a seed, not a subscription. Must stay before the guard.
   */
  if (hydrated && !seeded) {
    setSeeded(true);
    setLocalInterests(interests);
    setLocalTimes(digestTimes);
  }

  // Guard must appear after all hooks (Rules of Hooks).
  // Returning null prevents flashing store defaults before localStorage loads.
  if (!hydrated) return null;

  // ── Interests handlers ────────────────────────────────────────────────────

  /** Remove the interest at `index` and persist immediately. */
  function removeInterest(index: number) {
    const next = localInterests.filter((_, i) => i !== index);
    setLocalInterests(next);
    setInterests(next);
  }

  /**
   * Add the current inputValue as a new interest and persist immediately.
   * Guards duplicated in the UI (button disabled, max message) but also here
   * in case of concurrent state.
   */
  function addInterest() {
    const trimmed = inputValue.trim();
    if (!trimmed || localInterests.length >= 5) return;
    const next = [...localInterests, trimmed];
    setLocalInterests(next);
    setInterests(next);
    setInputValue("");
  }

  // ── Digest times handler ──────────────────────────────────────────────────

  /**
   * Toggle a preset time chip on/off and persist immediately.
   * A selected chip can always be deselected; an unselected chip is disabled
   * once three are chosen (chipDisabled).
   */
  function toggleTime(time: string) {
    const selected = localTimes.includes(time);
    const next = selected
      ? localTimes.filter((t) => t !== time)
      : [...localTimes, time];
    setLocalTimes(next);
    setDigestTimes(next);
  }

  const chipDisabled = localTimes.length >= 3;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 py-6 px-4">
      <Link
        href="/you"
        className="text-sm text-gray-500 dark:text-gray-400 underline-offset-2 hover:underline self-start"
      >
        ← Back
      </Link>

      <h1 className="text-xl font-semibold">{DIGEST.setupTitle}</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {DIGEST.setupPrompt}
      </p>

      {/* Interests section */}
      <section className="flex flex-col gap-3">
        {/* Section heading: DIGEST.timesTitle reused here per spec ("reuse is intentional"). */}
        <h2 className="text-base font-medium">{DIGEST.timesTitle}</h2>

        {localInterests.length > 0 && (
          <ul className="flex flex-col gap-2">
            {localInterests.map((interest, index) => (
              // key={index} is intentional: items are added at the end and removed
              // by index, never reordered. Each item has no internal state, so
              // index-keyed remounting is safe.
              <li
                key={index}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-sm">{interest}</span>
                <button
                  onClick={() => removeInterest(index)}
                  className="text-sm text-gray-500 dark:text-gray-400 underline-offset-2 hover:underline shrink-0"
                  aria-label={`Remove ${interest}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {localInterests.length < 5 ? (
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              maxLength={80}
              placeholder="Add a topic"
              className="flex-1 text-sm border-b border-gray-300 dark:border-gray-600 bg-transparent py-1 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") addInterest();
              }}
            />
            <button
              onClick={addInterest}
              disabled={inputValue.trim() === "" || localInterests.length >= 5}
              className="text-sm text-gray-700 dark:text-gray-300 disabled:opacity-40"
            >
              Add
            </button>
          </div>
        ) : (
          // Maximum message shown instead of the add row to avoid a disabled
          // form competing with the reason it is disabled.
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Five interests maximum reached.
          </p>
        )}
      </section>

      {/* Digest times section */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">{DIGEST.timesTitle}</h2>
        <div className="flex flex-wrap gap-2">
          {PRESET_TIMES.map((time) => {
            const selected = localTimes.includes(time);
            // A selected chip is never disabled — must always be deselectable.
            const disabled = !selected && chipDisabled;
            return (
              <button
                key={time}
                onClick={() => !disabled && toggleTime(time)}
                disabled={disabled}
                aria-pressed={selected}
                className={[
                  "px-3 py-1 rounded text-sm",
                  selected
                    ? "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                  disabled ? "opacity-40 cursor-not-allowed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {time}
              </button>
            );
          })}
        </div>
        {chipDisabled && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Three times selected — deselect one to choose another.
          </p>
        )}
      </section>
    </div>
  );
}
