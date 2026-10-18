import { describe, it, expect } from 'vitest'
import { hydrate, buildInitialState } from '@/lib/store/store-state'
import { coreReducers, CORE_DEFAULTS, corePersonaState } from '@/lib/store/core-slice'
import { planReducers, PLAN_DEFAULTS } from '@/lib/store/plan-slice'

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
