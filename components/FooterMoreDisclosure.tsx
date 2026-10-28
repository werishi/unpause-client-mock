"use client";

/**
 * FooterMoreDisclosure — the mobile "More information" toggle of the shared SiteFooter.
 *
 * The toggle is the only interactive thing in the footer, so it lives in this smallest possible
 * client component and SiteFooter stays a server component; that keeps the footer's static links
 * server-rendered instead of letting the "use client" boundary swallow them.
 *
 * The panel is an in-flow block, not a popover. The footer renders before TabBar and TabBar
 * renders its own in-flow spacer after it, so an in-flow block can never open underneath the
 * fixed `z-10` tab bar, whereas an upward popover would overlap the bar and need a z-index above
 * it.
 *
 * The panel is in the DOM at every width and is never conditionally mounted: from `lg` the same
 * elements are shown with no JavaScript and nothing exists twice in the DOM. Below `lg` the
 * collapsed state uses `hidden` (display: none), which also removes the collapsed links from the
 * tab order and the accessibility tree. The safety entry must never be passed in here as a child
 * — it stays outside the disclosure, visible at every width (goal G9, Not-a-medical-product
 * invariant).
 */

import { useId, useState } from "react";

/** Verbatim copy of `components/LoginPicker.tsx` FOCUS_RING, which that file does not export. */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:focus-visible:ring-indigo-400 dark:focus-visible:ring-offset-gray-900";

const PANEL_LAYOUT = "flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-12";

export type FooterMoreDisclosureProps = {
  /** Visible button label; static, because the open/closed state is carried by `aria-expanded`. */
  label: string;
  /** Panel content: collapsible below `lg`, always shown from `lg`. */
  children: React.ReactNode;
};

/** Renders the `lg:hidden` toggle button and the panel it controls as two siblings. */
export default function FooterMoreDisclosure({ label, children }: FooterMoreDisclosureProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-11 items-center text-sm text-gray-500 underline underline-offset-2 lg:hidden dark:text-gray-400 ${FOCUS_RING}`}
      >
        {label}
      </button>
      <div id={panelId} className={`${open ? "flex" : "hidden lg:flex"} ${PANEL_LAYOUT}`}>
        {children}
      </div>
    </>
  );
}
