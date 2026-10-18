import { describe, it, expect } from 'vitest'
import { planDay, suggestNextTemplate, addDays, weekDates, weekOffers } from '../lib/domain/planner'
import type { PlanInput, Activity, TemplateItem, LogEntry, Template } from '../lib/domain/types'

// ─── Fixture helpers (file-local) ────────────────────────────────────────────

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-test',
    title: 'Test',
    twoMinuteVersion: 'Quick test',
    cue: 'After breakfast, I …',
    energyRequired: 'low',
    category: 'pleasant',
    strenuous: false,
    minutes: 10,
    valueIds: [],
    sourceIds: [],
    ...overrides,
  }
}

function makeItem(overrides: Partial<TemplateItem> = {}): TemplateItem {
  return {
    templateId: 'tpl-test',
    activityId: 'act-test',
    timesPerWeek: 3,
    partOfDay: 'any',
    ...overrides,
  }
}

function makeLog(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'log-test',
    personaId: 'per-test',
    dayOffset: 0,
    activityId: 'act-test',
    templateId: 'tpl-test',
    outcome: 'done',
    version: 'full',
    moodBefore: null,
    moodAfter: null,
    date: '2024-01-08',
    ...overrides,
  }
}

/**
 * Default PlanInput. today='2024-01-08' is a Monday so weekStart === today,
 * making weekly quota windows trivially predictable in tests.
 * Uses templates: Template[] (the actual PlanInput shape), not templateIds.
 */
function basePlanInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    today: '2024-01-08',
    energy: 'medium',
    templates: [{ id: 'tpl-test', title: 'Test Template', summary: '', level: 1, sourceIds: [] }],
    activities: [],
    items: [],
    log: [],
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('planner', () => {
  it('addDays — UTC safety across DST boundary', () => {
    // 2024-03-10 crosses the US spring-forward DST boundary. A wall-clock
    // implementation would lose the "missing hour" and return '2024-03-10'.
    expect(addDays('2024-03-10', 1)).toBe('2024-03-11')
  })

  it('P2 — low energy returns exactly one item with leadWithTwoMinute=true', () => {
    const acts = ['a', 'b', 'c'].map((id) =>
      makeActivity({ id: `act-${id}`, energyRequired: 'low' })
    )
    const items = acts.map((a) => makeItem({ activityId: a.id, timesPerWeek: 3 }))
    const result = planDay(basePlanInput({ energy: 'low', activities: acts, items }))
    expect(result.activities.length).toBe(1)
    expect(result.activities[0].leadWithTwoMinute).toBe(true)
  })

  it('P3 — energy gate filters high-energy activity on low-energy day', () => {
    const act = makeActivity({ energyRequired: 'high' })
    const item = makeItem()
    const result = planDay(basePlanInput({ energy: 'low', activities: [act], items: [item] }))
    expect(result.activities.length).toBe(0)
  })

  it('P4 — timesPerWeek cap excludes activity once quota is met this week', () => {
    const act = makeActivity({ energyRequired: 'medium' })
    const item = makeItem({ timesPerWeek: 2 })
    // Both dates fall within the current ISO week (Mon Jan 8 – Sun Jan 14).
    // Jan 7 would be the prior week; Jan 9 is a valid in-week future date.
    const log = [
      makeLog({ activityId: act.id, date: '2024-01-08' }),
      makeLog({ activityId: act.id, date: '2024-01-09' }),
    ]
    const result = planDay(
      basePlanInput({ energy: 'medium', activities: [act], items: [item], log })
    )
    expect(result.activities.map((a) => a.activityId)).not.toContain(act.id)
  })

  it('P5 — strenuous activity blocked when done today or yesterday', () => {
    const act = makeActivity({ strenuous: true })
    const item = makeItem()

    // Done today — must be absent
    const todayLog = [makeLog({ activityId: act.id, outcome: 'done', date: '2024-01-08' })]
    expect(
      planDay(basePlanInput({ activities: [act], items: [item], log: todayLog }))
        .activities.map((a) => a.activityId)
    ).not.toContain(act.id)

    // Done yesterday — 48-hour rest rule still blocks it
    const yLog = [makeLog({ activityId: act.id, outcome: 'done', date: '2024-01-07' })]
    expect(
      planDay(basePlanInput({ activities: [act], items: [item], log: yLog }))
        .activities.map((a) => a.activityId)
    ).not.toContain(act.id)
  })

  it('P6 — pace score: skip outcomes are not incremented into engagedThisWeek', () => {
    // Friday Jan 12 — weekdayIndex 4; expected = 3*(4+1)/7 ≈ 2.14
    // Activity A: three "skip" entries this week. Per the spec, skips must NOT count
    // toward P4's engagedThisWeek cap, so A should not be filtered and its paceScore
    // should be 1 (capped from 2.14). Activity B has no entries; paceScore ≈ 0.43 on Monday.
    const actA = makeActivity({ id: 'act-a', energyRequired: 'low' })
    const actB = makeActivity({ id: 'act-b', energyRequired: 'low' })
    const itemA = makeItem({ activityId: 'act-a', timesPerWeek: 3 })
    const itemB = makeItem({ activityId: 'act-b', timesPerWeek: 3 })
    // Three skip entries in the current week (Mon Jan 8 – Fri Jan 12)
    const log = [
      makeLog({ activityId: 'act-a', outcome: 'skip', date: '2024-01-08' }),
      makeLog({ activityId: 'act-a', outcome: 'skip', date: '2024-01-09' }),
      makeLog({ activityId: 'act-a', outcome: 'skip', date: '2024-01-10' }),
    ]
    const result = planDay(
      basePlanInput({
        today: '2024-01-12',
        energy: 'low',
        activities: [actA, actB],
        items: [itemA, itemB],
        log,
      })
    )
    // A must appear — if skips count toward the cap, P4 would filter it (3 >= 3)
    expect(result.activities.map((a) => a.activityId)).toContain('act-a')
  })

  it('P7 — helpShare below threshold: activity with <3 rated completions is not filtered', () => {
    // Two rated "done" entries with mood improvement — below the 3-completion threshold.
    // P7 is a boost, not a filter: the activity still appears; its helpShare stays 0.
    const actA = makeActivity({ id: 'act-a', energyRequired: 'low' })
    const actB = makeActivity({ id: 'act-b', energyRequired: 'low' })
    const items = [
      makeItem({ activityId: 'act-a' }),
      makeItem({ activityId: 'act-b' }),
    ]
    const log = [
      makeLog({ activityId: 'act-a', date: '2024-01-01', moodBefore: 3, moodAfter: 5 }),
      makeLog({ activityId: 'act-a', date: '2024-01-02', moodBefore: 2, moodAfter: 4 }),
    ]
    const result = planDay(
      basePlanInput({ energy: 'medium', activities: [actA, actB], items, log })
    )
    expect(result.activities.map((a) => a.activityId)).toContain('act-a')
    expect(result.activities.map((a) => a.activityId)).toContain('act-b')
  })

  it('P7 — helpShare at threshold: boosted activity appears before equal-paceScore peer', () => {
    // Activity A: exactly 3 rated "done" with moodAfter > moodBefore → helpShare = 1.0
    // Activity B: no log. Both have timesPerWeek=3 on Monday → same paceScore ≈ 0.43.
    // A's total score = 0.43 + 0.5 > B's 0.43 → A must appear first.
    const actA = makeActivity({ id: 'act-a', energyRequired: 'low' })
    const actB = makeActivity({ id: 'act-b', energyRequired: 'low' })
    const items = [
      makeItem({ activityId: 'act-a', timesPerWeek: 3 }),
      makeItem({ activityId: 'act-b', timesPerWeek: 3 }),
    ]
    // All three entries are before the current week so engagedThisWeek=0 for A
    const log = [
      makeLog({ activityId: 'act-a', date: '2023-12-25', moodBefore: 2, moodAfter: 4 }),
      makeLog({ activityId: 'act-a', date: '2023-12-26', moodBefore: 1, moodAfter: 3 }),
      makeLog({ activityId: 'act-a', date: '2023-12-27', moodBefore: 3, moodAfter: 5 }),
    ]
    const result = planDay(
      basePlanInput({ energy: 'medium', activities: [actA, actB], items, log })
    )
    expect(result.activities[0].activityId).toBe('act-a')
  })

  it('P8 — rotation: activity offered yesterday is not in the top results when alternatives exist', () => {
    const actY = makeActivity({ id: 'act-y', energyRequired: 'low' })
    const act2 = makeActivity({ id: 'act-2', energyRequired: 'low' })
    const act3 = makeActivity({ id: 'act-3', energyRequired: 'low' })
    const items = [
      makeItem({ activityId: 'act-y' }),
      makeItem({ activityId: 'act-2' }),
      makeItem({ activityId: 'act-3' }),
    ]
    // yesterday = Jan 7; act-y gets the −0.5 recency penalty
    const log = [makeLog({ activityId: 'act-y', date: '2024-01-07', outcome: 'done' })]
    const result = planDay(
      basePlanInput({ energy: 'medium', activities: [actY, act2, act3], items, log })
    )
    expect(result.activities.map((a) => a.activityId)).not.toContain('act-y')
  })

  it('P10 — stable ties: identical inputs produce identical first result across two calls', () => {
    const actA = makeActivity({ id: 'act-a', energyRequired: 'low' })
    const actB = makeActivity({ id: 'act-b', energyRequired: 'low' })
    const items = [makeItem({ activityId: 'act-a' }), makeItem({ activityId: 'act-b' })]
    const input = basePlanInput({ energy: 'medium', activities: [actA, actB], items })
    const r1 = planDay(input)
    const r2 = planDay(input)
    expect(r1.activities[0].activityId).toBe(r2.activities[0].activityId)
  })

  it('P11 — anchor category goes to result.anchors, not result.activities', () => {
    const anchor = makeActivity({ id: 'act-anchor', category: 'anchor' })
    const pleasant = makeActivity({ id: 'act-pleasant', category: 'pleasant' })
    const items = [
      makeItem({ activityId: 'act-anchor' }),
      makeItem({ activityId: 'act-pleasant' }),
    ]
    const result = planDay(basePlanInput({ energy: 'medium', activities: [anchor, pleasant], items }))
    expect(result.anchors.map((a) => a.activityId)).toContain('act-anchor')
    expect(result.activities.map((a) => a.activityId)).not.toContain('act-anchor')
    expect(result.activities.map((a) => a.activityId)).toContain('act-pleasant')
  })

  it('P12 — empty pool returns empty activities and anchors without throwing', () => {
    const result = planDay(basePlanInput({ items: [], activities: [] }))
    expect(result.activities).toEqual([])
    expect(result.anchors).toEqual([])
  })

  describe('weekDates', () => {
    it('given a Monday, returns that date at index 0', () => {
      const dates = weekDates('2024-01-08') // Monday
      expect(dates[0]).toBe('2024-01-08')
    })

    it('given a Sunday, returns that date at index 6', () => {
      const dates = weekDates('2024-01-14') // Sunday
      expect(dates[6]).toBe('2024-01-14')
    })

    it('always returns seven entries', () => {
      expect(weekDates('2024-01-10').length).toBe(7)
    })

    it('given a Wednesday, index 0 is the Monday of that week', () => {
      // Jan 10 is a Wednesday; its ISO week starts Jan 8 (Monday)
      expect(weekDates('2024-01-10')[0]).toBe('2024-01-08')
    })
  })

  describe('weekOffers', () => {
    it('no templateIds → empty byTemplate, empty anchors', () => {
      const result = weekOffers([], [], [])
      expect(result.anchors).toEqual([])
      expect(result.byTemplate).toEqual([])
    })

    it('anchor activity is in anchors, not in byTemplate activities', () => {
      const anchor = makeActivity({ id: 'act-anchor', category: 'anchor' })
      const item = makeItem({ templateId: 'tpl-test', activityId: 'act-anchor' })
      const result = weekOffers(['tpl-test'], [item], [anchor])
      expect(result.anchors.map((a) => a.id)).toContain('act-anchor')
      expect(result.byTemplate[0].activities.map((a) => a.id)).not.toContain('act-anchor')
    })

    it('duplicate activityIds in a template appear once in catalogue order', () => {
      const act = makeActivity({ id: 'act-dup', category: 'pleasant' })
      const items = [
        makeItem({ templateId: 'tpl-test', activityId: 'act-dup' }),
        makeItem({ templateId: 'tpl-test', activityId: 'act-dup' }),
      ]
      const result = weekOffers(['tpl-test'], items, [act])
      expect(result.byTemplate[0].activities.filter((a) => a.id === 'act-dup').length).toBe(1)
    })

    it('activity absent from activities array is silently skipped', () => {
      const item = makeItem({ templateId: 'tpl-test', activityId: 'act-missing' })
      const result = weekOffers(['tpl-test'], [item], [])
      expect(result.byTemplate[0].activities).toEqual([])
      expect(result.anchors).toEqual([])
    })
  })

  it('suggestNextTemplate — returns null below threshold, nextTemplateId above, null when no nextTemplateId', () => {
    const template: Template = { id: 'tpl-test', title: 'Test', summary: '', level: 1, nextTemplateId: 'tpl-next', sourceIds: [] }
    const items: TemplateItem[] = [makeItem({ templateId: 'tpl-test', timesPerWeek: 3 })]
    // threshold = ceil(3/2) = 2 entries per week required for 3 consecutive prior weeks

    // Empty items → null immediately
    expect(suggestNextTemplate(template, [], [], '2024-01-08')).toBeNull()

    // One entry per prior week — below threshold (1 < 2) → null
    const belowLog = [
      { templateId: 'tpl-test', dayOffset: -7 },   // Jan 1 (week 1)
      { templateId: 'tpl-test', dayOffset: -14 },  // Dec 25 (week 2)
      { templateId: 'tpl-test', dayOffset: -21 },  // Dec 18 (week 3)
    ]
    expect(suggestNextTemplate(template, items, belowLog, '2024-01-08')).toBeNull()

    // Two entries per prior week — at threshold (2 >= 2) → 'tpl-next'
    const aboveLog = [
      { templateId: 'tpl-test', dayOffset: -7 },
      { templateId: 'tpl-test', dayOffset: -2 },   // Jan 6 (week 1)
      { templateId: 'tpl-test', dayOffset: -14 },
      { templateId: 'tpl-test', dayOffset: -9 },   // Dec 30 (week 2)
      { templateId: 'tpl-test', dayOffset: -21 },
      { templateId: 'tpl-test', dayOffset: -16 },  // Dec 23 (week 3)
    ]
    expect(suggestNextTemplate(template, items, aboveLog, '2024-01-08')).toBe('tpl-next')

    // nextTemplateId absent → null even above threshold
    const noNext: Template = { id: 'tpl-test', title: 'Test', summary: '', level: 1, sourceIds: [] }
    expect(suggestNextTemplate(noNext, items, aboveLog, '2024-01-08')).toBeNull()
  })
})
