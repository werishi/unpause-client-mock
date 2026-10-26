/**
 * investor-page.test.ts — source-scan guard for the investor page at `/`.
 *
 * There is no jsdom or component test in this target, so a section silently dropped from the
 * page, a copy key that stops being rendered, a hard-coded string or a `mailto:` built from a
 * literal address would all pass the build. This file reads app/page.tsx and
 * components/InvestorSections.tsx as text and checks them against INVESTOR in lib/copy.ts.
 * Precedent for scanning source as text: tests/dark-mode.test.ts.
 *
 * The expected ids and links are written out below rather than derived, so a rename fails here.
 *
 * Environment: Vitest node (no DOM, no browser globals needed).
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { INVESTOR } from '../lib/copy'

// process.cwd() is the repo root under `npm run test` (vitest.config.ts sets no root).
const ROOT = process.cwd()
const pageSrc = fs.readFileSync(path.join(ROOT, 'app', 'page.tsx'), 'utf8')
const sectionsSrc = fs.readFileSync(path.join(ROOT, 'components', 'InvestorSections.tsx'), 'utf8')
const src = `${pageSrc}\n${sectionsSrc}`

const SECTION_IDS = [
  'top',
  'problem',
  'goals',
  'solution',
  'evidence',
  'principles',
  'status',
  'team',
  'ask',
  'roles',
  'contact',
]

const LINKS = ['href="/login"', 'href="/safety"', 'href="/privacy"', 'href="/imprint"']

// The page is a static server component with no network access (profile Architecture invariant).
const FORBIDDEN = ['"use client"', '<form', '<input', '<img', 'fetch(', 'http://', 'https://']

/** Every key of `obj` whose `${prefix}.${key}` reference is absent from the scanned source. */
function missingRefs(prefix: string, obj: object): string[] {
  return Object.keys(obj)
    .map((key) => `${prefix}.${key}`)
    .filter((ref) => !src.includes(ref))
}

describe('investor page source scan', () => {
  it('references every top-level INVESTOR key', () => {
    expect(missingRefs('INVESTOR', INVESTOR)).toEqual([])
  })

  it('references every INVESTOR.placeholders key', () => {
    expect(missingRefs('INVESTOR.placeholders', INVESTOR.placeholders)).toEqual([])
  })

  it('references every INVESTOR.safetyAndLegal key', () => {
    expect(missingRefs('INVESTOR.safetyAndLegal', INVESTOR.safetyAndLegal)).toEqual([])
  })

  it('renders every section id', () => {
    expect(SECTION_IDS.filter((id) => !src.includes(`id="${id}"`))).toEqual([])
  })

  it('links to the demo, safety and legal pages', () => {
    expect(LINKS.filter((link) => !src.includes(link))).toEqual([])
  })

  it('builds the mailto from the placeholder address, never a literal one', () => {
    expect(src).toContain('mailto:${INVESTOR.placeholders.contactEmail}')
  })

  it('stays a static server page with no forms, images or network calls', () => {
    expect(FORBIDDEN.filter((token) => src.includes(token))).toEqual([])
  })

  it('exports metadata from app/page.tsx', () => {
    expect(pageSrc).toContain('export const metadata')
  })
})
