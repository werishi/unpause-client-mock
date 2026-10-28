/**
 * site-footer.test.ts — source-scan guard for the one shared footer rendered on every route.
 *
 * There is no jsdom in this target and the build does not render pages, so a footer dropped from
 * one branch of ShellFrame, a legal link that stops being rendered, the `/safety` link folded into
 * the mobile disclosure (the defect goal G9 forbids), or a client directive that swallows the
 * footer's static links would all pass the build. This file reads the sources as text and checks
 * them against SHELL and LOGIN in lib/copy.ts — same technique as tests/entry-points.test.ts and
 * tests/investor-page.test.ts.
 *
 * Environment: Vitest node (no DOM, no browser globals needed).
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SHELL, LOGIN } from '../lib/copy'

// process.cwd() is the repo root under `npm run test` (vitest.config.ts sets no root).
const ROOT = process.cwd()
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8')

const footerSrc = read('components', 'SiteFooter.tsx')
const disclosureSrc = read('components', 'FooterMoreDisclosure.tsx')
const appShellSrc = read('components', 'AppShell.tsx')
const shellFrameSrc = read('components', 'ShellFrame.tsx')
const pageSrc = read('app', 'page.tsx')
const sectionsSrc = read('components', 'InvestorSections.tsx')

const FOOTER_REFS = [
  'SHELL.footer',
  'SHELL.footerMoreLabel',
  'LOGIN.crisisNote',
  'LOGIN.crisisLinkLabel',
  'LOGIN.privacyLinkLabel',
  'LOGIN.imprintLinkLabel',
  'LOGIN.aboutProjectLinkLabel',
]

// [href, copy reference rendered as the link text]
const FOOTER_LINKS: Array<[string, string]> = [
  ['/safety', 'LOGIN.crisisLinkLabel'],
  ['/privacy', 'LOGIN.privacyLinkLabel'],
  ['/imprint', 'LOGIN.imprintLinkLabel'],
  ['/', 'LOGIN.aboutProjectLinkLabel'],
]

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

describe('SiteFooter', () => {
  it('references every footer copy key', () => {
    expect(FOOTER_REFS.filter((ref) => !footerSrc.includes(ref))).toEqual([])
  })

  it.each(FOOTER_LINKS)('links %s with %s as its text', (href, ref) => {
    const re = new RegExp(`<Link\\s+href="${escapeRe(href)}"[^>]*>\\s*\\{${escapeRe(ref)}\\}`)
    expect(footerSrc).toMatch(re)
  })

  it('keeps the /safety link outside the FooterMoreDisclosure element', () => {
    const safety = footerSrc.indexOf('href="/safety"')
    const open = footerSrc.indexOf('<FooterMoreDisclosure')
    const close = footerSrc.indexOf('</FooterMoreDisclosure>')
    expect(safety).toBeGreaterThanOrEqual(0)
    expect(open).toBeGreaterThanOrEqual(0)
    expect(close).toBeGreaterThan(open)
    expect(safety < open || safety > close).toBe(true)
  })

  it('stays a server component independent of the investor page and the old login footer', () => {
    expect(footerSrc).not.toContain('"use client"')
    expect(footerSrc).not.toMatch(/from\s+["'][^"']*InvestorSections["']/)
    expect(footerSrc).not.toContain('FOOTER_LINK')
  })
})

describe('FooterMoreDisclosure', () => {
  it('is a client component with an accessible lg-hidden toggle', () => {
    expect(disclosureSrc.trimStart().startsWith('"use client"')).toBe(true)
    expect(disclosureSrc).toContain('aria-expanded')
    expect(disclosureSrc).toContain('aria-controls')
    expect(disclosureSrc).toContain('lg:hidden')
  })

  it('never conditionally mounts its children', () => {
    expect(disclosureSrc).not.toMatch(/\{\s*open\s*&&/)
  })

  it('has a non-empty label with no digit', () => {
    expect(typeof SHELL.footerMoreLabel).toBe('string')
    expect(SHELL.footerMoreLabel.trim().length).toBeGreaterThan(0)
    expect(SHELL.footerMoreLabel).not.toMatch(/\d/)
  })
})

describe('footer placement', () => {
  it('AppShell passes SiteFooter and renders no footer of its own', () => {
    expect(appShellSrc).toContain('<SiteFooter />')
    expect(appShellSrc).not.toContain('<footer')
  })

  it('ShellFrame renders the footer once in each branch', () => {
    expect(shellFrameSrc.split('{footer}').length - 1).toBe(2)
  })

  it('ShellFrame bare branch renders the footer after </main>', () => {
    // The bare branch runs from `if (bare)` to the shell branch's `return (`, which is the
    // second `return (` after it — the first is the bare branch's own.
    const start = shellFrameSrc.indexOf('if (bare)')
    const bareReturn = shellFrameSrc.indexOf('return (', start)
    const shellReturn = shellFrameSrc.indexOf('return (', bareReturn + 1)
    expect(start).toBeGreaterThanOrEqual(0)
    expect(shellReturn).toBeGreaterThan(bareReturn)
    const bareBranch = shellFrameSrc.slice(start, shellReturn)
    const mainClose = bareBranch.indexOf('</main>')
    expect(mainClose).toBeGreaterThanOrEqual(0)
    expect(bareBranch.indexOf('{footer}')).toBeGreaterThan(mainClose)
  })

  it('the investor page no longer has its own footer', () => {
    expect(pageSrc).not.toContain('InvestorFooter')
    expect(sectionsSrc).not.toContain('InvestorFooter')
  })
})
