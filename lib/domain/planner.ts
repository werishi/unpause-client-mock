/**
 * Day planner for Unpause — lib/domain/planner.ts
 *
 * Exports:
 *   addDays             — ISO date arithmetic, exported so callers can resolve
 *                         LogEntry.dayOffset to ISO dates before building PlanInput.log.
 *   planDay             — Produces a DayPlan for today; implements rules P1–P12
 *                         (concept Section 2.6, lines 310–381).
 *   suggestNextTemplate — Returns template.nextTemplateId when the user has met
 *                         the weekly engagement threshold for 3 consecutive full weeks.
 *
 * No imports from React, Next.js, @/lib/store/*, or @/lib/repo/* — eslint enforces
 * this. All state arrives as function arguments: pure, deterministic, no side effects.
 */

import type {
  Activity,
  DayPlan,
  EnergyLevel,
  LogEntry,
  PlanInput,
  PlanItem,
  Template,
  TemplateItem,
} from './types';

// ─── Raw log shape for suggestNextTemplate ────────────────────────────────────

/**
 * Minimal raw log shape that suggestNextTemplate reads. The store holds entries
 * with dayOffset (non-positive integer, "this many days before today") rather than
 * resolved ISO dates. suggestNextTemplate resolves them inline; planDay's caller
 * must resolve dayOffset to `date` using addDays before calling planDay.
 */
type RawLogEntry = { templateId: string; dayOffset: number; date?: string };

// ─── Module-private helpers ───────────────────────────────────────────────────

/**
 * Parses "YYYY-MM-DD" to UTC milliseconds. All date parsing in this module flows
 * through this single site so the no-browser-timezone-shift invariant (P1) is
 * enforced centrally — never use `new Date(isoString)` directly.
 */
function parseUTC(iso: string): number {
  const parts = iso.split('-');
  return Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

/** Returns the ISO date of Monday of the week containing `today`. */
function weekStart(today: string): string {
  const dow = new Date(parseUTC(today)).getUTCDay(); // 0=Sun, 1=Mon, …, 6=Sat
  const offsetToMon = dow === 0 ? -6 : 1 - dow;
  return addDays(today, offsetToMon);
}

/**
 * Returns true when `required` energy is within `userEnergy`. Replicates the
 * energy rank used by suggestTaskForEnergy (energy.ts:64). Defined here rather
 * than in energy.ts because Part 1 locked that file to a single additive re-export
 * — adding a new named export there would widen Part 1's Public Surface.
 */
function fitsEnergy(userEnergy: EnergyLevel, required: EnergyLevel): boolean {
  const rank: Record<EnergyLevel, number> = { low: 0, medium: 1, high: 2 };
  return rank[required] <= rank[userEnergy];
}

// ─── Exported helpers ─────────────────────────────────────────────────────────

/**
 * Adds `n` calendar days to `iso` ("YYYY-MM-DD") using Date.UTC arithmetic and
 * returns the result as "YYYY-MM-DD". Exported because callers resolve
 * LogEntry.dayOffset to ISO dates before building PlanInput.log:
 *   `{ ...entry, date: addDays(today, entry.dayOffset) }`
 * Using this single site keeps timezone-safe arithmetic centralised (P1).
 */
export function addDays(iso: string, n: number): string {
  const ms = parseUTC(iso) + n * 86_400_000;
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const mo = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dy = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${dy}`;
}

/**
 * Returns the seven ISO date strings (Monday–Sunday) of the calendar week
 * containing `today`. Index 0 is always Monday; index 6 is always Sunday.
 * Delegates week-start resolution to the module-private `weekStart` so the
 * ISO week boundary cannot drift between callers.
 */
export function weekDates(today: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart(today), i));
}

/**
 * Return shape for weekOffers — the offer set displayed on the plan page.
 *
 * `anchors` collects every Activity with category "anchor" found across all
 * templateIds, de-duplicated across templates; `byTemplate` lists each template's
 * non-anchor activities in TemplateItem array order, de-duplicated by activityId
 * (first occurrence wins).
 *
 * weekOffers deliberately receives no log and no timesPerWeek reading: showing
 * "offered N× per week" or "X left this week" is the offer-rate-as-quota reading
 * the intake concept's round-1 repair refused. This function must not receive that
 * information — the prohibition is structural, not conventional.
 */
export interface WeekOffers {
  anchors: Activity[];
  byTemplate: { templateId: string; activities: Activity[] }[];
}

/**
 * Builds the set of activities the plan page should display for a given week.
 * Takes no log input and never reads `timesPerWeek` — see `WeekOffers` above for
 * the reasoning.
 *
 * @param templateIds  Ordered list of template ids to include (typically one active
 *                     template, but the plan page may include several).
 * @param items        All TemplateItem rows — filtered to each templateId inline.
 * @param activities   Full Activity catalogue; missing activityIds are silently skipped.
 */
export function weekOffers(
  templateIds: string[],
  items: TemplateItem[],
  activities: Activity[]
): WeekOffers {
  // Build O(1) lookup; missing ids are skipped at the call site below (seed-data gap)
  const activityMap = new Map<string, Activity>(activities.map((a) => [a.id, a]));
  const seenAnchorIds = new Set<string>();
  const anchors: Activity[] = [];
  const byTemplate: WeekOffers['byTemplate'] = [];

  for (const templateId of templateIds) {
    const seenIds = new Set<string>();
    const nonAnchors: Activity[] = [];

    for (const item of items) {
      if (item.templateId !== templateId) continue;
      // activityId not in catalogue — seed-data gap, not a logic error; skip silently
      const activity = activityMap.get(item.activityId);
      if (!activity) continue;
      // De-duplicate by activityId, preserving first-occurrence order
      if (seenIds.has(activity.id)) continue;
      seenIds.add(activity.id);

      if (activity.category === 'anchor') {
        // Anchors collected globally; de-dup across templates by id
        if (!seenAnchorIds.has(activity.id)) {
          seenAnchorIds.add(activity.id);
          anchors.push(activity);
        }
      } else {
        nonAnchors.push(activity);
      }
    }

    byTemplate.push({ templateId, activities: nonAnchors });
  }

  return { anchors, byTemplate };
}

// ─── planDay internal types ───────────────────────────────────────────────────

/** Internal scored-item record accumulated during the item-scoring loop. */
interface ScoredItem {
  item: TemplateItem;
  activity: Activity;
  score: number;
  /** Log rows for this activity in the last 14 days; used for P9 exploration slot. */
  logCount14d: number;
}

// ─── planDay ─────────────────────────────────────────────────────────────────

/**
 * Produces a DayPlan for `input.today`. Pure and deterministic — the caller owns
 * all state; nothing is read from the store, the repo, or the browser clock.
 *
 * Rules P1–P12, concept Section 2.6 (lines 310–381).
 *
 * Caller contract: `input.log` must carry resolved ISO dates. Each raw entry's
 * `dayOffset` must have been converted to `date` via `addDays(today, entry.dayOffset)`
 * before this call. `today` should come from a `useEffect` so SSR produces no plan
 * and there is no hydration mismatch.
 */
export function planDay(input: PlanInput): DayPlan {
  // ─ Pre-computation (once, before the item loop) ───────────────────────────

  const wStart = weekStart(input.today);
  const wEnd = addDays(wStart, 6);
  const yesterday = addDays(input.today, -1);
  // 0=Mon … 6=Sun; used in P6 expected-pace calculation
  const weekdayIndex = (new Date(parseUTC(input.today)).getUTCDay() + 6) % 7;

  // Activity lookup by id — built once, O(1) access in the loop
  const activityMap = new Map<string, Activity>(
    input.activities.map((a) => [a.id, a])
  );

  // P4: count log rows per activity within the current week
  const engagedThisWeek = new Map<string, number>();
  for (const entry of input.log) {
    if (entry.date >= wStart && entry.date <= wEnd && entry.outcome === 'done') {
      engagedThisWeek.set(
        entry.activityId,
        (engagedThisWeek.get(entry.activityId) ?? 0) + 1
      );
    }
  }

  // P8: same-day-last-week bonus (+0.3) — done exactly 7 days ago
  const doneLastWeekSameDay = new Set<string>(
    input.log
      .filter((e) => e.outcome === 'done' && e.date === addDays(input.today, -7))
      .map((e) => e.activityId)
  );

  // P8: recency penalty (−0.5) — offered or done yesterday (any outcome)
  const offeredOrDoneYesterday = new Set<string>(
    input.log.filter((e) => e.date === yesterday).map((e) => e.activityId)
  );

  // P5: strenuous 48-hour rest — blocks activities done yesterday or today
  const strenuousBlocked = new Set<string>(
    input.log
      .filter((e) => e.outcome === 'done' && e.date >= yesterday)
      .map((e) => e.activityId)
      .filter((id) => activityMap.get(id)?.strenuous === true)
  );

  // P2: slot count by energy level
  const count = input.energy === 'low' ? 1 : input.energy === 'medium' ? 2 : 3;

  // P10 tiebreaker maps — template index first, then item row index (both ascending)
  const templateIndexMap = new Map<string, number>(
    input.templates.map((t, i) => [t.id, i])
  );
  // TemplateItem has no `id` field on the TypeScript interface (Part 4 gotcha).
  // Use object reference as the Map key — items in eligibleItems come from input.items
  // directly, so the same references hit on lookup.
  const itemIndexMap = new Map<TemplateItem, number>(
    input.items.map((item, i) => [item, i])
  );

  // ─ Item scoring loop ──────────────────────────────────────────────────────

  const eligibleItems: ScoredItem[] = [];
  const anchorItems: PlanItem[] = [];

  for (const item of input.items) {
    const activity = activityMap.get(item.activityId);
    // Missing activity is a seed-data gap, not a logic error — skip rather than throw
    if (!activity) continue;

    // ─ Anchor path: rhythm routines, no two-minute/full split ─────────────
    if (activity.category === 'anchor') {
      // P4 only — energy filter and strenuous filter do not apply to anchors
      if ((engagedThisWeek.get(activity.id) ?? 0) >= item.timesPerWeek) continue;
      anchorItems.push({
        activityId: activity.id,
        templateId: item.templateId,
        partOfDay: item.partOfDay,
        leadWithTwoMinute: false,
        offerFullVersion: false,
      });
      continue;
    }

    // P3: energy gate
    if (!fitsEnergy(input.energy, activity.energyRequired)) continue;
    // P4: weekly frequency cap
    if ((engagedThisWeek.get(activity.id) ?? 0) >= item.timesPerWeek) continue;
    // P5: strenuous 48-hour rest
    if (strenuousBlocked.has(activity.id)) continue;

    // P6: pace score — Math.min(1, …) cap prevents catch-up stacking (Polivy 2010)
    const engaged = engagedThisWeek.get(activity.id) ?? 0;
    const expected = (item.timesPerWeek * (weekdayIndex + 1)) / 7;
    const paceScore = Math.min(1, Math.max(0, expected - engaged));

    // P7: mood-boost share — ≥3 rated completions required (G4 watch point: a single
    // outlier session must not dominate the score and cause daily recommendations)
    const cutoff28 = addDays(input.today, -28);
    const ratedDone = input.log.filter(
      (e) =>
        e.activityId === activity.id &&
        e.outcome === 'done' &&
        e.moodBefore != null &&
        e.moodAfter != null &&
        e.date >= cutoff28
    );
    const helpShare =
      ratedDone.length >= 3
        ? ratedDone.filter(
            (e) => (e.moodAfter as number) > (e.moodBefore as number)
          ).length / ratedDone.length
        : 0;
    const moodScore = 0.5 * helpShare;

    // P8 combined score
    const score =
      paceScore +
      moodScore +
      (doneLastWeekSameDay.has(activity.id) ? 0.3 : 0) -
      (offeredOrDoneYesterday.has(activity.id) ? 0.5 : 0);

    // P9: 14-day log count for exploration slot tiebreaking
    const logCount14d = input.log.filter(
      (e) => e.activityId === activity.id && e.date >= addDays(input.today, -14)
    ).length;

    eligibleItems.push({ item, activity, score, logCount14d });
  }

  // Sort anchor items by part-of-day order (morning → afternoon → evening → any)
  const partOrder: Record<string, number> = {
    morning: 0,
    afternoon: 1,
    evening: 2,
    any: 3,
  };
  anchorItems.sort(
    (a, b) => (partOrder[a.partOfDay] ?? 3) - (partOrder[b.partOfDay] ?? 3)
  );

  // ─ Selection (P9, P10, P11) ───────────────────────────────────────────────

  // P10: tiebreaker — lower template index wins; then lower item row index
  function tiebreak(a: ScoredItem, b: ScoredItem): number {
    const tA = templateIndexMap.get(a.item.templateId) ?? 0;
    const tB = templateIndexMap.get(b.item.templateId) ?? 0;
    if (tA !== tB) return tA - tB;
    return (itemIndexMap.get(a.item) ?? 0) - (itemIndexMap.get(b.item) ?? 0);
  }

  // Primary sort: descending score; tiebreak ascending
  eligibleItems.sort((a, b) => {
    const diff = b.score - a.score;
    return diff !== 0 ? diff : tiebreak(a, b);
  });

  const selectedItems: ScoredItem[] = [];

  if (count === 1) {
    // Low energy: single best-scored activity, no exploration slot (P9)
    if (eligibleItems.length > 0) selectedItems.push(eligibleItems[0]);
  } else {
    // Medium or high: top (count−1) scored slots + 1 exploration slot (P9)
    selectedItems.push(...eligibleItems.slice(0, count - 1));

    // Exploration slot: least-seen activity among remaining eligible items
    const remaining = eligibleItems.slice(count - 1);
    let exploration: ScoredItem | null = null;
    for (const candidate of remaining) {
      if (
        exploration === null ||
        candidate.logCount14d < exploration.logCount14d ||
        (candidate.logCount14d === exploration.logCount14d &&
          tiebreak(candidate, exploration) < 0)
      ) {
        exploration = candidate;
      }
    }
    if (exploration) selectedItems.push(exploration);
  }

  // P11: offerFullVersion — true when last 3 done entries were all two-minute versions.
  // LogEntry.version was added to types.ts in Part 5 step 2; typed directly here.
  const activities: PlanItem[] = selectedItems.map((si) => {
    let offerFullVersion = false;
    if (input.energy !== 'low') {
      const doneLast3 = input.log
        .filter((e) => e.activityId === si.activity.id && e.outcome === 'done')
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        .slice(0, 3);
      if (doneLast3.length === 3 && doneLast3.every((e) => e.version === 'twoMinute')) {
        offerFullVersion = true;
      }
    }
    return {
      activityId: si.activity.id,
      templateId: si.item.templateId,
      partOfDay: si.item.partOfDay,
      leadWithTwoMinute: count === 1,
      offerFullVersion,
    };
  });

  // P12: if no eligible non-anchor items, activities is []. Anchors are still included.
  return {
    date: input.today,
    activities,
    anchors: anchorItems,
  };
}

// ─── suggestNextTemplate ──────────────────────────────────────────────────────

/**
 * Returns `template.nextTemplateId` when the user engaged with this template at
 * or above half the weekly offer rate for each of the 3 most recent full weeks,
 * otherwise null. "Engaged" means any log row for this templateId in the week
 * window, regardless of outcome.
 *
 * `log` carries raw store entries with `dayOffset: number` (non-positive integer,
 * "this many days before today"). The function resolves them inline; callers do NOT
 * need to pre-resolve dates before calling (unlike planDay, which requires resolved
 * LogEntry.date values).
 *
 * Feature map (Part 5 Domain Notes): pass `getTemplateItems(template.id)` as `items`
 * so `timesPerWeek` is available for the threshold calculation.
 */
export function suggestNextTemplate(
  template: Template,
  items: TemplateItem[],
  log: RawLogEntry[],
  today: string
): string | null {
  const filteredItems = items.filter((i) => i.templateId === template.id);
  if (filteredItems.length === 0 || template.nextTemplateId == null) return null;

  const weeklyOfferRate = filteredItems.reduce((s, i) => s + i.timesPerWeek, 0);
  if (weeklyOfferRate === 0) return null;

  const threshold = Math.ceil(weeklyOfferRate / 2);
  const currentWeekStart = weekStart(today);

  for (let k = 1; k <= 3; k++) {
    const ws = addDays(currentWeekStart, -7 * k);
    const we = addDays(ws, 6);
    const engagedCount = log.filter((e) => {
      // Date-wins rule: use e.date when present (user-recorded rows); fall back
      // to addDays for persona-seed rows that carry only dayOffset.
      const rowDate = e.date ?? addDays(today, e.dayOffset ?? 0);
      return e.templateId === template.id && rowDate >= ws && rowDate <= we;
    }).length;
    if (engagedCount < threshold) return null;
  }

  return template.nextTemplateId;
}
