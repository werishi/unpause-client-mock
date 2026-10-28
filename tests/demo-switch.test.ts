/**
 * Pins the demo character switch in the header user menu.
 *
 * `demoSwitchDestination` is checked by value. The component facts that cannot be rendered here
 * (Vitest runs in node without jsdom) are checked by reading source text with comments stripped,
 * the same convention as tests/user-menu.test.ts.
 *
 * The native-`disabled` check uses a lookbehind instead of a plain `not.toContain('disabled={')`,
 * because `aria-disabled={` contains that substring and is exactly what the component is meant to
 * use; a plain substring check would fail on correct code.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SHELL } from '../lib/copy'
import { demoSwitchDestination } from '../lib/domain/demo-switch'

// process.cwd() is the repo root under `npm run test` (vitest.config.ts sets no root).
const ROOT = process.cwd()

function readSource(...segments: string[]): string {
  return fs.readFileSync(path.join(ROOT, ...segments), 'utf8')
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')
}

const SETTLED = { startedAt: '2026-10-01', welcomeBackDue: false }
const WELCOME_BACK_DUE = { startedAt: '2026-10-01', welcomeBackDue: true }
const NEW = { startedAt: null, welcomeBackDue: false }

describe('demoSwitchDestination', () => {
  it('stays on a tab route for a settled character', () => {
    for (const route of ['/today', '/today/', '/plan', '/look-back', '/you', '/you/therapist', '/you/demo/']) {
      expect(demoSwitchDestination(route, SETTLED), route).toBeNull()
    }
  })

  it('routes a settled character away from non-tab routes to /today', () => {
    const routes = [
      '/you/values', '/task', '/mood-before', '/mood-after', '/swap', '/done',
      '/welcome', '/welcome-back', '/therapist/link', '/buddy/choose', '/safety',
    ]
    for (const route of routes) {
      expect(demoSwitchDestination(route, SETTLED), route).toBe('/today')
    }
  })

  it('routes a character with welcome back due to /welcome-back even from a tab route', () => {
    expect(demoSwitchDestination('/today', WELCOME_BACK_DUE)).toBe('/welcome-back')
    expect(demoSwitchDestination('/you/therapist', WELCOME_BACK_DUE)).toBe('/welcome-back')
  })

  it('routes a new character to /welcome even from /today', () => {
    expect(demoSwitchDestination('/today', NEW)).toBe('/welcome')
  })
})

describe('demo switch copy', () => {
  it('has a non-empty heading and hint without digits', () => {
    for (const text of [SHELL.demoSwitchHeading, SHELL.demoSwitchHint]) {
      expect(text.trim().length).toBeGreaterThan(0)
      expect(text).not.toMatch(/\d/)
    }
  })

  it('names the heading as Demo', () => {
    expect(SHELL.demoSwitchHeading).toMatch(/\bDemo\b/)
  })
})

describe('components/DemoSwitch.tsx source', () => {
  const src = stripComments(readSource('components', 'DemoSwitch.tsx'))

  it('starts with the use client directive', () => {
    expect(src.trimStart()).toMatch(/^["']use client["']/)
  })

  it('uses aria-current, aria-disabled and the character cards', () => {
    for (const needle of ['aria-current', 'aria-disabled', 'getCharacterCards']) {
      expect(src).toContain(needle)
    }
  })

  it('uses no native disabled attribute and touches no storage', () => {
    expect(src).not.toMatch(/(?<![-\w])disabled=\{/)
    expect(src).not.toContain('localStorage')
    expect(src).not.toContain('sessionStorage')
  })

  it('loads, resets, decides the destination, then calls onDone, in that order', () => {
    const pick = src.indexOf('function pick')
    expect(pick).toBeGreaterThanOrEqual(0)
    const load = src.indexOf('loadPersona(', pick)
    const reset = src.indexOf('reset()', pick)
    const dest = src.indexOf('demoSwitchDestination(', pick)
    const done = src.indexOf('onDone()', pick)
    expect(load).toBeGreaterThan(pick)
    expect(reset).toBeGreaterThan(load)
    expect(dest).toBeGreaterThan(reset)
    expect(done).toBeGreaterThan(dest)
  })
})

describe('components/UserMenu.tsx source', () => {
  const raw = readSource('components', 'UserMenu.tsx')
  const src = stripComments(raw)

  it('hosts DemoSwitch and closes the menu when it is done', () => {
    expect(src).toContain('<DemoSwitch')
    expect(src).toContain('onDone={closeMenu}')
  })

  it('carries no PART 4 placeholder', () => {
    expect(raw).not.toContain('PART 4')
  })
})

describe('components/LoginPicker.tsx source', () => {
  const src = stripComments(readSource('components', 'LoginPicker.tsx'))

  it('uses the flow store and resets it on both character loads', () => {
    expect(src).toContain('useFlow')
    expect(src.split('reset()').length - 1).toBeGreaterThanOrEqual(2)
  })

  it('resets the flow store right after a card pick loads the persona', () => {
    const load = src.indexOf('const next = loadPersona(id)')
    expect(load).toBeGreaterThanOrEqual(0)
    const reset = src.indexOf('reset()', load)
    expect(reset).toBeGreaterThan(load)
    expect(reset - load).toBeLessThanOrEqual(120)
  })
})
