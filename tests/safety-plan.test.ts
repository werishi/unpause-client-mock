/**
 * safety-plan.test.ts — unit tests for lib/domain/safety-plan.ts.
 *
 * One describe block per exported function. The user's entries are addressed by
 * step index, so most cases here guard shape: normaliseSafetyEntries must always
 * yield SAFETY_STEP_COUNT arrays, and mergeSafetyPlan must line entries up with
 * seed steps by position.
 *
 * mergeSafetyPlan runs against a small local seed fixture rather than the real
 * data/safety-plan.json, so a copy edit in the seed cannot break these tests.
 * One case does read the real seed through getSafetyPlan, only to pin its step
 * count to SAFETY_STEP_COUNT.
 *
 * isSafetySetupDay starts from base(), where every condition holds, and each
 * case flips exactly one field, so a failing case names the condition it broke.
 */
import { describe, it, expect } from 'vitest'
import {
  SAFETY_STEP_COUNT,
  SafetySetupInput,
  normaliseSafetyEntries,
  hasSafetyContent,
  mergeSafetyPlan,
  isSafetySetupDay,
} from '@/lib/domain/safety-plan'
import { SafetyPlan, getSafetyPlan } from '@/lib/repo/safety-plan-repo'

function emptyEntries(): string[][] {
  return Array.from({ length: SAFETY_STEP_COUNT }, () => [])
}

function entriesWith(step: number, values: string[]): string[][] {
  const entries = emptyEntries()
  entries[step] = values
  return entries
}

function makeSeed(): SafetyPlan {
  return Array.from({ length: SAFETY_STEP_COUNT }, (_, i) => ({
    title: `Title ${i}`,
    prompt: `Prompt ${i}`,
    entries: [`Seed ${i}a`, `Seed ${i}b`],
  }))
}

describe('normaliseSafetyEntries', () => {
  it('returns six empty steps for undefined', () => {
    expect(normaliseSafetyEntries(undefined)).toEqual(emptyEntries())
  })

  it('returns six empty steps for null', () => {
    expect(normaliseSafetyEntries(null)).toEqual(emptyEntries())
  })

  it('returns six empty steps for a string', () => {
    expect(normaliseSafetyEntries('junk')).toEqual(emptyEntries())
  })

  it('returns six empty steps for an object', () => {
    expect(normaliseSafetyEntries({ 0: ['a'] })).toEqual(emptyEntries())
  })

  it('returns six empty steps for an empty array', () => {
    expect(normaliseSafetyEntries([])).toEqual(emptyEntries())
  })

  it('pads a three-step blob to six steps', () => {
    const result = normaliseSafetyEntries([['a'], ['b'], ['c']])
    expect(result).toEqual([['a'], ['b'], ['c'], [], [], []])
  })

  it('discards steps beyond the sixth', () => {
    const blob = [['0'], ['1'], ['2'], ['3'], ['4'], ['5'], ['6'], ['7']]
    expect(normaliseSafetyEntries(blob)).toEqual([['0'], ['1'], ['2'], ['3'], ['4'], ['5']])
  })

  it('replaces a non-array step with an empty step', () => {
    const result = normaliseSafetyEntries(['x', ['b']])
    expect(result).toEqual([[], ['b'], [], [], [], []])
  })

  it('drops non-string elements', () => {
    const result = normaliseSafetyEntries([['a', 1, null, ['nested'], 'b']])
    expect(result[0]).toEqual(['a', 'b'])
  })

  it('returns valid input equal to itself', () => {
    const valid = [['a'], [], ['b', 'c'], [], ['  d  '], ['']]
    expect(normaliseSafetyEntries(valid)).toEqual(valid)
  })

  it('always returns SAFETY_STEP_COUNT steps', () => {
    for (const value of [undefined, null, 'x', {}, [], [['a']], new Array(10).fill(['a'])]) {
      expect(normaliseSafetyEntries(value)).toHaveLength(SAFETY_STEP_COUNT)
    }
  })

  it('is idempotent', () => {
    const once = normaliseSafetyEntries([['a', 2], 'x', ['b']])
    expect(normaliseSafetyEntries(once)).toEqual(once)
  })
})

describe('hasSafetyContent', () => {
  it('is false when every step is empty', () => {
    expect(hasSafetyContent(emptyEntries())).toBe(false)
  })

  it('is false when the only entry is whitespace', () => {
    expect(hasSafetyContent(entriesWith(2, ['   ']))).toBe(false)
  })

  it('is true for one real entry', () => {
    expect(hasSafetyContent(entriesWith(0, ['Call Sam']))).toBe(true)
  })

  it('is true when the only entry is in the last step', () => {
    expect(hasSafetyContent(entriesWith(SAFETY_STEP_COUNT - 1, ['Lock the cabinet']))).toBe(true)
  })
})

describe('mergeSafetyPlan', () => {
  it('returns six seed steps with the seed entries when the user wrote nothing', () => {
    const seed = makeSeed()
    const result = mergeSafetyPlan(seed, emptyEntries())
    expect(result).toHaveLength(SAFETY_STEP_COUNT)
    result.forEach((step, i) => {
      expect(step.source).toBe('seed')
      expect(step.entries).toEqual(seed[i].entries)
    })
  })

  it('copies seed entries so mutating the result leaves the seed unchanged', () => {
    const seed = makeSeed()
    const result = mergeSafetyPlan(seed, emptyEntries())
    result[0].entries.push('mutated')
    result[1].entries[0] = 'changed'
    expect(seed[0].entries).toEqual(['Seed 0a', 'Seed 0b'])
    expect(seed[1].entries).toEqual(['Seed 1a', 'Seed 1b'])
  })

  it('never mixes seed lines with user lines: content in one step empties every other step', () => {
    // All-or-nothing: placeholder crisis lines must never sit beside the
    // user's own lines, or in a crisis nobody can tell which lines are real.
    const result = mergeSafetyPlan(makeSeed(), entriesWith(3, ['Call Sam']))
    expect(result[3]).toMatchObject({ source: 'user', entries: ['Call Sam'] })
    result.forEach((step, i) => {
      if (i === 3) return
      expect(step.source).toBe('empty')
      expect(step.entries).toEqual([])
    })
  })

  it('trims user entries and drops blanks', () => {
    const result = mergeSafetyPlan(makeSeed(), entriesWith(1, ['  Walk  ', '', '   ', 'Music']))
    expect(result[1].entries).toEqual(['Walk', 'Music'])
    expect(result[1].source).toBe('user')
  })

  it('marks a step holding only blanks as empty when the plan has content', () => {
    const entries = entriesWith(0, ['Call Sam'])
    entries[2] = ['   ', '']
    const result = mergeSafetyPlan(makeSeed(), entries)
    expect(result[2]).toMatchObject({ source: 'empty', entries: [] })
  })

  it('always takes titles and prompts from the seed', () => {
    const seed = makeSeed()
    for (const entries of [emptyEntries(), entriesWith(4, ['Mine'])]) {
      mergeSafetyPlan(seed, entries).forEach((step, i) => {
        expect(step.title).toBe(seed[i].title)
        expect(step.prompt).toBe(seed[i].prompt)
      })
    }
  })

  it('returns six seed steps for corrupted entries without throwing', () => {
    for (const junk of ['junk', null]) {
      const result = mergeSafetyPlan(makeSeed(), junk as unknown as string[][])
      expect(result).toHaveLength(SAFETY_STEP_COUNT)
      result.forEach((step) => expect(step.source).toBe('seed'))
    }
  })

  it('keeps the real seed at SAFETY_STEP_COUNT steps', () => {
    // User entries are stored by step index, so a seed with a different step
    // count would move every user's entries onto the wrong step.
    expect(getSafetyPlan().length).toBe(SAFETY_STEP_COUNT)
  })
})

describe('isSafetySetupDay', () => {
  function base(overrides?: Partial<SafetySetupInput>): SafetySetupInput {
    return {
      todayEnergy: 'medium',
      startedAt: '2026-10-01',
      today: '2026-10-20',
      entries: emptyEntries(),
      dismissedWeek: null,
      mondayDate: '2026-10-19',
      otherOfferShowing: false,
      dayEnded: false,
      ...overrides,
    }
  }

  it('is true when every condition holds', () => {
    expect(isSafetySetupDay(base())).toBe(true)
  })

  it('is false before the morning check-in', () => {
    expect(isSafetySetupDay(base({ todayEnergy: null }))).toBe(false)
  })

  it('is false on a low energy day', () => {
    expect(isSafetySetupDay(base({ todayEnergy: 'low' }))).toBe(false)
  })

  it('is true on a high energy day', () => {
    expect(isSafetySetupDay(base({ todayEnergy: 'high' }))).toBe(true)
  })

  it('is false when startedAt is unknown', () => {
    expect(isSafetySetupDay(base({ startedAt: null }))).toBe(false)
  })

  it('is false six days after the start', () => {
    expect(isSafetySetupDay(base({ startedAt: '2026-10-14' }))).toBe(false)
  })

  it('is true exactly seven days after the start', () => {
    expect(isSafetySetupDay(base({ startedAt: '2026-10-13' }))).toBe(true)
  })

  it('is false when startedAt is today', () => {
    expect(isSafetySetupDay(base({ startedAt: '2026-10-20' }))).toBe(false)
  })

  it('is false when startedAt lies after today', () => {
    expect(isSafetySetupDay(base({ startedAt: '2026-11-05' }))).toBe(false)
  })

  it('is false once the user has written a plan', () => {
    expect(isSafetySetupDay(base({ entries: entriesWith(0, ['Call Sam']) }))).toBe(false)
  })

  it('is false when the card was dismissed this week', () => {
    expect(isSafetySetupDay(base({ dismissedWeek: '2026-10-19' }))).toBe(false)
  })

  it('is true when the card was dismissed in an earlier week', () => {
    expect(isSafetySetupDay(base({ dismissedWeek: '2026-10-12' }))).toBe(true)
  })

  it('is false while another offer card is showing', () => {
    expect(isSafetySetupDay(base({ otherOfferShowing: true }))).toBe(false)
  })

  it('is false after the end-of-day sentence', () => {
    expect(isSafetySetupDay(base({ dayEnded: true }))).toBe(false)
  })

  it('does not throw on corrupted entries', () => {
    const input = base({ entries: 'junk' as unknown as string[][] })
    expect(() => isSafetySetupDay(input)).not.toThrow()
    expect(isSafetySetupDay(input)).toBe(true)
  })
})
