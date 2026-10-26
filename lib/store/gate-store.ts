/**
 * Gate store — the visitor's "I understand this is a demo" acceptance, remembered per browser.
 *
 * Single shared source of truth for the demo gate. Two components read it: the shell wrapper
 * (redirects to `/login` while the gate is unaccepted) and the `/login` page (writes it). Both go
 * through `useGate()` in `use-gate.ts`, which subscribes via `useSyncExternalStore`, so the moment
 * `/login` accepts, the wrapper sees the new status in the same tick. A separate `useState` in each
 * component would leave the wrapper stale for a render and bounce the visitor back to `/login`.
 *
 * Why this lives under its own key and NOT inside `unpause.demo.v2`:
 *  - `loadPersona` rebuilds the demo state from `buildInitialState()`, and
 *  - `resetDemoData` deletes the whole `unpause.demo.v2` key,
 * so a flag stored inside the demo blob would be erased by every character switch and every reset,
 * sending the visitor back through the gate. `resetDemoData` must therefore never touch
 * `GATE_STORAGE_KEY`. sessionStorage was also refused: the user decided on 2026-10-25 that the
 * acceptance is remembered per browser, not per tab session.
 *
 * Storage contract (profile `localStorage` invariant): every access is inside try/catch, because a
 * bare `localStorage` reference throws during server prerender and in Node, and can throw in private
 * windows. When storage is unavailable the acceptance still holds for the current visit through the
 * module-level `acceptedInMemory` flag.
 *
 * `getGateStatus` reads storage on every call rather than caching, so clearing site data in another
 * tab is respected on the next read. It returns a primitive string, which keeps the
 * `useSyncExternalStore` snapshot referentially stable. The server snapshot is `"unknown"` so the
 * gated UI renders only once the client has read the real status — no flash of the wrong state.
 *
 * There is deliberately no un-accept function: the gate is a one-way acknowledgement.
 *
 * No `"use client"` directive and no React import, so Node unit tests can import this file.
 */

export const GATE_STORAGE_KEY = 'unpause.gate.v1';

/** `"unknown"` exists only on the server / before hydration; the client resolves to the other two. */
export type GateStatus = 'unknown' | 'unaccepted' | 'accepted';

let acceptedInMemory = false;
const listeners = new Set<() => void>();

/**
 * Client snapshot. `"accepted"` when storage holds exactly `"1"` under `GATE_STORAGE_KEY`, or when
 * this visit accepted while storage was unavailable. Any other stored value counts as unaccepted.
 */
export function getGateStatus(): 'unaccepted' | 'accepted' {
  try {
    if (localStorage.getItem(GATE_STORAGE_KEY) === '1') return 'accepted';
  } catch {
    // Storage unavailable (server, Node, blocked site data) — fall back to the memory flag.
  }
  return acceptedInMemory ? 'accepted' : 'unaccepted';
}

/** Server snapshot: the status cannot be known before the client reads storage. */
export function getServerGateStatus(): 'unknown' {
  return 'unknown';
}

/**
 * Records acceptance. The memory flag is set first so the acceptance holds for this visit even when
 * the storage write fails; then storage is written; then every subscriber is notified. Never throws.
 */
export function acceptGate(): void {
  acceptedInMemory = true;
  try {
    localStorage.setItem(GATE_STORAGE_KEY, '1');
  } catch {
    // Storage unavailable — acceptance survives for this visit only, via acceptedInMemory.
  }
  listeners.forEach((listener) => listener());
}

/** `useSyncExternalStore` subscribe function; returns the unsubscribe callback. */
export function subscribeGate(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test-only: clears the in-memory flag. Does not touch storage or listeners. */
export function resetGateMemory(): void {
  acceptedInMemory = false;
}
