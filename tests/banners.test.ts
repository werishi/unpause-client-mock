import { describe, it, expect } from 'vitest'
import { isTabRoute, normalizePathname } from '@/lib/domain/routes'
import {
  isCheckInReminderDue,
  isCheckInReminderSuppressed,
  dueDigestBanner,
  type CheckInReminderInput,
  type DigestBannerInput,
} from '@/lib/domain/banners'
import { currentDigestSlot } from '@/lib/domain/digest'

const today = '2026-10-18'
const yesterday = '2026-10-17'

// ─── isTabRoute / normalizePathname ──────────────────────────────────────────

describe('isTabRoute and normalizePathname', () => {
  const tabRoutes = [
    '/today',
    '/today/',
    '/plan/',
    '/look-back/',
    '/you',
    '/you/',
    '/you/demo/',
    '/you/digest/',
  ]
  const flowRoutes = [
    '/',
    '/welcome/',
    '/welcome-back/',
    '/digest/',
    '/mood-before/',
    '/task/',
    '/mood-after/',
    '/done/',
    '/swap/',
    '/safety/plan/',
    '/onboarding/x/',
    '/buddy/share/',
    '/you/values',
    '/you/values/',
    '/you/values/edit/',
  ]

  it.each(tabRoutes)('%s is a tab route', (path) => {
    expect(isTabRoute(path)).toBe(true)
  })

  it.each(flowRoutes)('%s is not a tab route', (path) => {
    expect(isTabRoute(path)).toBe(false)
  })

  it('normalizePathname keeps the root slash', () => {
    expect(normalizePathname('/')).toBe('/')
  })

  it('normalizePathname strips one trailing slash', () => {
    expect(normalizePathname('/today/')).toBe('/today')
  })
})

// ─── Check-in reminder ────────────────────────────────────────────────────────

const reminderBase: CheckInReminderInput = {
  hydrated: true,
  today,
  todayPlan: null,
  startedAt: '2026-10-10',
  welcomeBackDue: false,
  checkInReminderShownDay: null,
  pathname: '/today/',
}

describe('isCheckInReminderDue', () => {
  it('is due for a hydrated person who started earlier, has not checked in and has not seen it today', () => {
    expect(isCheckInReminderDue(reminderBase)).toBe(true)
  })

  it('is not due before hydration', () => {
    expect(isCheckInReminderDue({ ...reminderBase, hydrated: false })).toBe(false)
  })

  it('is not due once there is a check-in today', () => {
    expect(isCheckInReminderDue({ ...reminderBase, todayPlan: { date: today } })).toBe(false)
  })

  it('stays due when the only plan is from yesterday', () => {
    expect(isCheckInReminderDue({ ...reminderBase, todayPlan: { date: yesterday } })).toBe(true)
  })

  it('is not due when already shown today', () => {
    expect(isCheckInReminderDue({ ...reminderBase, checkInReminderShownDay: today })).toBe(false)
  })

  it('stays due when last shown yesterday', () => {
    expect(isCheckInReminderDue({ ...reminderBase, checkInReminderShownDay: yesterday })).toBe(true)
  })

  it('is not due before onboarding (startedAt null)', () => {
    expect(isCheckInReminderDue({ ...reminderBase, startedAt: null })).toBe(false)
  })

  it('is not due for someone who started today', () => {
    expect(isCheckInReminderDue({ ...reminderBase, startedAt: today })).toBe(false)
  })

  it('is not due while welcome-back is due', () => {
    expect(isCheckInReminderDue({ ...reminderBase, welcomeBackDue: true })).toBe(false)
  })

  it('is not due inside a focused flow', () => {
    expect(isCheckInReminderDue({ ...reminderBase, pathname: '/task/' })).toBe(false)
  })
})

describe('isCheckInReminderSuppressed', () => {
  const welcomeBack: CheckInReminderInput = { ...reminderBase, welcomeBackDue: true }

  it('is suppressed on the welcome-back screen when the reminder would otherwise be due', () => {
    expect(isCheckInReminderSuppressed({ ...welcomeBack, pathname: '/welcome-back/' })).toBe(true)
  })

  it('is suppressed on Today too, since the route is ignored', () => {
    expect(isCheckInReminderSuppressed({ ...welcomeBack, pathname: '/today/' })).toBe(true)
  })

  it('is not suppressed when welcome-back is not due', () => {
    expect(isCheckInReminderSuppressed(reminderBase)).toBe(false)
  })

  it('is not suppressed when already shown today', () => {
    expect(isCheckInReminderSuppressed({ ...welcomeBack, checkInReminderShownDay: today })).toBe(false)
  })

  it('is not suppressed before onboarding (startedAt null)', () => {
    expect(isCheckInReminderSuppressed({ ...welcomeBack, startedAt: null })).toBe(false)
  })

  it('is not suppressed for someone who started today', () => {
    expect(isCheckInReminderSuppressed({ ...welcomeBack, startedAt: today })).toBe(false)
  })

  it('is not suppressed once there is a check-in today', () => {
    expect(isCheckInReminderSuppressed({ ...welcomeBack, todayPlan: { date: today } })).toBe(false)
  })

  it('is not suppressed before hydration', () => {
    expect(isCheckInReminderSuppressed({ ...welcomeBack, hydrated: false })).toBe(false)
  })

  it('is never true together with isCheckInReminderDue', () => {
    const variants: Partial<CheckInReminderInput>[] = [
      {},
      { hydrated: false },
      { todayPlan: { date: today } },
      { todayPlan: { date: yesterday } },
      { checkInReminderShownDay: today },
      { checkInReminderShownDay: yesterday },
      { startedAt: null },
      { startedAt: today },
      { pathname: '/task/' },
      { pathname: '/welcome-back/' },
    ]
    for (const welcomeBackDue of [false, true]) {
      for (const variant of variants) {
        const input = { ...reminderBase, welcomeBackDue, ...variant }
        expect(isCheckInReminderDue(input) && isCheckInReminderSuppressed(input)).toBe(false)
      }
    }
  })
})

// ─── Digest banner ────────────────────────────────────────────────────────────

const slotKey = '2026-10-18_08:00'

const digestBase: DigestBannerInput = {
  hydrated: true,
  today,
  todayPlan: null,
  slot: { slotKey },
  digestBannerShownSlot: null,
  checkInReminderVisible: false,
  pathname: '/today/',
}

describe('dueDigestBanner', () => {
  it('returns the slot key when a slot is current and its banner has not been shown', () => {
    expect(dueDigestBanner(digestBase)).toBe(slotKey)
  })

  it('returns null before hydration', () => {
    expect(dueDigestBanner({ ...digestBase, hydrated: false })).toBeNull()
  })

  it('returns null when no slot is current', () => {
    expect(dueDigestBanner({ ...digestBase, slot: null })).toBeNull()
  })

  it('returns null when the banner was already shown for this slot', () => {
    expect(dueDigestBanner({ ...digestBase, digestBannerShownSlot: slotKey })).toBeNull()
  })

  it('returns the new slot key when the banner was shown for an earlier slot', () => {
    expect(dueDigestBanner({ ...digestBase, digestBannerShownSlot: '2026-10-18_07:00' })).toBe(slotKey)
  })

  it('returns null while the check-in reminder is visible', () => {
    expect(dueDigestBanner({ ...digestBase, checkInReminderVisible: true })).toBeNull()
  })

  it('returns null inside a focused flow', () => {
    expect(dueDigestBanner({ ...digestBase, pathname: '/task/' })).toBeNull()
  })

  it('returns null on Today while the digest card is on screen (checked in today)', () => {
    expect(dueDigestBanner({ ...digestBase, todayPlan: { date: today } })).toBeNull()
  })

  it('returns the slot key on Plan even after checking in today, since the card is only on Today', () => {
    expect(
      dueDigestBanner({ ...digestBase, todayPlan: { date: today }, pathname: '/plan/' }),
    ).toBe(slotKey)
  })

  it('returns the slot key on Today when the only plan is from yesterday', () => {
    expect(dueDigestBanner({ ...digestBase, todayPlan: { date: yesterday } })).toBe(slotKey)
  })

  it('accepts the real currentDigestSlot result as its slot', () => {
    // new Date(y, m, d, h, min) is local time; month index 9 is October.
    const slot = currentDigestSlot(['08:00'], null, new Date(2026, 9, 18, 9, 0))
    expect(dueDigestBanner({ ...digestBase, slot })).toBe(slotKey)
  })
})
