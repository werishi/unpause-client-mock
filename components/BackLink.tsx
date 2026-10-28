// Back link for the legal pages. The shared footer links to /privacy and /imprint from
// every route, so a fixed link to /login would strand a reviewer who came from /today
// or /plan. On a plain left click this goes back in history when there is an earlier
// entry (shouldGoBack); otherwise, and for every modified click, the Link's own href
// (BACK_FALLBACK_HREF, /login) applies. Next's Link is used instead of a raw <a> because
// eslint-config-next flags raw anchors to internal pages; it still renders a plain
// <a href="/login/"> in the static HTML, so the link works before hydration.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

import { BACK_FALLBACK_HREF, shouldGoBack } from "@/lib/domain/back-navigation";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";

/**
 * Back link at the top of a legal page. The caller passes the translated label; this
 * component imports no copy. Ctrl/Cmd/Shift/Alt and middle clicks stay native so
 * "open in new tab" keeps working.
 */
export default function BackLink(props: { label: string }) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.defaultPrevented
    ) {
      return;
    }
    if (shouldGoBack(window.history.length)) {
      event.preventDefault();
      router.back();
    }
  }

  return (
    <Link
      href={BACK_FALLBACK_HREF}
      onClick={handleClick}
      className={`inline-flex min-h-[44px] items-center self-start text-sm text-gray-600 underline underline-offset-2 dark:text-gray-400 ${focusRing}`}
    >
      {props.label}
    </Link>
  );
}
