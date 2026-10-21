import { describe, it, expect } from 'vitest'
import { isWideRoute } from '@/lib/domain/routes'

// ─── isWideRoute ─────────────────────────────────────────────────────────────

describe('isWideRoute', () => {
  const wideRoutes = ['/look-back', '/look-back/', '/you', '/you/']
  const narrowRoutes = [
    '/you/values',
    '/you/about/',
    '/you/demo/',
    '/you/therapist/preview/',
    '/today/',
    '/plan/',
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
