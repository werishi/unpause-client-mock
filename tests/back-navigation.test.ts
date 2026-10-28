/**
 * back-navigation.test.ts — the rule BackLink uses to choose between history back and its href.
 *
 * A legal page opened in a fresh tab has history length 1 and must fall back to /login; any
 * longer history goes back. Environment: Vitest node (the function is pure, no DOM needed).
 */
import { describe, it, expect } from 'vitest'
import { BACK_FALLBACK_HREF, shouldGoBack } from '@/lib/domain/back-navigation'

describe('shouldGoBack', () => {
  it('does not go back with an empty history', () => {
    expect(shouldGoBack(0)).toBe(false)
  })

  it('does not go back from a fresh tab with a single history entry', () => {
    expect(shouldGoBack(1)).toBe(false)
  })

  it('goes back when there is one earlier entry', () => {
    expect(shouldGoBack(2)).toBe(true)
  })

  it('goes back with a long history', () => {
    expect(shouldGoBack(50)).toBe(true)
  })
})

describe('BACK_FALLBACK_HREF', () => {
  it('falls back to the login page', () => {
    expect(BACK_FALLBACK_HREF).toBe('/login')
  })
})
