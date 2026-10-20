/**
 * Route predicates shared by the tab bar and the notification banner.
 *
 * Pure TS, no React — the components pass in what `usePathname()` returned.
 *
 * Allow-list rationale: every new route is a focused flow by default; a forgotten
 * allow-list entry hides the tab bar (and the banner) rather than leaking one into a
 * flow (concept 2.2). Keeping the single copy here is what stops the tab bar and the
 * banner from drifting apart.
 */

/**
 * Strips one trailing slash unless the path is the root "/".
 *
 * `next.config.ts` sets `trailingSlash: true`, so `usePathname()` returns `/today/` and
 * `/you/`. Call this before comparing a pathname to a literal.
 */
export function normalizePathname(raw: string): string {
  return raw !== "/" && raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

/**
 * True on exactly the routes where the tab bar shows: `/today`, `/plan`, `/look-back`,
 * and `/you` plus its sub-pages except `/you/values*`. Accepts raw (`/today/`) or
 * normalized input.
 *
 * This is also the banner-route test: the notification banner calls it so that a banner
 * appears only where the tab bar does, never on a focused flow.
 *
 * `startsWith("/you")` is deliberately left as-is (it would also match a hypothetical
 * `/yours`); the predicate was extracted from `TabBar.tsx` behaviour-neutral, and
 * tightening it is a separate decision.
 */
export function isTabRoute(pathname: string): boolean {
  const p = normalizePathname(pathname);
  return (
    p === "/today" ||
    // Exact match: focused flows that may live under /plan/* must not get the tab bar.
    p === "/plan" ||
    p === "/look-back" ||
    // /you itself and its sub-pages (/you/demo, /you/about) show the tab bar;
    // focused flows under /you/values are excluded, mirroring the /plan exact guard.
    (p.startsWith("/you") && !p.startsWith("/you/values"))
  );
}
