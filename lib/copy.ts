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
 *   - No payment or unlock framing: never 'earn N to unlock', never a deduction
 *     or a balance going down, never a target shown as unmet. Points describe what
 *     the user did; a reward is an optional extra the user chose.
 *     (spec 02-gamification.md:49-70; §0 watch point in LOOK_BACK_AND_GENTLE_GAMIFICATION_CONCEPT.md)
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
  /**
   * Shown under a step whose entries are all empty. G10: names no failure and
   * asks for nothing now — filling it in can wait for a calm moment.
   */
  emptyStepLine:
    "Nothing here yet. You can add this when you have a calm moment, or with your therapist.",
  /** Label of the link from /safety to the editor at /safety/edit. */
  editLinkLabel: "Edit my plan",
} as const;

/**
 * Strings for the safety plan editor (/safety/edit). The step hints live here
 * rather than on SafetyPlanStep because that interface may not gain properties:
 * it would break the JSON cast in getSafetyPlan (lib/repo/safety-plan-repo.ts).
 * No string here may contain a digit, a phone number, tel:/mailto: or a crisis
 * service's name — profile Safety plan invariant: a wrong crisis number in a
 * demo is worse than none.
 */
export const SAFETY_EDIT = {
  heading: "Edit my safety plan",
  intro:
    "Write this on a calm day, in your own words. This is a demo, so please use made-up names. Everything stays in your browser.",
  therapistLine:
    "If you have a therapist, you can go through this together. If you don't, you can fill it in on your own.",
  addLineLabel: "Add a line",
  removeLabel: "Remove this line",
  saveLabel: "Save my plan",
  /**
   * One hint per seed step, by index: 0 warning signs, 1 internal coping,
   * 2 people and settings for distraction, 3 people to ask for help,
   * 4 professionals and crisis services, 5 making the environment safer.
   * Examples are invented first names only — no surname, address, digit or
   * real organisation (GOALS.md Non-Goal against holding real people's data).
   * Index 4 points to a self-checked number without supplying one.
   */
  hints: [
    "e.g. sleeping badly, pulling away from friends, thoughts that keep circling",
    "e.g. a walk around the block, a warm shower, a song you like",
    "e.g. a quiet café, or sitting with a friend, like 'Mia'",
    "e.g. a friend you trust, like 'Sam'",
    "e.g. your therapist, like 'Alex', or a crisis line — a number I looked up from a trusted source",
    "e.g. putting certain things out of reach, or asking a friend to keep them for a while",
  ],
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
  planLabel: "Plan",
  youLabel: "You",
  lookBackLabel: "Look back",
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
  /**
   * Heading of the weekly review card shown on the Today screen on Mondays
   * (concept §2.7). No specific week label — Today already shows the date.
   */
  weekReviewCardHeading: "How last week went",
  /**
   * Heading of the monthly review card shown on Today on the 1st of each month
   * (concept §2.8).
   */
  monthReviewCardHeading: "How last month went",
  /**
   * CTA label on review cards that takes the user to /look-back.
   * Matches the tab label so users recognise the destination.
   */
  lookBackCtaLabel: "Look back",
  /**
   * Heading for the digest card shown on Today when a new digest slot is ready.
   * The card is hidden after the user taps "Not now" or opens /digest (concept §2.3).
   * Placed above the end sentence so it is never shown after "you can put the phone down".
   */
  digestCardTitle: "Something to read",
  /**
   * Prompt line shown on Today between the plan and the end sentence when the user
   * has a plan for today (State B, todayPlan !== null). Tapping leads to /swap.
   * Hidden once allLogged is true — consistent with the rule that nothing new is
   * offered after the end sentence (concept §3.3).
   */
  swapLine: "Feel like scrolling? Try this instead.",
  /**
   * Body of the Today card inviting the user to set up their safety plan.
   * Carries no phone number and no crisis reference (profile Safety plan
   * invariant), and never mentions points, streaks or a check-in result, so it
   * cannot read as tied to either.
   */
  safetySetupText:
    "On a good day, it helps to have this ready. Takes about five minutes — or later.",
  /** CTA on the safety setup card; leads to /safety/edit. */
  safetySetupCta: "Set up my plan",
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
  /** Heading above the week preview strip on /onboarding/done. */
  firstWeekHeading: "Your first week",
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
  /**
   * Label for the plain-version toggle on /you/demo (concept §2.9).
   * Plain version hides points and the reward card for users who prefer a simpler
   * layout. Basis: setPlainVersion store action.
   */
  plainVersionLabel: "Plain version",
  /**
   * Shown on /you/demo to tell reviewers that loading a persona or resetting
   * replaces the user's saved data, including their own safety plan and any
   * therapist link (`loadPersona` and `resetDemoData` wipe `safetyEntries` and the
   * therapist state; concept §2.9).
   */
  replacesDataNote:
    "Loading a persona or resetting replaces everything saved in this browser, including your own safety plan and any therapist link.",
  /** Heading of the notification-replay controls on /you/demo. */
  replayHeading: "Show a notification",
  /** Button that replays the check-in reminder banner. */
  replayCheckInLabel: "Check-in reminder",
  /** Button that replays the digest-ready banner. */
  replayDigestLabel: "Digest ready",
} as const;

/**
 * Strings for the in-app notification banners (check-in reminder, digest ready).
 *
 * Tone rule (profile Tone invariant; goal G10): neither banner may mention missed
 * days, counts, streaks or anything the user "should" do. A notification is the
 * moment pressure lands hardest, so the bodies name only what is on offer and its
 * real cost. tests/copy.test.ts scans this namespace for deficit words, digits and
 * obligation words — a new key here is covered automatically by collectStrings.
 */
export const BANNER = {
  /** Sender line of a phone notification. */
  appName: "Unpause",
  /** How phones label a fresh notification; no clock time is invented. */
  timeLabel: "now",
  /**
   * Repeats CHECK_IN.heading so the banner and the screen it opens say the same
   * thing; the second sentence names the real cost (one tap) instead of a duty.
   * No time-of-day greeting, because the banner can show in the afternoon.
   */
  checkInBody: "How is your energy today? One tap is enough.",
  /** Says the digest is finite and chosen (goal G6) and puts no time pressure on reading it. */
  digestBody: "Your digest is ready — a few things you chose, whenever you like.",
  /**
   * Same words as ONBOARDING.notNowLabel but a separate key, so the banner can
   * change without changing onboarding.
   */
  dismissLabel: "Not now",
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
  /**
   * Short line shown when the comeback bonus is granted. No gap length, no count
   * of missed days (G5, G10 — no shaming, no gap named). Tone: matter-of-fact
   * encouragement, not effusive.
   */
  bonusLine: "Coming back is what counts.",
} as const;

/** Strings for the Plan tab and its sub-routes (/plan, /plan/templates, /plan/activity). */
export const PLAN = {
  /** Shown for a past day when the log has no done entries for that date. */
  quietDay: "A quiet day.",
  /** Shown for today when the user has not yet done a check-in. */
  beforeCheckIn: "Today starts with a check-in.",
  /** Link label that navigates to /today from the before-check-in state. */
  goToToday: "Go to Today",
  /** Shown for a future day that has no plan yet. */
  futureDay: "This day starts with a check-in.",
  /** Prefix before the comma-joined list of anchor activity titles. */
  anchorPrefix: "Your anchors:",
  /** Heading for the week-offers section below the day detail. */
  weekOffersHeading: "What may come up this week",
  /** Edit link label on a PlanActivityRow in the week-offers section. */
  editActivity: "Edit",
  /**
   * Fallback title when an activityId from the log or plan cannot be resolved
   * in the catalogue — guards against stale localStorage data.
   */
  noActivity: "This activity isn't available.",
  /** Section heading for the active templates list on /plan. */
  templatesSectionHeading: "Templates",
  /** Text link below template cards on /plan navigating to /plan/templates. */
  changeTemplates: "Change templates",
  /** Label prefix rendered as `${PLAN.templateLevel} ${template.level}` in picker cards. */
  templateLevel: "Level",
  /**
   * Offer card body on /plan when suggestNextTemplate returns a result.
   * Substitute {current} and {next} at the call site via .replace().
   */
  moveUpOfferText: "You've been keeping up with {current}. Want to try {next}?",
  /** Primary action button on the move-up offer card. */
  moveUpButton: "Move up",
  /** Secondary action button on the move-up offer card. */
  moveUpDismiss: "Not now",
  /** <h1> on /plan/templates. */
  templatesPageHeading: "Choose your templates",
  /** Save button on /plan/templates. */
  saveTemplates: "Save",
  /** Always-visible hint in TemplatePicker — never conditional. */
  templatePickerHint: "Choose one to three.",
  /**
   * Notice shown on /plan when todayPlan is non-null and the user has changed
   * their active templates since check-in (concept §3.3: plan is fixed at
   * check-in; changes apply at the next one).
   */
  changesNextCheckIn: "Changes start with your next check-in.",
  /**
   * Text button on /plan/activity that clears the user's override and restores
   * the activity to the planner's original suggestion (concept §2.5).
   */
  activityEditUseOriginal: "Use the original",
  /**
   * Label for the "None" chip on /plan/activity. Tapping it signals a cleared
   * selection; the page calls onToggle("") and interprets the empty id.
   */
  activityEditNone: "None",
  /**
   * Label on a homework card in the plan. Shown when the plan item carries
   * HOMEWORK_TEMPLATE_ID — the origin is encoded on the plan item, never on
   * `Activity`, so the same activity can be homework one day and not the next.
   */
  fromTherapist: "From your therapist",
} as const;

/**
 * Strings for the You section (/you and sub-routes including /you/values).
 *
 * youPageAboutLabel, youPageSafetyLabel, youPageDemoLabel were hard-coded
 * in app/you/page.tsx; they are centralised here so /you/values and future
 * You sub-pages share a single copy location.
 */
export const YOU = {
  /** Navigation link to /you/about in the You hub. */
  youPageAboutLabel: "About Unpause",
  /** Navigation link to /safety in the You hub. */
  youPageSafetyLabel: "Safety plan",
  /** Navigation link to /you/demo in the You hub. */
  youPageDemoLabel: "Demo",
  /**
   * Entry label in the You hub nav that leads to /you/values.
   * Rendered beside the other three entries when the You sub-page is built.
   */
  valuesEntry: "Your values",
  /**
   * Caption below the chip grid on /you/values explaining why values matter.
   * Exact string from concept §2.6; do not paraphrase.
   */
  valuesCaption: "These help you see why an activity matters to you.",
  /** Save button on /you/values. */
  valuesSave: "Save",
  /**
   * Back/close button on /you/values.
   * Matches the pattern used by SAFETY_PAGE.backLabel and other pages — "Back".
   */
  valuesBack: "Back",
  /**
   * Navigation link in the You hub that leads to /you/digest (interest and digest
   * setup). Shown alongside the existing About, Values, Safety, and Demo entries.
   */
  interestsAndDigest: "Interests and digest",
  /**
   * Navigation link in the You hub that leads to /you/media (media budget setup).
   * Shown alongside the other You hub entries once the budget feature is built.
   */
  mediaBudget: "Media budget",
  /**
   * Navigation link in the You hub that leads to /you/buddy (buddy management).
   * The label is static — it does not include the buddy's name even when one is
   * set, because reading the store here would turn the You page into a client
   * component (concept §2.7, Part 4 Domain Notes).
   */
  buddyEntry: "Buddy",
  /**
   * Navigation link in the You hub that leads to /you/therapist (therapist access
   * and sharing). Static label with no therapist name, for the same reason as
   * buddyEntry: reading the store here would make the You page a client component.
   */
  therapistEntry: "Therapist & sharing",
} as const;

/**
 * Strings for connection-nudge helpers shown on the task page when the active
 * activity has `category === "social"`. All strings pass tests/banned-words.ts.
 *
 * Placed as a named export consistent with PLAN, LOOK_BACK and similar objects.
 */
export const CONNECTION = {
  /** Disclosure label on the "Need words?" <details> element on /task. */
  disclosureLabel: "Need words?",
  /**
   * Motivational line inside the disclosure.
   * Source: concept §2.3; do not paraphrase — it carries the study framing.
   */
  honestLine: "Research shows people usually appreciate hearing from someone more than the sender expects.",
  /** Follow-up line reinforcing that any contact counts. */
  anyoneCounts: "Anyone counts — an old friend, a colleague, a neighbour.",
  /** Label on the copy-to-clipboard button beside each starter textarea. */
  copyLabel: "Copy",
} as const;

/**
 * Strings for the buddy feature: /you/buddy, /buddy/choose, and the shared
 * card on Today and Plan.
 *
 * `{name}` in a value is a plain token replaced by `.replace("{name}", buddy.name)`
 * at render time. It is not a template literal because that would change the type
 * away from `string`, break `as const` inference, and complicate the banned-words
 * check (see Rejected Alternatives in ConnectionAndBuddyMap.md, Part 3).
 *
 * All strings pass tests/banned-words.ts.
 */
export const BUDDY = {
  // ── /you/buddy — empty state ────────────────────────────────────────────────
  /** Introductory sentence shown when no buddy is set. */
  emptyState: "Doing one thing together with someone you know can make it easier.",
  /** CTA button label to open /buddy/choose. */
  chooseSomeone: "Choose someone",

  // ── /you/buddy — with buddy ─────────────────────────────────────────────────
  /**
   * Section heading that previews what the buddy would see.
   * `{name}` is replaced with `buddy.name` at render time.
   */
  whatTheyWouldSee: "What {name} would see",
  /** CTA button to navigate to /buddy/share for adding a shared activity. */
  planTogether: "Plan something together",
  /** Revoke button label for a single shared activity. */
  removeIt: "Remove it",
  /** Button to remove the buddy entirely (navigates to confirm flow). */
  stopHavingBuddy: "Stop having a buddy",

  // ── /buddy/choose ────────────────────────────────────────────────────────────
  /**
   * Disclaimer shown before the user confirms their choice.
   * Exact string from concept §2.4; do not paraphrase.
   * `{name}` is replaced with the entered name at render time.
   */
  notATherapist: "{name} is a friend, not a therapist. If things get heavy, your safety plan is always at the top right.",
  /** Confirm button on /buddy/choose. */
  agree: "Agree",
  /** Cancel button on /buddy/choose. */
  notNow: "Not now",
  /**
   * Helper hint below the name input on /buddy/choose.
   * Concept §2.4: keeps the tone warm and concrete without prescribing a
   * relationship type. Do not change without re-reading concept §2.4.
   */
  nameHint: "Someone you already know — a friend, a sibling, a neighbour.",

  // ── Today shared card ────────────────────────────────────────────────────────
  /**
   * Low-day note rendered below the shared activity card on Today.
   * `{name}` is replaced with `buddy.name` at render time.
   * Principle: a commitment is not hidden on low-energy days; this line offers
   * a minimal alternative instead.
   */
  lowDay: "Low day? A message to {name} to move it counts too.",
  /**
   * Badge label on an activity card when it is a shared commitment.
   * `{name}` is replaced with `buddy.name` at render time.
   */
  withName: "with {name}",

  // ── /done offer ──────────────────────────────────────────────────────────────
  /**
   * Offer line on /done when no buddy is set and the completed activity was
   * social. Shown at most once (buddyOfferDismissed gate).
   */
  doneOfferText: "Want to do something together with someone you know?",
} as const;

/**
 * Strings for therapist access and sharing: the hub (/you/therapist), the
 * three-step linking flow, and the "what your therapist would see" preview.
 *
 * Token convention: `{name}`, `{date}`, `{days}`, `{label}`, `{step}`, `{total}`,
 * `{count}` and `{values}` are plain tokens replaced with `.replace(...)` at
 * render time, the same convention as BUDDY (no template literals, so the type
 * stays `string` and `as const` inference holds). tests/copy.test.ts rejects any
 * other token, so a typo such as `{nme}` cannot render literally.
 *
 * All strings pass tests/banned-words.ts. The four wording rules of concept §2.8,
 * enforced by the "THERAPIST copy — wording rules" block in tests/copy.test.ts:
 *
 * 1. No deficit language: no "missed", "skipped", " left", "lost", no N-of-M.
 * 2. Nothing describing what the therapist sees may sound live: "live", "now" and
 *    "real time" appear only inside a negation ("Nobody watches ..."). This is why
 *    `previewNothing` says "at your next session" instead of the concept §2.5
 *    literal "right now" — that sentence breaks the concept's own rule, and the
 *    rule wins because it exists to protect GOALS.md:118.
 * 3. No clinical measurement words: no average, trend, band, severity, score, level.
 * 4. No treatment promise: no recover, treatment, heal, cure, improve, better.
 *
 * Further constraints:
 * - What the therapist would see is written in the conditional voice ("would see")
 *   because the rest of the app promises nothing is sent (ABOUT.body). If a real
 *   transport ever exists, these strings need rewording, not just the mock note.
 * - No string carries a digit. Window lengths are the `{days}` token and the week
 *   is "your past week", so changing THERAPIST_VIEW_DAYS never needs a copy edit.
 */
export const THERAPIST = {
  // Shared
  /** Badge marking the therapist feature as a mock placeholder. */
  placeholderBadge: "placeholder",
  back: "Back",
  /** Reassurance that the preview transmits nothing. */
  mockNote: "In this preview, nothing leaves your browser.",
  /** Rule 2: "live" appears only in a negation. */
  noLiveLine: "Nobody watches your data live. Your therapist would see only what you share, at your sessions.",
  /** Keeps the "not a substitute for professional help" invariant reachable from the hub. */
  notASubstitute: "Unpause supports your own routine. It does not replace professional help.",
  // Hub, not linked
  hubHeading: "Therapist & sharing",
  hubNotLinkedBody: "Unpause works fully without a therapist. Linking one is optional, and nothing here needs doing.",
  hubStartCta: "Set this up with your therapist",
  // Hub, linked
  /** `{date}` is the formatted link date. */
  hubLinkedOn: "Linked on {date}",
  unlinkLabel: "Unlink",
  switchesHeading: "What you share",
  switchesIntro: "Everything starts off. You can change any switch at any time, with one tap, and you never need to give a reason.",
  switchOn: "On",
  switchOff: "Off",
  /** `{label}` is the share type's label from `shareTypes`. */
  switchAriaLabel: "Share: {label}",
  /**
   * One entry per SHARE_TYPES value (lib/domain/sharing.ts); the test asserts the
   * key set matches. `{name}` is the therapist's name, `{days}` THERAPIST_VIEW_DAYS.
   */
  shareTypes: {
    moodRatings: { label: "Mood before and after", description: "{name} would see the ratings you gave before and after each activity, for the last {days} days." },
    activityLog: { label: "Activities done", description: "{name} would see the activities you did, day by day, for the last {days} days." },
    weekSummary: { label: "Your look-back", description: "{name} would see a short look back at your past week: active days, the values you acted on, and any patterns." },
    safetyPlan: { label: "Your safety plan", description: "{name} would see the lines you wrote in your own safety plan. Crisis contacts are not included." },
  },
  neverSharedHeading: "Never shared in this preview",
  /** Data that is never offered for sharing, each with the reason shown to the user. */
  neverShared: [
    { id: "media", label: "Media use and interests", reason: "What you read and watch is yours. It is not offered for sharing at all." },
    { id: "points", label: "Points", reason: "Points describe what you did, not how hard you tried, so they stay out of anything a therapist would see." },
    { id: "checkIns", label: "Energy check-ins", reason: "They only help Unpause plan your day, so they are not part of what you share." },
    { id: "buddy", label: "What you share with your buddy", reason: "That belongs to you and your buddy, so it is not passed on." },
  ],
  homeworkHeading: "Homework from {name}",
  homeworkEmpty: "No homework is set.",
  homeworkToday: "Today",
  homeworkOnDate: "On {date}",
  homeworkRemove: "Remove",
  homeworkNote: "Homework is always your choice. Setting it aside costs nothing.",
  previewLink: "See what {name} would see",
  // Linking flow
  /** `{step}` and `{total}` are numbers substituted at render time, never literals here. */
  linkStepLabel: "Step {step} of {total}",
  linkClose: "Close",
  linkNext: "Next",
  linkDone: "Done",
  step1Heading: "Together in a session",
  step1Body: "In the real app, you would set this up together with your therapist, during a session. You can stop or change it at any time.",
  step2Heading: "Your therapist's name",
  step2NameLabel: "Name",
  /** Placeholder-data invariant: no real person's name in a demo. */
  step2NameHint: "Please use a made-up name. This is a demo.",
  step2NamePlaceholder: "for example: Dr. Hartmann",
  step2NameEmpty: "Please enter a name to continue.",
  step3Heading: "What would be shared",
  step3Body: "Nothing is shared until you switch it on. You can change any of these later, from Therapist & sharing.",
  step3AllOffNote: "You can finish with every switch off. Your therapist would then see nothing.",
  // Preview
  previewHeading: "What {name} would see",
  previewIntro: "This is what {name} would see at your next session.",
  /** Rule 2: "live" appears only in a negation. */
  previewNoLive: "Nobody watches live. Nothing here is sent anywhere in this preview.",
  previewWindowNote: "Each section covers the last {days} days, except the look-back, which covers your past week.",
  stopSharing: "Stop sharing this",
  /** Says "at your next session", not the concept §2.5 "right now" — rule 2 bans "now" here. */
  previewNothing: "{name} would see nothing at your next session.",
  previewBackToSwitches: "Back to your switches",
  sectionEmpty: "Nothing to show for these days.",
  moodBefore: "Before",
  moodAfter: "After",
  /** `{count}` is the number of active days, substituted at render time. */
  weekActiveDays: "Active days in the past week: {count}",
  /** `{values}` is the comma-joined list of value labels. */
  weekValues: "Values you acted on: {values}",
  weekPatternsHeading: "Patterns",
  safetyPlanEmpty: "Your safety plan is empty, so there is nothing to show.",
  safetyPlanNote: "Only the lines you wrote yourself. Crisis contacts stay on the Safety page.",
} as const;

/**
 * Strings for the Look back screen (/look-back) and its sub-components.
 *
 * categoryLabels keys correspond to ActivityCategory values minus "media"
 * (lib/domain/types.ts:33-40). No import needed here — the keys are plain
 * string literals. A page that renders a PatternResult indexes this object
 * by result.categoryKey.
 *
 * Deficit language is banned by tests/copy.test.ts (deficit check extended in
 * part 2). No key in this object may contain "missed", "skipped", " left",
 * "lost", or a pattern matching /\d+\s*(of|\/)\s*\d+/.
 */
export const LOOK_BACK = {
  heading: "Look back",

  /** Strings for the "Since you started" stats block (concept §2.3). */
  sinceStarted: {
    heading: "Since you started",
    /** Number suffix when count === 1 */
    thingDoneSuffix: "thing done",
    /** Number suffix when count !== 1 */
    thingsDoneSuffix: "things done",
    /** Number suffix when count === 1 */
    activeDaySuffix: "day showing up",
    /** Number suffix when count !== 1 */
    activeDaysSuffix: "days showing up",
    /** Number suffix when count === 1 */
    pointSuffix: "point collected",
    /** Number suffix when count !== 1 */
    pointsSuffix: "points collected",
  },

  /**
   * Friendly labels for each non-media activity category. Keys match
   * ActivityCategory minus "media" (types.ts:33-40).
   */
  categoryLabels: {
    anchor: "Your anchor habit",
    movement: "Moving your body",
    routine: "Daily routines",
    mastery: "Building skills",
    pleasant: "Something enjoyable",
    social: "Time with people",
  },

  /**
   * Sentence suffix for a rank-0 (primary) pattern. Page renders:
   * "{categoryLabels[result.categoryKey]} {patternPrimary}"
   */
  patternPrimary: "tends to help you.",
  /**
   * Sentence suffix for a rank-1 (secondary) pattern.
   */
  patternSecondary: "has helped too.",

  /** Strings for the reward offer card (§2.5, shown at pointsTotal >= FIRST_REWARD_AT). */
  rewardOffer: {
    heading: "Set a reward for yourself",
    body: "You've been doing a lot. You can choose a real-world treat if you like — no pressure.",
    inputPlaceholder: "e.g. a coffee out, a new book",
    saveLabel: "Save reward",
    dismissLabel: "Maybe later",
  },

  /** Strings for the active reward card display (§2.6). */
  reward: {
    heading: "Your reward",
    /** Shown after markRewardReached is called. */
    reachedHeading: "You got your reward",
    reachedBody: "Nice. Set a new one whenever you like.",
    changeLabel: "Change reward",
    removeLabel: "Remove reward",
    /** Button that calls markRewardReached. */
    gotItLabel: "I got it",
  },

  /** Strings for weekly review cards on /look-back (§2.7). */
  weekReview: {
    /** Page sets the week heading, e.g. "This week" or "Week of 13 Oct". */
    heading: "This week",
    thingSuffix: "thing",
    thingsSuffix: "things",
    activeDaySuffix: "day",
    activeDaysSuffix: "days",
    /** Button that calls markReviewSeen("week", weekKey). */
    gotItLabel: "Got it",
  },

  /** Strings for monthly review cards on /look-back (§2.8). */
  monthReview: {
    heading: "This month",
    activeDaySuffix: "day",
    activeDaysSuffix: "days",
    /** Button that calls markReviewSeen("month", monthKey). */
    gotItLabel: "Got it",
  },

  /** Values section on /look-back — shown when valuesServed returns results. */
  valuesHeading: "Things you care about",

  /**
   * Demo toggle label for the force-preview that shows the weekly review card on
   * Today on non-Monday days (Open Direction Question 7 comparison mode).
   */
  reviewPreviewLabel: "Show this week's review card on Today",
  /** Plain-version toggle also appears in the Look back page footer or settings. */
  plainVersionLabel: "Plain version",
  plainVersionHint: "Simpler layout, no points.",

  // ── Per-new quiet state ──────────────────────────────────────────────────
  /** Shown in the "Since you started" block when doneCount(log) === 0 (concept §2.3). */
  perNewMessage: "Nothing to look back on yet — check back once you've done a few activities.",

  // ── Since you started extras ─────────────────────────────────────────────
  /** Prefix for the start-date sentence: "{startedOnLabel} {day} {MonthName}." */
  startedOnLabel: "You started on",
  /** Prefix for each reward already enjoyed, in the "Since you started" block. */
  rewardEnjoyedLabel: "Reward enjoyed:",

  // ── This month block ──────────────────────────────────────────────────────
  /** Heading for the "This month" active-days block (§2.8). */
  thisMonthHeading: "This month",
  /** Shown when doneCount > 0 but no done rows fall in the current month. */
  noActiveDaysThisMonthMessage: "Nothing yet this month.",

  // ── Patterns block ────────────────────────────────────────────────────────
  /** Heading for the "What tended to help" patterns block (§2.4). */
  patternsHeading: "What tended to help",
  /** Shown when no category meets the qualifying floors yet (§2.4). */
  noPatternsYetMessage: "Come back once you've done a few activities.",

  // ── Points and your reward block ──────────────────────────────────────────
  /** Heading for the "Points and your reward" block (§2.5–2.6). */
  pointsHeading: "Points and your reward",
  /**
   * Explanation shown below the points total (§2.5). No deficit language;
   * no "N of M" pattern. Constraint: lib/copy.ts header comment, line 11.
   */
  pointsExplanation:
    "You earn 10 points for each activity done, and a bonus when you come back after time away.",
  /** Abbreviation used in the reward-level selector radio buttons. */
  pointsAbbreviation: "pts",

  // ── Reward card extras ────────────────────────────────────────────────────
  /** Quiet link shown when the offer was dismissed and reward === null (§2.6). */
  setRewardLink: "Set a reward for yourself",
  /** Button on the offer card that opens the inline form. */
  chooseRewardLabel: "Choose a reward",
  /** Link shown after the "reached" card to set the next reward. */
  setNextRewardLabel: "Set the next one",
  /**
   * Five pre-filled suggestions in the inline reward form (§2.6).
   * None contains payment, pricing, or unlock framing (copy.ts:11 constraint).
   */
  rewardSuggestions: [
    "A coffee out",
    "A new book",
    "A long walk",
    "A favourite meal",
    "Time for yourself",
  ],
} as const;

/**
 * Strings for the interest digest flow (/digest and /digest/setup).
 *
 * No deficit language, no N-of-M patterns. The digest is shown as a gentle
 * offer, not a count of unread items (concept §2.3). `cardTitle` mirrors
 * `TODAY.digestCardTitle` — both refer to the same card, so they must read
 * consistently. Tests extend the deficit-pattern check to cover this export.
 */
export const DIGEST = {
  /**
   * Heading on the /digest page. Brief — the page itself carries the content.
   */
  cardTitle: "Something to read",
  /** Shown when no digest items match the user's interests for this slot. */
  emptyState: "Nothing matching your interests right now. Check back later.",
  /**
   * Shown after the last item in the current digest slot — signals the visit is
   * complete without framing it as a task or a count (G6, G10).
   */
  allCaughtUp: "That's everything for now.",
  /** Link from /digest back to Today after reading (or when skipping). */
  nextDigestLabel: "Done reading",
  /**
   * CTA at the bottom of the digest page pointing to /digest/setup.
   * Kept as a quiet text link so it does not compete with the content.
   */
  endCta: "Change what you see",
  /** Heading on the /digest/setup (interests) page. */
  setupTitle: "What interests you?",
  /**
   * One-sentence prompt below the heading on /digest/setup.
   * No promise of quality or relevance (copy.ts line 11 constraint).
   */
  setupPrompt: "Topics you enjoy — a mix is fine.",
  /** Label above the digest-time chip grid on /digest/setup. */
  timesTitle: "When do you like to read?",
  /** Save / confirm button on /digest/setup. */
  saveButton: "Save",
} as const;

/**
 * Strings for the swap flow (/swap).
 *
 * The swap is a one-activity offer shown when the user feels like scrolling.
 * No browsing, no list, no reroll — one activity chosen for the time of day
 * (concept §2.4, Rejected Alternatives). `setupLink` points to /you/media so
 * users who want to adjust their budget have a direct path without leaving mid-flow.
 */
export const SWAP = {
  /** Page heading on /swap. */
  title: "Feel like scrolling?",
  /**
   * Short sentence above the offered activity that frames the swap.
   * Not prescriptive — "here's one idea" rather than "you should do this".
   */
  leadIn: "Here's something you could do instead.",
  /** Primary button that starts the activity loop (sets energy, navigates to /mood-before). */
  startButton: "Start this",
  /**
   * Quiet text link to dismiss the swap and return to Today.
   * Neutral — no judgement on choosing not to swap (G10).
   */
  skipLink: "Maybe another time",
  /**
   * Quiet text link to /you/media for users who want to adjust their media budget.
   * Shown only when `todayPlan !== null` (same gate as the swap card on Today).
   */
  setupLink: "Adjust media budget",
} as const;

/**
 * Strings for the media budget pages (/you/media) and the budget display on /look-back.
 *
 * No deficit language, no N-of-M patterns (concept §2.7, G10 non-shaming).
 * `overBudget` acknowledges the over-budget state warmly without a judgement —
 * framing going over as a failure is explicitly refused (DigestAndMediaMap Rejected
 * Alternatives: "daily pass/fail is what 03-media-consumption.md Implication 2 warns against").
 * `withinBudget` is equally quiet so the app communicates no pass/fail at all.
 * Tests extend the deficit-pattern check to cover this export.
 */
export const MEDIA_BUDGET = {
  /** Page heading on /you/media. */
  title: "Media budget",
  /**
   * Label above the estimate chip grid. The estimate is how much time the user
   * thinks they spend on media daily; it seeds the suggested budget.
   */
  estimateLabel: "How much media time feels typical for you?",
  /**
   * One-sentence context below the estimate chips.
   * No "too much" framing — the estimate is neutral input, not a confession.
   */
  estimatePrompt: "A rough number is fine.",
  /** Label above the suggested/adjustable budget on the second step. */
  budgetLabel: "Your media budget",
  /**
   * One sentence below the budget explaining what it is.
   * The budget is the user's own intention, not a limit the app enforces.
   */
  budgetPrompt: "This is your own intention — adjust it anytime.",
  /**
   * Note shown when the user tries to go below the minimum (15 min).
   * Tone: informative, not a warning. The floor exists because a budget of zero
   * or very low would frame any media use as a failure (G10).
   */
  budgetFloorNote: "The minimum is 15 minutes.",
  /** Heading of the weekly budget bar chart on /you/media. */
  weekTitle: "This week",
  /**
   * Shown under the week chart for days within budget.
   * No celebratory framing — neutral acknowledgement (G10 equally applies to
   * positive framing that sets up a comparison; bars carry the weight instead).
   */
  withinBudget: "Within your intention today.",
  /**
   * Shown under the week chart for days over budget.
   * Warm acknowledgement; no judgement. The over-budget state is explicitly not
   * framed as a failure (concept §2.5, DigestAndMediaMap Domain Notes Part 3).
   */
  overBudget: "A bit over today — that happens.",
  /**
   * Shown on Today's media-budget row when no estimate has been set yet.
   * Points to /you/media without pressure.
   */
  noEstimate: "Set a rough media estimate in You.",
  /**
   * Shown when an estimate exists but no confirmed budget is set.
   * The suggestion is displayed alongside this line; this copy prompts the user
   * to confirm it if they like (concept §2.5: suggestion is never auto-stored).
   */
  noBudget: "Here's a suggested budget — confirm it to use it.",
  /**
   * Link from /swap to /you/media.
   * Quiet text; only shown when `todayPlan !== null` (concept §2.5 gate).
   */
  linkToSwap: "Adjust budget",
} as const;
