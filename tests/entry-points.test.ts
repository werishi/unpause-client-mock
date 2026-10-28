/**
 * entry-points.test.ts — source-scan guard for the two entry points into the investor page work.
 *
 * The shared SiteFooter links to `/` (the investor page), so a viewer starting at the picker on
 * `/login` can find the pitch, and the PWA manifest starts at `/login` so an installed app opens
 * the demo rather than the pitch. Neither change fails the build if reverted, and there is no
 * jsdom in this target, so this file reads the sources as text (same technique as
 * tests/investor-page.test.ts). That `/login` renders the shared footer at all is pinned in
 * tests/site-footer.test.ts.
 *
 * Environment: Vitest node (no DOM, no browser globals needed).
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// process.cwd() is the repo root under `npm run test` (vitest.config.ts sets no root).
const ROOT = process.cwd()
const footerSrc = fs.readFileSync(path.join(ROOT, 'components', 'SiteFooter.tsx'), 'utf8')
const loginSrc = fs.readFileSync(path.join(ROOT, 'app', 'login', 'page.tsx'), 'utf8')
const manifestSrc = fs.readFileSync(path.join(ROOT, 'public', 'manifest.webmanifest'), 'utf8')

describe('entry points', () => {
  it('shared footer links to / with the about-project label', () => {
    expect(footerSrc).toMatch(/<Link\s+href="\/"[^>]*>\s*\{LOGIN\.aboutProjectLinkLabel\}/)
  })

  it('login page no longer carries its own footer link row', () => {
    expect(loginSrc).not.toContain('FOOTER_LINK')
    expect(loginSrc).not.toContain('LOGIN.aboutProjectLinkLabel')
  })

  it('manifest start_url is /login', () => {
    expect(JSON.parse(manifestSrc).start_url).toBe('/login')
  })
})
