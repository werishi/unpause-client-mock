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
  PLAN,
  YOU,
  LOOK_BACK,
  DIGEST,
  SWAP,
  MEDIA_BUDGET,
  CONNECTION,
  BUDDY,
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
      DIGEST, SWAP, MEDIA_BUDGET,
      CHECK_IN, TASK_SCREEN, TABS, FLOW, TODAY, WELCOME, ONBOARDING,
      ABOUT, DEMO, WELCOME_BACK, PLAN, YOU, LOOK_BACK,
      CONNECTION, BUDDY,
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

describe("PLAN copy — no deficit language", () => {
  const planStrings = Object.values(PLAN).filter(v => typeof v === "string");
  const badSubstrings = ["missed", "skipped", " left"];
  const badPattern = /\d+\s*(of|\/)\s*\d+/;
  it.each(planStrings)("'%s' contains no deficit substring", (s) => {
    for (const bad of badSubstrings) {
      expect(s).not.toContain(bad);
    }
    expect(s).not.toMatch(badPattern);
  });
});

describe("LOOK_BACK / WELCOME_BACK bonus / TODAY review — no deficit language", () => {
  const { bonusLine } = WELCOME_BACK;
  const reviewStrings = [
    TODAY.weekReviewCardHeading,
    TODAY.monthReviewCardHeading,
    TODAY.lookBackCtaLabel,
  ];
  const lookBackStrings = collectStrings(LOOK_BACK);
  const allChecked = [bonusLine, ...reviewStrings, ...lookBackStrings];
  const badSubstrings = ["missed", "skipped", " left", "lost"];
  const badPattern = /\d+\s*(of|\/)\s*\d+/;

  it.each(allChecked)("'%s' contains no deficit substring", (s) => {
    for (const bad of badSubstrings) {
      expect(s).not.toContain(bad);
    }
    expect(s).not.toMatch(badPattern);
  });
});

describe("DIGEST and MEDIA_BUDGET — no deficit language", () => {
  // Concept §2.7: no N-of-M, no "missed", no "skipped", no " left" in digest or
  // media-budget copy. The budget is the user's own intention; framing unread items
  // or over-budget minutes as a deficit contradicts G10 (non-shaming) and the tone
  // established in the rest of the app.
  const digestStrings = collectStrings(DIGEST);
  const mediaBudgetStrings = collectStrings(MEDIA_BUDGET);
  const allChecked = [...digestStrings, ...mediaBudgetStrings];
  const badSubstrings = ["missed", "skipped", " left"];
  const badPattern = /\d+\s*(of|\/)\s*\d+/;

  it.each(allChecked)("'%s' contains no deficit substring", (s) => {
    for (const bad of badSubstrings) {
      expect(s).not.toContain(bad);
    }
    expect(s).not.toMatch(badPattern);
  });
});
