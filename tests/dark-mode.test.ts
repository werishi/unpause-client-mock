import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/*
 * Dark mode guard. Reads every .tsx file under app/ and components/ as text and checks each
 * string literal against three static rules. Nothing in tests/ renders a component (node
 * environment, no jsdom), so without this file contrast and pairing can be checked only by eye.
 *
 * Rule 1: no undefined token classes. bg-primary, text-primary, text-primary-foreground,
 *   text-foreground, text-muted-foreground, bg-muted, ring-primary and rounded-radius-* generate
 *   no CSS, because app/globals.css has no @theme block. Matched as whole tokens, with or
 *   without a variant prefix.
 * Rule 2: every white surface is paired. A literal holding the unprefixed class bg-white must
 *   also hold a dark:bg- class. The partner belongs in the same literal, not in another branch.
 * Rule 3: filled buttons do not lighten. A literal holding unprefixed text-white must not hold a
 *   dark: bg-indigo, bg-blue or bg-red class at shade 400 or 500: white on those is below 4.5:1.
 *   White-text fills stay at bg-{hue}-600 in both themes.
 *
 * Deliberately not flagged:
 * 1. text-white on a bg-{hue}-600 fill (the NotificationBanner.tsx badge, the WeekStrip.tsx today
 *    cell, every flow-page button). Unpaired by design: the filled-button rule keeps the 600
 *    shade in both themes. Rule 3 forbids only the lightened dark override, never its absence.
 * 2. dark:bg-white (the inverted bg-gray-900 ... dark:bg-white button in app/buddy/choose and
 *    app/you/values). It is a dark partner, not an unpaired bg-white, so rule 2 matches only
 *    the unprefixed token.
 * 3. Progress dots bg-indigo-600 dark:bg-indigo-400 and demo pill on-states bg-indigo-600
 *    dark:bg-indigo-500. They carry no text, and indigo-400/500 keeps them at 3:1 on the dark
 *    page. Rule 3 therefore fires only when text-white is in the same literal.
 * 4. text-title on the templates heading. A size class with no @theme behind it, deliberately
 *    left, and not on the rule 1 list.
 * 5. A class named only in a comment (components/TabBar.tsx). Comments are stripped first.
 * 6. Text and border pairs (text-gray-900 without dark:text-gray-100, border-gray-200 without
 *    dark:border-gray-700). Not checked: conditional class strings make a general rule produce
 *    false positives. Review catches these.
 * 7. hover:bg-white or any other prefixed bg-white. Not a base surface, so not rule 2's concern.
 *
 * Premise of the extractor: raw quote characters never appear in JSX text, because
 * eslint-config-next's react/no-unescaped-entities forbids them. So every quote outside a
 * comment opens a real string literal, and no parser is needed.
 */

// ─── literal extraction ──────────────────────────────────────────────────────

// Leftmost match wins: a comment start inside a string is consumed as part of that string.
// Single-quoted strings stop at a newline to bound the damage of a stray apostrophe.
const SCAN = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\\n])*)'|`((?:\\.|[^`\\])*)`/g

/** Every string literal in a source file, comments skipped; a template literal is one literal. */
function extractLiterals(source: string): string[] {
  const literals: string[] = []
  for (const match of source.matchAll(SCAN)) {
    const literal = match[1] ?? match[2] ?? match[3]
    if (literal !== undefined) literals.push(literal)
  }
  return literals
}

// ─── rule predicates ─────────────────────────────────────────────────────────

const TOKEN_CLASS =
  /(?<![\w-])(?:bg-primary|text-primary-foreground|text-primary|text-foreground|text-muted-foreground|bg-muted|ring-primary|rounded-radius-[\w-]+)(?![\w-])/
const UNPREFIXED_BG_WHITE = /(?<![\w:-])bg-white(?![\w-])/
const DARK_BG = /dark:bg-/
const UNPREFIXED_TEXT_WHITE = /(?<![\w:-])text-white(?![\w-])/
const LIGHTENED_DARK_FILL = /dark:(?:[a-z-]+:)*bg-(?:indigo|blue|red)-(?:400|500)(?![\w-])/

function hasTokenClass(literal: string): boolean {
  return TOKEN_CLASS.test(literal)
}

function isUnpairedWhiteSurface(literal: string): boolean {
  return UNPREFIXED_BG_WHITE.test(literal) && !DARK_BG.test(literal)
}

function hasLightenedFilledButton(literal: string): boolean {
  return UNPREFIXED_TEXT_WHITE.test(literal) && LIGHTENED_DARK_FILL.test(literal)
}

// ─── file discovery ──────────────────────────────────────────────────────────

// process.cwd() is the repo root under `npm run test` (vitest.config.ts sets no root).
const ROOT = process.cwd()

function collectTsx(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const found: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) found.push(...collectTsx(full))
    else if (entry.isFile() && entry.name.endsWith('.tsx')) found.push(full)
  }
  return found
}

const files = [...collectTsx(path.join(ROOT, 'app')), ...collectTsx(path.join(ROOT, 'components'))]
const sources = files.map((file) => ({
  rel: path.relative(ROOT, file).replace(/\\/g, '/'),
  literals: extractLiterals(fs.readFileSync(file, 'utf8')),
}))

/** Every offending literal in every file, so a failure lists all files at once. */
function violationsOf(predicate: (literal: string) => boolean): string[] {
  const violations: string[] = []
  for (const { rel, literals } of sources) {
    for (const literal of literals) {
      if (predicate(literal)) {
        violations.push(`${rel}: ${literal.replace(/\s+/g, ' ').trim().slice(0, 140)}`)
      }
    }
  }
  return violations
}

// ─── guard ───────────────────────────────────────────────────────────────────

describe('dark mode guard', () => {
  it('scans the real tree, not zero files', () => {
    expect(files.length).toBeGreaterThanOrEqual(20)
    const rels = sources.map((s) => s.rel)
    expect(rels).toContain('components/AppShell.tsx')
    expect(rels).toContain('app/layout.tsx')
  })

  it('rule 1: uses no token class, because globals.css has no @theme to generate it', () => {
    expect(violationsOf(hasTokenClass)).toEqual([])
  })

  it('rule 2: pairs every bg-white with a dark:bg- class in the same literal', () => {
    expect(violationsOf(isUnpairedWhiteSurface)).toEqual([])
  })

  it('rule 3: keeps white-text fills off dark 400/500 shades, which fall below 4.5:1', () => {
    expect(violationsOf(hasLightenedFilledButton)).toEqual([])
  })
})

// ─── scanner self-tests ──────────────────────────────────────────────────────

describe('dark mode guard scanner', () => {
  it('extracts double-quoted, single-quoted and template literals', () => {
    const source = 'const a = "x y"\nconst b = \'z\'\nconst c = `p ${q} r`\nconst e = ""'
    expect(extractLiterals(source)).toEqual(['x y', 'z', 'p ${q} r', ''])
  })

  it('keeps a multi-line double-quoted class string whole', () => {
    const source = 'className="a\n  bg-white\n  dark:bg-gray-900"'
    expect(extractLiterals(source)).toEqual(['a\n  bg-white\n  dark:bg-gray-900'])
  })

  it('consumes a // inside a string as part of the string', () => {
    expect(extractLiterals('const u = "https://x" + \'bg-white\'')).toEqual(['https://x', 'bg-white'])
  })

  it('skips line and block comments, including an apostrophe inside one', () => {
    expect(extractLiterals("// Fixed nav bar - bg-white matches AppShell's header\nconst n = 1")).toEqual([])
    expect(extractLiterals("{/* bg-white matches AppShell's header */}")).toEqual([])
  })

  it('flags an unpaired bg-white and nothing else', () => {
    expect(isUnpairedWhiteSurface('bg-white text-gray-900')).toBe(true)
    expect(isUnpairedWhiteSurface('bg-white dark:bg-gray-900')).toBe(false)
    expect(isUnpairedWhiteSurface('bg-gray-900 text-white dark:bg-white dark:text-gray-900')).toBe(false)
    expect(isUnpairedWhiteSurface('hover:bg-white')).toBe(false)
  })

  it('matches token classes as whole tokens', () => {
    expect(hasTokenClass('text-primary-foreground')).toBe(true)
    expect(hasTokenClass('hover:bg-muted')).toBe(true)
    expect(hasTokenClass('rounded-radius-md')).toBe(true)
    expect(hasTokenClass('bg-muted/50')).toBe(true)
    expect(hasTokenClass('text-title')).toBe(false)
    expect(hasTokenClass('bg-primary-500')).toBe(false)
  })

  it('flags a white-text fill that lightens in dark, not the demo pill or a 600 fill', () => {
    expect(hasLightenedFilledButton('bg-indigo-600 text-white dark:bg-indigo-500')).toBe(true)
    expect(hasLightenedFilledButton('bg-indigo-600 text-white dark:hover:bg-indigo-400')).toBe(true)
    expect(hasLightenedFilledButton('bg-indigo-600 dark:bg-indigo-500')).toBe(false)
    expect(hasLightenedFilledButton('bg-indigo-600 text-white hover:bg-indigo-700')).toBe(false)
  })
})
