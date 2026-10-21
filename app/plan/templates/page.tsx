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

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUserData } from "@/lib/store/user-store";
import { getTemplates } from "@/lib/repo/template-repo";
import TemplatePicker from "@/components/TemplatePicker";
import { PLAN } from "@/lib/copy";

export default function TemplatesPage() {
  const { templateIds, setTemplates, hydrated } = useUserData();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [seeded, setSeeded] = useState(false);
  const router = useRouter();

  /**
   * Seed the local selection from the store once per mount, the first render
   * in which `hydrated` is true. `useState([])` keeps the server prerender and
   * the first client render identical (empty array). Adjusting state during
   * render (instead of in an effect) lets React discard this render and re-run
   * with the seeded value before committing, so no empty-selection commit
   * exists. `seeded` makes it fire once: later store changes to `templateIds`
   * never overwrite the user's unsaved picks. On client-side navigation
   * `hydrated` is already true at mount, so the first render seeds.
   * Deriving (`draft ?? templateIds`) was refused to keep one idiom across the
   * three settings pages (see the media page, where deriving changes behaviour).
   */
  if (hydrated && !seeded) {
    setSeeded(true);
    setSelectedIds(templateIds);
  }

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
      <h1 className="text-title font-bold text-gray-900 dark:text-gray-100">
        {PLAN.templatesPageHeading}
      </h1>
      <TemplatePicker
        templates={sorted}
        selectedIds={selectedIds}
        onToggle={toggle}
      />
      <button
        onClick={save}
        className="w-full rounded-md bg-indigo-600 px-4 py-3 text-base font-semibold text-white"
      >
        {PLAN.saveTemplates}
      </button>
    </main>
  );
}
