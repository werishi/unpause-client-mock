/**
 * Data integrity tests — verify seed JSON files are internally consistent before
 * any user interaction. Data-authoring errors (typo FK, missing rank-1 row, banned
 * word) are caught here rather than at runtime where they surface as a blank UI
 * section or undefined activity. Read-only: no file system API, no mocks.
 */
import { describe, it, expect } from 'vitest'
import { BANNED_WORDS } from './banned-words'
import activities from '../data/activities.json'
import templates from '../data/templates.json'
import templateItems from '../data/template-items.json'
import reasonTemplates from '../data/reason-templates.json'
import reasons from '../data/reasons.json'
import values from '../data/values.json'
import sources from '../data/sources.json'
import personas from '../data/personas.json'
import personaCheckins from '../data/persona-checkins.json'
import personaLog from '../data/persona-log.json'
import digestItems from '../data/digest-items.json'

// ─── ID sets (derived once at module level) ───────────────────────────────────

const activityIds = new Set((activities as any[]).map((a) => a.id))
const templateIds = new Set((templates as any[]).map((t) => t.id))
const reasonIds = new Set((reasons as any[]).map((r) => r.id))
const valueIds = new Set((values as any[]).map((v) => v.id))
const sourceIds = new Set((sources as any[]).map((s) => s.id))
const personaIds = new Set((personas as any[]).map((p) => p.id))

// ─── FK tests ─────────────────────────────────────────────────────────────────

describe('data integrity', () => {
  it('template-items FK: every activityId resolves', () => {
    for (const row of templateItems as any[]) {
      expect(
        activityIds.has(row.activityId),
        `template-item ${row.id}: activityId '${row.activityId}' not found in activities`
      ).toBe(true)
    }
  })

  it('template-items FK: every templateId resolves', () => {
    for (const row of templateItems as any[]) {
      expect(
        templateIds.has(row.templateId),
        `template-item ${row.id}: templateId '${row.templateId}' not found in templates`
      ).toBe(true)
    }
  })

  it('reason-templates FK: every reasonId resolves', () => {
    for (const row of reasonTemplates as any[]) {
      expect(
        reasonIds.has(row.reasonId),
        `reason-templates row: reasonId '${row.reasonId}' not found in reasons`
      ).toBe(true)
    }
  })

  it('reason-templates FK: every templateId resolves', () => {
    for (const row of reasonTemplates as any[]) {
      expect(
        templateIds.has(row.templateId),
        `reason-templates row: templateId '${row.templateId}' not found in templates`
      ).toBe(true)
    }
  })

  it('activities FK: every sourceId resolves', () => {
    for (const row of activities as any[]) {
      for (const id of row.sourceIds ?? []) {
        expect(sourceIds.has(id), `activity ${row.id}: sourceId '${id}' not found`).toBe(true)
      }
    }
  })

  it('activities FK: every valueId resolves', () => {
    for (const row of activities as any[]) {
      for (const id of row.valueIds ?? []) {
        expect(valueIds.has(id), `activity ${row.id}: valueId '${id}' not found`).toBe(true)
      }
    }
  })

  it('templates FK: every sourceId resolves', () => {
    for (const row of templates as any[]) {
      for (const id of row.sourceIds ?? []) {
        expect(sourceIds.has(id), `template ${row.id}: sourceId '${id}' not found`).toBe(true)
      }
    }
  })

  it('personas FK: every reasonId resolves', () => {
    for (const row of personas as any[]) {
      for (const id of row.reasonIds ?? []) {
        expect(reasonIds.has(id), `persona ${row.id}: reasonId '${id}' not found`).toBe(true)
      }
    }
  })

  it('personas FK: every templateId resolves', () => {
    for (const row of personas as any[]) {
      for (const id of row.templateIds ?? []) {
        expect(templateIds.has(id), `persona ${row.id}: templateId '${id}' not found`).toBe(true)
      }
    }
  })

  it('personas FK: every valueId resolves', () => {
    for (const row of personas as any[]) {
      for (const id of (row as any).valueIds ?? []) {
        expect(valueIds.has(id), `persona ${row.id}: valueId '${id}' not found`).toBe(true)
      }
    }
  })

  it('persona-log FK: every activityId resolves', () => {
    for (const row of personaLog as any[]) {
      expect(activityIds.has(row.activityId), `log row: activityId '${row.activityId}' not found`).toBe(true)
    }
  })

  it('persona-log FK: every templateId resolves', () => {
    for (const row of personaLog as any[]) {
      expect(templateIds.has(row.templateId), `log row: templateId '${row.templateId}' not found`).toBe(true)
    }
  })

  it('persona-log FK: every personaId resolves', () => {
    for (const row of personaLog as any[]) {
      expect(personaIds.has(row.personaId), `log row: personaId '${row.personaId}' not found`).toBe(true)
    }
  })

  it('persona-checkins FK: every personaId resolves', () => {
    for (const row of personaCheckins as any[]) {
      expect(personaIds.has(row.personaId), `check-in row: personaId '${row.personaId}' not found`).toBe(true)
    }
  })

  it('every reason has a rank-1 template', () => {
    // The planner selects the rank-1 template as the default offer for each reason.
    // A reason with no rank-1 row silently produces no template for that reason.
    for (const id of reasonIds) {
      const hasRank1 = (reasonTemplates as any[]).some(
        (row) => row.reasonId === id && row.rank === 1
      )
      expect(hasRank1, `reason '${id}' has no rank-1 row in reason-templates`).toBe(true)
    }
  })

  it('every activity has a non-empty twoMinuteVersion', () => {
    // A blank twoMinuteVersion means the P2 low-energy path has nothing to lead with (G3).
    for (const row of activities as any[]) {
      expect(
        typeof row.twoMinuteVersion === 'string' && row.twoMinuteVersion.trim().length > 0,
        `activity ${row.id}: twoMinuteVersion is blank or missing`
      ).toBe(true)
    }
  })

  it('no banned words in user-facing text', () => {
    // Machine-checkable half of the tone rule. A human read is still needed for synonyms.
    function assertNoban(text: string, file: string, rowId: string, field: string) {
      for (const word of BANNED_WORDS) {
        expect(
          text.toLowerCase().includes(word),
          `${file} row ${rowId} field '${field}' contains banned word '${word}'`
        ).toBe(false)
      }
    }

    for (const row of reasons as any[]) {
      assertNoban(row.label ?? '', 'reasons', row.id, 'label')
      assertNoban(row.helper ?? '', 'reasons', row.id, 'helper')
    }
    for (const row of activities as any[]) {
      assertNoban(row.title ?? '', 'activities', row.id, 'title')
      assertNoban(row.twoMinuteVersion ?? '', 'activities', row.id, 'twoMinuteVersion')
      assertNoban(row.cue ?? '', 'activities', row.id, 'cue')
    }
    for (const row of templates as any[]) {
      assertNoban(row.title ?? '', 'templates', row.id, 'title')
      // summary is not on the TypeScript Template interface but may exist in the JSON
      if (typeof row.summary === 'string') {
        assertNoban(row.summary, 'templates', row.id, 'summary')
      }
    }
    // Digest item titles are user-facing (shown on /digest); a banned word in a
    // placeholder title would slip past a tone review that only reads copy.ts.
    for (const row of digestItems as any[]) {
      assertNoban(row.title ?? '', 'digest-items', row.id, 'title')
    }
  })
})
