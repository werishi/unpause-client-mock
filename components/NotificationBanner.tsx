"use client";

/**
 * NotificationBanner — the simulated phone notification shown just below the fixed header.
 *
 * Shows at most one of two banners: the check-in reminder (first open of a day before the
 * energy check-in) or the digest-ready banner (first open after an unseen digest slot is
 * ready), plus the replays You → Demo requests through `useNotificationBanner()`. Mounted
 * once from `AppShell`, inside `UserDataProvider > FlowProvider > NotificationBannerProvider`;
 * it renders `null` before the store is hydrated, off tab routes and when nothing is due.
 *
 * Record versus `active`: the store records a banner as shown the moment it is displayed,
 * and the due-functions in `lib/domain/banners.ts` return false once that record exists.
 * A banner derived purely from "is it due" would therefore flash for one render and vanish.
 * So this component keeps a local `active` — "the banner this page load is showing" — that
 * outlives the record. The record answers "may a banner be started"; `active` answers "is
 * one on screen". Starting a banner is a side effect, so it happens in an effect, never in
 * render. A reload drops `active`, and the record then keeps the banner from repeating.
 *
 * Deliberately no timer of any kind: an auto-hide would take the sentence away from slow
 * readers and people using large text. A digest slot that arrives while the viewer sits on
 * one screen is therefore picked up on the next effect run (navigation, a store change).
 */

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BANNER } from "@/lib/copy";
import {
  dueDigestBanner,
  isCheckInReminderDue,
  isCheckInReminderSuppressed,
  type CheckInReminderInput,
  type DigestBannerInput,
} from "@/lib/domain/banners";
import { currentDigestSlot } from "@/lib/domain/digest";
import { isTabRoute } from "@/lib/domain/routes";
import { useNotificationBanner, type BannerKind } from "@/lib/store/notification-banner-store";
import { useUserData } from "@/lib/store/user-store";

export default function NotificationBanner() {
  const {
    hydrated,
    today,
    todayPlan,
    startedAt,
    welcomeBackDue,
    digestTimes,
    digestSeenSlot,
    checkInReminderShownDay,
    digestBannerShownSlot,
    markCheckInReminderShown,
    markDigestBannerShown,
    markDigestSeen,
  } = useUserData();
  const { replayRequest, clearReplay } = useNotificationBanner();
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState<BannerKind | null>(null);

  // A replay overlays `active` rather than replacing it: the real banner's record is already
  // written, so overwriting `active` would lose a banner the viewer never got to read.
  const displayed: { kind: BannerKind; replay: boolean } | null =
    replayRequest !== null
      ? { kind: replayRequest, replay: true }
      : active !== null
        ? { kind: active, replay: false }
        : null;
  const displayedKind = displayed?.kind ?? null;

  // Effect A — may only START a banner. Check-in is evaluated first; while `active` is set the
  // digest branch does not run, and `active` returning to null re-runs this effect so the
  // digest banner can follow.
  useEffect(() => {
    if (!hydrated) return;
    const checkIn: CheckInReminderInput = {
      hydrated,
      today,
      todayPlan,
      startedAt,
      welcomeBackDue,
      checkInReminderShownDay,
      pathname,
    };
    if (isCheckInReminderSuppressed(checkIn)) {
      // Welcome-back already spoke on this open: record the reminder as spent, show nothing.
      markCheckInReminderShown(today);
      return;
    }
    if (active !== null) return;
    if (isCheckInReminderDue(checkIn)) {
      // Record and `active` set in one effect, so React batches them into one render.
      markCheckInReminderShown(today);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: starting a banner after hydration is a side effect and must not happen in render
      setActive("checkIn");
      return;
    }
    const digest: DigestBannerInput = {
      hydrated,
      today,
      todayPlan,
      slot: currentDigestSlot(digestTimes, digestSeenSlot, new Date()),
      digestBannerShownSlot,
      checkInReminderVisible: displayedKind === "checkIn",
      pathname,
    };
    const slotKey = dueDigestBanner(digest);
    if (slotKey !== null) {
      markDigestBannerShown(slotKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: same post-hydration start as the check-in branch above
      setActive("digest");
    }
  }, [
    hydrated,
    today,
    todayPlan,
    startedAt,
    welcomeBackDue,
    checkInReminderShownDay,
    digestTimes,
    digestSeenSlot,
    digestBannerShownSlot,
    pathname,
    active,
    displayedKind,
    markCheckInReminderShown,
    markDigestBannerShown,
  ]);

  // Effect B — may only END a banner whose basis is gone. A null record means a demo reset or
  // persona switch re-armed the banners (Effect A then starts the re-armed one afresh); a
  // check-in already answered today makes the reminder pointless; a digest slot already seen
  // must not be announced as ready. The `!== null` guard matters: after a reset both digest
  // fields are null and the equality alone would be true.
  useEffect(() => {
    if (!hydrated) return;
    const checkInStale =
      active === "checkIn" &&
      (checkInReminderShownDay === null || todayPlan?.date === today);
    const digestStale =
      active === "digest" &&
      (digestBannerShownSlot === null || digestSeenSlot === digestBannerShownSlot);
    if (checkInStale || digestStale) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: ending a banner whose store basis changed is a side effect of that change
      setActive(null);
    }
  }, [hydrated, active, checkInReminderShownDay, todayPlan, today, digestBannerShownSlot, digestSeenSlot]);

  // Hidden, never cleared, off tab routes: a banner waiting on a focused flow shows again on
  // the next tab route of the same page load. Applies to replays as well.
  if (!hydrated || displayed === null || !isTabRoute(pathname)) return null;

  const { kind, replay } = displayed;

  function close() {
    if (replay) clearReplay();
    else setActive(null);
  }

  // The digest tap never calls markDigestSeen: /digest marks the slot seen in its own effect,
  // and marking it here would hide the Today card if the navigation were interrupted.
  function handleOpen() {
    close();
    router.push(kind === "checkIn" ? "/today" : "/digest");
  }

  // Digest "Not now" on a real banner does what the Today card's "Not now" does, so Today
  // cannot re-offer the slot just declined. A replay writes nothing at all.
  function handleDismiss() {
    close();
    if (kind === "digest" && !replay && digestBannerShownSlot !== null) {
      markDigestSeen(digestBannerShownSlot);
    }
  }

  return (
    <BannerPanel
      key={kind + (replay ? "-replay" : "")}
      kind={kind}
      onOpen={handleOpen}
      onDismiss={handleDismiss}
    />
  );
}

interface BannerPanelProps {
  kind: BannerKind;
  /** Body tap: close the banner and go where it points. */
  onOpen: () => void;
  /** "Not now": close the banner; any store write is the parent's decision. */
  onDismiss: () => void;
}

/**
 * The notification panel itself. Fixed under the header at `z-20` (header and tab bar are
 * `z-10`), never over it, so SafetyPlanLink stays tappable; the full-width outer layer is
 * `pointer-events-none` so the strip beside the panel does not swallow taps meant for the page.
 * The slide-in is `motion-safe:`-gated, so under reduced motion it is visible from frame one.
 * Remounted per banner by the parent's `key`, so each one animates in.
 */
function BannerPanel({ kind, onOpen, onDismiss }: BannerPanelProps) {
  const [entered, setEntered] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: flips the enter transition on the frame after mount
  useEffect(() => setEntered(true), []);

  return (
    <div className="fixed left-0 right-0 z-20 px-4 top-[calc(3.5rem+env(safe-area-inset-top))] pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <div
          role="status"
          aria-live="polite"
          className={`mt-2 flex items-stretch rounded-2xl border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800 shadow-lg motion-safe:transition motion-safe:duration-200 ${
            entered ? "" : "motion-safe:opacity-0 motion-safe:-translate-y-2"
          }`}
        >
          <button
            type="button"
            onClick={onOpen}
            className="flex-1 min-w-0 min-h-[44px] px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span
                aria-hidden="true"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-[0.625rem] font-semibold text-white"
              >
                {BANNER.appName.charAt(0)}
              </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{BANNER.appName}</span>
              <span className="ml-auto">{BANNER.timeLabel}</span>
            </span>
            <span className="mt-1 block text-gray-900 dark:text-gray-100">
              {kind === "checkIn" ? BANNER.checkInBody : BANNER.digestBody}
            </span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 min-h-[44px] px-4 text-sm text-gray-500 dark:text-gray-400"
          >
            {BANNER.dismissLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
