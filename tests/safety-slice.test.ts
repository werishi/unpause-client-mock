/**
 * safety-slice.test.ts — unit tests for lib/store/safety-slice.ts and for how
 * its fields compose into the flat blob in lib/store/store-state.ts.
 *
 * One describe block per reducer. Both reducers always return a new object
 * reference and never mutate their input state. setSafetyEntries stores copies
 * of the outer and inner arrays, so the editor's draft can never alias the
 * persisted plan.
 *
 * Base state is derived from SAFETY_DEFAULTS via makeState() so that any new
 * field added to SafetyState propagates to every test automatically. makeState()
 * re-allocates safetyEntries (outer and inner arrays), because a shallow spread
 * of SAFETY_DEFAULTS would share those arrays with the constant.
 *
 * The store-composition block exists because the safety slice shipped without
 * a STORAGE_KEY change and without a migration: a demo blob saved before the
 * slice existed must gain the safety defaults on load. That relies on hydrate()
 * spreading the parsed blob over buildInitialState(); if hydrate() ever stops
 * doing that, the old-blob case here fails and the slice needs an explicit
 * migration instead.
 */
import { describe, it, expect } from 'vitest'
import {
  SAFETY_DEFAULTS,
  SafetyState,
  setSafetyEntries,
  dismissSafetySetup,
} from '@/lib/store/safety-slice'
import { buildInitialState, hydrate } from '@/lib/store/store-state'

/**
 * Returns a fresh SafetyState seeded from SAFETY_DEFAULTS, with safetyEntries
 * re-declared as six new inner arrays so that mutations in one test cannot
 * bleed into another (SAFETY_DEFAULTS JSDoc).
 */
function makeState(overrides?: Partial<SafetyState>): SafetyState {
  return {
    ...SAFETY_DEFAULTS,
    safetyEntries: [[], [], [], [], [], []],
    ...overrides,
  }
}

const SIX_STEPS: string[][] = [
  ['Racing thoughts'],
  ['Go for a walk', 'Music'],
  ['Cafe on the corner'],
  ['Alex'],
  ['Dr. Lee'],
  ['Lock the cabinet'],
]

// ─── setSafetyEntries ─────────────────────────────────────────────────────────

describe('setSafetyEntries', () => {
  it('replaces all six steps', () => {
    const state = makeState({ safetyEntries: [['old'], [], [], [], [], ['old too']] })
    const result = setSafetyEntries(state, SIX_STEPS)
    expect(result.safetyEntries).toEqual(SIX_STEPS)
  })

  it('returns a new object reference', () => {
    const state = makeState()
    const result = setSafetyEntries(state, SIX_STEPS)
    expect(result).not.toBe(state)
  })

  it('stores copies — mutating the input outer array afterwards does not change state', () => {
    const entries = SIX_STEPS.map((step) => [...step])
    const result = setSafetyEntries(makeState(), entries)
    entries.push(['extra'])
    entries[0] = ['replaced']
    expect(result.safetyEntries).toEqual(SIX_STEPS)
    expect(result.safetyEntries).not.toBe(entries)
  })

  it('stores copies — mutating an input inner array afterwards does not change state', () => {
    const entries = SIX_STEPS.map((step) => [...step])
    const result = setSafetyEntries(makeState(), entries)
    entries[1].push('Call someone')
    entries[3][0] = 'changed'
    expect(result.safetyEntries).toEqual(SIX_STEPS)
    expect(result.safetyEntries[1]).not.toBe(entries[1])
  })

  it('leaves safetySetupDismissedWeek alone', () => {
    const state = makeState({ safetySetupDismissedWeek: '2026-10-19' })
    const result = setSafetyEntries(state, SIX_STEPS)
    expect(result.safetySetupDismissedWeek).toBe('2026-10-19')
  })

  it('does not mutate its input state', () => {
    const state = makeState({ safetyEntries: [['keep'], [], [], [], [], []] })
    const before = state.safetyEntries
    setSafetyEntries(state, SIX_STEPS)
    expect(state.safetyEntries).toBe(before)
    expect(state.safetyEntries).toEqual([['keep'], [], [], [], [], []])
    expect(state.safetySetupDismissedWeek).toBeNull()
  })
})

// ─── dismissSafetySetup ───────────────────────────────────────────────────────

describe('dismissSafetySetup', () => {
  it('sets safetySetupDismissedWeek to the given Monday', () => {
    const result = dismissSafetySetup(makeState(), '2026-10-19')
    expect(result.safetySetupDismissedWeek).toBe('2026-10-19')
  })

  it('overwrites an earlier dismissed week', () => {
    const state = makeState({ safetySetupDismissedWeek: '2026-10-12' })
    const result = dismissSafetySetup(state, '2026-10-19')
    expect(result.safetySetupDismissedWeek).toBe('2026-10-19')
  })

  it('leaves safetyEntries alone', () => {
    const state = makeState({ safetyEntries: SIX_STEPS.map((step) => [...step]) })
    const result = dismissSafetySetup(state, '2026-10-19')
    expect(result.safetyEntries).toEqual(SIX_STEPS)
  })

  it('returns a new object reference', () => {
    const state = makeState()
    const result = dismissSafetySetup(state, '2026-10-19')
    expect(result).not.toBe(state)
  })

  it('does not mutate its input state', () => {
    const state = makeState({ safetySetupDismissedWeek: '2026-10-12' })
    dismissSafetySetup(state, '2026-10-19')
    expect(state.safetySetupDismissedWeek).toBe('2026-10-12')
  })
})

// ─── Store composition ────────────────────────────────────────────────────────

describe('safety fields in store composition', () => {
  it('buildInitialState has six empty safety steps and a null dismissed week', () => {
    const init = buildInitialState()
    expect(init.safetyEntries).toEqual([[], [], [], [], [], []])
    expect(init.safetySetupDismissedWeek).toBeNull()
  })

  it('two buildInitialState calls do not share safetyEntries arrays, outer or inner', () => {
    const a = buildInitialState()
    const b = buildInitialState()
    expect(a.safetyEntries).not.toBe(b.safetyEntries)
    for (let i = 0; i < 6; i++) {
      expect(a.safetyEntries[i]).not.toBe(b.safetyEntries[i])
    }
  })

  it('mutating a buildInitialState inner array does not change SAFETY_DEFAULTS', () => {
    const init = buildInitialState()
    init.safetyEntries[0].push('leak')
    init.safetyEntries.push(['leak'])
    expect(SAFETY_DEFAULTS.safetyEntries).toEqual([[], [], [], [], [], []])
    expect(buildInitialState().safetyEntries).toEqual([[], [], [], [], [], []])
  })

  it('hydrate of an old blob without safety fields gives six empty steps and a null dismissed week', () => {
    // lastOpenedDate is required: hydrate() reads it via daysBetween before the merge, and a blob
    // without it throws into the fresh-state fallback, which would hide whether the spread works.
    const { state } = hydrate(
      JSON.stringify({ personaId: 'x', lastOpenedDate: '2026-10-19' }),
      '2026-10-20',
    )
    expect(state.safetyEntries).toEqual([[], [], [], [], [], []])
    expect(state.safetySetupDismissedWeek).toBeNull()
  })

  it('hydrate of a blob with saved safety entries and a dismissed week returns them unchanged', () => {
    const raw = JSON.stringify({
      personaId: 'x',
      lastOpenedDate: '2026-10-19',
      safetyEntries: SIX_STEPS,
      safetySetupDismissedWeek: '2026-10-19',
    })
    const { state } = hydrate(raw, '2026-10-20')
    expect(state.safetyEntries).toEqual(SIX_STEPS)
    expect(state.safetySetupDismissedWeek).toBe('2026-10-19')
  })
})
