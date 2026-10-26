import { describe, it, expect } from 'vitest'
import { getCharacterCards, getPersonas, getPersonaSeed } from '@/lib/repo/persona-repo'
import { isWelcomeBackDue, latestDate } from '@/lib/domain/day'
import { WELCOME_BACK_GAP_DAYS } from '@/lib/store/core-slice'

const TODAY = '2026-10-25'

function welcomeBackDueFor(personaId: string): boolean {
  const { checkIns, log } = getPersonaSeed(personaId, TODAY)
  const last = latestDate([...checkIns.map((c) => c.date), ...log.map((e) => e.date)])
  return isWelcomeBackDue(last, TODAY, WELCOME_BACK_GAP_DAYS)
}

// ─── getCharacterCards ───────────────────────────────────────────────────────

describe('getCharacterCards', () => {
  it('returns the six character personas in seed order', () => {
    expect(getCharacterCards().map((c) => c.id)).toEqual([
      'per-sam',
      'per-jonas',
      'per-lea',
      'per-ayla',
      'per-mira',
      'per-noor',
    ])
  })

  it('never includes the fresh-start persona', () => {
    expect(getCharacterCards().some((c) => c.id === 'per-new')).toBe(false)
  })

  it.each(getCharacterCards())(
    '$id has a non-empty stage and tryThis',
    (card) => {
      expect(card.profile.stage.trim()).not.toBe('')
      expect(card.profile.tryThis.trim()).not.toBe('')
    },
  )
})

// ─── getPersonas ─────────────────────────────────────────────────────────────

describe('getPersonas', () => {
  it('still returns all seven personas including the fresh start', () => {
    expect(getPersonas()).toHaveLength(7)
  })

  it.each(getPersonas())(
    '$id has a non-empty blurb and a valueIds array',
    (persona) => {
      expect(persona.blurb.trim()).not.toBe('')
      expect(Array.isArray(persona.valueIds)).toBe(true)
    },
  )
})

// ─── Seed premises behind the tryThis lines ──────────────────────────────────

describe('seed premises behind the tryThis lines', () => {
  it('per-lea has a welcome back due on the seed alone', () => {
    expect(
      welcomeBackDueFor('per-lea'),
      "Lea's tryThis promises the welcome-back screen, so her latest seeded check-in or log date must be at least WELCOME_BACK_GAP_DAYS before today",
    ).toBe(true)
  })

  it.each(['per-sam', 'per-jonas', 'per-ayla', 'per-mira', 'per-noor'])(
    '%s has no welcome back due on the seed alone',
    (personaId) => {
      expect(
        welcomeBackDueFor(personaId),
        `${personaId}'s tryThis sends the viewer to Today or a tab screen, so the seed must not trigger welcome-back`,
      ).toBe(false)
    },
  )
})
