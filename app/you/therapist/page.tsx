"use client";

/**
 * Therapist & sharing hub (/you/therapist).
 *
 * Rendered under the You tab (the path starts with /you/, so TabBar shows).
 * Reached only from the quiet "Therapist & sharing" row on /you; nothing else
 * in the app links here or prompts the user to link a therapist (goal G8).
 *
 * Hydration gate: returns `null` until `hydrated`. Before hydration the store
 * holds defaults, so a linked user would otherwise see the not-linked block
 * flash up, and a switch page showing every switch off, which reads as
 * "your sharing was reset".
 *
 * Not linked: `<TherapistNotLinked />` and nothing else.
 *
 * Linked, in this order:
 *   1. The record: name with the visible placeholder badge, link date, and an
 *      Unlink text button. Unlink calls the store directly: no confirm, no
 *      dialog, no reason field. Leaving must be as easy as joining (spec 05:
 *      a gate on revoking is consent pressure).
 *   2. The no-live line, the mock note and the not-a-substitute note.
 *   3. One `ShareSwitchRow` per SHARE_TYPES entry, bound to the live store.
 *   4. The never-shared list, each item with its reason.
 *   5. Standing homework, dated today or later, oldest first; each removable
 *      with one tap. Empty shows `homeworkEmpty` and no call to action.
 *   6. A link to the preview.
 *
 * Pages carry no business logic: the only list handling here is the
 * `date >= today` filter (`pruneHomeworkItems`) and the display sort. `today`
 * comes from the store (a local date), never from `toISOString()` (UTC).
 *
 * Parent requirement: UserDataProvider is mounted (app/layout.tsx).
 */

import Link from "next/link";
import { useUserData } from "@/lib/store/user-store";
import { pruneHomeworkItems } from "@/lib/store/sharing-slice";
import { SHARE_TYPES } from "@/lib/domain/sharing";
import { formatDayLabel } from "@/lib/domain/day";
import { withOverride } from "@/lib/domain/override";
import { getTaskById } from "@/lib/repo/activity-repo";
import { ShareSwitchRow, TherapistNotLinked } from "@/components/TherapistParts";
import { THERAPIST } from "@/lib/copy";

export default function TherapistHubPage() {
  const {
    hydrated,
    today,
    therapist,
    sharing,
    homework,
    activityOverrides,
    setShareSwitch,
    unlinkTherapist,
    removeHomework,
  } = useUserData();

  if (!hydrated) return null;

  // ── Not linked ───────────────────────────────────────────────────────────────

  if (!therapist) {
    return <TherapistNotLinked />;
  }

  // ── Linked ───────────────────────────────────────────────────────────────────

  // Copy before sorting: the sort is display-only and must not reorder state.
  const sortedHomework = [...pruneHomeworkItems(homework, today)].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
  // An item whose activity id is no longer in the catalogue is skipped rather
  // than shown as a raw id.
  const homeworkRows = sortedHomework.flatMap((item) => {
    const activity = getTaskById(item.activityId);
    if (!activity) return [];
    const title = withOverride(activity, activityOverrides[item.activityId]).title;
    const dateLabel =
      item.date === today
        ? THERAPIST.homeworkToday
        : THERAPIST.homeworkOnDate.replace("{date}", formatDayLabel(item.date));
    return [{ homeworkId: item.homeworkId, title, dateLabel }];
  });

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* ── 1. The record ── */}
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold break-words">{therapist.name}</h1>
          <span className="rounded-full border border-gray-300 dark:border-gray-600 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
            {THERAPIST.placeholderBadge}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {THERAPIST.hubLinkedOn.replace("{date}", formatDayLabel(therapist.linkedOn))}
        </p>
        <button
          type="button"
          onClick={() => unlinkTherapist()}
          className="text-sm text-red-600 dark:text-red-400 underline self-start"
        >
          {THERAPIST.unlinkLabel}
        </button>
      </section>

      {/* ── 2. What linking does and does not mean ── */}
      <section className="flex flex-col gap-2">
        <p className="text-sm text-gray-700 dark:text-gray-300">{THERAPIST.noLiveLine}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{THERAPIST.mockNote}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{THERAPIST.notASubstitute}</p>
      </section>

      {/* ── 3. Switches ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {THERAPIST.switchesHeading}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{THERAPIST.switchesIntro}</p>
        {SHARE_TYPES.map((type) => (
          <ShareSwitchRow
            key={type}
            type={type}
            name={therapist.name}
            checked={sharing[type]}
            onChange={(on) => setShareSwitch(type, on)}
          />
        ))}
      </section>

      {/* ── 4. Never shared ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {THERAPIST.neverSharedHeading}
        </h2>
        <ul className="flex flex-col gap-3">
          {THERAPIST.neverShared.map((item) => (
            <li key={item.id} className="flex flex-col gap-1">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{item.reason}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── 5. Homework ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {THERAPIST.homeworkHeading.replace("{name}", therapist.name)}
        </h2>
        {homeworkRows.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">{THERAPIST.homeworkEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {homeworkRows.map((row) => (
              <li
                key={row.homeworkId}
                className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-sm font-medium break-words">{row.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{row.dateLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeHomework(row.homeworkId)}
                  className="shrink-0 text-sm text-gray-600 dark:text-gray-400 underline"
                >
                  {THERAPIST.homeworkRemove}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-gray-500 dark:text-gray-400">{THERAPIST.homeworkNote}</p>
      </section>

      {/* ── 6. Preview ── */}
      <Link
        href="/you/therapist/preview"
        className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-center block"
      >
        {THERAPIST.previewLink.replace("{name}", therapist.name)}
      </Link>
    </div>
  );
}
