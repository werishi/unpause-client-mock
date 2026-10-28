import { describe, it, expect } from 'vitest'
import { isWideRoute, isActiveTab, isBareRoute, isGateExemptRoute, entryRouteFor } from '@/lib/domain/routes'

// ─── isWideRoute ─────────────────────────────────────────────────────────────

describe('isWideRoute', () => {
  // /today and /plan were flipped from narrow to wide on purpose when the desktop layouts were added.
  const wideRoutes = ['/today', '/today/', '/plan', '/plan/', '/look-back', '/look-back/', '/you', '/you/']
  const narrowRoutes = [
    '/you/values',
    '/you/about/',
    '/you/demo/',
    '/you/therapist/preview/',
    '/',
    '/look-back/x/',
    '/yours',
  ]

  it.each(wideRoutes)('%s is a wide route', (path) => {
    expect(isWideRoute(path)).toBe(true)
  })

  it.each(narrowRoutes)('%s is not a wide route', (path) => {
    expect(isWideRoute(path)).toBe(false)
  })
})

// ─── isActiveTab ─────────────────────────────────────────────────────────────

describe('isActiveTab', () => {
  // Today matches exactly; the other tabs own their sub-pages via the href + '/' prefix.
  it.each([
    ['/today', '/today'],
    ['/today/', '/today'],
    ['/plan', '/plan'],
    ['/plan/edit', '/plan'],
    ['/look-back/', '/look-back'],
    ['/you', '/you'],
    ['/you/', '/you'],
    ['/you/about/', '/you'],
  ])('%s activates the %s tab', (pathname, href) => {
    expect(isActiveTab(pathname, href)).toBe(true)
  })

  it.each([
    ['/today/anything', '/today'],
    ['/yours', '/you'],
    ['/you/about', '/today'],
    ['/plan', '/you'],
    ['/today', '/plan'],
  ])('%s does not activate the %s tab', (pathname, href) => {
    expect(isActiveTab(pathname, href)).toBe(false)
  })
})

// ─── isBareRoute ─────────────────────────────────────────────────────────────

describe('isBareRoute', () => {
  const bareRoutes = ['/', '/login', '/login/', '/privacy', '/privacy/', '/imprint', '/imprint/']
  const chromeRoutes = [
    '/welcome/',
    '/today/',
    '/you/',
    '/login-help',
    '/login/extra/',
    '/privacy/x',
    '/imprint/x/',
    '/safety/',
  ]

  it.each(bareRoutes)('%s is a bare route', (path) => {
    expect(isBareRoute(path)).toBe(true)
  })

  it.each(chromeRoutes)('%s is not a bare route', (path) => {
    expect(isBareRoute(path)).toBe(false)
  })
})

// ─── isGateExemptRoute ───────────────────────────────────────────────────────

describe('isGateExemptRoute', () => {
  // /safety and everything under /safety/ stay reachable without the demo login,
  // because no gate may stand in front of help.
  // '/' is the investor page, which itself states the two things the gate notice exists
  // for, so an anonymous visitor reads it before ticking the demo notice.
  const exemptRoutes = ['/', '/login', '/login/', '/privacy/', '/imprint', '/safety', '/safety/', '/safety/edit/']
  const gatedRoutes = ['/today/', '/welcome', '/you/demo/', '/safety-plan', '/login-help']

  it.each(exemptRoutes)('%s is exempt from the gate', (path) => {
    expect(isGateExemptRoute(path)).toBe(true)
  })

  it.each(gatedRoutes)('%s is behind the gate', (path) => {
    expect(isGateExemptRoute(path)).toBe(false)
  })
})

// ─── entryRouteFor ───────────────────────────────────────────────────────────

describe('entryRouteFor', () => {
  it.each([
    { startedAt: null, welcomeBackDue: false, expected: '/welcome' },
    { startedAt: '2026-10-01', welcomeBackDue: true, expected: '/welcome-back' },
    { startedAt: '2026-10-01', welcomeBackDue: false, expected: '/today' },
    { startedAt: null, welcomeBackDue: true, expected: '/welcome' },
  ])(
    'startedAt $startedAt with welcomeBackDue $welcomeBackDue lands on $expected',
    ({ startedAt, welcomeBackDue, expected }) => {
      expect(entryRouteFor({ startedAt, welcomeBackDue })).toBe(expected)
    },
  )
})
