// Back navigation for the legal pages (/privacy, /imprint). Pure, no React, so Vitest
// can test it in the node environment without jsdom.

/** Where the back link goes when there is no earlier history entry to return to. */
export const BACK_FALLBACK_HREF = "/login";

/**
 * Whether the back link should call history back instead of following its href.
 * A legal page opened directly (typed URL, new tab, shared link) has a history of
 * length 1, so it falls back to BACK_FALLBACK_HREF; anything longer goes back.
 *
 * Known limit: an entry that came from another website also counts as history, so
 * Back would leave the app in that case. Accepted for a mockup: the alternative, a
 * referrer check, is unreliable under static export and was refused by the
 * global-footer concept as over-engineering for the shared-link case.
 */
export function shouldGoBack(historyLength: number): boolean {
  return historyLength > 1;
}
