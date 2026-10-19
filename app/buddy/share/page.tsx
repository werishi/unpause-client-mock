"use client";

/**
 * Buddy share page — focused flow for planning one upcoming shared activity.
 *
 * Belongs to the Connection & Buddy feature. Presents an activity picker drawn
 * from `SHARED_ACTIVITY_IDS` and a six-day chip row, then calls
 * `addSharedActivity` on the user store when the user confirms. The route lives
 * under `/buddy/` (not `/you/buddy/`) so the tab bar does not render inside
 * this focused flow (concept §2.6).
 *
 * Redirect guards (applied on mount via `useEffect`, both use `router.replace`
 * so the back button does not loop back to this page):
 *   - No buddy set → `/you/buddy`. The user should set a buddy before planning.
 *   - An upcoming shared activity already exists → `/you/buddy`. The
 *     at-most-one constraint (concept §2.5) means this page is only reachable
 *     when no future commitment exists; navigating here manually while one
 *     does exist would show a broken picker.
 *
 * `crypto.randomUUID()` is called in `handleAdd` at tap time — safe in a
 * browser client component; no SSR polyfill needed.
 *
 * The parent (UserDataProvider) is expected to have loaded and hydrated the
 * store before any store reads are meaningful.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserData } from "@/lib/store/user-store";
import { SHARED_ACTIVITY_IDS, eligibleDays } from "@/lib/domain/buddy";
import { getTaskById } from "@/lib/repo/activity-repo";
import { BUDDY } from "@/lib/copy";

export default function BuddySharePage() {
  const { hydrated, buddy, sharedActivities, addSharedActivity } =
    useUserData();
  const router = useRouter();

  // Computed once at render time and passed as a parameter to eligibleDays,
  // which takes today rather than reading new Date() internally so tests can
  // supply a fixed date. The string form is a stable primitive — useEffect deps
  // compare by value, so they only re-fire if the date itself changes.
  const today = new Date().toISOString().slice(0, 10);

  const [activityId, setActivityId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Guard 1: no buddy set — redirect to the management page.
  useEffect(() => {
    if (hydrated && buddy === null) {
      router.replace("/you/buddy");
    }
  }, [hydrated, buddy, router]);

  // Guard 2: at-most-one upcoming shared activity (concept §2.5). If one already
  // exists the user should manage it from /you/buddy, not add another.
  useEffect(() => {
    if (hydrated && sharedActivities.some((a) => a.date >= today)) {
      router.replace("/you/buddy");
    }
  }, [hydrated, sharedActivities, today, router]);

  // Block render until hydrated and until guards have had a chance to fire.
  if (!hydrated) return null;
  if (buddy === null) return null;
  if (sharedActivities.some((a) => a.date >= today)) return null;

  // Resolve the display-name for each shareable activity from the repo.
  // `getTaskById` returns `Activity | undefined`; undefined entries are filtered
  // out in case a seed id is ever removed without updating SHARED_ACTIVITY_IDS.
  const activities = SHARED_ACTIVITY_IDS.map((id) => getTaskById(id)).filter(
    (a): a is NonNullable<typeof a> => a !== undefined,
  );

  const chips = eligibleDays(today);

  // Derived values for the preview line; both are null until the user has
  // selected both an activity and a date.
  const selectedActivity =
    activityId != null ? getTaskById(activityId) : undefined;
  const selectedChip =
    selectedDate != null ? chips.find((c) => c.date === selectedDate) : undefined;

  /**
   * Adds the chosen activity + date as a new shared commitment and navigates
   * to /you/buddy so the user can immediately see the result.
   * `crypto.randomUUID()` is called here at tap time, not in the reducer,
   * so each tap produces a fresh ID and the reducer stays pure.
   */
  function handleAdd() {
    if (activityId == null || selectedDate == null) return;
    addSharedActivity({
      id: crypto.randomUUID(),
      activityId,
      date: selectedDate,
    });
    router.push("/you/buddy");
  }

  return (
    <main>
      <header>
        <h1>{BUDDY.planTogether}</h1>
        <button
          type="button"
          aria-label="Close"
          onClick={() => router.push("/you/buddy")}
        >
          ×
        </button>
      </header>

      <section aria-labelledby="activity-heading">
        <h2 id="activity-heading">Choose an activity</h2>
        <ul role="list">
          {activities.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setActivityId(a.id)}
                aria-pressed={activityId === a.id}
              >
                {a.title}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="day-heading">
        <h2 id="day-heading">Pick a day</h2>
        <div role="group" aria-label="Day chips">
          {chips.map((chip) => (
            <button
              key={chip.date}
              type="button"
              onClick={() => setSelectedDate(chip.date)}
              aria-pressed={selectedDate === chip.date}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </section>

      {selectedActivity != null && selectedChip != null && (
        <p aria-live="polite">
          {selectedActivity.title} — {selectedChip.label}
        </p>
      )}

      <button
        type="button"
        disabled={activityId == null || selectedDate == null}
        onClick={handleAdd}
      >
        Agree and add
      </button>
    </main>
  );
}
