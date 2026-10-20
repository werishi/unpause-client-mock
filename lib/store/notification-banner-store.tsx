"use client";

/**
 * NotificationBannerProvider and useNotificationBanner — the transient Demo
 * replay request for the in-app notification banners.
 *
 * Holds one value: which banner (`checkIn` or `digest`) You → Demo has asked to
 * replay, or `null` when no replay is pending. You → Demo is the writer; the
 * banner rendered inside AppShell reads the request and clears it when it closes.
 *
 * The request lives in React state only and is deliberately not persisted.
 * Concept 2.8 requires that a reload ends a replay and that a replay writes no
 * stored record. The user store was refused as the home for it: its `update()`
 * persists every field, so the flag would survive a reload and would have to be
 * excluded by hand from `buildInitialState`, `hydrate` and the persona carry-over
 * lists — three places to forget. A URL query parameter was refused for the same
 * persistence reason, and because the Demo page would have to navigate to show a
 * banner on itself.
 *
 * This module knows nothing about how a banner looks or which banner wins when a
 * real one is also due (slice 3 decides that); it only carries the request. It
 * imports nothing from the user store, `lib/domain/` or `components/`, and never
 * touches localStorage, so a test without a DOM can import it.
 *
 * NotificationBannerProvider must be mounted once in app/layout.tsx, outside
 * AppShell, so that both the Demo page and the banner inside the shell reach the
 * same context.
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

/** The banners that You → Demo can replay. */
export type BannerKind = "checkIn" | "digest";

/** The replay request and its two actions, exposed through context. */
export interface NotificationBannerContextValue {
  /**
   * Non-null from the moment You → Demo asks for a replay until the banner
   * closes; `null` otherwise. Resets to `null` on reload.
   */
  replayRequest: BannerKind | null;
  /**
   * Asks for `kind` to be replayed. The same kind again is a no-op by state
   * equality; the other kind replaces the pending request. Writes nothing to
   * any store. Referentially stable.
   */
  requestReplay: (kind: BannerKind) => void;
  /** Clears the pending request; called by the banner when it closes. Referentially stable. */
  clearReplay: () => void;
}

const NotificationBannerContext = createContext<NotificationBannerContextValue | null>(null);

/**
 * Provides the replay request to the entire app tree. Mount once in
 * app/layout.tsx between FlowProvider and AppShell. Accepts children only.
 */
export function NotificationBannerProvider({ children }: { children: ReactNode }) {
  const [replayRequest, setReplayRequest] = useState<BannerKind | null>(null);

  const requestReplay = useCallback((kind: BannerKind) => setReplayRequest(kind), []);
  const clearReplay = useCallback(() => setReplayRequest(null), []);

  // Keyed on replayRequest only (the callbacks are stable), so consumers do not
  // re-render when the parent re-renders for an unrelated reason.
  const value = useMemo<NotificationBannerContextValue>(
    () => ({ replayRequest, requestReplay, clearReplay }),
    [replayRequest, requestReplay, clearReplay],
  );

  return (
    <NotificationBannerContext.Provider value={value}>{children}</NotificationBannerContext.Provider>
  );
}

/**
 * Returns the current NotificationBannerContextValue. Throws if called outside
 * NotificationBannerProvider, so a missing mount fails loudly instead of the
 * Demo replay silently doing nothing.
 */
export function useNotificationBanner(): NotificationBannerContextValue {
  const value = useContext(NotificationBannerContext);
  if (value === null) {
    throw new Error("useNotificationBanner must be used inside NotificationBannerProvider");
  }
  return value;
}
