"use client";

/**
 * /plan/activity — per-activity edit page.
 *
 * Static-export exception: useSearchParams() requires a Suspense boundary when
 * next.config.ts uses output: "export". The default export is a thin shell that
 * renders Suspense; ActivityContent is the real component that runs client-only.
 *
 * Tab bar is already hidden here because TabBar.tsx guards on pathname === "/plan"
 * (exact match, not startsWith), so /plan/activity does not match.
 *
 * Belongs to the Plan feature. Parent must have UserDataProvider mounted above.
 */

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getActivities } from "@/lib/repo/activity-repo";
import { getValues } from "@/lib/repo/value-repo";
import { withOverride } from "@/lib/domain/override";
import { useUserData } from "@/lib/store/user-store";
import ValueChips from "@/components/ValueChips";
import { PLAN, TASK_SCREEN } from "@/lib/copy";

// Static catalogue reads — synchronous, placed at module level to avoid
// re-allocation on every render (mirrors app/plan/page.tsx pattern).
const allActivities = getActivities();
const allValues = getValues();

/**
 * Page shell — renders Suspense so Next.js static export can prerender this
 * route without calling useSearchParams (which requires the browser).
 * ActivityContent is the real component; it runs only in the browser.
 */
export default function ActivityEditPage() {
  return (
    <Suspense fallback={null}>
      <ActivityContent />
    </Suspense>
  );
}

/**
 * Reads ?id from the URL, resolves the activity from the catalogue, and
 * pre-fills the edit form from activityOverrides[id] via withOverride.
 *
 * Not-found path: renders a neutral message + back link when id is absent or
 * not in the catalogue. No copy key — this is a fallback-only path, never
 * reached through normal navigation.
 *
 * Save: calls setActivityOverride(id, patch) then routes to /plan.
 * Use original: calls clearActivityOverride(id) then routes to /plan.
 */
function ActivityContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { activityOverrides, setActivityOverride, clearActivityOverride } = useUserData();

  const id = searchParams.get("id");
  const activity = id ? allActivities.find((a) => a.id === id) : undefined;

  if (!id || !activity) {
    return (
      <main className="flex flex-col min-h-screen px-4 py-6">
        <p className="mt-6 text-gray-700 dark:text-gray-300">
          We couldn&apos;t find that activity.
        </p>
        <Link
          href="/plan"
          className="mt-4 text-sm text-indigo-600 dark:text-indigo-400"
        >
          Back to plan
        </Link>
      </main>
    );
  }

  const override = activityOverrides[id];
  const merged = withOverride(activity, override);

  // valueTag in the override takes priority over the catalogue default.
  // override.valueTag === "" → user chose None → selectedIds = [].
  // override.valueTag is a non-empty string → selectedIds = [valueTag].
  // override.valueTag === undefined (no override, or override has no valueTag) →
  //   fall back to the catalogue's first valueId, or [] if none.
  const initialSelectedIds: string[] =
    override?.valueTag !== undefined
      ? override.valueTag === "" ? [] : [override.valueTag]
      : activity.valueIds[0] ? [activity.valueIds[0]] : [];

  return (
    <ActivityForm
      title={activity.title}
      initialCue={merged.cue}
      initialTwoMinute={merged.twoMinuteVersion}
      initialSelectedIds={initialSelectedIds}
      onSave={(cue, twoMinuteVersion, valueTag) => {
        setActivityOverride(id, { cue, twoMinuteVersion, valueTag });
        router.push("/plan");
      }}
      onClear={() => {
        clearActivityOverride(id);
        router.push("/plan");
      }}
    />
  );
}

interface ActivityFormProps {
  /** Catalogue title — displayed as a heading, not editable. */
  title: string;
  /** Pre-filled from withOverride(activity, override).cue. */
  initialCue: string;
  /** Pre-filled from withOverride(activity, override).twoMinuteVersion. */
  initialTwoMinute: string;
  /** Pre-filled selection: [] for None, [id] for a value, or catalogue default. */
  initialSelectedIds: string[];
  /** Called on Save with the final (cue, twoMinuteVersion, valueTag) triple. */
  onSave: (cue: string, twoMinuteVersion: string, valueTag: string) => void;
  /** Called on "Use the original" to clear the override. */
  onClear: () => void;
}

/**
 * Controlled edit form for a single activity.
 *
 * Owns cue, twoMinuteVersion, and selectedIds state.
 * Delegates all persistence and navigation to the onSave / onClear callbacks —
 * it holds no store reference of its own, making it independently testable.
 *
 * onToggle("") fires when the None chip is tapped; that sets selectedIds to []
 * and causes handleSave to write valueTag = "" (the explicit-None signal to the store).
 */
function ActivityForm({
  title,
  initialCue,
  initialTwoMinute,
  initialSelectedIds,
  onSave,
  onClear,
}: ActivityFormProps) {
  const [cue, setCue] = useState(initialCue);
  const [twoMinute, setTwoMinute] = useState(initialTwoMinute);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);

  function handleToggle(id: string): void {
    if (id === "") {
      // None chip tapped — clear the selection (explicit None signal).
      setSelectedIds([]);
    } else {
      // Toggle: deselect if already active, otherwise replace (max=1).
      setSelectedIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  }

  function handleSave(): void {
    // selectedIds = [] means None is active; selectedIds = [id] means a value is chosen.
    const valueTag = selectedIds.length === 0 ? "" : (selectedIds[0] ?? "");
    onSave(cue, twoMinute, valueTag);
  }

  return (
    <main className="flex flex-col min-h-screen px-4 py-6">
      <h1 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h1>

      <div className="mt-6 flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {TASK_SCREEN.cueLabel}
        </label>
        <input
          type="text"
          value={cue}
          onChange={(e) => setCue(e.target.value)}
          maxLength={120}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {TASK_SCREEN.twoMinuteLabel}
        </label>
        <input
          type="text"
          value={twoMinute}
          onChange={(e) => setTwoMinute(e.target.value)}
          maxLength={120}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Value
        </span>
        <ValueChips
          values={allValues}
          selectedIds={selectedIds}
          max={1}
          onToggle={handleToggle}
          showNone
        />
      </div>

      <div className="mt-auto pt-8 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {PLAN.activityEditUseOriginal}
        </button>
      </div>
    </main>
  );
}
