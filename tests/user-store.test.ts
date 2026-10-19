import { describe, it, expect } from 'vitest'
import { hydrate, buildInitialState } from '@/lib/store/store-state'
import { coreReducers, CORE_DEFAULTS, corePersonaState } from '@/lib/store/core-slice'
import { planReducers, PLAN_DEFAULTS } from '@/lib/store/plan-slice'
import {
  BUDDY_DEFAULTS,
  setBuddy,
  removeBuddy,
  addSharedActivity,
  removeSharedActivity,
  dismissBuddyOffer,
  type BuddyState,
  type SharedActivityItem,
} from '@/lib/store/buddy-slice'
import { SHARED_ACTIVITY_IDS } from '@/lib/domain/buddy'
import { addDays } from '@/lib/domain/planner'

const today = '2026-10-18'

// ─── hydrate ─────────────────────────────────────────────────────────────────

describe('hydrate', () => {
  it('null raw returns fresh state with lastOpenedDate today and welcomeBackDue false', () => {
    const { state, welcomeBackDue } = hydrate(null, today)
    expect(state).toEqual({ ...buildInitialState(), lastOpenedDate: today })
    expect(welcomeBackDue).toBe(false)
  })

  it('corrupt JSON returns fallback without throwing', () => {
    expect(() => hydrate('{corrupt', today)).not.toThrow()
    const { state, welcomeBackDue } = hydrate('{corrupt', today)
    expect(state.lastOpenedDate).toBe(today)
    expect(welcomeBackDue).toBe(false)
  })

  it('5-day gap gives welcomeBackDue true and overwrites lastOpenedDate to today', () => {
    // 2026-10-13 is 5 days before today; WELCOME_BACK_GAP_DAYS === 4, so 5 >= 4 → true.
    // If this fails with welcomeBackDue:false the order in hydrate was reversed.
    const raw = JSON.stringify({ lastOpenedDate: '2026-10-13' })
    const { state, welcomeBackDue } = hydrate(raw, today)
    expect(welcomeBackDue).toBe(true)
    expect(state.lastOpenedDate).toBe(today)
  })

  it('2-day gap gives welcomeBackDue false', () => {
    // 2026-10-16 is 2 days before today; 2 < 4 → false.
    const raw = JSON.stringify({ lastOpenedDate: '2026-10-16' })
    const { welcomeBackDue } = hydrate(raw, today)
    expect(welcomeBackDue).toBe(false)
  })

  it('blob without plan fields hydrates with activityOverrides {} and moveUpPutOff null', () => {
    // Simulates a blob saved before the plan slice was introduced.
    // buildInitialState() defaults fill the missing fields.
    const raw = JSON.stringify({ personaId: 'per-new', lastOpenedDate: '2026-10-17' })
    const { state } = hydrate(raw, today)
    expect(state.activityOverrides).toEqual({})
    expect(state.moveUpPutOff).toBeNull()
  })
})

// ─── Reducer shape ────────────────────────────────────────────────────────────

describe('reducer shape', () => {
  it('every reducer output keys are a subset of buildInitialState keys', () => {
    // Verifies no reducer adds a nested slice key that would break the flat blob.
    const initKeys = new Set(Object.keys(buildInitialState()))
    const coreResult = coreReducers.markPersonalised(CORE_DEFAULTS, { today })
    const planResult = planReducers.setActivityOverride(PLAN_DEFAULTS, { today }, 'act-x', {})
    for (const key of Object.keys(coreResult)) {
      expect(initKeys.has(key), `unexpected key '${key}' from coreReducers`).toBe(true)
    }
    for (const key of Object.keys(planResult)) {
      expect(initKeys.has(key), `unexpected key '${key}' from planReducers`).toBe(true)
    }
  })
})

// ─── corePersonaState ─────────────────────────────────────────────────────────

describe('corePersonaState', () => {
  it('merged state has every init key, todayPlan null, plan defaults, and personaliseDismissed true for a seeded persona', () => {
    const init = buildInitialState()
    const sortedInitKeys = [...Object.keys(init)].sort()

    // markPersonalised path (per-new user who just personalised): all init keys present.
    const markResult = coreReducers.markPersonalised(CORE_DEFAULTS, { today: 'per-new' })
    const mergedMark = { ...init, ...markResult }
    expect(Object.keys(mergedMark).sort()).toEqual(sortedInitKeys)
    expect(mergedMark.todayPlan).toBeNull()
    expect(mergedMark.activityOverrides).toEqual({})
    expect(mergedMark.moveUpPutOff).toBeNull()

    // Seeded persona (per-sam): personaliseDismissed must be true.
    const coreState = corePersonaState('per-sam', today)
    expect(coreState).not.toBeNull()
    const merged = { ...init, ...coreState! }
    expect(Object.keys(merged).sort()).toEqual(sortedInitKeys)
    expect(merged.todayPlan).toBeNull()
    expect(merged.personaliseDismissed).toBe(true)
    expect(merged.activityOverrides).toEqual({})
    expect(merged.moveUpPutOff).toBeNull()
  })
})

// ─── Digest slice fields ──────────────────────────────────────────────────────

describe('buildInitialState digest fields', () => {
  // These assertions catch a field removed from buildInitialState() (or never added)
  // before it surfaces as a silent reset bug at demo time. The digest fields live in
  // DigestState / DIGEST_DEFAULTS (digest-slice.ts) and are spread into buildInitialState()
  // in store-state.ts. A field not in buildInitialState() is invisible to resetDemoData()
  // (which delegates entirely to buildInitialState()), so a persona switch leaves stale
  // interests or a stale budget behind.
  it('interests is present and is an empty array', () => {
    const init = buildInitialState()
    expect(Object.prototype.hasOwnProperty.call(init, 'interests')).toBe(true)
    expect(init.interests).toEqual([])
  })

  it('digestTimes is present and is an empty array', () => {
    const init = buildInitialState()
    expect(Object.prototype.hasOwnProperty.call(init, 'digestTimes')).toBe(true)
    expect(init.digestTimes).toEqual([])
  })

  it('digestSeenSlot is present and is null', () => {
    const init = buildInitialState()
    expect(Object.prototype.hasOwnProperty.call(init, 'digestSeenSlot')).toBe(true)
    expect(init.digestSeenSlot).toBeNull()
  })

  it('media is present with estimateMinutes null and budgetMinutes null', () => {
    const init = buildInitialState()
    expect(Object.prototype.hasOwnProperty.call(init, 'media')).toBe(true)
    expect(init.media.estimateMinutes).toBeNull()
    expect(init.media.budgetMinutes).toBeNull()
  })

  it('mediaMinutesByDate is present and is an empty object', () => {
    const init = buildInitialState()
    expect(Object.prototype.hasOwnProperty.call(init, 'mediaMinutesByDate')).toBe(true)
    expect(init.mediaMinutesByDate).toEqual({})
  })
})

// ─── buddy-slice reducers ─────────────────────────────────────────────────────

describe('buddy-slice reducers', () => {
  it('setBuddy sets name and agreedAt', () => {
    const result = setBuddy(BUDDY_DEFAULTS, 'Robin', '2026-01-01T00:00:00.000Z')
    expect(result.buddy?.name).toBe('Robin')
    expect(result.buddy?.agreedAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('removeBuddy clears both buddy and sharedActivities', () => {
    const state: BuddyState = {
      ...BUDDY_DEFAULTS,
      buddy: { name: 'Alex', agreedAt: '2026-01-01T00:00:00.000Z' },
      sharedActivities: [{ id: 'sha-alex-01', activityId: 'act-call-one', date: '2026-10-20' }],
    }
    const result = removeBuddy(state)
    expect(result.buddy).toBeNull()
    expect(result.sharedActivities).toHaveLength(0)
  })

  it('addSharedActivity and removeSharedActivity', () => {
    const item1: SharedActivityItem = { id: 'sha-01', activityId: 'act-call-one', date: '2026-10-20' }
    const item2: SharedActivityItem = { id: 'sha-02', activityId: 'act-meet-in-person', date: '2026-10-21' }
    const after2 = addSharedActivity(addSharedActivity(BUDDY_DEFAULTS, item1), item2)
    expect(after2.sharedActivities).toHaveLength(2)
    const removed = removeSharedActivity(after2, 'sha-01')
    expect(removed.sharedActivities).toHaveLength(1)
    expect(removed.sharedActivities[0].id).toBe('sha-02')
  })

  it('dismissBuddyOffer sets flag; not reset by removeBuddy', () => {
    expect(BUDDY_DEFAULTS.buddyOfferDismissed).toBe(false)
    const dismissed = dismissBuddyOffer(BUDDY_DEFAULTS)
    expect(dismissed.buddyOfferDismissed).toBe(true)
    const afterRemove = removeBuddy(dismissed)
    expect(afterRemove.buddyOfferDismissed).toBe(true)
  })
})

// ─── startDay shared and prune ────────────────────────────────────────────────

describe('startDay shared and prune', () => {
  const testToday = '2026-10-19'

  it('startDay prune: past entry removed, today entry kept', () => {
    const yesterday = addDays(testToday, -1)
    const sharedActivities: SharedActivityItem[] = [
      { id: 'sha-past', activityId: 'act-call-one', date: yesterday },
      { id: 'sha-today', activityId: 'act-call-one', date: testToday },
    ]
    const prev = { ...buildInitialState(), templateIds: ['tpl-starter'] }
    const result = coreReducers.startDay(prev, { today: testToday, sharedActivities }, 'low')
    expect(result.sharedActivities).toHaveLength(1)
    expect(result.sharedActivities[0].date).toBe(testToday)
  })

  it('startDay builds shared plan items for today', () => {
    const activityId = SHARED_ACTIVITY_IDS[0] // 'act-message-one'
    const sharedActivities: SharedActivityItem[] = [
      { id: 'sha-buddy-01', activityId, date: testToday },
    ]
    const prev = { ...buildInitialState(), templateIds: ['tpl-starter'] }
    const result = coreReducers.startDay(prev, { today: testToday, sharedActivities }, 'medium')
    const sharedPlan = result.todayPlan?.plan?.shared ?? []
    expect(sharedPlan).toHaveLength(1)
    expect(sharedPlan[0].sharedId).toBe('sha-buddy-01')
  })

  it('startDay with empty sharedActivities: no error, shared is empty', () => {
    const prev = { ...buildInitialState(), templateIds: ['tpl-starter'] }
    const result = coreReducers.startDay(prev, { today: testToday, sharedActivities: [] }, 'low')
    expect((result.todayPlan?.plan?.shared ?? []).length).toBe(0)
  })
})

// ─── hydrate backward compat ──────────────────────────────────────────────────

describe('hydrate backward compat', () => {
  it('todayPlan.plan without shared field does not throw and shared is empty', () => {
    const raw = JSON.stringify({ todayPlan: { date: today, plan: { activities: [] } } })
    let state: ReturnType<typeof hydrate>['state'] | undefined
    expect(() => {
      state = hydrate(raw, today).state
    }).not.toThrow()
    expect((state?.todayPlan?.plan?.shared ?? []).length).toBe(0)
  })
})

// ─── Mutation safety ──────────────────────────────────────────────────────────

describe('mutation safety', () => {
  it('buildInitialState arrays are not shared between calls', () => {
    const result1 = buildInitialState()
    const result2 = buildInitialState()
    ;(result1.log as unknown[]).push('x')
    expect(result2.log).toHaveLength(0)
  })
})

// ─── coreReducers ─────────────────────────────────────────────────────────────

describe('coreReducers', () => {
  it('setReasons deduplicates template ids and caps at 3', () => {
    // rsn-cant-get-going → tpl-small-steps (added)
    // rsn-running-on-empty → tpl-small-steps (duplicate, skipped by Set)
    // rsn-no-shape → tpl-shape-the-day (added, 2nd)
    // rsn-pulled-away → tpl-reconnect (added, 3rd)
    // rsn-games → tpl-games-in-balance (4th distinct, dropped by .slice(0,3))
    const result = coreReducers.setReasons(
      CORE_DEFAULTS,
      { today },
      ['rsn-cant-get-going', 'rsn-running-on-empty', 'rsn-no-shape', 'rsn-pulled-away', 'rsn-games'],
    )
    expect(result.templateIds).toHaveLength(3)
    expect(result.templateIds).toEqual(['tpl-small-steps', 'tpl-shape-the-day', 'tpl-reconnect'])
  })

  it('startDay on a state with templateIds and empty log gives one CheckIn dated today and todayPlan dated today', () => {
    const prev = { ...buildInitialState(), templateIds: ['tpl-starter'] }
    const result = coreReducers.startDay(prev, { today }, 'low')
    expect(result.checkIns).toHaveLength(1)
    expect(result.checkIns[0].date).toBe(today)
    expect(result.todayPlan).not.toBeNull()
    expect(result.todayPlan!.date).toBe(today)
  })
})
