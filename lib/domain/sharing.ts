/**
 * Sharing domain constants — the kinds of data a user may share with a linked
 * therapist.
 *
 * This lives in `lib/domain/` rather than in `lib/store/sharing-slice.ts`
 * because `Persona.sharing` in `types.ts` needs `ShareType`, and a domain file
 * must never import from `lib/store/` (the store imports the domain, never the
 * reverse). The slice re-exports both names, so consumers may import from
 * either path.
 *
 * Pure TypeScript: no React, no store imports.
 */

/**
 * Every shareable data kind, in display order. The sharing hub, the linking
 * step and the therapist-view projection all iterate this one list.
 *
 * - `moodRatings` — the user's mood/energy check-in ratings.
 * - `activityLog` — which activities were done or skipped, and when.
 * - `weekSummary` — the weekly look-back summary.
 * - `safetyPlan`  — the user's Stanley-Brown safety-plan entries.
 *
 * Adding a share type later is one entry here plus one projector in the
 * therapist-view module (`lib/domain/therapist-view.ts`). Stored switch records
 * from before the addition simply lack the new key, which `resolveSharing` in
 * the slice reads as "not shared".
 */
export const SHARE_TYPES = [
  "moodRatings",
  "activityLog",
  "weekSummary",
  "safetyPlan",
] as const;

/** The key type of one sharing switch. */
export type ShareType = (typeof SHARE_TYPES)[number];
