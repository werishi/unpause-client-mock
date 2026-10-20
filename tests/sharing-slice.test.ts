/**
 * sharing-slice.test.ts — unit tests for lib/store/sharing-slice.ts and for how
 * its three fields compose into the flat blob in lib/store/store-state.ts.
 *
 * One describe block per export. The slice's failure direction is "share less":
 * every switch read goes through resolveSharing (strict === true), and no switch
 * or homework item may stand without a linked therapist. Several cases below pin
 * that invariant from different entry points (setShareSwitch, unlinkTherapist,
 * sharingFromPersona).
 *
 * Base state is derived from SHARING_DEFAULTS via makeState() so that a new
 * SharingState field propagates to every test. makeState() re-allocates sharing
 * and homework, because a shallow spread of SHARING_DEFAULTS would share those
 * references with the constant.
 *
 * The store-composition block exists because the slice shipped without a
 * STORAGE_KEY change and without a migration: a blob saved before the slice
 * existed must gain the defaults through hydrate()'s top-level spread over
 * buildInitialState(), and a stored partial `sharing` is kept as stored and
 * resolved on read rather than migrated.
 */
import { describe, it, expect } from 'vitest'
import {
  SHARING_DEFAULTS,
  SharingState,
  HomeworkItem,
  resolveSharing,
  linkTherapist,
  setShareSwitch,
  unlinkTherapist,
  removeHomework,
  pruneHomeworkItems,
  pruneHomework,
  sharingFromPersona,
} from '@/lib/store/sharing-slice'
import type { ShareType } from '@/lib/store/sharing-slice'
import { buildInitialState, hydrate } from '@/lib/store/store-state'

/** Fresh SharingState from SHARING_DEFAULTS with sharing and homework re-allocated. */
function makeState(overrides?: Partial<SharingState>): SharingState {
  return {
    ...SHARING_DEFAULTS,
    sharing: { ...SHARING_DEFAULTS.sharing },
    homework: [],
    ...overrides,
  }
}

const ALL_OFF: Record<ShareType, boolean> = {
  moodRatings: false,
  activityLog: false,
  weekSummary: false,
  safetyPlan: false,
}

const LINKED = { name: 'Dr. Hartmann', linkedOn: '2026-10-06' }

const HW_A: HomeworkItem = { homeworkId: 'hw-noor-01', activityId: 'a', date: '2026-10-19' }
const HW_B: HomeworkItem = { homeworkId: 'hw-noor-02', activityId: 'b', date: '2026-10-20' }
const HW_C: HomeworkItem = { homeworkId: 'hw-noor-03', activityId: 'c', date: '2026-10-22' }

// ─── resolveSharing ───────────────────────────────────────────────────────────

describe('resolveSharing', () => {
  it('gives four false for undefined, null and {}', () => {
    expect(resolveSharing(undefined)).toEqual(ALL_OFF)
    expect(resolveSharing(null)).toEqual(ALL_OFF)
    expect(resolveSharing({})).toEqual(ALL_OFF)
  })

  it('fills the missing keys of a partial record with false', () => {
    expect(resolveSharing({ moodRatings: true })).toEqual({ ...ALL_OFF, moodRatings: true })
  })

  it('drops unknown keys', () => {
    const stored = { weekSummary: true, legacyKey: true } as unknown as Partial<Record<ShareType, boolean>>
    const result = resolveSharing(stored)
    expect(result).toEqual({ ...ALL_OFF, weekSummary: true })
    expect(Object.keys(result)).not.toContain('legacyKey')
  })

  it('reads a non-boolean truthy value as false', () => {
    const corrupt = { moodRatings: 'yes', safetyPlan: 1 } as unknown as Partial<Record<ShareType, boolean>>
    expect(resolveSharing(corrupt)).toEqual(ALL_OFF)
  })

  it('returns a new object on each call', () => {
    const stored = { ...ALL_OFF, activityLog: true }
    const a = resolveSharing(stored)
    const b = resolveSharing(stored)
    expect(a).not.toBe(stored)
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })
})

// ─── linkTherapist ────────────────────────────────────────────────────────────

describe('linkTherapist', () => {
  it('sets the trimmed name and linkedOn', () => {
    const result = linkTherapist(makeState(), '  Dr. Hartmann  ', '2026-10-20')
    expect(result.therapist).toEqual({ name: 'Dr. Hartmann', linkedOn: '2026-10-20' })
  })

  it('returns the identical state for an empty name', () => {
    const state = makeState()
    expect(linkTherapist(state, '', '2026-10-20')).toBe(state)
  })

  it('returns the identical state for a whitespace-only name', () => {
    const state = makeState()
    expect(linkTherapist(state, '   \t ', '2026-10-20')).toBe(state)
  })

  it('resolves initialSharing to a full record', () => {
    const result = linkTherapist(makeState(), 'Dr. Hartmann', '2026-10-20', { weekSummary: true })
    expect(result.sharing).toEqual({ ...ALL_OFF, weekSummary: true })
    expect(Object.keys(result.sharing).sort()).toEqual(Object.keys(ALL_OFF).sort())
  })

  it('turns all four off without initialSharing', () => {
    const state = makeState({ sharing: { moodRatings: true } })
    const result = linkTherapist(state, 'Dr. Hartmann', '2026-10-20')
    expect(result.sharing).toEqual(ALL_OFF)
  })

  it('does not touch homework', () => {
    const homework = [HW_A, HW_B]
    const state = makeState({ homework })
    const result = linkTherapist(state, 'Dr. Hartmann', '2026-10-20')
    expect(result.homework).toBe(homework)
    expect(result.homework).toEqual([HW_A, HW_B])
  })
})

// ─── setShareSwitch ───────────────────────────────────────────────────────────

describe('setShareSwitch', () => {
  it('turns one type on and leaves the others', () => {
    const state = makeState({ therapist: LINKED, sharing: { ...ALL_OFF, weekSummary: true } })
    const result = setShareSwitch(state, 'moodRatings', true)
    expect(result.sharing).toEqual({ ...ALL_OFF, weekSummary: true, moodRatings: true })
  })

  it('turns it off again', () => {
    const state = makeState({ therapist: LINKED })
    const on = setShareSwitch(state, 'activityLog', true)
    const off = setShareSwitch(on, 'activityLog', false)
    expect(off.sharing).toEqual(ALL_OFF)
  })

  it('returns the identical state when no therapist is linked', () => {
    const state = makeState()
    expect(setShareSwitch(state, 'moodRatings', true)).toBe(state)
  })

  it('returns the identical state when the value would not change', () => {
    const state = makeState({ therapist: LINKED, sharing: { ...ALL_OFF, safetyPlan: true } })
    expect(setShareSwitch(state, 'safetyPlan', true)).toBe(state)
    expect(setShareSwitch(state, 'moodRatings', false)).toBe(state)
  })

  it('always stores all four keys, even from a stored partial', () => {
    const state = makeState({ therapist: LINKED, sharing: { moodRatings: true } })
    const result = setShareSwitch(state, 'weekSummary', true)
    expect(Object.keys(result.sharing).sort()).toEqual(Object.keys(ALL_OFF).sort())
    expect(result.sharing).toEqual({ ...ALL_OFF, moodRatings: true, weekSummary: true })
  })
})

// ─── unlinkTherapist ──────────────────────────────────────────────────────────

describe('unlinkTherapist', () => {
  it('clears the therapist, turns every switch off and empties homework', () => {
    const state = makeState({
      therapist: LINKED,
      sharing: { ...ALL_OFF, moodRatings: true, weekSummary: true },
      homework: [HW_A, HW_B],
    })
    const result = unlinkTherapist(state)
    expect(result.therapist).toBeNull()
    expect(result.sharing).toEqual(ALL_OFF)
    expect(result.homework).toEqual([])
  })
})

// ─── removeHomework ───────────────────────────────────────────────────────────

describe('removeHomework', () => {
  it('removes the item with the given id', () => {
    const state = makeState({ therapist: LINKED, homework: [HW_A, HW_B, HW_C] })
    const result = removeHomework(state, 'hw-noor-02')
    expect(result.homework).toEqual([HW_A, HW_C])
  })

  it('returns the identical state for an unknown id', () => {
    const state = makeState({ therapist: LINKED, homework: [HW_A, HW_B] })
    expect(removeHomework(state, 'hw-noor-99')).toBe(state)
  })
})

// ─── pruneHomeworkItems / pruneHomework ───────────────────────────────────────

describe('pruneHomeworkItems', () => {
  it('keeps items dated today or later and drops yesterday', () => {
    const result = pruneHomeworkItems([HW_A, HW_B, HW_C], '2026-10-20')
    expect(result).toEqual([HW_B, HW_C])
  })

  it('returns a new array even when nothing is pruned', () => {
    const items = [HW_B, HW_C]
    const result = pruneHomeworkItems(items, '2026-10-20')
    expect(result).toEqual(items)
    expect(result).not.toBe(items)
  })
})

describe('pruneHomework', () => {
  it('keeps an item dated today and drops one dated yesterday', () => {
    const state = makeState({ therapist: LINKED, homework: [HW_A, HW_B, HW_C] })
    const result = pruneHomework(state, '2026-10-20')
    expect(result.homework).toEqual([HW_B, HW_C])
  })

  it('returns the identical state when nothing is pruned', () => {
    const state = makeState({ therapist: LINKED, homework: [HW_B, HW_C] })
    expect(pruneHomework(state, '2026-10-20')).toBe(state)
  })
})

// ─── sharingFromPersona ───────────────────────────────────────────────────────

describe('sharingFromPersona', () => {
  const TODAY = '2026-10-20'

  it('translates a linked persona row into store fields', () => {
    const result = sharingFromPersona(
      {
        therapist: { name: 'Dr. Hartmann' },
        sharing: { moodRatings: true, weekSummary: true },
        homework: [
          { activityId: 'a', dayOffset: 0 },
          { activityId: 'b', dayOffset: 2 },
        ],
      },
      'per-noor',
      TODAY,
    )
    expect(result.therapist).toEqual({ name: 'Dr. Hartmann', linkedOn: '2026-10-06' })
    expect(result.sharing).toEqual({ ...ALL_OFF, moodRatings: true, weekSummary: true })
    expect(result.sharing.activityLog).toBe(false)
    expect(result.sharing.safetyPlan).toBe(false)
    expect(result.homework).toEqual([
      { homeworkId: 'hw-noor-01', activityId: 'a', date: '2026-10-20' },
      { homeworkId: 'hw-noor-02', activityId: 'b', date: '2026-10-22' },
    ])
  })

  it('returns the defaults for a row with sharing and homework but no therapist', () => {
    const result = sharingFromPersona(
      {
        sharing: { moodRatings: true, safetyPlan: true },
        homework: [{ activityId: 'a', dayOffset: 0 }],
      },
      'per-noor',
      TODAY,
    )
    expect(result).toEqual({ therapist: null, sharing: ALL_OFF, homework: [] })
  })

  it('gives all switches off and no homework for a row with a therapist only', () => {
    const result = sharingFromPersona({ therapist: { name: 'Dr. Hartmann' } }, 'per-noor', TODAY)
    expect(result.therapist).toEqual({ name: 'Dr. Hartmann', linkedOn: '2026-10-06' })
    expect(result.sharing).toEqual(ALL_OFF)
    expect(result.homework).toEqual([])
  })
})

// ─── Store composition ────────────────────────────────────────────────────────

describe('sharing fields in store composition', () => {
  it('buildInitialState has no therapist, four switches off and no homework', () => {
    const init = buildInitialState()
    expect(init.therapist).toBeNull()
    expect(init.sharing).toEqual(ALL_OFF)
    expect(init.homework).toEqual([])
  })

  it('two buildInitialState calls do not share sharing or homework objects', () => {
    const a = buildInitialState()
    const b = buildInitialState()
    expect(a.sharing).not.toBe(b.sharing)
    expect(a.homework).not.toBe(b.homework)
  })

  it('pushing to a buildInitialState homework array leaves SHARING_DEFAULTS empty', () => {
    const init = buildInitialState()
    init.homework.push(HW_A)
    expect(SHARING_DEFAULTS.homework).toEqual([])
    expect(buildInitialState().homework).toEqual([])
  })

  it('hydrate of an old blob without sharing fields gives the defaults', () => {
    // lastOpenedDate is required: hydrate() reads it via daysBetween before the merge, and a blob
    // without it throws into the fresh-state fallback, which would hide whether the spread works.
    const { state } = hydrate(
      JSON.stringify({ personaId: 'x', lastOpenedDate: '2026-10-19', startedAt: '2026-10-01' }),
      '2026-10-20',
    )
    expect(state.therapist).toBeNull()
    expect(state.sharing).toEqual(ALL_OFF)
    expect(state.homework).toEqual([])
  })

  it('hydrate keeps a stored partial sharing as stored and resolveSharing fills the rest', () => {
    const raw = JSON.stringify({
      personaId: 'x',
      lastOpenedDate: '2026-10-19',
      therapist: LINKED,
      sharing: { moodRatings: true },
    })
    const { state } = hydrate(raw, '2026-10-20')
    expect(state.sharing).toEqual({ moodRatings: true })
    expect(resolveSharing(state.sharing)).toEqual({ ...ALL_OFF, moodRatings: true })
  })
})
