/**
 * SiteFooter — the one footer rendered on every route: bare routes (`/`, `/login`, legal pages)
 * and app-shell routes alike, across three different content widths.
 *
 * Because it must look the same everywhere, it knows nothing about the route: it is a
 * self-contained full-width bar and does not use ShellWidth, which would make it too narrow for
 * `/` and would need a pathname read in a server component. On app-shell routes the footer row is
 * therefore wider than the 448 px content column above it from `md` up; that is intended and reads
 * as a site footer.
 *
 * Server component. The only interactive part, the mobile "More information" toggle, is isolated
 * in FooterMoreDisclosure so these links stay server-rendered.
 *
 * The disclaimer and the `/safety` link sit outside the disclosure and are visible at every width:
 * the safety entry is never folded away (goal G9, profile Not-a-medical-product invariant). It is
 * a plain text link, not SafetyPlanLink, so it does not compete with the top-bar button.
 *
 * The bottom padding has a safe-area floor because bare routes have no tab bar, and the `/safety`
 * link must not sit under an iPhone home indicator; on app-shell routes the extra inset adds at
 * most a few pixels above TabBar's own spacer, which is accepted. No other bottom padding is added
 * for the tab bar — TabBar renders its own in-flow spacer.
 *
 * "About the project" links to `/` and stays visible on `/` itself: hiding it would need a
 * pathname read in a server component, and a self-link to the top of the page is harmless.
 */

import Link from "next/link";
import FooterMoreDisclosure from "@/components/FooterMoreDisclosure";
import { LOGIN, SHELL } from "@/lib/copy";

/** Verbatim copy of `components/LoginPicker.tsx` FOCUS_RING, which that file does not export. */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:focus-visible:ring-indigo-400 dark:focus-visible:ring-offset-gray-900";

/** Muted underlined text link; the focus ring is appended at each use. */
const TEXT_LINK = "text-sm text-gray-500 underline underline-offset-2 dark:text-gray-400";

/** Muted body text for the disclaimer and the crisis note. */
const MUTED_TEXT = "text-sm text-gray-500 dark:text-gray-400";

/** Full-size touch target below `lg`, relaxed on desktop where a pointer is the norm. */
const TOUCH_TARGET = "inline-flex min-h-11 items-center lg:min-h-0";

/** Renders the site-wide footer: disclaimer, safety link, and the collapsible crisis/legal panel. */
export default function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-700">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:justify-between">
          <p className={MUTED_TEXT}>{SHELL.footer}</p>
          <Link
            href="/safety"
            className={`inline-flex min-h-11 items-center ${TEXT_LINK} ${FOCUS_RING}`}
          >
            {LOGIN.crisisLinkLabel}
          </Link>
          <FooterMoreDisclosure label={SHELL.footerMoreLabel}>
            <p className={MUTED_TEXT}>{LOGIN.crisisNote}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <Link href="/privacy" className={`${TOUCH_TARGET} ${TEXT_LINK} ${FOCUS_RING}`}>
                {LOGIN.privacyLinkLabel}
              </Link>
              <Link href="/imprint" className={`${TOUCH_TARGET} ${TEXT_LINK} ${FOCUS_RING}`}>
                {LOGIN.imprintLinkLabel}
              </Link>
              <Link href="/" className={`${TOUCH_TARGET} ${TEXT_LINK} ${FOCUS_RING}`}>
                {LOGIN.aboutProjectLinkLabel}
              </Link>
            </div>
          </FooterMoreDisclosure>
        </div>
      </div>
    </footer>
  );
}
