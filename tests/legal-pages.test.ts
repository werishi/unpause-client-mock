/**
 * legal-pages.test.ts — source-scan guard for /privacy, /imprint and the BackLink island.
 *
 * There is no jsdom or component test in this target, so a back link reverting to a fixed
 * href="/login", the safety entry dropping below the heading, or a page turning into a client
 * component would all pass the build. This file reads the sources as text, the same approach as
 * tests/investor-page.test.ts. Dark-mode pairing is enforced by tests/dark-mode.test.ts and is
 * not repeated here.
 *
 * Environment: Vitest node (no DOM, no browser globals needed).
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// process.cwd() is the repo root under `npm run test` (vitest.config.ts sets no root).
const ROOT = process.cwd()

const read = (...segments: string[]) => fs.readFileSync(path.join(ROOT, ...segments), 'utf8')

const LEGAL_PAGES = [
  ['app/privacy/page.tsx', read('app', 'privacy', 'page.tsx')],
  ['app/imprint/page.tsx', read('app', 'imprint', 'page.tsx')],
] as const

const backLinkSrc = read('components', 'BackLink.tsx')

/** The first line that is neither blank nor part of a comment. */
function firstStatement(src: string): string | undefined {
  return src
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line !== '' && !/^(\/\/|\/\*|\*)/.test(line))
}

describe.each(LEGAL_PAGES)('%s source scan', (_file, src) => {
  it('imports SafetyPlanLink and BackLink', () => {
    expect(src).toMatch(/import\s+SafetyPlanLink\b/)
    expect(src).toMatch(/import\s+BackLink\b/)
  })

  it('renders the safety link before the heading', () => {
    const safety = src.indexOf('<SafetyPlanLink')
    expect(safety).toBeGreaterThanOrEqual(0)
    expect(safety).toBeLessThan(src.indexOf('<h1'))
  })

  it('renders the back link before the safety link', () => {
    const back = src.indexOf('<BackLink')
    expect(back).toBeGreaterThanOrEqual(0)
    expect(back).toBeLessThan(src.indexOf('<SafetyPlanLink'))
  })

  it('has no fixed link to the login page and does not import next/link', () => {
    expect(src).not.toContain('href="/login"')
    expect(src).not.toContain('next/link')
  })

  it('stays a server component', () => {
    expect(src).not.toContain('"use client"')
    expect(src).not.toContain("'use client'")
  })
})

describe('components/BackLink.tsx source scan', () => {
  it('has the use client directive as its first statement', () => {
    expect(firstStatement(backLinkSrc)).toMatch(/^["']use client["'];?$/)
  })

  it('goes back through the router', () => {
    expect(backLinkSrc).toContain('router.back()')
  })

  it('decides through shouldGoBack', () => {
    expect(backLinkSrc).toContain('shouldGoBack(')
  })
})
