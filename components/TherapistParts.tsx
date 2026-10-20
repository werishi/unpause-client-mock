"use client";

/**
 * Shared presentational parts of the Therapist Access and Sharing feature.
 *
 * Both exports are imported by more than one page, which is why they live in
 * `components/` rather than inline in a page:
 * - `ShareSwitchRow` — the hub `/you/therapist` (bound to the live store) and
 *   step 3 of the linking flow `/therapist/link` (bound to local state before
 *   the link exists).
 * - `TherapistNotLinked` — the hub and the preview `/you/therapist/preview`
 *   when either is opened while no therapist is linked.
 *
 * All strings come from `THERAPIST` in `lib/copy.ts`; tokens are substituted
 * with `.replace(...)`, never template literals, so the copy test can scan the
 * catalogue for every visible word.
 */

import Link from "next/link";
import { THERAPIST } from "@/lib/copy";
import { THERAPIST_VIEW_DAYS } from "@/lib/domain/therapist-view";
import type { ShareType } from "@/lib/domain/sharing";

type ShareSwitchRowProps = {
  /** Which share type this row controls; selects label and description from `THERAPIST.shareTypes`. */
  type: ShareType;
  /** The therapist's name, substituted for `{name}` in the description. */
  name: string;
  /** Current switch value. The caller resolves it (hub: `sharing[type]`, link step 3: local state). */
  checked: boolean;
  /**
   * Called with the NEW value (`!checked`) on every tap. One tap, no
   * confirmation: a gate on switching off is consent pressure (spec 05).
   */
  onChange: (on: boolean) => void;
};

/**
 * One share-type switch: label, conditional-voice description and an on/off
 * button with `role="switch"`.
 *
 * The `{name}` / `{days}` substitution and the aria label live here, in this
 * one component, so the hub and the linking flow cannot word the same switch
 * differently. `{days}` is `THERAPIST_VIEW_DAYS` so the window length is never
 * a digit written into copy.
 */
export function ShareSwitchRow({ type, name, checked, onChange }: ShareSwitchRowProps) {
  const { label, description } = THERAPIST.shareTypes[type];
  const text = description
    .replace("{name}", name)
    .replace("{days}", String(THERAPIST_VIEW_DAYS));

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={THERAPIST.switchAriaLabel.replace("{label}", label)}
        onClick={() => onChange(!checked)}
        className={
          checked
            ? "shrink-0 rounded-full bg-indigo-600 px-3 py-1 text-sm font-medium text-white"
            : "shrink-0 rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1 text-sm text-gray-700 dark:text-gray-300"
        }
      >
        {checked ? THERAPIST.switchOn : THERAPIST.switchOff}
      </button>
    </div>
  );
}

/**
 * The not-linked block: heading, the "works fully without a therapist" body
 * and one link into the linking flow at `/therapist/link`.
 *
 * Deliberately nothing else — no benefits list, no badge, no second prompt —
 * because the not-linked state must not become a prompt to link (concept goal
 * G8). Rendered only on `/you/therapist` and its preview; no other page may
 * show it.
 */
export function TherapistNotLinked() {
  return (
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-xl font-semibold">{THERAPIST.hubHeading}</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {THERAPIST.hubNotLinkedBody}
      </p>
      <Link
        href="/therapist/link"
        className="rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white text-center"
      >
        {THERAPIST.hubStartCta}
      </Link>
    </div>
  );
}
