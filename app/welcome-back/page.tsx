"use client";

/**
 * Welcome-back screen (/welcome-back).
 *
 * Shown when `welcomeBackDue` is true in the user store — meaning the user
 * has been away at least WELCOME_BACK_GAP_DAYS (4) days. The screen names no
 * gap length and no missed-activity count (G5, G10: no shaming, no streak
 * language). The single CTA calls `acknowledgeWelcomeBack()` — which sets
 * `welcomeBackDue = false` — then navigates to /today. After that, the entry
 * redirect at / will not route here again until the user is away another 4 days.
 *
 * Guards on `hydrated` before rendering the CTA: writing to the store before
 * the mount effect has rehydrated from localStorage would overwrite the
 * just-loaded state with a stale write (see Domain Notes Part 1).
 *
 * "use client" is required: this component reads from the store via useUserData
 * and calls useRouter — neither is available in a server component.
 */

import { useRouter } from "next/navigation";
import { useUserData } from "@/lib/store/user-store";
import { WELCOME_BACK } from "@/lib/copy";

export default function WelcomeBackPage() {
  const { hydrated, acknowledgeWelcomeBack, plainVersion } = useUserData();
  const router = useRouter();

  const handleCta = () => {
    acknowledgeWelcomeBack();
    router.push("/today");
  };

  if (!hydrated) return null;

  return (
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-2xl font-semibold">{WELCOME_BACK.headline}</h1>
      <p className="text-base leading-relaxed">{WELCOME_BACK.body}</p>
      {hydrated && !plainVersion && (
        <p className="text-base leading-relaxed">{WELCOME_BACK.bonusLine}</p>
      )}
      <button
        onClick={handleCta}
        className="self-start rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white dark:bg-indigo-500"
      >
        {WELCOME_BACK.ctaLabel}
      </button>
    </div>
  );
}
