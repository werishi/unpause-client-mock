"use client";

/**
 * Demo page (/you/demo).
 *
 * Lets reviewers load a pre-seeded persona or reset to a blank first-run state.
 * After either action, navigation goes to `/` and the entry redirect
 * (`app/page.tsx`) routes to `/welcome`, `/welcome-back`, or `/today` based on
 * the loaded state. The demo page does not decide which screen to show — it
 * only sets state and navigates to the redirect.
 *
 * Guards on `hydrated` before enabling the persona rows: `loadPersona` depends
 * on the store's mount effect having run (today is set in that effect, and
 * getPersonaSeed resolves dayOffset against it). The reset button is not gated
 * because `resetDemoData` does not depend on `today`.
 */

import { useRouter } from "next/navigation";
import { useUserData } from "@/lib/store/user-store";
import { getPersonas } from "@/lib/repo/persona-repo";
import type { Persona } from "@/lib/domain/types";
import { DEMO, LOOK_BACK } from "@/lib/copy";

/** `blurb` exists in personas.json but is not on the public Persona interface. */
type PersonaWithBlurb = Persona & { blurb?: string };

// Called at module level — pure synchronous read from in-memory seed data.
const personas = getPersonas() as unknown as PersonaWithBlurb[];

export default function DemoPage() {
  const {
    hydrated,
    loadPersona,
    resetDemoData,
    plainVersion,
    setPlainVersion,
    reviewPreview,
    setReviewPreview,
  } = useUserData();
  const router = useRouter();

  const handleLoad = (id: string) => {
    loadPersona(id);
    router.push("/");
  };

  const handleReset = () => {
    resetDemoData();
    setPlainVersion(false);
    router.push("/");
  };

  return (
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-xl font-semibold">{DEMO.heading}</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">{DEMO.intro}</p>

      {hydrated && (
        <ul className="flex flex-col gap-2">
          {personas.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => handleLoad(p.id)}
                className="w-full text-left flex flex-col gap-0.5 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700"
              >
                <span className="font-medium">{p.displayName}</span>
                {p.blurb && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {p.blurb}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

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
                : "bg-gray-300 dark:bg-gray-600"
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
                : "bg-gray-300 dark:bg-gray-600"
            }`}
            aria-label={LOOK_BACK.reviewPreviewLabel}
          />
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
