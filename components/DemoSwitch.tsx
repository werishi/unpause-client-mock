"use client";

/**
 * DemoSwitch — the demo part of the header user menu: one button per demo character, which
 * switches the loaded character in place.
 *
 * One self-contained island that owns the demo markup and the switch handler, so `UserMenu`
 * hosts it with a single line. The root's top border is the divider between the product-facing
 * part of the menu and this demo part.
 *
 * `reset()` of the flow store is called here, at the call site, and not inside `loadPersona`:
 * `FlowProvider` is mounted inside `UserDataProvider` (`app/layout.tsx`), so the user store
 * cannot reach the flow store without inverting the provider order, which the concept refused.
 * Without the reset a half-finished task flow of the previous character would leak into the
 * next one.
 *
 * Where to land after the switch is decided by `demoSwitchDestination` from the state
 * `loadPersona` returned, never from this render's closure (see `lib/domain/demo-switch.ts`).
 *
 * The current character's button is `aria-disabled` and its handler returns early; the
 * `disabled` attribute is not used, so the button stays focusable and announced.
 */

import { useId } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SHELL } from "@/lib/copy";
import { demoSwitchDestination } from "@/lib/domain/demo-switch";
import { personaFirstName } from "@/lib/domain/persona-name";
import { getCharacterCards } from "@/lib/repo/persona-repo";
import { useFlow } from "@/lib/store/flow-store";
import { useUserData } from "@/lib/store/user-store";

/** Verbatim copy of the focus ring in components/LoginPicker.tsx, which does not export it. */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:focus-visible:ring-indigo-400 dark:focus-visible:ring-offset-gray-900";

/** Muted demo look: dashed border, no filled accent, so it does not read as a product control. */
const BUTTON_BASE =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-dashed border-gray-300 px-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-300";

const BUTTON_HOVER = "hover:bg-gray-100 dark:hover:bg-gray-800";

/** The current character's button: solid border and a light fill, no hover. */
const BUTTON_CURRENT =
  "border-solid bg-gray-100 font-semibold text-gray-900 dark:bg-gray-800 dark:text-gray-100";

interface DemoSwitchProps {
  /** Called after a successful switch so the host can close its panel and restore focus. */
  onDone: () => void;
}

/**
 * Renders the demo character switch inside the user menu panel. The parent renders it only
 * while the panel is open and someone is signed in; when the current character is `per-new`
 * no card matches, so all six are clickable.
 */
export default function DemoSwitch(props: DemoSwitchProps) {
  const { onDone } = props;
  const { personaId, loadPersona } = useUserData();
  const { reset } = useFlow();
  const router = useRouter();
  const pathname = usePathname();
  const headingId = useId();
  const cards = getCharacterCards();

  function pick(id: string) {
    if (id === personaId) return;
    const next = loadPersona(id);
    if (!next) return;
    reset();
    const dest = demoSwitchDestination(pathname, next);
    if (dest !== null) router.push(dest);
    onDone();
  }

  return (
    <div className="flex flex-col gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
      <p
        id={headingId}
        className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400"
      >
        {SHELL.demoSwitchHeading}
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-400">{SHELL.demoSwitchHint}</p>
      <div role="group" aria-labelledby={headingId} className="grid grid-cols-2 gap-2">
        {cards.map((card) => {
          const current = card.id === personaId;
          return (
            <button
              key={card.id}
              type="button"
              aria-current={current ? "true" : undefined}
              aria-disabled={current ? "true" : undefined}
              onClick={() => pick(card.id)}
              className={`${BUTTON_BASE} ${current ? BUTTON_CURRENT : BUTTON_HOVER} ${FOCUS_RING}`}
            >
              <span className="truncate">{personaFirstName(card.displayName)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
