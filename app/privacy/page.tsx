// /privacy: the mockup's privacy addendum. A bare route, so ShellFrame renders it
// inside its own <main> with no header or tab bar; the shared footer follows <main>.
// This page's root is an <article> and sets its own width and padding. Its first row
// carries the back link and the safety entry, because the footer is reached only after
// scrolling and goal G9 asks for one tap to /safety from any screen. Server component
// on purpose: it is reachable before the demo notice is accepted and must not depend
// on the store; BackLink is the only client island.
// All text comes from PRIVACY in lib/copy.ts, where the copy tests can reach it.
import BackLink from "@/components/BackLink";
import SafetyPlanLink from "@/components/SafetyPlanLink";
import { PRIVACY } from "@/lib/copy";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";

const linkClass = `underline underline-offset-2 ${focusRing}`;

/**
 * Privacy addendum page. Lists only what this mockup does beyond the main site's
 * policy: hosting logs, the two localStorage keys (from PRIVACY.storageRows, so the
 * keys are never hard-coded here), health data and tracking.
 */
export default function PrivacyPage() {
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink label={PRIVACY.backLabel} />
        <SafetyPlanLink />
      </div>

      <h1 className="text-xl font-semibold">{PRIVACY.heading}</h1>
      <p className="text-xs text-gray-500 dark:text-gray-400">{PRIVACY.draftNote}</p>
      <p className="text-sm leading-relaxed">{PRIVACY.intro}</p>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">{PRIVACY.hostingHeading}</h2>
        <p className="text-sm leading-relaxed">{PRIVACY.hostingBody}</p>
        <a
          href={PRIVACY.hostingLinkHref}
          rel="noopener noreferrer"
          className={`self-start text-sm ${linkClass}`}
        >
          {PRIVACY.hostingLinkLabel}
        </a>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">{PRIVACY.storageHeading}</h2>
        <p className="text-sm leading-relaxed">{PRIVACY.storageIntro}</p>
        {/* overflow-x-auto + break-all keep the table inside 360 px. */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th scope="col" className="py-2 pr-3 align-top text-sm font-semibold">
                  {PRIVACY.storageColumnKey}
                </th>
                <th scope="col" className="py-2 pr-3 align-top text-sm font-semibold">
                  {PRIVACY.storageColumnPurpose}
                </th>
              </tr>
            </thead>
            <tbody>
              {PRIVACY.storageRows.map((row) => (
                <tr key={row.key} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="py-2 pr-3 align-top text-sm">
                    <code className="break-all text-xs">{row.key}</code>
                  </td>
                  <td className="py-2 pr-3 align-top text-sm">{row.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="list-disc pl-5 text-sm leading-relaxed">
          {PRIVACY.storageNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">{PRIVACY.healthHeading}</h2>
        <p className="text-sm leading-relaxed">{PRIVACY.healthBody}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">{PRIVACY.trackingHeading}</h2>
        <p className="text-sm leading-relaxed">{PRIVACY.trackingBody}</p>
      </section>
    </article>
  );
}
