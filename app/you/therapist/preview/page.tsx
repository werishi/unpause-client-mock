"use client";

/**
 * Therapist preview (/you/therapist/preview).
 *
 * Shows the user, with their real data in front of them, what a linked
 * therapist would see at the next session. Correct by construction: the page
 * builds one `TherapistViewInput`, calls `projectTherapistView` once and
 * renders `view.sections` in array order. It never inspects `sharing` or
 * `therapist` to decide which sections appear, and never filters, sorts or
 * aggregates shared data; a switched-off type is simply absent from the
 * result. The one lookup it does is resolving `valueIds` to labels through
 * `getValues()`. The projection is unit-tested in node because this repo has
 * no jsdom, which is why the decisions live there and not here.
 *
 * `sharing` comes from the store already passed through `resolveSharing`, so
 * a stale blob with missing or corrupt keys reads as "not shared". Do not read
 * a raw switch value from anywhere else.
 *
 * "Stop sharing this" calls `setShareSwitch(type, false)` with one tap and no
 * confirmation (a gate on revoking is consent pressure, spec 05); the section
 * then disappears because the projection no longer returns it.
 *
 * Copy rules: every string is a THERAPIST / MOOD_RATING / LOOK_BACK key with
 * tokens substituted through `.replace`, so no visible string holds a digit
 * and nothing says or implies anything was sent or is visible now. No score,
 * average, trend or arrow is shown; the view carries none to show.
 *
 * Hydration gate: returns `null` until `hydrated`, so a linked user never sees
 * the not-linked block or an empty preview flash up from seed defaults.
 *
 * Parent requirement: UserDataProvider is mounted (app/layout.tsx).
 */

import Link from "next/link";
import { useUserData } from "@/lib/store/user-store";
import {
  projectTherapistView,
  THERAPIST_VIEW_DAYS,
  type TherapistSection,
} from "@/lib/domain/therapist-view";
import { formatDayLabel } from "@/lib/domain/day";
import { withOverride } from "@/lib/domain/override";
import { getActivities } from "@/lib/repo/activity-repo";
import { getValues } from "@/lib/repo/value-repo";
import { getSafetyPlan } from "@/lib/repo/safety-plan-repo";
import { TherapistNotLinked } from "@/components/TherapistParts";
import { THERAPIST, MOOD_RATING, LOOK_BACK } from "@/lib/copy";

// Module-level: synchronous in-memory reads; stable references across renders
// (same pattern as app/look-back/page.tsx).
const activities = getActivities();
const allValues = getValues();
const safetySeed = getSafetyPlan();

const mutedText = "text-sm text-gray-600 dark:text-gray-400";
const subHeading =
  "text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide";

/** The user's own rating word for a stored 1–5 value; the raw value only if out of range. */
function ratingWord(value: number): string {
  return MOOD_RATING.labels[value - 1] ?? String(value);
}

export default function TherapistPreviewPage() {
  const {
    hydrated,
    today,
    therapist,
    sharing,
    log,
    safetyEntries,
    activityOverrides,
    setShareSwitch,
  } = useUserData();

  if (!hydrated) return null;

  // ── Not linked ───────────────────────────────────────────────────────────────

  if (therapist === null) {
    return <TherapistNotLinked />;
  }

  // ── Linked ───────────────────────────────────────────────────────────────────

  const view = projectTherapistView(
    {
      therapist,
      sharing,
      log,
      safetyEntries,
      activities: activities.map((a) => withOverride(a, activityOverrides[a.id])),
      safetySeed,
    },
    today,
  );
  const name = therapist.name;

  return (
    <div className="flex flex-col gap-6 py-6">
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold break-words">
            {THERAPIST.previewHeading.replace("{name}", name)}
          </h1>
          <span className="rounded-full border border-gray-300 dark:border-gray-600 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
            {THERAPIST.placeholderBadge}
          </span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
          {THERAPIST.previewIntro.replace("{name}", name)}
        </p>
        <p className={mutedText}>{THERAPIST.previewNoLive}</p>
        <p className={mutedText}>{THERAPIST.mockNote}</p>
        <p className={mutedText}>
          {THERAPIST.previewWindowNote.replace("{days}", String(THERAPIST_VIEW_DAYS))}
        </p>
      </section>

      {view.sections.length === 0 ? (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
            {THERAPIST.previewNothing.replace("{name}", name)}
          </p>
          <Link
            href="/you/therapist"
            className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-center block"
          >
            {THERAPIST.previewBackToSwitches}
          </Link>
        </section>
      ) : (
        view.sections.map((section) => (
          <section
            key={section.type}
            className="flex flex-col gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-4"
          >
            <h2 className={subHeading}>{THERAPIST.shareTypes[section.type].label}</h2>
            <SectionBody section={section} />
            <button
              type="button"
              onClick={() => setShareSwitch(section.type, false)}
              className="text-sm text-gray-600 dark:text-gray-400 underline self-start"
            >
              {THERAPIST.stopSharing}
            </button>
          </section>
        ))
      )}
    </div>
  );
}

/** Renders one projected section's content; presentation only, switched on the discriminant. */
function SectionBody({ section }: { section: TherapistSection }) {
  switch (section.type) {
    case "moodRatings":
      if (section.rows.length === 0) {
        return <p className={mutedText}>{THERAPIST.sectionEmpty}</p>;
      }
      return (
        <ul className="flex flex-col gap-3">
          {section.rows.map((row, i) => (
            // Rows never reorder within a render; date + id + index is unique
            // even when one activity was rated twice on the same day.
            <li key={`${row.date}-${row.activityId}-${i}`} className="flex flex-col gap-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDayLabel(row.date)}
              </p>
              <p className="text-sm font-medium break-words">{row.title}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {THERAPIST.moodBefore} {ratingWord(row.moodBefore)}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {THERAPIST.moodAfter} {ratingWord(row.moodAfter)}
              </p>
            </li>
          ))}
        </ul>
      );

    case "activityLog":
      if (section.days.length === 0) {
        return <p className={mutedText}>{THERAPIST.sectionEmpty}</p>;
      }
      return (
        <ul className="flex flex-col gap-3">
          {section.days.map((day) => (
            <li key={day.date} className="flex flex-col gap-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDayLabel(day.date)}
              </p>
              <ul className="flex flex-col gap-1 ps-4 list-disc">
                {day.titles.map((title, i) => (
                  <li key={`${day.date}-${i}`} className="text-sm break-words">
                    {title}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      );

    case "weekSummary": {
      // The one lookup the page may do: value ids to their labels.
      const valueLabels = section.valueIds
        .map((id) => allValues.find((v) => v.id === id)?.label)
        .filter((l): l is string => l !== undefined);
      return (
        <div className="flex flex-col gap-2">
          {/* No copy key exists for a range; the dash is punctuation only. */}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatDayLabel(section.from)} – {formatDayLabel(section.to)}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {THERAPIST.weekActiveDays.replace("{count}", String(section.activeDays))}
          </p>
          {valueLabels.length > 0 && (
            <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
              {THERAPIST.weekValues.replace("{values}", valueLabels.join(", "))}
            </p>
          )}
          {/* Omitted when empty: an empty list under a heading reads as "nothing good happened". */}
          {section.patterns.length > 0 && (
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-medium">{THERAPIST.weekPatternsHeading}</h3>
              {section.patterns.map((result) => (
                <p key={result.categoryKey} className="text-sm">
                  {LOOK_BACK.categoryLabels[result.categoryKey]}{" "}
                  {result.rank === 0 ? LOOK_BACK.patternPrimary : LOOK_BACK.patternSecondary}
                </p>
              ))}
            </div>
          )}
        </div>
      );
    }

    case "safetyPlan":
      return (
        <div className="flex flex-col gap-3">
          {section.empty ? (
            <p className={mutedText}>{THERAPIST.safetyPlanEmpty}</p>
          ) : (
            section.steps.map((step, i) => (
              <div key={`${step.title}-${i}`} className="flex flex-col gap-1">
                <p className="text-sm font-medium break-words">{step.title}</p>
                <ul className="flex flex-col gap-1 ps-4 list-disc">
                  {step.entries.map((entry, j) => (
                    <li key={`${i}-${j}`} className="text-sm break-words">
                      {entry}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400">{THERAPIST.safetyPlanNote}</p>
        </div>
      );

    default: {
      const unhandled: never = section;
      void unhandled;
      return null;
    }
  }
}
