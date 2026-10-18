/**
 * copy.test.ts — tone-enforcement tests for lib/copy.ts.
 *
 * Verifies that no user-facing string in the copy file contains a banned word
 * (defined in ./banned-words). Catches shaming, diagnostic, or habit-claim
 * wording before it ships. Pure unit test — no React, no Next, no network.
 *
 * Environment: Vitest node (no DOM, no browser globals needed).
 */
import { describe, it, expect } from 'vitest'
import { BANNED_WORDS } from './banned-words'
import {
  SHELL,
  SAFETY_PLAN_LINK,
  MOOD_RATING,
  SAFETY_PAGE,
  DONE_SCREEN,
  START_SCREEN,
  MOOD_BEFORE_PAGE,
  MOOD_AFTER_PAGE,
  NOT_FOUND_PAGE,
  CHECK_IN,
  TASK_SCREEN,
  TABS,
  FLOW,
  TODAY,
  WELCOME,
  ONBOARDING,
  ABOUT,
  DEMO,
  WELCOME_BACK,
} from '../lib/copy'

/**
 * Recursively walks an object or array and collects every string leaf value.
 * Primitive non-string leaves are skipped. Does not export — internal helper only.
 */
function collectStrings(obj: unknown): string[] {
  if (typeof obj === 'string') return [obj]
  if (Array.isArray(obj)) return obj.flatMap(collectStrings)
  if (obj !== null && typeof obj === 'object') {
    return Object.values(obj as Record<string, unknown>).flatMap(collectStrings)
  }
  return []
}

describe('copy tone', () => {
  it('no copy key contains a banned word', () => {
    const allExports: unknown[] = [
      SHELL, SAFETY_PLAN_LINK, MOOD_RATING, SAFETY_PAGE, DONE_SCREEN,
      START_SCREEN, MOOD_BEFORE_PAGE, MOOD_AFTER_PAGE, NOT_FOUND_PAGE,
      CHECK_IN, TASK_SCREEN, TABS, FLOW, TODAY, WELCOME, ONBOARDING,
      ABOUT, DEMO, WELCOME_BACK,
    ]
    const strings = allExports.flatMap(collectStrings)

    for (const s of strings) {
      for (const word of BANNED_WORDS) {
        expect(
          s.toLowerCase().includes(word),
          `copy key contains banned word '${word}': '${s}'`,
        ).toBe(false)
      }
    }
  })
})
