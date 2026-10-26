"use client";

import { useSyncExternalStore } from 'react';
import { acceptGate, getGateStatus, getServerGateStatus, subscribeGate } from './gate-store';

/**
 * Reads and writes the demo-gate acceptance held in `gate-store.ts`.
 *
 * Used by the shell wrapper (redirects to `/login` while `ready && !accepted`) and by the `/login`
 * page (calls `accept`). Both share the module-level store, so an `accept()` on `/login` is visible
 * to the wrapper in the same tick.
 *
 * `ready` is false during server render and the hydration pass (server snapshot `"unknown"`);
 * callers render gated content only once `ready` is true, which avoids flashing the wrong state.
 * Deliberately no `useState`/`useEffect`: a mount effect would first render the unaccepted state and
 * trips the repo's lint rule against setting state in effects.
 */
export function useGate(): { ready: boolean; accepted: boolean; accept: () => void } {
  const status = useSyncExternalStore(subscribeGate, getGateStatus, getServerGateStatus);
  return { ready: status !== 'unknown', accepted: status === 'accepted', accept: acceptGate };
}
