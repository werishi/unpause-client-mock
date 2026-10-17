/**
 * copy.ts — every user-facing string in the UI, in one file.
 *
 * This is a leaf module: no imports from any local file. Keeping all strings
 * here means a tone reviewer can read one file and catch any shaming wording,
 * mood-improvement claims, or unsafe copy before it ships.
 *
 * Constraints enforced in this file (profile Tone invariant + spec citations):
 *   - No shaming copy, no lost-streak wording.
 *   - No "21 days" habit claims (spec 01-daily-structure.md:73).
 *   - No points, payment, or reward framing (spec 02-gamification.md:51).
 *   - No claim that doing a task will improve or lift mood — ratings are
 *     informational, not a promise (concept Section 2.4, Goal G4).
 *   - No phone numbers or tel: links anywhere.
 *
 * This file will be extended in part 4 with additive exports (START_SCREEN,
 * MOOD_BEFORE_PAGE, MOOD_AFTER_PAGE, additional DONE_SCREEN fields,
 * NOT_FOUND_PAGE). Do not treat this file as complete.
 */

/** Strings for the persistent app shell (header, footer, nav). */
export const SHELL = {
  /** App name shown in the top-bar left side. */
  appName: "Unpause",
  /** Safety-plan link label shown in the top bar. */
  safetyLinkLabel: "Safety Plan",
  /**
   * Footer text. Exact value required by the profile Not-a-medical-product
   * invariant (concept Section 2.3).
   */
  footer: "Unpause is not a substitute for professional help.",
} as const;

/** Strings for the SafetyPlanLink component. */
export const SAFETY_PLAN_LINK = {
  /** Accessible label for the always-visible safety-plan button in the top bar. */
  label: "Safety Plan",
} as const;

/** Strings for the MoodRating component. */
export const MOOD_RATING = {
  /**
   * Five labels in ascending order; index 0 → value 1, index 4 → value 5.
   * Labels are informational — they describe how the user feels, not a
   * promised outcome of completing a task.
   */
  labels: ["Very low", "Low", "Okay", "Good", "Very good"] as const,
} as const;

/** Strings for the safety plan page (/safety). */
export const SAFETY_PAGE = {
  heading: "Safety Plan",
  intro:
    "This page is here whenever you need it. Take a breath and read through the steps below.",
  /**
   * Prominent notice required by the profile Safety plan invariant: a wrong
   * crisis number in a demo is worse than none. No real numbers appear here.
   */
  placeholderNotice:
    "All contacts shown are placeholder text — no real numbers appear here.",
  /**
   * Disclaimer required by concept Section 2.4 (citing spec 06-safety-plan.md:62):
   * Unpause is not monitored in real time and is not a crisis service.
   */
  disclaimerLine:
    "Unpause is not monitored in real time and is not a crisis service. If you are in immediate danger, please contact emergency services.",
  /** Short label for the back-navigation button on the safety page. */
  backLabel: "Back",
  /**
   * Badge text appended to placeholder contact entries. Mirrors the seed data's
   * "(placeholder)" marker as a visible UI cue — no real contact details appear here.
   */
  placeholderBadge: "placeholder",
} as const;

/** Strings for the done/outcome page. */
export const DONE_SCREEN = {
  heading: "You did it.",
  bodyText: "That counts. Even a small step is a step.",
  /** Shown when the user completed the task — affirms without promising a mood lift. */
  doneText: "You did something for yourself today. That counts.",
  /** Shown when the user skipped — no shaming, open invitation (profile Tone invariant). */
  skipText: "Rest is part of it too. Unpause is here whenever you want to try again.",
  /** Label for the home-navigation button; must match the tone of the surrounding copy. */
  backToStartLabel: "Start again",
} as const;

/** Strings for the start / home page. */
export const START_SCREEN = {
  headline: "A small step. Right now.",
  /**
   * Verbatim from README.md `## Note` (lines 139–140). Required by the
   * profile Not-a-medical-product invariant.
   */
  safetyNote:
    "Unpause is meant to support everyday life. It is not a substitute for professional help. If you're struggling, please reach out to a doctor, therapist, or a local crisis line.",
  ctaLabel: "Let's start",
} as const;

/** Strings for the mood-rating page shown before the task. */
export const MOOD_BEFORE_PAGE = {
  heading: "How do you feel right now?",
} as const;

/** Strings for the mood-rating page shown after the task. */
export const MOOD_AFTER_PAGE = {
  heading: "How do you feel now?",
} as const;

/** Strings for the 404 not-found page (`app/not-found.tsx`). */
export const NOT_FOUND_PAGE = {
  heading: "Page not found",
  body: "This page does not exist.",
  homeLinkLabel: "Back to start",
} as const;

/**
 * Strings for the energy check-in page (/check-in).
 * energyOptions drives the three energy-level buttons; value literals match
 * the EnergyLevel union in lib/domain/energy.ts.
 */
export const CHECK_IN = {
  heading: "How is your energy today?",
  instructions: "Pick what feels true right now.",
  energyOptions: [
    { value: "low" as const, label: "Low" },
    { value: "medium" as const, label: "Medium" },
    { value: "high" as const, label: "High" },
  ],
} as const;

/** Strings for the task screen (/task). */
export const TASK_SCREEN = {
  /** Prefix label shown before the task's implementation-intention cue. */
  cueLabel: "After this, I …",
  /** Secondary label beneath the two-minute version text. */
  twoMinuteLabel: "2-minute version",
  /** Primary action button — user completed the task. */
  startLabel: "I did it",
  /** Secondary action button — user wants to skip. */
  skipLabel: "Skip for now",
} as const;
