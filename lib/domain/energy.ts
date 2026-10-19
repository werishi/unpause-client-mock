/**
 * Domain module: energy-based task suggestion.
 *
 * Pure TypeScript — no React, no Next.js, no lib/repo, no data/ imports.
 * Receives `tasks` as a parameter so it is fully testable without any
 * file-system access. The caller (a repo function) owns loading the data.
 *
 * Matching rules (concept Section 2.3):
 *   "low"    → only tasks where energyRequired === "low"
 *   "medium" → tasks where energyRequired is "low" or "medium"
 *   "high"   → any task regardless of energyRequired
 * Among matches, the first in list order wins — the caller controls ordering.
 * Fallback when no match exists: return the task with the lowest energyRequired.
 * Empty list: throw, because no sensible fallback exists for zero tasks.
 */

export type EnergyLevel = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  cue: string;
  twoMinuteVersion: string;
  energyRequired: EnergyLevel;
  minutes: number;
}

/**
 * Returns the most appropriate task for the given energy level.
 *
 * The function is deterministic: given the same `energy` and `tasks` list it
 * always returns the same task. Callers that want different ordering should
 * sort or shuffle the array before passing it in.
 *
 * @param energy - The user's current energy level.
 * @param tasks  - The full task list, ordered so that preferred matches appear
 *                 first. Low-energy tasks should come before medium and high
 *                 so that a low-energy query returns the lightest option.
 * @returns The first task in `tasks` that matches the energy level, or — when
 *          no match exists — the task with the lowest energyRequired value.
 * @throws {Error} When `tasks` is empty, because no fallback is possible.
 */
export function suggestTaskForEnergy(energy: EnergyLevel, tasks: Task[]): Task {
  if (tasks.length === 0) {
    throw new Error("suggestTaskForEnergy: tasks list must not be empty");
  }

  const matches = tasks.filter((task) => {
    if (energy === "low") return task.energyRequired === "low";
    if (energy === "medium")
      return task.energyRequired === "low" || task.energyRequired === "medium";
    // "high" matches any task
    return true;
  });

  if (matches.length > 0) {
    return matches[0];
  }

  // Fallback: no task matched the requested energy level.
  // Return the task with the lowest energyRequired to avoid returning undefined.
  // Premise: EnergyLevel values are "low" < "medium" < "high"; this ordering
  // is encoded in energyRank below and is not derived from string comparison.
  const energyRank: Record<EnergyLevel, number> = { low: 0, medium: 1, high: 2 };
  return tasks.reduce((best, task) =>
    energyRank[task.energyRequired] < energyRank[best.energyRequired] ? task : best
  );
}

/**
 * Returns true when an activity's energy requirement is compatible with the
 * user's current energy level.
 *
 * Matching rules (mirrors the filter inside suggestTaskForEnergy):
 *   "low"    → only activities where energyRequired === "low"
 *   "medium" → energyRequired "low" or "medium"
 *   "high"   → any energyRequired
 *
 * Extracted as a standalone function so the swap domain layer can use it
 * without depending on the full Task-list selector.
 */
export function isEnergyCompatible(
  energyRequired: EnergyLevel,
  currentEnergy: EnergyLevel
): boolean {
  if (currentEnergy === 'low') return energyRequired === 'low';
  if (currentEnergy === 'medium')
    return energyRequired === 'low' || energyRequired === 'medium';
  return true; // "high" matches any
}

export type { Activity } from './types';
