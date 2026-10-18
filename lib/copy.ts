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
 * All user-facing strings live here. Add new exports; never rename or remove
 * an existing key — live pages render them and a missing key is a build error.
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
  /**
   * Label for the button that returns to /today after completing or skipping an activity.
   * Coexists with backToStartLabel: that key goes to / and is rendered by the existing done
   * page; this key goes to /today and is rendered by the new done page once the Today screen
   * exists. Both keys are kept so the existing page does not break while Today is being built.
   */
  backToTodayLabel: "Back to today",
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

/** Tab-bar display labels. */
export const TABS = {
  todayLabel: "Today",
  youLabel: "You",
} as const;

/** Strings for the flow close/exit control (FlowCloseButton component). */
export const FLOW = {
  /** Accessible label for the close button in onboarding and activity flows. */
  closeAriaLabel: "Close",
} as const;

/** Strings for the Today screen (/today). */
export const TODAY = {
  heading: "Today",
  /** Shown below the plan when the day is already complete. */
  planDoneNote: "You've done what you planned today.",
  /** Shown when there is no plan yet for today (energy not yet given). */
  noCheckInYet: "Tap Check in to build today's plan.",
  /** Label on the check-in button. */
  checkInLabel: "Check in",
  /** Label on the plan entry for a started-but-not-finished activity. */
  continueLabel: "Continue",
  /** Label for the energy level shown in the plan header. */
  energyLabel: "Energy",
  greetingMorning: "Good morning.",
  greetingAfternoon: "Good afternoon.",
  greetingEvening: "Good evening.",
  /** State B header. Page appends the energy level (e.g. "Your plan today — Low"). */
  planHeading: "Your plan today —",
  /** State A note below the energy buttons. G10: no pressure, no streak. */
  lowDayNote: "A low day with one small thing still counts.",
  /** Primary button label on each activity card. */
  startLabel: "Start",
  /** Collapsed card label for a completed activity. G10: equally neutral as skippedLine. */
  doneLine: "Done",
  /**
   * Collapsed card label for a skipped activity. G10: no shame or deficit framing.
   * Both doneLine and skippedLine use identical visual weight so the app never
   * communicates that one outcome is better or worse than the other.
   */
  skippedLine: "Skipped",
  /**
   * Shown under all collapsed cards when every activity in today's plan has a log row.
   * G6: the day has a clear end; the app suggests nothing more after this line.
   */
  endOfDay: "That's it for today. You can put the phone down.",
  /**
   * Text link visible in State B while no log entry for today exists.
   * Disappears once any card is completed or skipped — re-planning then would remove
   * an activity the user already finished (concept 2.4).
   */
  changeEnergyLabel: "Change energy",
  /**
   * Prefix for the wake-time anchor chip. Page renders "${TODAY.wakeAnchor} ${wakeTime}",
   * e.g. "Up around 08:30". Kept as a prefix (not a template function) so tone reviewers
   * can read it inline in this file.
   */
  wakeAnchor: "Up around",
} as const;

/** Strings for the welcome screen (/welcome — first open). */
export const WELCOME = {
  headline: "Your life, unpaused.",
  /** One sentence on what Unpause does. No mood-improvement promise. */
  body: "Small steps, one day at a time.",
  /** Pointer to the safety plan, shown below the body. */
  safetyPointer: "Your safety plan is always at the top right.",
  ctaLabel: "Let's start small",
} as const;

/** Strings for the onboarding flow (/onboarding/*). */
export const ONBOARDING = {
  /** Shown on /done when personalisation has not been completed or dismissed. */
  offerLine: "Want Unpause to fit your days? Three quick questions.",
  offerCta: "Make it yours",
  laterLabel: "Later",
  /** Primary button label on each onboarding step. */
  nextLabel: "Next",
  /** Secondary text button on each onboarding step — skips without penalty (G10). */
  skipLabel: "Skip",
  reasonsHeading: "What brings you here?",
  /**
   * Shown under the reasons list when at least one selected reason has
   * supportPointer: true. Points to professional help without diagnosing.
   * Must not include a phone number or crisis-line reference (profile Safety plan
   * invariant — wrong numbers are worse than none).
   */
  supportPointer:
    "Talking to a doctor or therapist can be a helpful next step alongside this.",
  valuesHeading: "What matters to you?",
  /** Hint shown when the user tries to select a fourth value chip. */
  valuesHint: "Up to three",
  startHeading: "Where would you like to start?",
  /**
   * Note below the template list — no pressure framing (G10: no shaming).
   * "Move up" refers to energy-level difficulty, not achievement.
   */
  moveUpNote: "You can move up whenever you're ready.",
  wakeLabel: "Around what time do you usually wake up?",
  doneHeading: "Your plan is ready",
  seeTodayLabel: "See today",
  /**
   * Dismiss label on the "Make it yours" card shown on Today from the second day onward.
   * Different from laterLabel ("Later") on /done: "Not now" signals the offer can return,
   * but both in fact call dismissPersonalise() — the distinction is tonal for the context.
   */
  notNowLabel: "Not now",
} as const;

/** Strings for the About Unpause page (/you/about). */
export const ABOUT = {
  heading: "About Unpause",
  /**
   * Two sentences saying this is a clickable mockup with placeholder data
   * that stores nothing outside the browser, and that the safety page points
   * to crisis services. Kept factual; no mood-improvement claim.
   */
  body: "This is a clickable mockup with placeholder data. Nothing you do here is sent anywhere — everything stays in your browser. The safety page links to real crisis services.",
} as const;

/** Strings for the Demo page (/you/demo). */
export const DEMO = {
  heading: "Demo",
  /** One sentence for reviewers explaining what the Demo section does. */
  intro:
    "Tap a persona to explore how Unpause looks at different points in someone's journey.",
  resetLabel: "Reset demo data",
} as const;

/** Strings for the welcome-back screen (/welcome-back). */
export const WELCOME_BACK = {
  /**
   * No gap length, no count of missed days (G5: welcome back that never names
   * the gap; G10: no shaming).
   */
  headline: "Welcome back.",
  body: "Today is a fresh start. Everything you did before is still here.",
  ctaLabel: "See today",
} as const;
