"use client";

/**
 * /plan/templates — full-screen template picker.
 *
 * Shows all 15 templates sorted by level then title, pre-selected to the
 * user's current active set. Changes are held in local state and committed
 * only on explicit Save, so navigating back without saving leaves the store
 * untouched. This is required because template changes apply from the *next*
 * check-in; an incomplete or accidental selection must never auto-apply.
 *
 * The tab bar is hidden here because Part 2's TabBar uses an exact-match guard
 * (`pathname === "/plan"`), so this sub-route hides it without any change to
 * TabBar.tsx.
 *
 * Premise: `templateIds` is `[]` before the mount effect reads localStorage;
 * `hydrated` is the correct signal that the store is ready.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserData } from "@/lib/store/user-store";
import { getTemplates } from "@/lib/repo/template-repo";
import TemplatePicker from "@/components/TemplatePicker";
import { PLAN } from "@/lib/copy";

export default function TemplatesPage() {
  const { templateIds, setTemplates, hydrated } = useUserData();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const router = useRouter();

  /**
   * Initialise local selection from the store after hydration.
   * `useState([])` ensures the server prerender and the first client render
   * agree (empty array); this effect corrects it once the store is ready.
   */
  useEffect(() => {
    if (hydrated) setSelectedIds(templateIds);
  }, [hydrated]);

  // Prevent rendering a picker before the store is ready — an empty selection
  // would flash, and saving it would silently clear the user's templates.
  if (!hydrated) return null;

  const sorted = getTemplates()
    .slice()
    .sort((a, b) =>
      a.level !== b.level
        ? a.level - b.level
        : a.title.localeCompare(b.title)
    );

  /**
   * Toggle a template in local state, re-enforcing the 1–3 bound.
   * TemplatePicker also enforces it internally; this guard ensures the page
   * never passes an out-of-range array to the component or to the store.
   */
  function toggle(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        // Deselect only if more than one is selected (enforce minimum of 1).
        return prev.length > 1 ? prev.filter((x) => x !== id) : prev;
      }
      // Select only if below the maximum of 3.
      return prev.length < 3 ? [...prev, id] : prev;
    });
  }

  /**
   * Commit the local selection to the store and return to the Plan tab.
   * `useRouter().push` is used for client-side navigation — `redirect()` is a
   * server function and fails at runtime in a static export (PROJECT_PROFILE.md
   * Invariants: "No server actions that persist, no server redirect()").
   */
  function save() {
    setTemplates(selectedIds);
    router.push("/plan");
  }

  return (
    <main className="flex flex-col gap-6 px-4 py-6">
      <h1 className="text-title font-bold text-foreground">
        {PLAN.templatesPageHeading}
      </h1>
      <TemplatePicker
        templates={sorted}
        selectedIds={selectedIds}
        onToggle={toggle}
      />
      <button
        onClick={save}
        className="w-full rounded-radius-md bg-primary px-4 py-3 text-base font-semibold text-primary-foreground dark:bg-primary dark:text-primary-foreground"
      >
        {PLAN.saveTemplates}
      </button>
    </main>
  );
}
