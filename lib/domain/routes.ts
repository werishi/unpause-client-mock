/**
 * Route predicates shared by the tab bar and the notification banner
 * (`isTabRoute`), plus the shell-width decision (`isWideRoute`), which is consumed only
 * by `ShellWidth`. Also the bare-route test (`isBareRoute`: pages rendered without the
 * app chrome) and the entry-route decision (`entryRouteFor`: where opening the app lands).
 * Also the login-gate exemption (`isGateExemptRoute`: the bare routes plus `/safety` and
 * every `/safety/*` sub-page, which the demo login gate must never stand in front of).
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

/**
 * True on exactly the routes whose content may use the wide shell: `/look-back` and
 * `/you`. Accepts raw (`/you/`) or normalized input; `normalizePathname` runs first
 * because `trailingSlash: true` makes `usePathname()` return `/you/`.
 *
 * The match is exact on purpose and must never become `startsWith`: the `/you/*`
 * sub-pages (`/you/values`, `/you/about`, `/you/demo`, `/you/digest`, `/you/media`,
 * `/you/buddy`, `/you/therapist`, ...) were designed for the 448 px column and stay
 * there. Consumed only by `ShellWidth`, so no component hard-codes route literals.
 */
export function isWideRoute(pathname: string): boolean {
  const p = normalizePathname(pathname);
  return p === "/look-back" || p === "/you";
}

/**
 * True on exactly the bare routes: the root `/`, `/login`, `/privacy` and `/imprint`.
 * Accepts raw (`/login/`) or normalized input; `normalizePathname` runs first because
 * `trailingSlash: true` makes `usePathname()` return the slashed form.
 *
 * `/` is the investor page: it renders full width, wider than the shell's 448 px column,
 * and because `isGateExemptRoute` passes every bare route, an anonymous visitor reads it
 * without the demo login gate.
 *
 * Exact match on purpose, never `startsWith`, for the same reason as `isWideRoute`:
 * `/login` must not swallow a later `/login-help`. This is the single copy of the bare
 * paths, so no component hard-codes them.
 */
export function isBareRoute(pathname: string): boolean {
  const p = normalizePathname(pathname);
  return p === "/" || p === "/login" || p === "/privacy" || p === "/imprint";
}

/**
 * True on the routes the demo login gate lets through without a login: the bare routes
 * (`isBareRoute`) plus `/safety` and every page under `/safety/`. Accepts raw
 * (`/safety/edit/`) or normalized input.
 *
 * The `/safety/` part is a prefix match on purpose, unlike the exact `isBareRoute`:
 * `/safety/edit` already exists and any later safety sub-page is crisis-adjacent, and
 * the Tone invariant forbids putting a demo checkbox in front of help. The trailing `/`
 * in the prefix keeps `/safety-plan` out. The gate in `ShellFrame` is the only caller.
 */
export function isGateExemptRoute(pathname: string): boolean {
  const p = normalizePathname(pathname);
  return isBareRoute(p) || p === "/safety" || p.startsWith("/safety/");
}

/**
 * The slice of store state `entryRouteFor` needs. A structural type rather than the
 * store's state type, because `lib/domain/` must not import from `lib/store/` (cycle).
 */
export interface EntryRouteInput {
  /** When the journey started; `null` until the first start. */
  startedAt: string | null;
  /** Whether the welcome-back screen is due after a break. */
  welcomeBackDue: boolean;
}

/**
 * Where opening the app lands: `/welcome` before any journey has started, else
 * `/welcome-back` when a welcome back is due, else `/today`.
 *
 * `startedAt === null` is checked first, so `welcomeBackDue: true` with no start still
 * returns `/welcome`: the flag only means something once a journey has started.
 */
export function entryRouteFor(state: EntryRouteInput): "/welcome" | "/welcome-back" | "/today" {
  if (state.startedAt === null) return "/welcome";
  if (state.welcomeBackDue) return "/welcome-back";
  return "/today";
}
