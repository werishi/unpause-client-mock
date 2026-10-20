/**
 * Therapist persona tests — keep the `per-noor` seed rows honest as the data
 * evolves, and scan every persona's own text for banned words (data-integrity
 * does not cover `personas.json` text). The expected figures below are tied to
 * the seed rows in data/persona-log.json; a deliberate seed change updates them.
 */
import { describe, it, expect } from 'vitest'
import { BANNED_WORDS } from './banned-words'
import activities from '../data/activities.json'
import templateItems from '../data/template-items.json'
import personas from '../data/personas.json'
import personaCheckins from '../data/persona-checkins.json'
import personaLog from '../data/persona-log.json'
import personaMedia from '../data/persona-media.json'
import templates from '../data/templates.json'
import { getPersonaSeed } from '@/lib/repo/persona-repo'
import { getActivities } from '@/lib/repo/activity-repo'
import { getSafetyPlan } from '@/lib/repo/safety-plan-repo'
import { sharingFromPersona, PERSONA_LINKED_DAYS_AGO } from '../lib/store/sharing-slice'
import { SHARE_TYPES } from '@/lib/domain/sharing'
import { HOMEWORK_TEMPLATE_ID } from '@/lib/domain/buddy'
import { addDays } from '@/lib/domain/planner'
import {
  projectTherapistView,
  THERAPIST_VIEW_DAYS,
  type TherapistSection,
} from '@/lib/domain/therapist-view'

const TODAY = '2026-10-20'
const NOOR = 'per-noor'

const activityIds = new Set((activities as any[]).map((a) => a.id))
const templateIds = new Set((templates as any[]).map((t) => t.id))
const noorRow = (personas as any[]).find((p) => p.id === NOOR)

function noorView(sharingOverride: Record<string, boolean> = {}) {
  const seed = getPersonaSeed(NOOR, TODAY)
  const sharing = sharingFromPersona(noorRow, NOOR, TODAY)
  return projectTherapistView(
    {
      therapist: sharing.therapist,
      sharing: { ...sharing.sharing, ...sharingOverride },
      log: seed.log,
      safetyEntries: [],
      activities: getActivities(),
      safetySeed: getSafetyPlan(),
    },
    TODAY,
  )
}

function section<T extends TherapistSection['type']>(
  sections: TherapistSection[],
  type: T,
): Extract<TherapistSection, { type: T }> {
  const s = sections.find((x) => x.type === type)
  expect(s, `section '${type}' missing`).toBeDefined()
  return s as Extract<TherapistSection, { type: T }>
}

describe('persona text tone', () => {
  it('no persona displayName or blurb contains a banned word', () => {
    expect((personas as any[]).length).toBe(7)
    for (const p of personas as any[]) {
      for (const field of ['displayName', 'blurb'] as const) {
        const text = String(p[field] ?? '').toLowerCase()
        for (const word of BANNED_WORDS) {
          expect(text.includes(word), `persona ${p.id} ${field} contains banned word '${word}'`).toBe(false)
        }
      }
    }
  })
})

describe('per-noor seed row', () => {
  it('exists with a named therapist, valid switches and two homework items outside the template', () => {
    expect(noorRow).toBeDefined()
    expect(typeof noorRow.therapist.name).toBe('string')
    expect(noorRow.therapist.name.length).toBeGreaterThan(0)

    const shareTypes: readonly string[] = SHARE_TYPES
    for (const [key, value] of Object.entries(noorRow.sharing)) {
      expect(shareTypes.includes(key), `sharing key '${key}' not in SHARE_TYPES`).toBe(true)
      expect(typeof value, `sharing.${key} is not boolean`).toBe('boolean')
    }
    const on = Object.entries(noorRow.sharing).filter(([, v]) => v === true).map(([k]) => k).sort()
    expect(on).toEqual(['moodRatings', 'weekSummary'])

    expect(noorRow.homework).toHaveLength(2)
    const templateActivityIds = new Set(
      (templateItems as any[])
        .filter((ti) => (noorRow.templateIds as string[]).includes(ti.templateId))
        .map((ti) => ti.activityId),
    )
    for (const hw of noorRow.homework as any[]) {
      expect(activityIds.has(hw.activityId), `homework activityId '${hw.activityId}' not found`).toBe(true)
      expect(templateActivityIds.has(hw.activityId), `homework '${hw.activityId}' is in the template`).toBe(false)
    }
    expect((noorRow.homework as any[]).map((h) => h.dayOffset)).toEqual([0, 2])
  })

  it('check-in, log and media rows belong to per-noor and resolve', () => {
    const checkins = (personaCheckins as any[]).filter((c) => c.id.startsWith('chk-noor-'))
    const log = (personaLog as any[]).filter((r) => r.id.startsWith('log-noor-'))
    expect(checkins.length).toBeGreaterThan(0)
    expect(log.length).toBeGreaterThan(0)
    for (const c of checkins) expect(c.personaId, `check-in ${c.id}`).toBe(NOOR)
    for (const r of log) {
      expect(r.personaId, `log ${r.id}`).toBe(NOOR)
      expect(activityIds.has(r.activityId), `log ${r.id}: activityId '${r.activityId}' not found`).toBe(true)
      expect(templateIds.has(r.templateId), `log ${r.id}: templateId '${r.templateId}' not found`).toBe(true)
      // The persona-log FK test in data-integrity requires a real template, so
      // homework completions cannot be seeded under the homework sentinel.
      expect(r.templateId, `log ${r.id}`).not.toBe(HOMEWORK_TEMPLATE_ID)
    }
    expect((personaMedia as Record<string, unknown>)[NOOR]).toBeDefined()
  })

  it('history fills the whole preview window with rated days and keeps at least one skip', () => {
    const seed = getPersonaSeed(NOOR, TODAY)
    const from = addDays(TODAY, -(THERAPIST_VIEW_DAYS - 1))
    const ratedDays = new Set(
      seed.log
        .filter(
          (e) =>
            e.outcome === 'done' &&
            e.moodBefore != null &&
            e.moodAfter != null &&
            e.date >= from &&
            e.date <= TODAY,
        )
        .map((e) => e.date),
    )
    expect(ratedDays.size).toBeGreaterThanOrEqual(14)
    expect(seed.log.some((e) => e.outcome === 'skip')).toBe(true)
    const earliest = seed.checkIns.map((c) => c.date).sort()[0]
    expect(earliest).toBe(addDays(TODAY, -20))
  })

  it('sharingFromPersona loads Dr. Hartmann, two switches and dated homework', () => {
    const s = sharingFromPersona(noorRow, NOOR, TODAY)
    expect(s.therapist?.name).toBe('Dr. Hartmann')
    expect(s.therapist?.linkedOn).toBe('2026-10-06')
    expect(s.therapist?.linkedOn).toBe(addDays(TODAY, -PERSONA_LINKED_DAYS_AGO))
    expect(s.sharing).toEqual({
      moodRatings: true,
      activityLog: false,
      weekSummary: true,
      safetyPlan: false,
    })
    expect(s.homework.map((h) => [h.homeworkId, h.date])).toEqual([
      ['hw-noor-01', '2026-10-20'],
      ['hw-noor-02', '2026-10-22'],
    ])
  })

  it('therapist preview shows mood ratings and the week summary over the seed', () => {
    const view = noorView()
    expect(view.sections.map((s) => s.type)).toEqual(['moodRatings', 'weekSummary'])

    const mood = section(view.sections, 'moodRatings')
    expect(mood.rows).toHaveLength(21)
    const from = addDays(TODAY, -13)
    for (const r of mood.rows) expect(r.date >= from, `mood row dated ${r.date}`).toBe(true)

    const week = section(view.sections, 'weekSummary')
    expect(week.activeDays).toBe(7)
    expect(week.valueIds).toEqual(['val-health', 'val-home', 'val-learning', 'val-play'])
  })

  it('switching the activity log on adds 14 days and leaves skip rows out', () => {
    const view = noorView({ activityLog: true })
    const log = section(view.sections, 'activityLog')
    expect(log.days).toHaveLength(14)
    const day = log.days.find((d) => d.date === addDays(TODAY, -4))
    const dishes = (activities as any[]).find((a) => a.id === 'act-dishes').title
    expect(day?.titles).toEqual([dishes])
  })
})

describe('other personas', () => {
  it('carry no therapist, sharing or homework field', () => {
    for (const p of (personas as any[]).filter((x) => x.id !== NOOR)) {
      expect(p.therapist, `persona ${p.id} therapist`).toBeUndefined()
      expect(p.sharing, `persona ${p.id} sharing`).toBeUndefined()
      expect(p.homework, `persona ${p.id} homework`).toBeUndefined()
    }
  })
})
