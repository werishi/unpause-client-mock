"use client";

/**
 * LoginPicker — the right column of the login screen (`/login`).
 *
 * Holds every interactive part of that screen so the page itself stays a server component:
 * the demo-notice gate, the Continue card for a character already saved in this browser,
 * the six character cards and the new-character button.
 *
 * Three rules shape it (login-screen-and-legal part 3, step 4; concept §2.5):
 * - Nothing acts before the gate is ticked. Until then every card and button is
 *   `aria-disabled` (still focusable and announced, never `disabled`) and its handler
 *   returns at once. `useGate` is the only source of the flag; no copy is held in state.
 * - A character card navigates from the state `loadPersona` returned, never from the render
 *   closure: the closure still holds the previous persona's `welcomeBackDue`, and reading it
 *   would skip `/welcome-back` and leave the check-in reminder silenced.
 * - It does not flash: until both the gate and the user store have read localStorage it renders
 *   only a fixed-height placeholder.
 * - A character load (card pick or new character) also clears the flow store with `reset()`, so a
 *   half-finished task flow of the previous character does not leak into the next one.
 *
 * The parent renders it without props; no auth or data needs resolving first.
 */

import { useRouter } from "next/navigation";
import { LOGIN } from "@/lib/copy";
import { entryRouteFor } from "@/lib/domain/routes";
import { personaFirstName } from "@/lib/domain/persona-name";
import type { CharacterCard } from "@/lib/domain/types";
import { getCharacterCards } from "@/lib/repo/persona-repo";
import { useFlow } from "@/lib/store/flow-store";
import { useGate } from "@/lib/store/use-gate";
import { useUserData } from "@/lib/store/user-store";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:focus-visible:ring-indigo-400 dark:focus-visible:ring-offset-gray-900";

const CARD_BASE =
  "w-full min-h-11 rounded-xl border border-gray-200 bg-white p-4 text-left dark:border-gray-700 dark:bg-gray-900";

const MUTED = "text-gray-500 dark:text-gray-400";

/** Classes that make a gated control look inert while staying focusable. */
function gatedClasses(accepted: boolean): string {
  return accepted ? "cursor-pointer" : "cursor-not-allowed opacity-50";
}

interface GateProps {
  accepted: boolean;
  /** Records acceptance in the gate store; there is no way back, so the box disables itself. */
  onAccept: () => void;
}

function Gate({ accepted, onAccept }: GateProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex min-h-11 items-start gap-3 text-gray-900 dark:text-gray-100">
        <input
          type="checkbox"
          checked={accepted}
          disabled={accepted}
          onChange={onAccept}
          className={`mt-1 h-5 w-5 shrink-0 rounded border-gray-300 accent-indigo-600 dark:border-gray-600 ${FOCUS_RING}`}
        />
        <span>{LOGIN.gateLabel}</span>
      </label>
      {!accepted && <p className={`text-sm ${MUTED}`}>{LOGIN.gateHint}</p>}
    </div>
  );
}

interface CardButtonProps {
  card: CharacterCard;
  accepted: boolean;
  /** Called with the card's persona id; the caller loads it and navigates. */
  onPick: (id: string) => void;
}

function CardButton({ card, accepted, onPick }: CardButtonProps) {
  const name = personaFirstName(card.displayName);
  return (
    <button
      type="button"
      aria-disabled={!accepted || undefined}
      aria-label={LOGIN.cardAriaLabel.replace("{name}", name)}
      onClick={() => onPick(card.id)}
      className={`${CARD_BASE} flex flex-col gap-1 hover:border-indigo-600 dark:hover:border-indigo-400 ${gatedClasses(accepted)} ${FOCUS_RING}`}
    >
      <span className="font-semibold text-gray-900 dark:text-gray-100">{name}</span>
      <span className={`text-sm ${MUTED}`}>{card.profile.stage}</span>
      <span className="text-sm italic text-gray-900 dark:text-gray-100">
        &ldquo;{card.blurb}&rdquo;
      </span>
      <span className={`text-sm ${MUTED}`}>
        {LOGIN.tryThisLabel + ": " + card.profile.tryThis}
      </span>
    </button>
  );
}

interface ContinueCardProps {
  /** The first name of the saved character, or `LOGIN.continueOwnCharacter`. */
  who: string;
  accepted: boolean;
  onContinue: () => void;
}

function ContinueCard({ who, accepted, onContinue }: ContinueCardProps) {
  return (
    <button
      type="button"
      aria-disabled={!accepted || undefined}
      onClick={onContinue}
      className={`${CARD_BASE} flex flex-col gap-1 hover:border-indigo-600 dark:hover:border-indigo-400 ${gatedClasses(accepted)} ${FOCUS_RING}`}
    >
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {LOGIN.continueTitle.replace("{name}", who)}
      </span>
      <span className={`text-sm ${MUTED}`}>{LOGIN.continueHint}</span>
    </button>
  );
}

interface NewCharacterProps {
  accepted: boolean;
  /** True when a journey is saved in this browser, which the button would replace. */
  hasSaved: boolean;
  onStart: () => void;
}

function NewCharacter({ accepted, hasSaved, onStart }: NewCharacterProps) {
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-disabled={!accepted || undefined}
        onClick={onStart}
        className={`min-h-11 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 ${gatedClasses(accepted)} ${FOCUS_RING}`}
      >
        {LOGIN.newCharacterLabel}
      </button>
      <p className={`text-sm ${MUTED}`}>{LOGIN.newCharacterHint}</p>
      {hasSaved && <p className={`text-sm ${MUTED}`}>{LOGIN.replacesNote}</p>}
    </div>
  );
}

/**
 * Renders the gate and the character choice of the login screen; see the file header for the
 * rules it keeps. Navigation targets come from `entryRouteFor`, except the new-character button,
 * which always goes to `/welcome` so it starts onboarding whatever the seed holds for `per-new`.
 */
export function LoginPicker() {
  const { ready, accepted, accept } = useGate();
  const { hydrated, personaId, startedAt, welcomeBackDue, loadPersona } = useUserData();
  const { reset } = useFlow();
  const router = useRouter();
  const cards = getCharacterCards();

  if (!(ready && hydrated)) {
    return <div className="min-h-[32rem]" aria-hidden="true" />;
  }

  function pick(id: string) {
    if (!accepted) return;
    // Navigate from the returned state: the render closure still holds the old persona's flags.
    const next = loadPersona(id);
    if (next) {
      reset();
      router.push(entryRouteFor(next));
    }
  }

  function continueSaved() {
    if (!accepted) return;
    // No loadPersona here: loading would overwrite the progress this card exists to keep.
    // The closure is current because nothing was just changed.
    router.push(entryRouteFor({ startedAt, welcomeBackDue }));
  }

  function startNew() {
    if (!accepted) return;
    loadPersona("per-new");
    reset();
    router.push("/welcome");
  }

  const saved = personaId === "per-new" ? undefined : cards.find((c) => c.id === personaId);
  const who = saved ? personaFirstName(saved.displayName) : LOGIN.continueOwnCharacter;

  return (
    <section className="flex flex-col gap-4">
      <Gate accepted={accepted} onAccept={accept} />

      {startedAt !== null && (
        <ContinueCard who={who} accepted={accepted} onContinue={continueSaved} />
      )}

      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {LOGIN.charactersHeading}
        </h2>
        <p className={`text-sm ${MUTED}`}>{LOGIN.charactersIntro}</p>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {cards.map((card) => (
          <li key={card.id} className="flex">
            <CardButton card={card} accepted={accepted} onPick={pick} />
          </li>
        ))}
      </ul>

      <NewCharacter accepted={accepted} hasSaved={startedAt !== null} onStart={startNew} />
    </section>
  );
}
