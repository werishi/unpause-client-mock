/**
 * Login page (/login): the demo's entry screen.
 *
 * Left column: static explanation and notices, always visible and never behind the demo-notice
 * checkbox. They stay unconditional because acceptance is remembered per browser, so a second
 * viewer on the same browser would otherwise never see the demo notice.
 * Right column: `LoginPicker`, the client child that owns the checkbox gate and the character choice.
 *
 * The crisis link to /safety lives here because the shell header (and with it `SafetyPlanLink`) is
 * hidden on this route; removing it would break the profile's "safety plan one tap away" rule.
 * It is never gated or disabled.
 *
 * The footer row links to `/`, the investor landing page, so a viewer who starts here can still
 * find the pitch; it sits with the legal links rather than the picker column so it never competes
 * with the character cards.
 *
 * Server component: static content only. Importing the client `LoginPicker` is valid. No `<main>`,
 * because the frame supplies it.
 */

import Link from "next/link";
import { LoginPicker } from "@/components/LoginPicker";
import { LOGIN, START_SCREEN } from "@/lib/copy";

const H2 = "text-lg font-semibold";
const BODY = "text-sm leading-relaxed";
const FOOTER_LINK = "text-sm text-gray-500 underline underline-offset-2 dark:text-gray-400";

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 lg:grid lg:grid-cols-2 lg:gap-12 lg:py-12">
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold">{LOGIN.pageTitle}</h1>
          <p className="text-base text-gray-500 dark:text-gray-400">{LOGIN.tagline}</p>
          <h2 className={H2}>{LOGIN.aboutHeading}</h2>
          <p className={BODY}>{LOGIN.aboutBody}</p>
          <p className={BODY}>{LOGIN.mockupNote}</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={H2}>{LOGIN.howHeading}</h2>
          <ol className="list-decimal pl-5 flex flex-col gap-2 text-sm leading-relaxed">
            {LOGIN.howSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={H2}>{LOGIN.noticesHeading}</h2>
          <p className={BODY}>{START_SCREEN.safetyNote}</p>
          <p className={BODY}>
            {LOGIN.crisisNote}{" "}
            <Link href="/safety" className="underline underline-offset-2">
              {LOGIN.crisisLinkLabel}
            </Link>
          </p>
          <p className={BODY}>{LOGIN.demoDataNote}</p>
        </section>

        <div className="flex flex-wrap gap-4">
          <Link href="/privacy" className={FOOTER_LINK}>
            {LOGIN.privacyLinkLabel}
          </Link>
          <Link href="/imprint" className={FOOTER_LINK}>
            {LOGIN.imprintLinkLabel}
          </Link>
          <Link href="/" className={FOOTER_LINK}>
            {LOGIN.aboutProjectLinkLabel}
          </Link>
        </div>
      </div>
      <LoginPicker />
    </div>
  );
}
