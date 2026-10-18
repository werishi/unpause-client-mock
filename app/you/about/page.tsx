/**
 * About Unpause page (/you/about).
 *
 * Displays the app's safety note (from START_SCREEN — the longer disclaimer
 * text) and the about body (mockup disclaimer + safety-page note). Neither
 * section names a medical claim or implies a therapeutic outcome.
 *
 * Server component — static content only; no client hooks needed.
 */

import { ABOUT, START_SCREEN } from "@/lib/copy";

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-xl font-semibold">{ABOUT.heading}</h1>
      <p className="text-sm leading-relaxed">{START_SCREEN.safetyNote}</p>
      <p className="text-sm leading-relaxed">{ABOUT.body}</p>
    </div>
  );
}
