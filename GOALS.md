# Goals — Unpause clickable mockup

_Scope: the whole `unpause-client-mock` repository — one npm package (`app`), a frontend-only clickable Next.js mockup of the Unpause app. Root file; no module-level files, because the single package has no independently evolving unit and fails the necessity test._
_Parent: none — this is the root_
_Last updated: 2026-10-17_

> **Where this file lives, and why.** It sits at the root of the Unpause repo because other people
> will work on the product and need to read its direction there — the user, 2026-10-17: "the goal
> file should be in the repo. because other people will work on it". It is the one deliberate
> exception to the pipeline keeping its files out of this repo; maps, concepts and task files stay
> in the ai-hub workspace under `targets/unpause-client-mock/`.
>
> **How to read these goals.** The user's instruction, verbatim (2026-10-17): "use the documentation
> and provide a fitting goal set for the client and concept design. goals should help not restrict.
> they are guiding concept agents to a fitting answer." Each goal therefore names an outcome, the
> evidence behind it, and which way to lean when two designs compete — not a feature list. Hard
> rules (no backend, placeholder data only, not a medical product, placeholder crisis numbers, no
> shaming copy, 360 px phone-first) are the profile's `## Invariants` and are not repeated as goals.
>
> **Provenance.** Every goal below is traced to a section of the repo `README.md` or a file in
> `documentation/` (the user's own writing), cited inline. What the sources do not supply is the
> *mockup translation* — the "Done looks like" signals and the screen-design cues — which the
> assistant wrote. Where a goal rests on that translation rather than on a source, it is marked
> UNVERIFIED. "Evidence is thin" notes quote the documentation's own `Evidence gaps and risks`
> sections; they mean *keep it light and optional*, not *leave it out*.

## Why This Exists

Life on pause — hours of watching and scrolling while the days lose their shape — is a common part of depression, and withdrawal makes depression worse (README `The idea`; `documentation/00-behavioral-activation.md`). Unpause is an app idea built on behavioral activation that helps people take small, realistic steps back into an active life, at their own pace. Before anyone builds the real client, this mockup has to make the idea tangible: the main screens and flows clickable, the tone audible, so that look, feel and direction can be judged and feedback gathered (README `Goal of this repo`). Without it, tone mistakes — a shaming sentence, a guilt mechanic, a feed that keeps people scrolling — would be discovered in a production app used by people for whom such a mistake does real harm.

## Goals

### G1 — Viewers can judge Unpause's look, feel and tone and give feedback, so believable clickable flows win over screen coverage and polish

**What:** A person shown the mockup on a phone can walk through Unpause's main flows with placeholder data and react to how it feels and sounds, and concept choices lean toward a flow that clicks through believably over adding more screens.
**Why:** The README states the repo's whole purpose as visualising the main screens and flows, testing look, feel and tone, and gathering feedback before the real client exists (README `Goal of this repo`). Tone is the thing Unpause most depends on — the design principles are almost all about how the app treats someone on a bad day — and tone can only be judged in motion, by tapping through a day, never from a static screen list. The ranking "flow over coverage" is what follows from that purpose: a missing feature costs one feedback comment, while a dead click in the middle of the core loop costs the whole test. _(UNVERIFIED — the flow-over-coverage ranking is inferred from README `Goal of this repo` and the caller's brief; correct or delete)_
**Done looks like:** In a walkthrough, feedback is about wording, pacing and feel ("this sentence would make me feel bad", "too many taps before I can start") rather than "what does this screen do" or "this button does nothing".
**Status:** pursuing

### G2 — The plan-do-rate activity loop is the centre of Unpause, and every other feature visibly feeds it rather than competing with it

**What:** Planning a small activity, doing it and rating mood around it is the flow a first-time viewer meets first, and points, media budget, digest, nudges and therapist features each show where they connect back to it.
**Why:** Activity scheduling is the part of behavioral activation with the strongest evidence — large effects against control conditions, and the component that stands out inside internet CBT — and the documentation says the other features "should serve this loop, not compete with it" (`00-behavioral-activation.md`, Implications 1). It also warns against padding: more modules are not automatically better, and some added components even worsen outcomes (Implications 9). A concept that adds a screen with no route back to an activity is drifting from the evidence base, and the viewer of the mock will read Unpause as a media-control or game app instead of an activation app.
**Done looks like:** Asked "what is this app for?" after a walkthrough, viewers describe doing small things and noticing how they feel, not collecting points or blocking YouTube.
**Status:** pursuing

### G3 — On a low-energy day, a user gets from opening Unpause to one small doable action, with its two-minute version first, in very few taps

**What:** The energy check-in scales the day down rather than cancelling it, so a "low" answer leads to one task whose tiny fallback ("put on your shoes") is shown first and counts as a full success.
**Why:** Starting is the hardest part, and fatigue in depression is a symptom, not a lack of willpower (README core idea 1; `01-daily-structure.md`, Implications — Energy check-in, Two-minute version). Depression raises the felt cost of effort, so counting the two-minute version fully keeps the cost of starting low (`01-daily-structure.md`; `02-gamification.md`, Points). This goal carries the README principle **Small steps**: when two designs compete, pick the one that is achievable on a bad day. Evidence is thin: neither energy-adaptive planning nor the two-minute version has been tested as such, and always-easy "low" days could stop activity from ever growing (`01-daily-structure.md`, Evidence gaps) — so keep the check-in to one tap and let the user, not the app, decide when to move up a template.
**Done looks like:** A viewer choosing "low energy" in the mock reaches a single task they would actually do today without scrolling a list, and finishing its two-minute version visibly counts.
**Status:** pursuing

### G4 — Users see for themselves, over days and weeks, that doing things tends to help, without any single task being judged by its mood rating

**What:** A one-tap mood rating before and after an activity feeds trends and "what helped me" patterns across days and weeks, and a "no change" rating is shown as normal.
**Why:** The README frames the rating as the way users "see for themselves that doing things helps" (README `Foundation`). The documentation supports keeping it but keeping it light: activity and mood move together, yet depressed people often rate events as less pleasant and week-to-week links are weak, so a per-task verdict would mislead and could discourage (`00-behavioral-activation.md`, Implications 3–5). Evidence is thin: no trial has tested the before-and-after rating as a separate ingredient, and whether repeated low ratings discourage users is unknown and should be watched in user testing (`00-behavioral-activation.md`, Evidence gaps) — which is exactly what the mock can show viewers and ask about.
**Done looks like:** The mock's review screens show a pattern across placeholder weeks ("walks were most often followed by a better mood"), and nowhere tells the user a task "didn't work".
**Status:** pursuing

### G5 — Progress survives bad days: nothing the user has earned is ever lost, and coming back after a break feels like a fresh start

**What:** Points only go up, missed days cost nothing, a return after a break is welcomed with a modest comeback bonus and no mention of how long the user was away, and reviews show concrete records compared with the starting point.
**Why:** Showing a broken streak lowers later engagement, more so when people blame themselves, and self-blame is common in depression; a fresh-start framing softens the drop (`02-gamification.md`, Comeback bonus instead of streaks). Depression biases memory toward the negative, so progress is easy to overlook unless reviews list what the user actually did and which values it served (`02-gamification.md`, Reviews; README core idea 2). Gamification itself did not add to the effect of depression apps, so it is a support layer that makes progress visible, not the treatment — every game element needs a stated purpose tied to activation (`02-gamification.md`, Overall role). When torn, lean toward feedback ("You went outside today. That counts.") over payment ("earn 10 points to unlock").
**Done looks like:** A mock user who skips a placeholder week returns to a "welcome back" screen and a review that still shows everything they did before, with no number that went down.
**Status:** pursuing

### G6 — Unpause leaves people with less passive screen time, counting Unpause's own screen time too

**What:** Content arrives as a finite, intent-based digest at chosen times with a clear "You're all caught up" end, the media budget is soft and adjustable, scroll urges get a concrete five-minute swap, and each visit to Unpause itself stays short.
**Why:** Cutting back social media or phone time brings a small drop in depressive symptoms and limiting works as well as quitting; batched notifications improved mood while silencing everything raised anxiety; infinite feeds keep people in loops they regret (`03-media-consumption.md`, Implications 1–5). Unpause is itself a screen app, so tracking, digests and check-ins add screen time and must stay brief (`03-media-consumption.md`, Possible harms; `02-gamification.md`: "Do not judge success by app usage"). This goal carries the README principle **Less screen time**: when two designs compete, pick the one that gets the phone put down sooner. Evidence is thin: the digest, earned bonus time and swap prompts are untested extrapolations from short trials in non-depressed groups (`03-media-consumption.md`, Evidence gaps) — so keep budgets moderate and never framed as pass/fail.
**Done looks like:** A mock digest ends after a handful of items, and a viewer can complete the morning flow and close the app in well under the time one feed session would take.
**Status:** pursuing

### G7 — Unpause makes reaching out to someone the user already knows small and safe, and success never depends on anyone replying

**What:** Connection nudges are small, optional and graded to energy, the task counts as done when the user reaches out, and the optional buddy is a trusted person the user already knows, focused on doing things together.
**Why:** Loneliness and low support are consistently linked to depression, but interventions have small effects, people with depression often expect rejection, and a design that depends on replies can confirm that fear (`04-social-connection.md`, Implications — Connection nudges). Buddy evidence is clearest for doing activities together with a trusted supporter, while side-by-side progress comparison is linked to lower mood (`04-social-connection.md`, Buddy). Evidence is thin: no in-app nudge or app-based buddy pairing has been tested for depression (`04-social-connection.md`, Evidence gaps) — so the mock shows the buddy as a light, optional flow, not a social network.
**Done looks like:** Sending a placeholder "Saw this and thought of you" message completes the task in the mock immediately, and no screen shows a buddy's score next to the user's.
**Status:** pursuing

### G8 — Unpause works fully without a therapist, and when one is linked it supports the therapy conversation through sharing the user controls

**What:** Every feature works solo, and therapist access — set up together, sharing off by default, chosen per data type, revocable in one tap — shows the therapist what happened between sessions without claiming to treat anything.
**Why:** Feedback to clinicians has small or unclear effects on depression on its own; the stronger case is that digital tools work better with human contact and the German guideline wants them accompanied by a clinician, so the value is the conversation, not the data (`05-therapist-access.md`, Summary and Implications 1–2). GDPR requires explicit, granular, easily withdrawn consent, and consent must not be a condition for unrelated features (`05-therapist-access.md`, Implications 8–9; README core idea 5: "You decide what is shared and with whom"). When torn, lean toward the design where the user sees what the therapist sees ("see what my therapist sees"), and keep points as optional context rather than a compliance score. Evidence is thin: therapist dashboards, homework inside a self-help app and automatic session summaries are untested (`05-therapist-access.md`, Evidence gaps).
**Done looks like:** A mock user without a therapist never hits a dead end, and a mock user with one can see and switch off each shared item from one screen.
**Status:** pursuing

### G9 — A person in crisis reaches their own safety plan from every screen in one tap, and it stays outside points, budgets and check-ins

**What:** A safety-plan entry is visible on every screen, opens a short, readable plan in the Stanley-Brown structure, and is never earned, blocked, scored or gated by any other feature.
**Why:** Safety planning is one of the better-supported brief interventions in suicide prevention, guidelines say the plan must be accessible at times of crisis, and reviewed apps hid crisis contacts, showed wrong numbers or listed harmful content (`06-safety-plan.md`, Summary and Implications 1–5; README core idea 6). Keeping it out of gamification and media limits is the documentation's design judgment following from "always accessible" (Implications 4). Evidence is thin: no app-based safety plan has been proven to work and the core evidence is low quality (`06-safety-plan.md`, Evidence gaps) — so follow the established structure closely rather than inventing a new format, and present the plan as a support next to professional care. In the mock, crisis numbers are placeholders per the profile's `Safety plan` invariant.
**Done looks like:** From any screen in the mock, one tap shows warning signs, people to call and (placeholder-marked) crisis lines, with no points, timers or prompts in between.
**Status:** pursuing

### G10 — Every sentence and every piece of feedback in Unpause encourages and never shames, especially on a missed day, a low score or an overrun

**What:** When two wordings or two feedback designs compete, the one a person in a depressive episode would read as kind, hopeful and non-judging wins.
**Why:** **Encouraging, never shaming** is a README design principle, and the documentation finds the same risk in every feature: unfinished plans feed self-blame (`01-daily-structure.md`, Possible harms), broken streaks and missed reward goals confirm negative beliefs (`02-gamification.md`), budget overruns trigger self-criticism and must never be framed as failure (`03-media-consumption.md`), and the safety plan's tone must avoid both drama and trivialising (`06-safety-plan.md`, Implications 14). Low energy is a symptom, so copy never implies laziness, and screen time is not moralised or labelled "addiction" (`01-daily-structure.md`; `03-media-consumption.md`, Implications 10). Tone is what G1 exists to test, so this goal is where most mock feedback will land.
**Done looks like:** Reading every empty, missed and "over budget" state in the mock aloud, no viewer finds a sentence that blames the user.
**Status:** pursuing

### G11 — The user can see and decide what Unpause keeps and who sees it, so privacy is something the mock demonstrates rather than asserts

**What:** Sharing with a therapist or buddy is opt-in per item, visible as a preview, and revocable, and the mock shows these moments as part of the flows rather than in a settings page alone.
**Why:** **Privacy first: your data belongs to you** is a README design principle; depression apps often leak data to third parties, social and safety-plan data are among the most sensitive a person has, and sharing must be explicit, granular and easy to revoke (`04-social-connection.md`, Privacy; `05-therapist-access.md`, Implications 8–10; `06-safety-plan.md`, Implications 13). A mockup cannot prove data protection, but it can show viewers whether the consent moments feel respectful or burdensome, which is the part feedback can change. _(UNVERIFIED — "demonstrates rather than asserts" is the assistant's mockup translation of the README principle; correct or delete)_
**Done looks like:** A viewer can point to the screen where they would decide what their therapist or buddy sees, and to where they would take it back.
**Status:** pursuing

## Non-Goals

| Not doing | Why not | Revisit when |
|---|---|---|
| Diagnosis, severity labels or suicide-risk scores shown to the user, or any "we detect your crisis" promise | Unpause supports everyday life and is not a substitute for professional help (README `Note`); a PHQ-9 score is never a diagnosis and NICE advises against risk scores (`05-therapist-access.md` 4–5; `06-safety-plan.md` 8). Repair toward: show trends in gentle wording and route any concerning answer straight to the safety plan (G9). | The team takes regulatory and clinical advice on a medical intended purpose (`05-therapist-access.md` 11) |
| Lost streaks, point deductions, a balance going down, leaderboards or buddy score comparisons | Broken streaks and upward comparison lower engagement and mood in exactly the people Unpause is for, and "missed days are not punished" is a design principle (`02-gamification.md`; `04-social-connection.md`, Buddy). Repair toward: active-days-in-a-period counts, comeback bonus and cumulative "since you started" reviews (G5). | — |
| An engagement-maximising design: infinite feed, autoplay, "more like this", or app opens and minutes-in-app as the success measure | Unpause wants people off the screen; infinite feeds create loops people regret, and gamification can drive compulsive checking instead of real-world activity (`03-media-consumption.md` 4; `02-gamification.md`). Repair toward: a finite digest with a clear end and success shown as real-world tasks done (G6). | — |
| A media budget that defaults to zero, frames the goal as quitting, or makes base rest time depend on productivity | Limiting worked as well as quitting, total cut-off raised anxiety, and "Earn your episode" must never take away the base budget (`03-media-consumption.md` 1, 3, 8). Repair toward: start from the user's own use and suggest a moderate, adjustable cut. | — |
| Replacing the therapist, a crisis service or follow-up care, or implying Unpause is watched in real time | The evidence does not cover people in acute crisis, Unpause must not be the only support for severe depression, and users must be told plainly nobody is watching live (`00-behavioral-activation.md`, Evidence gaps; `06-safety-plan.md` 7, 10). Repair toward: link out to professional help and the safety plan at the moments a feature would otherwise try to handle a crisis itself. | — |
| An open peer community or forum | Peer support for depression shows mixed, modest effects and unmoderated forums showed no benefit and more distress (`04-social-connection.md`, Peer communities). Repair toward: the buddy flow with one trusted, known person (G7). | Active moderation, pseudonyms and suicide-content rules are designed in (`04-social-connection.md`) |
| Extra therapy modules beyond activation — home-made CBT-I, relaxation programmes, light-therapy advice | More modules are not automatically better, relaxation may worsen outcomes, and sleep and light advice belongs with a clinician (`00-behavioral-activation.md` 9; `01-daily-structure.md`, Rhythm anchors). Repair toward: a simple rhythm anchor plus a pointer to a doctor or evidence-based programme. | New evidence for a specific component appears |
| Real health, mood or questionnaire data, real backends, accounts or network services in the mock | The mock exists to judge look, feel and tone (G1), and holding real mental-health data would add risk with nothing to learn from it; the profile's `Architecture` and `Data` invariants make it binding. Repair toward: believable placeholder personas and in-browser state. | The real client is built in a separate project |

## Open Direction Questions

1. **UI language:** does the mockup speak English (as the README does) or German (where the documentation's guideline, PHQ translation and crisis services point), or both behind a switch?
2. **Therapist prominence for solo users:** how visible should therapist features be for someone without a therapist — a quiet optional entry, or a recurring invitation to link one, given guidance helps most in moderate or worse depression (`00-behavioral-activation.md` 6)?
3. **Therapist persona:** does the mock show the therapist's side (dashboard, homework entry, session summary) as its own flow, or only what the user sees and shares?
4. **Buddy scope:** is the buddy a single shared-activity flow in the mock, or does it include the buddy's own view and the expectation-setting step (`04-social-connection.md`, Buddy)?
5. **PHQ-9 without a therapist:** does the mock show the PHQ-9 with its item 9 crisis path, the PHQ-8, or no questionnaire at all for solo users — a decision the documentation says needs clinical advisers (`05-therapist-access.md` 5)?
6. **Intended users at acute risk:** is a person at acute suicidal risk an intended user, and what does the app then say about what the safety plan can and cannot do (`06-safety-plan.md` 12)?
7. **Gamification as a variant:** should the mock offer a plain version beside the gamified one so feedback can compare them, as the documentation suggests testing rather than assuming it helps (`02-gamification.md`, Overall role)?
