"use client";

/**
 * Values page (/you/values).
 *
 * Lets the user update the up-to-three values they selected during onboarding.
 * Values annotate why an activity matters — they do not affect which activities
 * the planner offers (concept §2.6: "Changing values changes no plan").
 *
 * The tab bar is hidden on this route: TabBar.tsx excludes /you/values via
 * !pathname.startsWith("/you/values"), treating it as a focused sub-flow.
 *
 * Parent requirement: UserDataProvider must be mounted (app/layout.tsx satisfies this).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUserData } from "@/lib/store/user-store";
import { getValues } from "@/lib/repo/value-repo";
import ValueChips from "@/components/ValueChips";
import { YOU } from "@/lib/copy";

export default function ValuesPage() {
  const router = useRouter();
  const { valueIds, setValues } = useUserData();

  /**
   * Local copy of selected value ids — changes are not committed to the store
   * until the user taps Save. Initialised from the stored valueIds so the chips
   * reflect the current selection on entry.
   */
  const [selectedIds, setSelectedIds] = useState<string[]>(() => valueIds);

  /**
   * Toggles one value id in local state.
   * - Empty string ("") is the "None" sentinel from ValueChips — not stored; treated
   *   as a clear-all by clearing selectedIds.
   * - Adds the id when absent and the cap (3) has not been reached.
   * - Removes the id when already present.
   */
  function toggle(id: string) {
    if (id === "") {
      setSelectedIds([]);
      return;
    }
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((v) => v !== id);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, id];
    });
  }

  function handleSave() {
    setValues(selectedIds);
    router.back();
  }

  function handleBack() {
    router.back();
  }

  return (
    <div className="flex flex-col gap-6 py-6 px-4">
      <div className="flex items-center gap-2">
        <button
          onClick={handleBack}
          className="text-sm text-gray-500 dark:text-gray-400 underline-offset-2 hover:underline"
          aria-label={YOU.valuesBack}
        >
          {YOU.valuesBack}
        </button>
      </div>

      <ValueChips
        values={getValues()}
        selectedIds={selectedIds}
        max={3}
        onToggle={toggle}
      />

      <p className="text-sm text-gray-500 dark:text-gray-400">
        {YOU.valuesCaption}
      </p>

      <button
        onClick={handleSave}
        className="mt-auto w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white dark:bg-white dark:text-gray-900"
      >
        {YOU.valuesSave}
      </button>
    </div>
  );
}
