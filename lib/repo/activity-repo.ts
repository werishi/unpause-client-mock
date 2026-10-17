/**
 * Data-access layer for activity tasks.
 *
 * This is the only permitted importer of `@/data/tasks.json`. Pages and
 * feature modules must use this module as their single import path for both
 * task data and the `Task` type; importing from `@/data` or relative `data/`
 * paths is banned by the project ESLint rule (see part 1.2).
 *
 * Contains no business logic — it is a thin getter over the JSON file. The
 * domain function `suggestTaskForEnergy` in `lib/domain/energy.ts` owns all
 * matching and selection logic; pass `getTasks()` to it rather than calling
 * it here.
 */

import tasksJson from "@/data/tasks.json";
import type { Task } from "@/lib/domain/energy";

export type { Task } from "@/lib/domain/energy";

/**
 * Returns the full task list as typed `Task[]`.
 *
 * The JSON is imported at module load time via `resolveJsonModule` (tsconfig
 * strict preset). The cast is safe as long as `data/tasks.json` is kept in
 * sync with the `Task` interface in `lib/domain/energy.ts`.
 */
export function getTasks(): Task[] {
  return tasksJson as Task[];
}

/**
 * Finds a single task by its `id` field.
 *
 * Returns `undefined` when no task with that id exists — callers must guard
 * against that case, for example when resolving a URL param to a task.
 *
 * @param id - The task's `id` string as stored in `data/tasks.json`.
 */
export function getTaskById(id: string): Task | undefined {
  return (tasksJson as Task[]).find((t) => t.id === id);
}
