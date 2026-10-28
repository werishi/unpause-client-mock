"use client";

/**
 * UserMenu — the header avatar button and its panel: who is signed in, and Log out.
 *
 * The only interactive thing in the header, so it is one self-contained client island; AppShell
 * stays a server component and the header stays server-rendered.
 *
 * It is a disclosure (a button with aria-expanded and aria-controls that shows a panel), not an
 * ARIA menu, and the trigger deliberately carries no aria-haspopup. That attribute promises
 * role=menu semantics with arrow-key movement between menuitems, and this panel holds a text line
 * and a group of buttons; claiming a menu without building its keyboard behaviour is worse for a
 * screen-reader user than the plain disclosure pattern. A real menu would be a deliberate rewrite.
 *
 * Positioning: the panel is absolute and nothing inside this component is relative, so it
 * positions against the relative header row in AppShell. A panel anchored to the 44 px trigger
 * would be 20rem wide with its right edge at the trigger, which runs off the left of a 360 px
 * screen. It opens below the header row, so it never covers SafetyPlanLink. It needs no z-index
 * of its own: the header is z-30, above the z-20 notification banner.
 *
 * Shown only when shouldShowUserMenu holds (hydrated, and not a per-new visitor still before
 * /welcome). Log out only navigates to /login and keeps the stored data, so the /login Continue
 * card can still offer to continue as this character; the mockup has no accounts (GOALS.md
 * Non-Goal). Accepted consequence: browser Back after Log out returns to an app route with the
 * same character loaded.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import DemoSwitch from "@/components/DemoSwitch";
import { LOGIN, SHELL } from "@/lib/copy";
import { shouldShowUserMenu, userInitial, userMenuName } from "@/lib/domain/user-menu";
import { getPersonas } from "@/lib/repo/persona-repo";
import { useUserData } from "@/lib/store/user-store";

/** Verbatim copy of the focus ring in components/LoginPicker.tsx, which does not export it. */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:focus-visible:ring-indigo-400 dark:focus-visible:ring-offset-gray-900";

/** Header user menu; renders nothing until the store has hydrated and someone is signed in. */
export default function UserMenu() {
  const { hydrated, personaId, startedAt } = useUserData();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const persona = getPersonas().find((p) => p.id === personaId);
  const name = userMenuName(personaId, persona?.displayName, LOGIN.continueOwnCharacter);

  /** Closes the panel and returns focus to the trigger. Used by Escape and by the demo part. */
  const closeMenu = useCallback((): void => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  /*
   * Outside interaction closes the panel without moving focus, since the user already chose
   * where focus goes. focusin covers Tab leaving the panel and works in Safari, where clicking
   * a button does not focus it; that is why onBlur on the wrapper was not used.
   */
  useEffect(() => {
    if (!open) return;
    const isOutside = (target: EventTarget | null): boolean =>
      !(target instanceof Node && rootRef.current?.contains(target));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (isOutside(event.target)) setOpen(false);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (isOutside(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open, closeMenu]);

  /*
   * The header is not remounted between routes, so the panel must not survive a navigation.
   * Adjusted during render (React's "storing information from previous renders" pattern) rather
   * than in an effect, which react-hooks/set-state-in-effect rejects as a cascading render.
   */
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  if (!shouldShowUserMenu({ hydrated, personaId, startedAt })) return null;

  /** Navigates to /login and nothing else: no reset, no storage access, no signed-out flag. */
  const logOut = () => {
    setOpen(false);
    router.push("/login");
  };

  return (
    <div ref={rootRef} className="flex items-center">
      <button
        ref={triggerRef}
        type="button"
        aria-label={SHELL.userMenuLabel}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-sm font-semibold text-gray-900 hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 ${FOCUS_RING}`}
      >
        <span aria-hidden="true">{userInitial(name)}</span>
      </button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={SHELL.userMenuLabel}
          className="absolute right-4 top-full mt-1 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="flex flex-col gap-3">
            <p className="truncate text-sm text-gray-700 dark:text-gray-300">
              {SHELL.signedInAs.replace("{name}", name)}
            </p>
            <button
              type="button"
              onClick={logOut}
              className={`inline-flex min-h-11 w-full items-center justify-center rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-900 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800 ${FOCUS_RING}`}
            >
              {SHELL.logOutLabel}
            </button>
          </div>
          <DemoSwitch onDone={closeMenu} />
        </div>
      )}
    </div>
  );
}
