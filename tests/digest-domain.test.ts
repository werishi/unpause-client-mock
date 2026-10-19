import { describe, it, expect } from 'vitest'
import { buildDigest, currentDigestSlot, nextDigestTime } from '../lib/domain/digest'
import { getPartOfDay, pickSwap } from '../lib/domain/swap'
import { suggestBudget, weekEntries, daysWithinBudget, isOverBudgetToday } from '../lib/domain/media-budget'
import type { DigestItem } from '../lib/repo/digest-repo'
import type { SwapEntry } from '../lib/repo/swap-repo'
import type { Activity } from '../lib/domain/types'

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeDigestItem(overrides: Partial<DigestItem> = {}): DigestItem {
  return { id: 'item-1', title: 'Title', source: 'source', tags: [], minutesToRead: 3, ...overrides }
}

function makeSwapEntry(overrides: Partial<SwapEntry> = {}): SwapEntry {
  return { id: 'swap-1', activityId: 'act-1', partOfDay: 'any', ...overrides }
}

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1', title: 'Activity', twoMinuteVersion: 'Quick', cue: 'After X',
    energyRequired: 'low', category: 'pleasant', strenuous: false, minutes: 10,
    valueIds: [], sourceIds: [], ...overrides,
  }
}

/** Builds a local-time Date from a date string and hour/minute components. */
function makeDate(dateStr: string, hour: number, minute: number): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d, hour, minute)
}

// Pre-built corpora. 14 items: rotation-by-day test (15 items wrap to same startIdx every day).
// 15 items: slot-rotation test and standard-corpus test. 3 items: wrap-around test.
const CORPUS_14 = Array.from({ length: 14 }, (_, i) => makeDigestItem({ id: `item-${i}` }))
const CORPUS_15 = Array.from({ length: 15 }, (_, i) => makeDigestItem({ id: `item-${i}` }))
const CORPUS_3 = Array.from({ length: 3 }, (_, i) => makeDigestItem({ id: `item-${i}` }))

// ─── buildDigest ─────────────────────────────────────────────────────────────

describe('buildDigest', () => {
  it('returns [] when interests is empty', () => {
    expect(buildDigest([], CORPUS_15, 0, new Date())).toEqual([])
  })

  it('returns [] when items is empty', () => {
    expect(buildDigest(['tech'], [], 0, new Date())).toEqual([])
  })

  it('returns 5 items for a standard corpus of 15', () => {
    expect(buildDigest(['tech'], CORPUS_15, 0, new Date())).toHaveLength(5)
  })

  it('startIdx rotates: slotIndex 0 vs 1 return different items', () => {
    const now = makeDate('2024-01-08', 10, 0)
    const r0 = buildDigest(['tech'], CORPUS_15, 0, now).map((x) => x.id)
    const r1 = buildDigest(['tech'], CORPUS_15, 1, now).map((x) => x.id)
    expect(r0).not.toEqual(r1)
  })

  it('startIdx rotates: day N vs day N+1 return different items', () => {
    // 14-item corpus: (dayNum * 15) % 14 advances by 1 each day, so adjacent days always differ.
    const r0 = buildDigest(['tech'], CORPUS_14, 0, makeDate('2024-01-08', 10, 0)).map((x) => x.id)
    const r1 = buildDigest(['tech'], CORPUS_14, 0, makeDate('2024-01-09', 10, 0)).map((x) => x.id)
    expect(r0).not.toEqual(r1)
  })

  it('wrap-around: startIdx near end of items still returns 5 items', () => {
    expect(buildDigest(['tech'], CORPUS_3, 0, new Date())).toHaveLength(5)
  })

  it('assignedInterest cycles round-robin with 2 interests and 5 items', () => {
    const result = buildDigest(['a', 'b'], CORPUS_15, 0, new Date())
    expect(result.map((x) => x.assignedInterest)).toEqual(['a', 'b', 'a', 'b', 'a'])
  })
})

// ─── currentDigestSlot ───────────────────────────────────────────────────────

describe('currentDigestSlot', () => {
  it('returns null when digestTimes is empty', () => {
    expect(currentDigestSlot([], null, new Date())).toBeNull()
  })

  it('returns null when no time is at or before now', () => {
    expect(currentDigestSlot(['08:00', '12:00'], null, makeDate('2024-01-08', 7, 0))).toBeNull()
  })

  it('returns the last eligible time when two times are at or before now', () => {
    const slot = currentDigestSlot(['09:00', '12:00', '17:00'], null, makeDate('2024-01-08', 15, 0))
    expect(slot).not.toBeNull()
    expect(slot!.slotIndex).toBe(1) // 12:00 is the last time before 15:00, index 1
  })

  it('returns null when the resulting slot key equals digestSeenSlot', () => {
    const seen = '2024-01-08_12:00'
    expect(currentDigestSlot(['09:00', '12:00', '17:00'], seen, makeDate('2024-01-08', 15, 0))).toBeNull()
  })

  it('returns correct slotIndex as the index in digestTimes, not a position counter', () => {
    // 12:30 is the last time before 13:00 and sits at index 1 in the array
    const slot = currentDigestSlot(['09:00', '12:30', '17:00'], null, makeDate('2024-01-08', 13, 0))
    expect(slot!.slotIndex).toBe(1)
  })
})

// ─── nextDigestTime ───────────────────────────────────────────────────────────

describe('nextDigestTime', () => {
  it('returns first future time with isTomorrow:false when one exists today', () => {
    const result = nextDigestTime(['08:00', '12:00', '18:00'], makeDate('2024-01-08', 10, 0))
    expect(result).toEqual({ timeLabel: '12:00', isTomorrow: false })
  })

  it('returns isTomorrow:true when all times are past', () => {
    const result = nextDigestTime(['08:00', '12:00'], makeDate('2024-01-08', 20, 0))
    expect(result).toEqual({ timeLabel: '08:00', isTomorrow: true })
  })

  it('returns isTomorrow:true with the first time when digestTimes has one entry and it is past', () => {
    const result = nextDigestTime(['08:00'], makeDate('2024-01-08', 14, 0))
    expect(result).toEqual({ timeLabel: '08:00', isTomorrow: true })
  })
})

// ─── getPartOfDay ─────────────────────────────────────────────────────────────

describe('getPartOfDay', () => {
  it('11:59 → morning', () => expect(getPartOfDay(makeDate('2024-01-08', 11, 59))).toBe('morning'))
  it('12:00 → afternoon', () => expect(getPartOfDay(makeDate('2024-01-08', 12, 0))).toBe('afternoon'))
  it('17:59 → afternoon', () => expect(getPartOfDay(makeDate('2024-01-08', 17, 59))).toBe('afternoon'))
  it('18:00 → evening', () => expect(getPartOfDay(makeDate('2024-01-08', 18, 0))).toBe('evening'))
})

// ─── pickSwap ────────────────────────────────────────────────────────────────

describe('pickSwap', () => {
  // afternoon: 14:00 — morning entries will be filtered out by the time-of-day step
  const afternoon = makeDate('2024-01-08', 14, 0)

  it('returns "act-swap-window" fallback when nothing matches partOfDay or energy', () => {
    const entry = makeSwapEntry({ activityId: 'act-m', partOfDay: 'morning' })
    const act = makeActivity({ id: 'act-m' })
    expect(pickSwap([entry], [act], afternoon, 'low', [], [])).toBe('act-swap-window')
  })

  it('returns null when fallback is in loggedTodayIds', () => {
    const entry = makeSwapEntry({ activityId: 'act-m', partOfDay: 'morning' })
    const act = makeActivity({ id: 'act-m' })
    expect(pickSwap([entry], [act], afternoon, 'low', [], ['act-swap-window'])).toBeNull()
  })

  it('drops entries whose activityId is in todayActivityIds', () => {
    const entry = makeSwapEntry({ activityId: 'act-plan', partOfDay: 'any' })
    const act = makeActivity({ id: 'act-plan' })
    // sole candidate is in the plan → removed → fallback
    expect(pickSwap([entry], [act], afternoon, 'low', ['act-plan'], [])).toBe('act-swap-window')
  })

  it('drops entries whose activityId is in loggedTodayIds', () => {
    const entry = makeSwapEntry({ activityId: 'act-done', partOfDay: 'any' })
    const act = makeActivity({ id: 'act-done' })
    // sole candidate already logged → removed → fallback
    expect(pickSwap([entry], [act], afternoon, 'low', [], ['act-done'])).toBe('act-swap-window')
  })

  it('rotation: day N and day N+1 return different activityIds with a pool of two', () => {
    const entries = [
      makeSwapEntry({ id: 'swap-1', activityId: 'act-x', partOfDay: 'any' }),
      makeSwapEntry({ id: 'swap-2', activityId: 'act-y', partOfDay: 'any' }),
    ]
    const acts = [makeActivity({ id: 'act-x' }), makeActivity({ id: 'act-y' })]
    const r0 = pickSwap(entries, acts, makeDate('2024-01-08', 14, 0), 'low', [], [])
    const r1 = pickSwap(entries, acts, makeDate('2024-01-09', 14, 0), 'low', [], [])
    expect(r0).not.toBe(r1)
  })
})

// ─── suggestBudget ───────────────────────────────────────────────────────────

describe('suggestBudget', () => {
  it('30 → 15', () => expect(suggestBudget(30)).toBe(15))
  it('60 → 45', () => expect(suggestBudget(60)).toBe(45))
  it('120 → 90', () => expect(suggestBudget(120)).toBe(90))
  it('180 → 135', () => expect(suggestBudget(180)).toBe(135))
  it('240 → 180', () => expect(suggestBudget(240)).toBe(180))
})

// ─── weekEntries ─────────────────────────────────────────────────────────────

describe('weekEntries', () => {
  it('returns 7 elements with index 0 = today', () => {
    const entries = weekEntries({}, '2024-01-08')
    expect(entries).toHaveLength(7)
    expect(entries[0].date).toBe('2024-01-08')
  })

  it('days not in mediaMinutesByDate have minutes: null', () => {
    const entries = weekEntries({}, '2024-01-08')
    expect(entries.every((e) => e.minutes === null)).toBe(true)
  })

  it('days present have the correct minutes value', () => {
    const entries = weekEntries({ '2024-01-08': 60, '2024-01-06': 90 }, '2024-01-08')
    expect(entries[0].minutes).toBe(60) // today
    expect(entries[1].minutes).toBeNull() // yesterday — no entry
    expect(entries[2].minutes).toBe(90) // 2 days ago
  })
})

// ─── daysWithinBudget ────────────────────────────────────────────────────────

describe('daysWithinBudget', () => {
  it('does not count days with minutes: null', () => {
    expect(daysWithinBudget([{ minutes: null }, { minutes: null }], 60)).toBe(0)
  })

  it('does not count days where minutes > budgetMinutes', () => {
    expect(daysWithinBudget([{ minutes: 90 }, { minutes: 120 }], 60)).toBe(0)
  })

  it('counts days where minutes <= budgetMinutes', () => {
    const entries = [{ minutes: 60 }, { minutes: 30 }, { minutes: null }, { minutes: 90 }]
    expect(daysWithinBudget(entries, 60)).toBe(2)
  })
})

// ─── isOverBudgetToday ───────────────────────────────────────────────────────

describe('isOverBudgetToday', () => {
  it('returns false when today has no entry', () => {
    expect(isOverBudgetToday({}, '2024-01-08', 60)).toBe(false)
  })

  it('returns false when entry equals budget', () => {
    expect(isOverBudgetToday({ '2024-01-08': 60 }, '2024-01-08', 60)).toBe(false)
  })

  it('returns true when entry exceeds budget', () => {
    expect(isOverBudgetToday({ '2024-01-08': 61 }, '2024-01-08', 60)).toBe(true)
  })
})
