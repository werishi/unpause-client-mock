"use client";

/**
 * TherapistLinkPage — the focused three-step flow that links a (made-up)
 * therapist and chooses the first sharing switches (therapist access and
 * sharing, part 4 step 6).
 *
 * Lives at /therapist/link, outside /you, so the TabBar is hidden without a
 * route-specific exclusion in components/TabBar.tsx (refused alternative in
 * TherapistSharingMap `## Rejected Alternatives`). The only entry point is
 * TherapistNotLinked on the /you/therapist hub; nothing else prompts to link.
 *
 * Step 1 explains the in-session setup; step 2 takes the name (only an empty
 * trimmed name is rejected); step 3 shows one ShareSwitchRow per SHARE_TYPES
 * entry. Every switch starts off, even inside a session, because consent given
 * across the table is not necessarily free — a design rule of this feature, not
 * a default to improve. Finishing with all four off is a valid end state.
 *
 * Nothing is saved before "Done": close and the step-1 back control return to
 * the hub with the store untouched. "Done" makes exactly one linkTherapist call,
 * which writes the therapist (linkedOn = today, supplied by the context) and
 * the switches together, so no render shows a therapist with unchosen switches.
 *
 * Redirect guard: once hydrated, a linked user (typed URL, back button) is
 * replaced to /you/therapist so the record and switches are never silently
 * overwritten. After a successful finish the guard fires too, which is harmless
 * because both navigations target the same page. Mirrors app/buddy/choose.
 *
 * Prerequisite: UserDataProvider is mounted above (app/layout.tsx).
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserData } from "@/lib/store/user-store";
import { SHARE_TYPES, type ShareType } from "@/lib/domain/sharing";
import { ShareSwitchRow } from "@/components/TherapistParts";
import { THERAPIST } from "@/lib/copy";

const HUB = "/you/therapist";

/** Every share type switched off — the mandatory starting point of step 3. */
function allOff(): Record<ShareType, boolean> {
  return SHARE_TYPES.reduce(
    (acc, type) => ({ ...acc, [type]: false }),
    {} as Record<ShareType, boolean>,
  );
}

const PRIMARY_BUTTON =
  "w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white text-center";
const BACK_BUTTON =
  "w-full rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-center";

export default function TherapistLinkPage() {
  const router = useRouter();
  const { hydrated, therapist, linkTherapist } = useUserData();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<Record<ShareType, boolean>>(allOff);

  // Redirect guard: a linked user must not re-enter the flow. Only navigates,
  // sets no state. Replace (not push) so Back skips this page.
  useEffect(() => {
    if (hydrated && therapist !== null) {
      router.replace(HUB);
    }
  }, [hydrated, therapist, router]);

  if (!hydrated || therapist !== null) {
    return null;
  }

  const trimmedName = name.trim();
  const allChoicesOff = SHARE_TYPES.every((type) => !choices[type]);

  function handleBack() {
    if (step === 1) {
      router.push(HUB);
    } else {
      // Going back keeps the entered name and the chosen switches.
      setStep(step === 3 ? 2 : 1);
    }
  }

  function handleNameNext() {
    if (trimmedName.length === 0) {
      setError(THERAPIST.step2NameEmpty);
      return;
    }
    setError(null);
    setStep(3);
  }

  /** The single save of the flow: therapist and switches in one call. */
  function handleDone() {
    linkTherapist(trimmedName, choices);
    router.push(HUB);
  }

  const backControl = (
    <button type="button" onClick={handleBack} className={BACK_BUTTON}>
      {THERAPIST.back}
    </button>
  );

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* Header row — the close button saves nothing */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {THERAPIST.linkStepLabel
            .replace("{step}", String(step))
            .replace("{total}", "3")}
        </span>
        <button
          type="button"
          aria-label={THERAPIST.linkClose}
          onClick={() => router.push(HUB)}
          className="text-2xl leading-none text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          ×
        </button>
      </div>

      {/* ── Step 1: together in a session ── */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold">{THERAPIST.step1Heading}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {THERAPIST.step1Body}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {THERAPIST.noLiveLine}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {THERAPIST.mockNote}
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className={PRIMARY_BUTTON}
            >
              {THERAPIST.linkNext}
            </button>
            {backControl}
          </div>
        </div>
      )}

      {/* ── Step 2: the therapist's name ── */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold">{THERAPIST.step2Heading}</h1>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="therapist-name"
              className="text-sm font-medium text-gray-900 dark:text-white"
            >
              {THERAPIST.step2NameLabel}
            </label>
            <input
              id="therapist-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              maxLength={40}
              placeholder={THERAPIST.step2NamePlaceholder}
              autoFocus
              aria-invalid={error !== null}
              aria-describedby="therapist-name-hint"
              className="w-full min-w-0 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
            />
            {error !== null && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <p
              id="therapist-name-hint"
              className="text-sm text-gray-500 dark:text-gray-400"
            >
              {THERAPIST.step2NameHint}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleNameNext}
              className={PRIMARY_BUTTON}
            >
              {THERAPIST.linkNext}
            </button>
            {backControl}
          </div>
        </div>
      )}

      {/* ── Step 3: what would be shared; every switch starts off ── */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold">{THERAPIST.step3Heading}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {THERAPIST.step3Body}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {THERAPIST.switchesIntro}
          </p>
          <div className="flex flex-col gap-3">
            {SHARE_TYPES.map((type) => (
              <ShareSwitchRow
                key={type}
                type={type}
                name={trimmedName}
                checked={choices[type]}
                onChange={(on) =>
                  setChoices((prev) => ({ ...prev, [type]: on }))
                }
              />
            ))}
          </div>
          {allChoicesOff && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {THERAPIST.step3AllOffNote}
            </p>
          )}
          <div className="flex flex-col gap-3">
            <button type="button" onClick={handleDone} className={PRIMARY_BUTTON}>
              {THERAPIST.linkDone}
            </button>
            {backControl}
          </div>
        </div>
      )}
    </div>
  );
}
