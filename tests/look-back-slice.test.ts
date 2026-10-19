/**
 * look-back-slice.test.ts — unit tests for lib/store/look-back-slice.ts.
 *
 * One describe block per reducer. Every reducer that modifies state returns a
 * new object reference (immutability); the two idempotent no-ops return the
 * input reference unchanged.
 *
 * Base state is derived from LOOK_BACK_DEFAULTS via makeState() so that any new
 * field added to LookBackState propagates to every test automatically, without
 * hand-rolled object literals silently lagging.
 */
import { describe, it, expect } from 'vitest'
import {
  LOOK_BACK_DEFAULTS,
  LookBackState,
  grantComebackBonus,
  setReward,
  removeReward,
  markRewardReached,
  dismissRewardOffer,
  markReviewSeen,
  setReviewPreview,
  setPlainVersion,
} from '@/lib/store/look-back-slice'

/**
 * Returns a fresh LookBackState seeded from LOOK_BACK_DEFAULTS.
 * Re-declares the three shared-reference fields as new literals so that
 * mutations in one test cannot bleed into another (LOOK_BACK_DEFAULTS JSDoc).
 */
function makeState(overrides?: Partial<LookBackState>): LookBackState {
  return {
    ...LOOK_BACK_DEFAULTS,
    comebackGrants: [],
    rewardsReached: [],
    reviewSeen: { week: null, month: null },
    ...overrides,
  }
}

// ─── grantComebackBonus ───────────────────────────────────────────────────────

describe('grantComebackBonus', () => {
  it('adds today to comebackGrants', () => {
    const state = makeState()
    const result = grantComebackBonus(state, '2026-10-19')
    expect(result.comebackGrants).toEqual(['2026-10-19'])
  })

  it('returns a new object reference', () => {
    const state = makeState()
    const result = grantComebackBonus(state, '2026-10-19')
    expect(result).not.toBe(state)
  })

  it('is idempotent for the same date — returns the same reference', () => {
    const state = makeState({ comebackGrants: ['2026-10-19'] })
    const result = grantComebackBonus(state, '2026-10-19')
    expect(result).toBe(state)
    expect(result.comebackGrants).toHaveLength(1)
  })
})

// ─── setReward ────────────────────────────────────────────────────────────────

describe('setReward', () => {
  it('sets text, at, and setOn correctly', () => {
    const state = makeState()
    const result = setReward(state, 'Coffee', 42, '2026-10-19')
    expect(result.reward).toEqual({ text: 'Coffee', at: 42, setOn: '2026-10-19' })
  })

  it('returns a new object reference', () => {
    const state = makeState()
    const result = setReward(state, 'Coffee', 42, '2026-10-19')
    expect(result).not.toBe(state)
  })
})

// ─── removeReward ─────────────────────────────────────────────────────────────

describe('removeReward', () => {
  it('nulls reward', () => {
    const state = makeState({ reward: { text: 'Coffee', at: 10, setOn: '2026-10-19' } })
    const result = removeReward(state)
    expect(result.reward).toBeNull()
  })

  it('does not touch rewardsReached', () => {
    const reached = [{ text: 'Tea', at: 5, reachedOn: '2026-10-01' }]
    const state = makeState({
      reward: { text: 'Coffee', at: 10, setOn: '2026-10-19' },
      rewardsReached: reached,
    })
    const result = removeReward(state)
    expect(result.rewardsReached).toEqual(reached)
  })

  it('returns a new object reference', () => {
    const state = makeState({ reward: { text: 'Coffee', at: 10, setOn: '2026-10-19' } })
    const result = removeReward(state)
    expect(result).not.toBe(state)
  })
})

// ─── markRewardReached ────────────────────────────────────────────────────────

describe('markRewardReached', () => {
  it('moves reward into rewardsReached and nulls reward', () => {
    const state = makeState({ reward: { text: 'Coffee', at: 42, setOn: '2026-10-15' } })
    const result = markRewardReached(state, '2026-10-19')
    expect(result.reward).toBeNull()
    expect(result.rewardsReached).toEqual([{ text: 'Coffee', at: 42, reachedOn: '2026-10-19' }])
  })

  it('returns a new object reference when reward is set', () => {
    const state = makeState({ reward: { text: 'Coffee', at: 42, setOn: '2026-10-15' } })
    const result = markRewardReached(state, '2026-10-19')
    expect(result).not.toBe(state)
  })

  it('is no-op when reward is null — returns the same reference', () => {
    const state = makeState()
    const result = markRewardReached(state, '2026-10-19')
    expect(result).toBe(state)
  })
})

// ─── dismissRewardOffer ───────────────────────────────────────────────────────

describe('dismissRewardOffer', () => {
  it('sets rewardOfferDismissed to true', () => {
    const state = makeState()
    const result = dismissRewardOffer(state)
    expect(result.rewardOfferDismissed).toBe(true)
  })

  it('returns a new object reference', () => {
    const state = makeState()
    const result = dismissRewardOffer(state)
    expect(result).not.toBe(state)
  })
})

// ─── markReviewSeen ───────────────────────────────────────────────────────────

describe('markReviewSeen — week', () => {
  it('sets reviewSeen.week to the given key', () => {
    const state = makeState()
    const result = markReviewSeen(state, 'week', '2026-W42')
    expect(result.reviewSeen.week).toBe('2026-W42')
  })

  it('clears reviewPreview when kind is week', () => {
    const state = makeState({ reviewPreview: true })
    const result = markReviewSeen(state, 'week', '2026-W42')
    expect(result.reviewPreview).toBe(false)
  })

  it('returns a new object reference', () => {
    const state = makeState()
    const result = markReviewSeen(state, 'week', '2026-W42')
    expect(result).not.toBe(state)
  })
})

describe('markReviewSeen — month', () => {
  it('sets reviewSeen.month to the given key', () => {
    const state = makeState()
    const result = markReviewSeen(state, 'month', '2026-10')
    expect(result.reviewSeen.month).toBe('2026-10')
  })

  it('does NOT clear reviewPreview when kind is month', () => {
    const state = makeState({ reviewPreview: true })
    const result = markReviewSeen(state, 'month', '2026-10')
    expect(result.reviewPreview).toBe(true)
  })

  it('returns a new object reference', () => {
    const state = makeState()
    const result = markReviewSeen(state, 'month', '2026-10')
    expect(result).not.toBe(state)
  })
})

// ─── setReviewPreview ─────────────────────────────────────────────────────────

describe('setReviewPreview', () => {
  it('sets reviewPreview to true', () => {
    const state = makeState()
    const result = setReviewPreview(state, true)
    expect(result.reviewPreview).toBe(true)
  })

  it('sets reviewPreview to false', () => {
    const state = makeState({ reviewPreview: true })
    const result = setReviewPreview(state, false)
    expect(result.reviewPreview).toBe(false)
  })

  it('returns a new object reference', () => {
    const state = makeState()
    const result = setReviewPreview(state, true)
    expect(result).not.toBe(state)
  })
})

// ─── setPlainVersion ──────────────────────────────────────────────────────────

describe('setPlainVersion', () => {
  it('sets plainVersion to true', () => {
    const state = makeState()
    const result = setPlainVersion(state, true)
    expect(result.plainVersion).toBe(true)
  })

  it('sets plainVersion to false', () => {
    const state = makeState({ plainVersion: true })
    const result = setPlainVersion(state, false)
    expect(result.plainVersion).toBe(false)
  })

  it('returns a new object reference', () => {
    const state = makeState()
    const result = setPlainVersion(state, true)
    expect(result).not.toBe(state)
  })
})
