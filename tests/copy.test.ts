/**
 * copy.test.ts — tone-enforcement tests for lib/copy.ts.
 *
 * Verifies that no user-facing string in the copy file contains a banned word
 * (defined in ./banned-words). Catches shaming, diagnostic, or habit-claim
 * wording before it ships. Pure unit test — no React, no Next, no network.
 *
 * Environment: Vitest node (no DOM, no browser globals needed).
 */
import { describe, it, expect } from 'vitest'
import { BANNED_WORDS } from './banned-words'
import {
  SHELL,
  SAFETY_PLAN_LINK,
  MOOD_RATING,
  SAFETY_PAGE,
  SAFETY_EDIT,
  DONE_SCREEN,
  START_SCREEN,
  MOOD_BEFORE_PAGE,
  MOOD_AFTER_PAGE,
  NOT_FOUND_PAGE,
  CHECK_IN,
  TASK_SCREEN,
  TABS,
  FLOW,
  TODAY,
  WELCOME,
  ONBOARDING,
  ABOUT,
  DEMO,
  BANNER,
  WELCOME_BACK,
  PLAN,
  YOU,
  LOOK_BACK,
  DIGEST,
  SWAP,
  MEDIA_BUDGET,
  CONNECTION,
  BUDDY,
  THERAPIST,
  LOGIN,
  PRIVACY,
  IMPRINT,
  INVESTOR,
} from '../lib/copy'
import { GATE_STORAGE_KEY } from '../lib/store/gate-store'
import { SHARE_TYPES } from '../lib/domain/sharing'

/**
 * Recursively walks an object or array and collects every string leaf value.
 * Primitive non-string leaves are skipped. Does not export — internal helper only.
 */
function collectStrings(obj: unknown): string[] {
  if (typeof obj === 'string') return [obj]
  if (Array.isArray(obj)) return obj.flatMap(collectStrings)
  if (obj !== null && typeof obj === 'object') {
    return Object.values(obj as Record<string, unknown>).flatMap(collectStrings)
  }
  return []
}

describe('copy tone', () => {
  it('no copy key contains a banned word', () => {
    const allExports: unknown[] = [
      SHELL, SAFETY_PLAN_LINK, MOOD_RATING, SAFETY_PAGE, SAFETY_EDIT, DONE_SCREEN,
      START_SCREEN, MOOD_BEFORE_PAGE, MOOD_AFTER_PAGE, NOT_FOUND_PAGE,
      DIGEST, SWAP, MEDIA_BUDGET,
      CHECK_IN, TASK_SCREEN, TABS, FLOW, TODAY, WELCOME, ONBOARDING,
      ABOUT, DEMO, BANNER, WELCOME_BACK, PLAN, YOU, LOOK_BACK,
      CONNECTION, BUDDY, THERAPIST,
      LOGIN, PRIVACY, IMPRINT, INVESTOR,
    ]
    const strings = allExports.flatMap(collectStrings)

    for (const s of strings) {
      for (const word of BANNED_WORDS) {
        expect(
          s.toLowerCase().includes(word),
          `copy key contains banned word '${word}': '${s}'`,
        ).toBe(false)
      }
    }
  })
})

describe("PLAN copy — no deficit language", () => {
  const planStrings = Object.values(PLAN).filter(v => typeof v === "string");
  const badSubstrings = ["missed", "skipped", " left"];
  const badPattern = /\d+\s*(of|\/)\s*\d+/;
  it.each(planStrings)("'%s' contains no deficit substring", (s) => {
    for (const bad of badSubstrings) {
      expect(s).not.toContain(bad);
    }
    expect(s).not.toMatch(badPattern);
  });
});

describe("LOOK_BACK / WELCOME_BACK bonus / TODAY review — no deficit language", () => {
  const { bonusLine } = WELCOME_BACK;
  const reviewStrings = [
    TODAY.weekReviewCardHeading,
    TODAY.monthReviewCardHeading,
    TODAY.lookBackCtaLabel,
  ];
  const lookBackStrings = collectStrings(LOOK_BACK);
  const allChecked = [bonusLine, ...reviewStrings, ...lookBackStrings];
  const badSubstrings = ["missed", "skipped", " left", "lost"];
  const badPattern = /\d+\s*(of|\/)\s*\d+/;

  it.each(allChecked)("'%s' contains no deficit substring", (s) => {
    for (const bad of badSubstrings) {
      expect(s).not.toContain(bad);
    }
    expect(s).not.toMatch(badPattern);
  });
});

describe('SAFETY_EDIT hints and setup card', () => {
  // Profile Safety plan invariant: a wrong crisis number in a demo is worse than
  // none, so no digit may appear where a viewer could read it as a number to call.
  const noContactStrings = [
    ...collectStrings(SAFETY_EDIT),
    TODAY.safetySetupText,
    TODAY.safetySetupCta,
  ]
  const forbiddenSubstrings = ['tel:', 'mailto:', 'point', 'streak']
  const deficitStrings = [SAFETY_PAGE.emptyStepLine, TODAY.safetySetupText]
  const deficitSubstrings = ['missed', 'skipped', ' left', 'lost']
  const deficitPattern = /\d+\s*(of|\/)\s*\d+/

  it('has one hint per seed step', () => {
    expect(SAFETY_EDIT.hints).toHaveLength(6)
  })

  it.each([...SAFETY_EDIT.hints])("hint '%s' has no digit and starts with e.g.", (hint) => {
    expect(hint).not.toMatch(/\d/)
    expect(hint.startsWith('e.g.')).toBe(true)
  })

  it.each(noContactStrings)("'%s' has no digit, contact scheme, points or streak", (s) => {
    expect(s).not.toMatch(/\d/)
    for (const bad of forbiddenSubstrings) {
      expect(s.toLowerCase()).not.toContain(bad)
    }
  })

  it.each(deficitStrings)("'%s' contains no deficit substring", (s) => {
    for (const bad of deficitSubstrings) {
      expect(s).not.toContain(bad)
    }
    expect(s).not.toMatch(deficitPattern)
  })
})

describe("DIGEST and MEDIA_BUDGET — no deficit language", () => {
  // Concept §2.7: no N-of-M, no "missed", no "skipped", no " left" in digest or
  // media-budget copy. The budget is the user's own intention; framing unread items
  // or over-budget minutes as a deficit contradicts G10 (non-shaming) and the tone
  // established in the rest of the app.
  const digestStrings = collectStrings(DIGEST);
  const mediaBudgetStrings = collectStrings(MEDIA_BUDGET);
  const allChecked = [...digestStrings, ...mediaBudgetStrings];
  const badSubstrings = ["missed", "skipped", " left"];
  const badPattern = /\d+\s*(of|\/)\s*\d+/;

  it.each(allChecked)("'%s' contains no deficit substring", (s) => {
    for (const bad of badSubstrings) {
      expect(s).not.toContain(bad);
    }
    expect(s).not.toMatch(badPattern);
  });
});

describe("BANNER and DEMO replay copy — tone", () => {
  // Profile Tone invariant / goal G10: a notification may carry no deficit, no count
  // and no obligation. A digit in a banner is exactly the pressure the concept rules out.
  const allChecked = [
    ...collectStrings(BANNER),
    DEMO.replayHeading,
    DEMO.replayCheckInLabel,
    DEMO.replayDigestLabel,
  ];
  const badSubstrings = ["missed", "skipped", " left", "lost"];
  const badPattern = /\d+\s*(of|\/)\s*\d+/;
  const bodies = [BANNER.checkInBody, BANNER.digestBody];
  const obligationWords = ["should", "must", "need to", "don't forget"];

  it.each(allChecked)("'%s' contains no deficit substring, count or digit", (s) => {
    for (const bad of badSubstrings) {
      expect(s).not.toContain(bad);
    }
    expect(s).not.toMatch(badPattern);
    expect(s).not.toMatch(/\d/);
  });

  it.each(bodies)("body '%s' asks nothing of the user", (s) => {
    for (const word of obligationWords) {
      expect(s.toLowerCase()).not.toContain(word);
    }
  });
});

describe("THERAPIST copy — wording rules", () => {
  // Concept §2.8 wording rules for therapist access and sharing. collectStrings
  // reaches nested shareTypes objects and the neverShared array of objects.
  const strings = collectStrings(THERAPIST);
  const allowedTokens = new Set(["name", "date", "days", "label", "step", "total", "count", "values"]);

  it("uses only known {tokens}", () => {
    // Token convention: a typo such as {nme} would render literally in the UI.
    for (const s of strings) {
      for (const m of s.matchAll(/\{([^}]*)\}/g)) {
        expect(allowedTokens.has(m[1]), `unknown token '{${m[1]}}' in '${s}'`).toBe(true);
      }
    }
  });

  it("contains no digit", () => {
    // Window sizes are {days} tokens; a literal number would drift from THERAPIST_VIEW_DAYS.
    for (const s of strings) {
      expect(s, `digit in '${s}'`).not.toMatch(/\d/);
    }
  });

  it("contains no deficit language", () => {
    // Rule 1: same deficit substrings and N-of-M pattern as the PLAN / LOOK_BACK blocks.
    for (const s of strings) {
      for (const bad of ["missed", "skipped", " left", "lost"]) {
        expect(s, `deficit substring '${bad}' in '${s}'`).not.toContain(bad);
      }
      expect(s).not.toMatch(/\d+\s*(of|\/)\s*\d+/);
    }
  });

  it("uses live / real time / now only inside a negation", () => {
    // Rule 2: nothing describing what the therapist sees may sound live.
    for (const s of strings) {
      if (/\blive\b|real[- ]time|\bnow\b/i.test(s)) {
        expect(s, `'${s}' sounds live without a negation`).toMatch(/\b(nobody|no one|not|never)\b/i);
      }
    }
  });

  it("states that nobody watches live", () => {
    // Rule 2: the two no-live lines must carry the explicit negation.
    expect(THERAPIST.noLiveLine).toMatch(/nobody watches/i);
    expect(THERAPIST.previewNoLive).toMatch(/nobody watches/i);
  });

  it("uses no measurement or treatment-promise words", () => {
    // Rule 3: no clinical measurement framing. Rule 4: no promise of treatment effect.
    for (const s of strings) {
      expect(s, `measurement word in '${s}'`).not.toMatch(/\b(average|trend|band|severity|score|level)\b/i);
      expect(s, `treatment promise in '${s}'`).not.toMatch(/recover|treatment|heal|cure|improv|better/i);
    }
  });

  it("describes what the therapist sees in the conditional voice", () => {
    // Nothing is sent (ABOUT.body), so every description of the therapist's view says "would".
    for (const type of SHARE_TYPES) {
      expect(THERAPIST.shareTypes).toHaveProperty(type);
      expect(THERAPIST.shareTypes[type].description).toContain("would");
    }
    expect(THERAPIST.previewIntro).toContain("would");
    expect(THERAPIST.previewNothing).toContain("would");
    expect(THERAPIST.previewLink).toContain("would");
  });

  it("lists four never-shared entries, each with a label and a reason", () => {
    // The never-shared list explains every exclusion; an empty reason would read as arbitrary.
    expect(THERAPIST.neverShared).toHaveLength(4);
    for (const entry of THERAPIST.neverShared) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.reason.length).toBeGreaterThan(0);
    }
  });

  it("adds the entry, homework and demo-reset strings outside THERAPIST", () => {
    // The You hub entry, the homework card label and the reset warning (concept §2.9).
    expect(YOU.therapistEntry.length).toBeGreaterThan(0);
    expect(PLAN.fromTherapist.length).toBeGreaterThan(0);
    expect(DEMO.replacesDataNote).toContain("therapist");
  });
});

describe("LOGIN, PRIVACY and IMPRINT copy", () => {
  // Profile Safety plan invariant: no digit on the login page, where a viewer could
  // read it as a number to call. PRIVACY is excluded because "7 days" and
  // "Art. 6(1)(f)" are legitimate legal facts there.
  const loginStrings = collectStrings(LOGIN);

  it.each(loginStrings)("LOGIN string '%s' has no digit and no tel:/mailto:", (s) => {
    expect(s).not.toMatch(/\d/);
    expect(s.toLowerCase()).not.toContain("tel:");
    expect(s.toLowerCase()).not.toContain("mailto:");
  });

  it("has exactly one {name} token in the templated labels and three how-to steps", () => {
    expect(LOGIN.cardAriaLabel.split("{name}").length - 1).toBe(1);
    expect(LOGIN.continueTitle.split("{name}").length - 1).toBe(1);
    expect(LOGIN.howSteps).toHaveLength(3);
  });

  it("lists exactly the two localStorage keys the store and the gate write", () => {
    // Literal "unpause.demo.v2" because STORAGE_KEY in lib/store/user-store.tsx is
    // not exported; GATE_STORAGE_KEY is.
    expect(PRIVACY.storageRows).toHaveLength(2);
    expect(PRIVACY.storageRows.some((r) => r.key === GATE_STORAGE_KEY)).toBe(true);
    expect(PRIVACY.storageRows.some((r) => r.key === "unpause.demo.v2")).toBe(true);
  });

  it("links only to nilsfeldeisen.de over https", () => {
    expect(PRIVACY.hostingLinkHref.startsWith("https://nilsfeldeisen.de/")).toBe(true);
    expect(IMPRINT.linkHref.startsWith("https://nilsfeldeisen.de/")).toBe(true);
  });
});

describe("INVESTOR copy", () => {
  // The LOGIN no-digit / no-mailto rule is deliberately not applied here: the amount, the
  // study figures and the contact link need digits, and INVESTOR reuses LOGIN.crisisNote
  // instead of carrying its own crisis numbers.
  const strings = collectStrings(INVESTOR);

  it("makes no treatment claim", () => {
    // Trailing \b is deliberate: without it `heal` matches "health" ("digital health app").
    // Leading \b keeps "secure" from matching `cure`.
    for (const s of strings) {
      expect(s, `treatment claim in '${s}'`).not.toMatch(
        /\b(?:cures?|cured|heal|heals|healed|healing|clinically proven|guarantee\w*)\b/i,
      );
    }
  });

  it("promises no DiGA status", () => {
    // Profile "Not a medical product" invariant: the page may not claim a medical intended purpose.
    for (const s of strings) {
      expect(s, `DiGA promise in '${s}'`).not.toMatch(/\b(?:will|going to)\s+(?:become|be)\s+a\s+DiGA\b/i);
    }
  });

  it("states the evidence caveat and that it is not a medical product", () => {
    expect(INVESTOR.evidence.caveat).toMatch(/not been tested/i);
    expect(INVESTOR.principles.notMedical).toMatch(/not a medical product/i);
  });

  it("has exactly the twelve placeholder keys, each visibly marked", () => {
    expect(Object.keys(INVESTOR.placeholders).sort()).toEqual(
      [
        "prevalence",
        "careGap",
        "marketSize",
        "founderName",
        "founderBio",
        "fundsShareDevelopment",
        "fundsShareClinical",
        "fundsSharePilot",
        "fundsShareOperations",
        "runwayMonths",
        "roadmapDates",
        "contactEmail",
      ].sort(),
    );
    expect(INVESTOR.placeholders.roadmapDates).toHaveLength(3);
    for (const [key, value] of Object.entries(INVESTOR.placeholders)) {
      if (key === "contactEmail") continue;
      const values: readonly string[] = Array.isArray(value) ? value : [value as string];
      for (const v of values) {
        expect(v.startsWith("Placeholder: "), `placeholder '${key}' is not marked: '${v}'`).toBe(true);
      }
    }
    expect(INVESTOR.placeholders.contactEmail).toBe("founder@example.com");
  });

  it("has the list shapes the page renders", () => {
    expect(INVESTOR.solution.cards).toHaveLength(6);
    expect(INVESTOR.ask.rows).toHaveLength(4);
    expect(INVESTOR.roles.cards).toHaveLength(3);
    expect(INVESTOR.status.steps).toHaveLength(5);
    expect(INVESTOR.goals.items).toHaveLength(4);
    expect(INVESTOR.evidence.points).toHaveLength(4);
    expect(INVESTOR.status.currentStep).toBe(2);
  });

  it("reuses the shell and login safety strings instead of copying them", () => {
    expect(INVESTOR.safetyAndLegal.disclaimer).toBe(SHELL.footer);
    expect(INVESTOR.safetyAndLegal.crisisNote).toBe(LOGIN.crisisNote);
    expect(LOGIN.aboutProjectLinkLabel.length).toBeGreaterThan(0);
  });
});
