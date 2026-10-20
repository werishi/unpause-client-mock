/**
 * safety-editor.test.ts — unit tests for lib/domain/safety-editor.ts.
 *
 * One describe block per exported function. draftFromEntries is the load
 * direction (caps, one empty row per empty step, never trims);
 * entriesFromDraft is the save direction (trims, drops blanks before the count
 * cap). Both must always yield SAFETY_STEP_COUNT arrays whatever they are fed,
 * because the stored blob is only JSON-validated on hydrate.
 */
import { describe, it, expect } from 'vitest'
import {
  SAFETY_MAX_ENTRIES_PER_STEP,
  SAFETY_MAX_ENTRY_LENGTH,
  draftFromEntries,
  entriesFromDraft,
} from '@/lib/domain/safety-editor'
import { SAFETY_STEP_COUNT, hasSafetyContent } from '@/lib/domain/safety-plan'

function emptyEntries(): string[][] {
  return Array.from({ length: SAFETY_STEP_COUNT }, () => [])
}

function sixBlankRows(): string[][] {
  return Array.from({ length: SAFETY_STEP_COUNT }, () => [''])
}

describe('draftFromEntries', () => {
  it('gives one empty row per step when every step is empty', () => {
    expect(draftFromEntries(emptyEntries())).toEqual(sixBlankRows())
  })

  it('keeps a step that has entries as is, without padding', () => {
    const entries = emptyEntries()
    entries[0] = ['Walk outside', '  half typed ']
    const draft = draftFromEntries(entries)
    expect(draft[0]).toEqual(['Walk outside', '  half typed '])
    expect(draft[1]).toEqual([''])
  })

  it('cuts a step with seven entries to the maximum', () => {
    const entries = emptyEntries()
    entries[2] = ['1', '2', '3', '4', '5', '6', '7']
    const draft = draftFromEntries(entries)
    expect(draft[2]).toHaveLength(SAFETY_MAX_ENTRIES_PER_STEP)
    expect(draft[2]).toEqual(['1', '2', '3', '4', '5'])
  })

  it('cuts a 130-character entry to the maximum length', () => {
    const entries = emptyEntries()
    entries[1] = ['a'.repeat(130)]
    const draft = draftFromEntries(entries)
    expect(draft[1][0]).toHaveLength(SAFETY_MAX_ENTRY_LENGTH)
  })

  it('yields six arrays for undefined input without throwing', () => {
    expect(draftFromEntries(undefined)).toEqual(sixBlankRows())
  })

  it('yields six arrays for a string input without throwing', () => {
    expect(draftFromEntries('x')).toEqual(sixBlankRows())
  })

  it('yields six arrays for a mixed malformed array without throwing', () => {
    const draft = draftFromEntries([['a'], 5, null])
    expect(draft).toHaveLength(SAFETY_STEP_COUNT)
    expect(draft[0]).toEqual(['a'])
    for (let i = 1; i < SAFETY_STEP_COUNT; i++) {
      expect(draft[i]).toEqual([''])
    }
  })

  it('does not alias the input', () => {
    const entries = emptyEntries()
    entries[0] = ['keep me']
    const draft = draftFromEntries(entries)
    draft[0][0] = 'changed'
    draft[0].push('extra')
    expect(entries[0]).toEqual(['keep me'])
  })
})

describe('entriesFromDraft', () => {
  it('trims surrounding whitespace', () => {
    const draft = sixBlankRows()
    draft[0] = ['  a  ']
    expect(entriesFromDraft(draft)[0]).toEqual(['a'])
  })

  it('drops a whitespace-only row', () => {
    const draft = sixBlankRows()
    draft[0] = ['   ']
    expect(entriesFromDraft(draft)[0]).toEqual([])
  })

  it('keeps only the real rows, in order, when blanks sit between them', () => {
    const draft = sixBlankRows()
    draft[3] = ['first', '', 'second', '  ', 'third']
    expect(entriesFromDraft(draft)[3]).toEqual(['first', 'second', 'third'])
  })

  it('removes blanks before the count cap', () => {
    const draft = sixBlankRows()
    draft[4] = ['', '1', '2', '3', '4', '5']
    expect(entriesFromDraft(draft)[4]).toEqual(['1', '2', '3', '4', '5'])
  })

  it('cuts a 130-character entry to the maximum length with no trailing space', () => {
    const draft = sixBlankRows()
    draft[0] = ['a'.repeat(SAFETY_MAX_ENTRY_LENGTH - 1) + ' ' + 'b'.repeat(10)]
    const saved = entriesFromDraft(draft)[0][0]
    expect(saved.length).toBeLessThanOrEqual(SAFETY_MAX_ENTRY_LENGTH)
    expect(saved).toBe('a'.repeat(SAFETY_MAX_ENTRY_LENGTH - 1))
    expect(saved.endsWith(' ')).toBe(false)

    draft[1] = ['c'.repeat(130)]
    expect(entriesFromDraft(draft)[1][0]).toHaveLength(SAFETY_MAX_ENTRY_LENGTH)
  })

  it('yields six arrays from a draft of only three', () => {
    const saved = entriesFromDraft([['a'], ['b'], ['c']])
    expect(saved).toHaveLength(SAFETY_STEP_COUNT)
    expect(saved.slice(0, 3)).toEqual([['a'], ['b'], ['c']])
    expect(saved.slice(3)).toEqual([[], [], []])
  })

  it('yields six empty arrays from an all-blank draft, which reads as no plan', () => {
    const draft = sixBlankRows()
    draft[2] = ['  ', '']
    const saved = entriesFromDraft(draft)
    expect(saved).toEqual(emptyEntries())
    expect(hasSafetyContent(saved)).toBe(false)
  })

  it('returns fresh arrays, never the input ones', () => {
    const draft = sixBlankRows()
    draft[0] = ['a']
    const saved = entriesFromDraft(draft)
    expect(saved[0]).not.toBe(draft[0])
    saved[0].push('x')
    expect(draft[0]).toEqual(['a'])
  })
})
