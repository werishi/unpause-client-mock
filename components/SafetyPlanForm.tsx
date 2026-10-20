"use client";

/**
 * SafetyPlanForm — the whole editor UI for the six-step safety plan, used only
 * by the /safety/edit route. It owns the draft (one string[] per step) and
 * nothing else: it holds no store reference and imports no repo. The container
 * passes the step titles and prompts in and receives the cleaned entries back
 * through `onSave`, so the form can be reasoned about without the store
 * (same split as ActivityForm in app/plan/activity/page.tsx).
 *
 * The draft is seeded once, by a lazy useState initialiser and no effect. That
 * is correct only because the container mounts this form after the store has
 * hydrated, so `initialEntries` is final on the first render. If the form is
 * ever mounted before hydration, the draft would be seeded empty and a Save
 * would overwrite the persisted plan.
 *
 * Inputs are `type="text"`, never `tel`, and carry no `inputMode="tel"`: a
 * telephone keypad in a demo invites a viewer to type a real number, which the
 * profile Safety plan invariant rules out. Each step's hint is persistent
 * helper text rather than a placeholder, because a placeholder vanishes on the
 * first keystroke and would repeat on every row of a multi-row step.
 *
 * The therapist line is plain text with no control attached: a user without a
 * therapist completes the plan alone (concept goal condition).
 */

import { useState } from "react";
import {
  SAFETY_MAX_ENTRIES_PER_STEP,
  SAFETY_MAX_ENTRY_LENGTH,
  draftFromEntries,
  entriesFromDraft,
} from "@/lib/domain/safety-editor";
import { SAFETY_EDIT, SAFETY_PAGE } from "@/lib/copy";

export interface SafetyPlanFormProps {
  /** Title and prompt of each Stanley-Brown step, in seed order (six entries). */
  steps: { title: string; prompt: string }[];
  /**
   * The persisted plan as the store holds it, already hydrated. Passed as is;
   * draftFromEntries normalises its shape.
   */
  initialEntries: string[][];
  /**
   * Called on Save with entriesFromDraft(draft): trimmed, empty lines dropped,
   * capped. The container persists it and navigates; the form does neither.
   */
  onSave: (entries: string[][]) => void;
  /** Called by the back control. Leaving without Save discards the draft. */
  onBack: () => void;
}

const INPUT_CLASSES =
  "min-w-0 flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-indigo-500 dark:focus:border-indigo-400";

export function SafetyPlanForm({
  steps,
  initialEntries,
  onSave,
  onBack,
}: SafetyPlanFormProps) {
  const [draft, setDraft] = useState<string[][]>(() =>
    draftFromEntries(initialEntries),
  );

  function handleChange(s: number, r: number, value: string): void {
    setDraft((prev) =>
      prev.map((rows, i) =>
        i === s ? rows.map((row, j) => (j === r ? value : row)) : rows,
      ),
    );
  }

  function handleRemove(s: number, r: number): void {
    setDraft((prev) =>
      prev.map((rows, i) => (i === s ? rows.filter((_, j) => j !== r) : rows)),
    );
  }

  function handleAdd(s: number): void {
    setDraft((prev) =>
      prev.map((rows, i) =>
        i === s && rows.length < SAFETY_MAX_ENTRIES_PER_STEP
          ? [...rows, ""]
          : rows,
      ),
    );
  }

  function handleSave(): void {
    onSave(entriesFromDraft(draft));
  }

  return (
    <main className="flex flex-col gap-8 py-8">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        {SAFETY_PAGE.backLabel}
      </button>

      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {SAFETY_EDIT.heading}
        </h1>
        <p className="text-gray-700 dark:text-gray-300">{SAFETY_EDIT.intro}</p>
        <p className="text-gray-700 dark:text-gray-300">
          {SAFETY_EDIT.therapistLine}
        </p>
      </div>

      {steps.map((step, s) => {
        const rows = draft[s] ?? [];
        return (
          <section key={step.title} className="flex flex-col gap-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {step.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {step.prompt}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {SAFETY_EDIT.hints[s]}
            </p>

            {/* Index keys: rows have no identity and every input is controlled. */}
            {rows.map((value, r) => (
              <div key={r} className="flex items-center gap-2">
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleChange(s, r, e.target.value)}
                  maxLength={SAFETY_MAX_ENTRY_LENGTH}
                  autoComplete="off"
                  aria-label={`${step.title} ${r + 1}`}
                  className={INPUT_CLASSES}
                />
                <button
                  type="button"
                  onClick={() => handleRemove(s, r)}
                  aria-label={`${SAFETY_EDIT.removeLabel} ${r + 1}`}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center text-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
            ))}

            {rows.length < SAFETY_MAX_ENTRIES_PER_STEP && (
              <button
                type="button"
                onClick={() => handleAdd(s)}
                className="self-start text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {SAFETY_EDIT.addLineLabel}
              </button>
            )}
          </section>
        );
      })}

      <button
        type="button"
        onClick={handleSave}
        className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
      >
        {SAFETY_EDIT.saveLabel}
      </button>
    </main>
  );
}
