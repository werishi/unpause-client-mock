/**
 * Pins the header user menu.
 *
 * The domain rules in `lib/domain/user-menu.ts` are checked by value. The facts that cannot be
 * rendered here (Vitest runs in node without jsdom) are checked by reading source text: that
 * Log out only navigates and resets no demo data, that the header's z-index outranks the banner,
 * and that the header's DOM order is app name, user menu, safety link. Without these source
 * checks a later edit could add a data reset to Log out or drop the z-index and every other test
 * would stay green.
 *
 * Comments are stripped before every source check, because the components' header comments
 * legitimately mention words such as "localStorage" or "aria-haspopup" while explaining the
 * design. The stripper is regex-based: it would misfire on a `//` preceded by whitespace inside
 * a string literal, which neither file is expected to contain.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SHELL } from '../lib/copy'
import {
  NEW_PERSONA_ID,
  shouldShowUserMenu,
  userMenuName,
  userInitial,
} from '../lib/domain/user-menu'

// process.cwd() is the repo root under `npm run test` (vitest.config.ts sets no root).
const ROOT = process.cwd()

function readSource(...segments: string[]): string {
  return fs.readFileSync(path.join(ROOT, ...segments), 'utf8')
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')
}

// "per-sam" is a seeded persona id in data/personas.json.
const REAL_ID = 'per-sam'
const STARTED = '2026-10-01T09:00:00.000Z'
const FB = 'your own character'

describe('shouldShowUserMenu', () => {
  it('is false before hydration for every persona and startedAt', () => {
    for (const personaId of [NEW_PERSONA_ID, REAL_ID]) {
      for (const startedAt of [null, STARTED]) {
        expect(shouldShowUserMenu({ hydrated: false, personaId, startedAt })).toBe(false)
      }
    }
  })

  it('is false for a hydrated per-new visitor who has not started', () => {
    expect(shouldShowUserMenu({ hydrated: true, personaId: NEW_PERSONA_ID, startedAt: null })).toBe(false)
  })

  it('is true for a hydrated per-new visitor who has started', () => {
    expect(shouldShowUserMenu({ hydrated: true, personaId: NEW_PERSONA_ID, startedAt: STARTED })).toBe(true)
  })

  it('is true for a hydrated seeded persona whether or not startedAt is set', () => {
    expect(shouldShowUserMenu({ hydrated: true, personaId: REAL_ID, startedAt: null })).toBe(true)
    expect(shouldShowUserMenu({ hydrated: true, personaId: REAL_ID, startedAt: STARTED })).toBe(true)
  })
})

describe('userMenuName', () => {
  it('returns the first name of a seeded persona', () => {
    expect(userMenuName('per-jonas', 'Jonas, two weeks in', FB)).toBe('Jonas')
  })

  it('returns the fallback for per-new even when a display name is passed', () => {
    expect(userMenuName('per-new', 'Anything, here', FB)).toBe(FB)
  })

  it('returns the fallback for an unknown id', () => {
    expect(userMenuName('unknown', undefined, FB)).toBe(FB)
  })

  it('returns the fallback for a blank first name', () => {
    expect(userMenuName('per-x', '  ', FB)).toBe(FB)
  })
})

describe('userInitial', () => {
  it('uppercases the first letter', () => {
    expect(userInitial('noor')).toBe('N')
    expect(userInitial('your own character')).toBe('Y')
  })

  it('returns a question mark for an empty name', () => {
    expect(userInitial('')).toBe('?')
  })

  it('returns a whole surrogate-pair character rather than half of it', () => {
    const initial = userInitial('\u{1F600} Sam')
    expect(initial).toBe('\u{1F600}')
    expect(initial.length).toBe(2)
  })
})

describe('user menu copy', () => {
  const labels = [SHELL.userMenuLabel, SHELL.signedInAs, SHELL.logOutLabel]

  it('has a name placeholder in signedInAs', () => {
    expect(SHELL.signedInAs).toContain('{name}')
  })

  it('has non-empty labels without digits', () => {
    for (const label of labels) {
      expect(label.trim().length).toBeGreaterThan(0)
      expect(label).not.toMatch(/\d/)
    }
  })
})

describe('components/UserMenu.tsx source', () => {
  const src = stripComments(readSource('components', 'UserMenu.tsx'))

  it('starts with the use client directive', () => {
    expect(src.trimStart()).toMatch(/^["']use client["']/)
  })

  it('navigates to /login on log out', () => {
    expect(src).toContain('router.push("/login")')
  })

  it('resets no demo data and touches no storage', () => {
    for (const forbidden of ['resetDemoData', 'localStorage', 'removeItem', 'sessionStorage', 'aria-haspopup']) {
      expect(src).not.toContain(forbidden)
    }
  })
})

describe('components/AppShell.tsx source', () => {
  const src = stripComments(readSource('components', 'AppShell.tsx'))

  it('lifts the header above the banner with z-30', () => {
    const headerTag = src.match(/<header\b[^>]*>/)
    expect(headerTag).not.toBeNull()
    const tag = headerTag![0]
    expect(tag).toMatch(/\bz-30\b/)
    expect(tag).not.toMatch(/\bz-10\b/)
  })

  it('orders app name, user menu, safety link', () => {
    const appName = src.indexOf('SHELL.appName')
    const userMenu = src.indexOf('<UserMenu')
    const safetyLink = src.indexOf('<SafetyPlanLink')
    expect(appName).toBeGreaterThanOrEqual(0)
    expect(userMenu).toBeGreaterThan(appName)
    expect(safetyLink).toBeGreaterThan(userMenu)
  })
})
