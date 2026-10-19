import { describe, it, expect } from 'vitest';
import type { LogEntry, Activity } from '../lib/domain/types';
import { isRatedDone, wasFollowedByBetterMood } from '../lib/domain/mood';
import {
  activeDays,
  doneCount,
  valuesServed,
  categoryPatterns,
  pointsTotal,
  weekSummary,
  monthSummary,
  POINTS_PER_DONE,
  COMEBACK_BONUS,
} from '../lib/domain/look-back';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function entry(
  activityId: string,
  date: string,
  outcome: 'done' | 'skip' = 'done',
  moodBefore?: number | null,
  moodAfter?: number | null
): LogEntry {
  return { activityId, templateId: 'tmpl-1', date, outcome, moodBefore, moodAfter };
}

function activity(
  id: string,
  category: Activity['category'],
  valueIds: string[] = []
): Activity {
  return {
    id,
    category,
    valueIds,
    strenuous: false,
    title: 'Test',
    cue: 'Test cue',
    twoMinuteVersion: 'Test two-min',
    energyRequired: 'low',
    minutes: 10,
    sourceIds: [],
  };
}

// ─── isRatedDone ──────────────────────────────────────────────────────────────

describe('isRatedDone', () => {
  it('returns false when outcome is skip', () => {
    expect(isRatedDone(entry('a1', '2026-10-01', 'skip', 3, 4))).toBe(false);
  });

  it('returns false when moodBefore is missing (undefined)', () => {
    expect(isRatedDone(entry('a1', '2026-10-01', 'done', undefined, 4))).toBe(false);
  });

  it('returns false when moodAfter is null', () => {
    expect(isRatedDone(entry('a1', '2026-10-01', 'done', 3, null))).toBe(false);
  });

  it('returns true when done with both moods recorded', () => {
    expect(isRatedDone(entry('a1', '2026-10-01', 'done', 3, 4))).toBe(true);
  });
});

// ─── wasFollowedByBetterMood ──────────────────────────────────────────────────

describe('wasFollowedByBetterMood', () => {
  it('returns false when moodAfter equals moodBefore', () => {
    expect(wasFollowedByBetterMood(entry('a1', '2026-10-01', 'done', 3, 3))).toBe(false);
  });

  it('returns false when moodAfter is lower than moodBefore', () => {
    expect(wasFollowedByBetterMood(entry('a1', '2026-10-01', 'done', 4, 3))).toBe(false);
  });

  it('returns true when moodAfter is strictly higher than moodBefore', () => {
    expect(wasFollowedByBetterMood(entry('a1', '2026-10-01', 'done', 3, 5))).toBe(true);
  });

  it('returns false when outcome is skip (delegates to isRatedDone)', () => {
    expect(wasFollowedByBetterMood(entry('a1', '2026-10-01', 'skip', 3, 5))).toBe(false);
  });
});

// ─── activeDays ───────────────────────────────────────────────────────────────

describe('activeDays', () => {
  it('returns 0 for an empty log', () => {
    expect(activeDays([], '2026-10-01', '2026-10-07')).toBe(0);
  });

  it('counts a date once even when multiple done rows share it', () => {
    const log = [
      entry('a1', '2026-10-05'),
      entry('a2', '2026-10-05'),
      entry('a3', '2026-10-05'),
    ];
    expect(activeDays(log, '2026-10-01', '2026-10-07')).toBe(1);
  });

  it('excludes entries whose date falls outside the range', () => {
    const log = [
      entry('a1', '2026-10-05'), // inside
      entry('a2', '2026-10-08'), // outside (after to)
    ];
    expect(activeDays(log, '2026-10-01', '2026-10-07')).toBe(1);
  });
});

// ─── doneCount ────────────────────────────────────────────────────────────────

describe('doneCount', () => {
  it('returns 0 for an empty log', () => {
    expect(doneCount([])).toBe(0);
  });

  it('counts only done entries, ignoring skips', () => {
    const log = [
      entry('a1', '2026-10-01', 'done'),
      entry('a2', '2026-10-02', 'skip'),
      entry('a3', '2026-10-03', 'done'),
    ];
    expect(doneCount(log)).toBe(2);
  });
});

// ─── valuesServed ─────────────────────────────────────────────────────────────

describe('valuesServed', () => {
  it('returns an empty array when there are no done rows', () => {
    const acts = [activity('a1', 'movement', ['v1'])];
    const log = [entry('a1', '2026-10-01', 'skip')];
    expect(valuesServed(log, acts)).toEqual([]);
  });

  it('returns the single value served by the single done activity', () => {
    const acts = [activity('a1', 'movement', ['v-health'])];
    const log = [entry('a1', '2026-10-01', 'done')];
    expect(valuesServed(log, acts)).toEqual(['v-health']);
  });

  it('deduplicates values and returns them sorted', () => {
    // Two activities share 'v-health'; a3 adds 'v-connect'. Expected: sorted.
    const acts = [
      activity('a1', 'movement', ['v-health', 'v-connect']),
      activity('a2', 'movement', ['v-health']),
    ];
    const log = [
      entry('a1', '2026-10-01', 'done'),
      entry('a2', '2026-10-02', 'done'),
    ];
    expect(valuesServed(log, acts)).toEqual(['v-connect', 'v-health']);
  });
});

// ─── categoryPatterns ────────────────────────────────────────────────────────

// Shared anchor: today = "2026-10-19" (Monday); 28-day window is 2026-09-21 to 2026-10-19.

const TODAY = '2026-10-19';

describe('categoryPatterns', () => {
  // Activities used across sub-describes
  const movA = activity('mov-a', 'movement');
  const movB = activity('mov-b', 'movement');
  const ancA = activity('anc-a', 'anchor');
  const ancB = activity('anc-b', 'anchor');
  const mediaA = activity('med-a', 'media');

  describe('floor 1 — minimum 3 completions', () => {
    it('qualifies a category that has exactly 3 done entries in the window', () => {
      // movement: 3 entries across 2 weeks with 2 distinct activities → qualifies
      const log = [
        entry('mov-a', '2026-10-05'), // week 2026-10-05
        entry('mov-b', '2026-10-06'), // week 2026-10-05
        entry('mov-a', '2026-10-12'), // week 2026-10-12 (2nd week)
      ];
      const result = categoryPatterns(log, [movA, movB], TODAY);
      expect(result).toHaveLength(1);
      expect(result[0].categoryKey).toBe('movement');
    });

    it('rejects a category that has only 2 done entries in the window', () => {
      const log = [
        entry('mov-a', '2026-10-05'),
        entry('mov-b', '2026-10-12'),
      ];
      const result = categoryPatterns(log, [movA, movB], TODAY);
      expect(result).toHaveLength(0);
    });
  });

  describe('floor 2 — minimum 2 distinct activities', () => {
    it('qualifies when 3 entries come from 2 distinct activities', () => {
      const log = [
        entry('mov-a', '2026-10-05'),
        entry('mov-b', '2026-10-06'),
        entry('mov-a', '2026-10-12'),
      ];
      const result = categoryPatterns(log, [movA, movB], TODAY);
      expect(result).toHaveLength(1);
    });

    it('rejects when all 3 entries come from the same activity', () => {
      const log = [
        entry('mov-a', '2026-10-05'),
        entry('mov-a', '2026-10-06'),
        entry('mov-a', '2026-10-12'),
      ];
      const result = categoryPatterns(log, [movA, movB], TODAY);
      expect(result).toHaveLength(0);
    });
  });

  describe('floor 3 — minimum 2 distinct calendar weeks', () => {
    it('qualifies when entries span 2 distinct weeks', () => {
      const log = [
        entry('mov-a', '2026-10-05'), // week 2026-10-05
        entry('mov-b', '2026-10-06'), // week 2026-10-05
        entry('mov-a', '2026-10-12'), // week 2026-10-12
      ];
      const result = categoryPatterns(log, [movA, movB], TODAY);
      expect(result).toHaveLength(1);
    });

    it('rejects when all entries fall within one calendar week', () => {
      const log = [
        entry('mov-a', '2026-10-05'), // week 2026-10-05
        entry('mov-b', '2026-10-06'), // week 2026-10-05
        entry('mov-a', '2026-10-07'), // week 2026-10-05
      ];
      const result = categoryPatterns(log, [movA, movB], TODAY);
      expect(result).toHaveLength(0);
    });
  });

  describe('floor 4 — minimum share ≥ 1/3', () => {
    // per-ayla: movement share = 5/15 = 1/3 exactly — must qualify (floor is ≥, not >)
    it('qualifies when movement share is exactly 1/3 (per-ayla)', () => {
      // movement: 5 entries, 2 activities, 2 weeks (qualifies all floors)
      // anchor: 10 entries all from one activity (fails floor 2, so only movement qualifies)
      const log = [
        // movement week 1 (2026-10-05)
        entry('mov-a', '2026-10-05'),
        entry('mov-b', '2026-10-06'),
        // movement week 2 (2026-10-12)
        entry('mov-a', '2026-10-12'),
        entry('mov-b', '2026-10-13'),
        entry('mov-a', '2026-10-14'),
        // anchor × 10 — all from one activity (fails floor 2)
        entry('anc-a', '2026-09-21'),
        entry('anc-a', '2026-09-22'),
        entry('anc-a', '2026-09-23'),
        entry('anc-a', '2026-09-24'),
        entry('anc-a', '2026-09-25'),
        entry('anc-a', '2026-09-26'),
        entry('anc-a', '2026-09-27'),
        entry('anc-a', '2026-09-28'),
        entry('anc-a', '2026-09-29'),
        entry('anc-a', '2026-09-30'),
      ];
      // total = 15; movement = 5; share = 5/15 = 1/3 exactly
      const result = categoryPatterns(log, [movA, movB, ancA], TODAY);
      expect(result).toHaveLength(1);
      expect(result[0].categoryKey).toBe('movement');
    });

    it('rejects a category whose share is below 1/3', () => {
      // movement: 3 entries, 2 activities, 2 weeks; anchor total makes movement < 1/3
      // total = 10 (3 movement + 7 anchor); movement share = 3/10 = 0.3 < 1/3
      const log = [
        entry('mov-a', '2026-10-05'),
        entry('mov-b', '2026-10-06'),
        entry('mov-a', '2026-10-12'),
        // anchor × 7 — all from one activity so anchor fails floor 2
        entry('anc-a', '2026-09-21'),
        entry('anc-a', '2026-09-22'),
        entry('anc-a', '2026-09-23'),
        entry('anc-a', '2026-09-24'),
        entry('anc-a', '2026-09-25'),
        entry('anc-a', '2026-09-26'),
        entry('anc-a', '2026-09-27'),
      ];
      // movement share = 3/10 = 0.3 < 1/3 → movement fails floor 4
      const result = categoryPatterns(log, [movA, movB, ancA], TODAY);
      expect(result).toHaveLength(0);
    });
  });

  // per-jonas: movement G4 demo case — movement, share 5/6, 2 activities, 2 weeks
  it('returns movement as the primary pattern for the per-jonas demo case', () => {
    const log = [
      // movement — week 1 (2026-10-05): 3 entries
      entry('mov-a', '2026-10-05'),
      entry('mov-b', '2026-10-06'),
      entry('mov-a', '2026-10-07'),
      // movement — week 2 (2026-10-12): 2 entries
      entry('mov-a', '2026-10-12'),
      entry('mov-b', '2026-10-13'),
      // anchor × 1 (makes total = 6; movement share = 5/6 ≈ 0.833)
      entry('anc-a', '2026-10-14'),
    ];
    // movement: 5 completions, 2 distinct activities, 2 distinct weeks, share 5/6 ✓
    const result = categoryPatterns(log, [movA, movB, ancA], TODAY);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ categoryKey: 'movement', rank: 0 });
  });

  it('excludes media entries structurally — only movement is returned', () => {
    const log = [
      // movement: 3 entries, 2 activities, 2 weeks (qualifies)
      entry('mov-a', '2026-10-05'),
      entry('mov-b', '2026-10-06'),
      entry('mov-a', '2026-10-12'),
      // media: 3 entries — excluded before qualifying checks run
      entry('med-a', '2026-10-05'),
      entry('med-a', '2026-10-06'),
      entry('med-a', '2026-10-12'),
    ];
    const result = categoryPatterns(log, [movA, movB, mediaA], TODAY);
    expect(result).toHaveLength(1);
    expect(result[0].categoryKey).toBe('movement');
  });

  it('assigns rank 0 to the higher-count category when two qualify (tie-break by count)', () => {
    // anchor: 5 entries; movement: 3 entries — both qualify floors 1–4
    // total = 8; anchor share = 5/8 = 0.625 ✓; movement share = 3/8 = 0.375 ✓
    const log = [
      // anchor — 2 activities, 2 weeks
      entry('anc-a', '2026-10-05'),
      entry('anc-b', '2026-10-06'),
      entry('anc-a', '2026-10-12'),
      entry('anc-b', '2026-10-13'),
      entry('anc-a', '2026-10-14'),
      // movement — 2 activities, 2 weeks
      entry('mov-a', '2026-10-05'),
      entry('mov-b', '2026-10-06'),
      entry('mov-a', '2026-10-12'),
    ];
    const result = categoryPatterns(log, [movA, movB, ancA, ancB], TODAY);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ categoryKey: 'anchor', rank: 0 });
    expect(result[1]).toEqual({ categoryKey: 'movement', rank: 1 });
  });
});

// ─── pointsTotal ──────────────────────────────────────────────────────────────

describe('pointsTotal', () => {
  it('returns 0 for an empty log with no comeback grants', () => {
    expect(pointsTotal([], [])).toBe(0);
  });

  it('adds POINTS_PER_DONE per done entry and COMEBACK_BONUS per comeback grant', () => {
    const log = [
      entry('a1', '2026-10-01', 'done'),
      entry('a2', '2026-10-02', 'done'),
      entry('a3', '2026-10-03', 'skip'),
    ];
    const grants = ['2026-10-05', '2026-10-10'];
    expect(pointsTotal(log, grants)).toBe(2 * POINTS_PER_DONE + 2 * COMEBACK_BONUS);
  });
});

// ─── weekSummary ──────────────────────────────────────────────────────────────

describe('weekSummary', () => {
  it('counts done entries and active days within the week', () => {
    // weekStart 2026-10-12 → week is 2026-10-12 to 2026-10-18
    const log = [
      entry('a1', '2026-10-12', 'done'),
      entry('a2', '2026-10-14', 'done'),
      entry('a3', '2026-10-14', 'skip'), // skip not counted
      entry('a4', '2026-10-19', 'done'), // outside this week
    ];
    expect(weekSummary(log, '2026-10-12')).toEqual({ doneCount: 2, activeDays: 2 });
  });

  it('returns zeros when all done entries fall outside the week', () => {
    const log = [entry('a1', '2026-09-30', 'done')];
    expect(weekSummary(log, '2026-10-12')).toEqual({ doneCount: 0, activeDays: 0 });
  });
});

// ─── monthSummary ─────────────────────────────────────────────────────────────

describe('monthSummary', () => {
  it('counts distinct active days in the given month', () => {
    const log = [
      entry('a1', '2026-10-05', 'done'),
      entry('a2', '2026-10-05', 'done'), // same day — counts once
      entry('a3', '2026-10-12', 'done'),
    ];
    expect(monthSummary(log, 2026, 10)).toEqual({ activeDays: 2 });
  });

  it('returns 0 active days when all done entries are in a different month', () => {
    const log = [entry('a1', '2026-09-30', 'done')];
    expect(monthSummary(log, 2026, 10)).toEqual({ activeDays: 0 });
  });
});
