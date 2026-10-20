import { describe, it, expect } from 'vitest';
import type { LogEntry, Activity } from '../lib/domain/types';
import type { SafetyPlan } from '../lib/repo/safety-plan-repo';
import { SHARE_TYPES, type ShareType } from '../lib/domain/sharing';
import { categoryPatterns } from '../lib/domain/look-back';
import {
  projectTherapistView,
  type TherapistSection,
  type TherapistView,
  type TherapistViewInput,
} from '../lib/domain/therapist-view';

// ─── Fixture helpers ──────────────────────────────────────────────────────────
// Hand-built and independent of the persona seed data, so a seed edit cannot
// hide a regression in the projection.

function entry(
  activityId: string,
  date: string,
  outcome: 'done' | 'skip' = 'done',
  moodBefore?: number | null,
  moodAfter?: number | null
): LogEntry {
  return { activityId, templateId: 'tmpl-1', date, outcome, moodBefore, moodAfter };
}

function activity(
  id: string,
  category: Activity['category'],
  valueIds: string[] = [],
  title = 'Test'
): Activity {
  return {
    id,
    category,
    valueIds,
    strenuous: false,
    title,
    cue: 'Test cue',
    twoMinuteVersion: 'Test two-min',
    energyRequired: 'low',
    minutes: 10,
    sourceIds: [],
  };
}

// Tuesday; the Monday week boundary is 2026-10-19. 14-day window starts
// 2026-10-07, the 7-day weekSummary window starts 2026-10-14.
const today = '2026-10-20';

const PLACEHOLDER_WARNING = 'PLACEHOLDER warning sign line';
const PLACEHOLDER_CRISIS = 'PLACEHOLDER crisis line 0800 000 000';

const safetySeed: SafetyPlan = [
  { title: 'Warning signs', prompt: 'What tells you a crisis may be coming?', entries: [PLACEHOLDER_WARNING] },
  { title: 'People to call', prompt: 'Who can you reach out to?', entries: [PLACEHOLDER_CRISIS] },
];

const NONE_ON: Partial<Record<ShareType, boolean>> = {
  moodRatings: false,
  activityLog: false,
  weekSummary: false,
  safetyPlan: false,
};

const ALL_ON: Partial<Record<ShareType, boolean>> = {
  moodRatings: true,
  activityLog: true,
  weekSummary: true,
  safetyPlan: true,
};

function makeInput(overrides: Partial<TherapistViewInput> = {}): TherapistViewInput {
  return {
    therapist: { name: 'Dr. Test' },
    sharing: { ...NONE_ON },
    log: [],
    safetyEntries: [],
    activities: [
      activity('walk', 'movement', ['v-health'], 'Walk'),
      activity('stretch', 'movement', ['v-health', 'v-calm'], 'Stretch'),
      activity('call', 'social', ['v-connect'], 'Call a friend'),
    ],
    safetySeed,
    ...overrides,
  };
}

function only(type: ShareType): Partial<Record<ShareType, boolean>> {
  return { ...NONE_ON, [type]: true };
}

function section<T extends TherapistSection['type']>(
  view: TherapistView,
  type: T
): Extract<TherapistSection, { type: T }> {
  const s = view.sections.find((x) => x.type === type);
  if (!s) throw new Error(`section ${type} missing`);
  return s as Extract<TherapistSection, { type: T }>;
}

function moodDates(view: TherapistView): string[] {
  return section(view, 'moodRatings').rows.map((r) => r.date);
}

function logDates(view: TherapistView): string[] {
  return section(view, 'activityLog').days.map((d) => d.date);
}

function collectKeys(value: unknown, into: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const v of value) collectKeys(v, into);
  } else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      into.push(k);
      collectKeys(v, into);
    }
  }
  return into;
}

// ─── Switched-off types are absent ───────────────────────────────────────────

describe('projectTherapistView — switched-off types absent', () => {
  it('returns no sections when every switch is off', () => {
    expect(projectTherapistView(makeInput(), today).sections).toEqual([]);
  });

  it.each(SHARE_TYPES.map((t) => [t]))('returns exactly the %s section when only it is on', (type) => {
    const view = projectTherapistView(makeInput({ sharing: only(type) }), today);
    expect(view.sections.map((s) => s.type)).toEqual([type]);
  });

  it('returns all four sections in SHARE_TYPES order regardless of the sharing key order', () => {
    const sharing: Partial<Record<ShareType, boolean>> = {
      safetyPlan: true,
      weekSummary: true,
      activityLog: true,
      moodRatings: true,
    };
    const view = projectTherapistView(makeInput({ sharing }), today);
    expect(view.sections.map((s) => s.type)).toEqual([...SHARE_TYPES]);
  });

  it('returns no sections when no therapist is linked even with every switch on', () => {
    const view = projectTherapistView(makeInput({ therapist: null, sharing: { ...ALL_ON } }), today);
    expect(view.sections).toEqual([]);
  });

  it('treats a non-boolean switch value as not shared', () => {
    const sharing = { ...NONE_ON, moodRatings: 'yes' as unknown as boolean };
    const view = projectTherapistView(makeInput({ sharing }), today);
    expect(view.sections).toEqual([]);
  });

  it('does not mutate the input', () => {
    const input = makeInput({
      sharing: { ...ALL_ON },
      log: [
        entry('walk', '2026-10-15', 'done', 2, 4),
        entry('stretch', '2026-10-19', 'done', 3, 3),
        entry('call', '2026-10-18', 'skip', null, null),
      ],
      safetyEntries: [['  Feeling withdrawn  '], []],
    });
    const before = JSON.stringify(input);
    projectTherapistView(input, today);
    expect(JSON.stringify(input)).toBe(before);
  });
});

// ─── Window ──────────────────────────────────────────────────────────────────

describe('projectTherapistView — window', () => {
  const log = [
    entry('walk', '2026-10-07', 'done', 2, 4), // today-13: inside
    entry('walk', '2026-10-06', 'done', 2, 4), // today-14: outside
    entry('walk', '2026-10-21', 'done', 2, 4), // today+1: outside
  ];

  it('reports the 14-day window bounds', () => {
    const view = projectTherapistView(makeInput(), today);
    expect(view.from).toBe('2026-10-07');
    expect(view.to).toBe(today);
  });

  it('includes a rated done row at today-13 and excludes today-14 and today+1 from mood rows', () => {
    const view = projectTherapistView(makeInput({ sharing: only('moodRatings'), log }), today);
    expect(moodDates(view)).toEqual(['2026-10-07']);
  });

  it('applies the same bounds to the activity log', () => {
    const view = projectTherapistView(makeInput({ sharing: only('activityLog'), log }), today);
    expect(logDates(view)).toEqual(['2026-10-07']);
  });

  it('counts a done row at today-6 toward activeDays and not one at today-7', () => {
    const weekLog = [entry('walk', '2026-10-14'), entry('call', '2026-10-13')];
    const view = projectTherapistView(makeInput({ sharing: only('weekSummary'), log: weekLog }), today);
    const week = section(view, 'weekSummary');
    expect(week.from).toBe('2026-10-14');
    expect(week.to).toBe(today);
    expect(week.activeDays).toBe(1);
    expect(week.valueIds).toEqual(['v-health']);
  });
});

// ─── No skip rows ────────────────────────────────────────────────────────────

describe('projectTherapistView — no skip rows', () => {
  const sharing = { ...NONE_ON, moodRatings: true, activityLog: true };

  it('never turns a skip row into a mood row', () => {
    const log = [entry('walk', '2026-10-15', 'skip', null, null)];
    const view = projectTherapistView(makeInput({ sharing, log }), today);
    expect(section(view, 'moodRatings').rows).toEqual([]);
  });

  it('omits a day that has only a skip row from the activity log', () => {
    const log = [
      entry('walk', '2026-10-15', 'skip', null, null),
      entry('stretch', '2026-10-16', 'done'),
    ];
    const view = projectTherapistView(makeInput({ sharing, log }), today);
    expect(section(view, 'activityLog').days).toEqual([{ date: '2026-10-16', titles: ['Stretch'] }]);
  });

  it('does not make a mood row from a done row with a missing moodAfter', () => {
    const log = [entry('walk', '2026-10-15', 'done', 3)];
    const view = projectTherapistView(makeInput({ sharing, log }), today);
    expect(section(view, 'moodRatings').rows).toEqual([]);
    expect(section(view, 'activityLog').days).toEqual([{ date: '2026-10-15', titles: ['Walk'] }]);
  });

  it('omits an unknown activity id from both mood rows and the activity log', () => {
    const log = [entry('act-unknown', '2026-10-15', 'done', 2, 4)];
    const view = projectTherapistView(makeInput({ sharing, log }), today);
    expect(section(view, 'moodRatings').rows).toEqual([]);
    expect(section(view, 'activityLog').days).toEqual([]);
  });
});

// ─── Ordering and shape ──────────────────────────────────────────────────────

describe('projectTherapistView — ordering and shape', () => {
  const sharing = { ...NONE_ON, moodRatings: true, activityLog: true };
  const log = [
    entry('walk', '2026-10-10', 'done', 2, 3),
    entry('stretch', '2026-10-12', 'done', 3, 4),
    entry('call', '2026-10-10', 'done', 1, 2),
  ];

  it('orders mood rows newest first and keeps log order within a day', () => {
    const view = projectTherapistView(makeInput({ sharing, log }), today);
    expect(section(view, 'moodRatings').rows).toEqual([
      { date: '2026-10-12', activityId: 'stretch', title: 'Stretch', moodBefore: 3, moodAfter: 4 },
      { date: '2026-10-10', activityId: 'walk', title: 'Walk', moodBefore: 2, moodAfter: 3 },
      { date: '2026-10-10', activityId: 'call', title: 'Call a friend', moodBefore: 1, moodAfter: 2 },
    ]);
  });

  it('orders log days newest first and keeps log order within a day', () => {
    const view = projectTherapistView(makeInput({ sharing, log }), today);
    expect(section(view, 'activityLog').days).toEqual([
      { date: '2026-10-12', titles: ['Stretch'] },
      { date: '2026-10-10', titles: ['Walk', 'Call a friend'] },
    ]);
  });

  it('takes titles from the supplied activities, including an overridden title', () => {
    const activities = [
      activity('walk', 'movement', ['v-health'], 'My evening loop'),
      activity('stretch', 'movement', ['v-health'], 'Stretch'),
      activity('call', 'social', ['v-connect'], 'Call a friend'),
    ];
    const view = projectTherapistView(makeInput({ sharing, log, activities }), today);
    expect(section(view, 'moodRatings').rows[1].title).toBe('My evening loop');
    expect(section(view, 'activityLog').days[1].titles[0]).toBe('My evening loop');
  });
});

// ─── No score-like field ─────────────────────────────────────────────────────

describe('projectTherapistView — no score-like field', () => {
  it('has no key anywhere in a fully populated view that reads as a score', () => {
    const log = [
      entry('walk', '2026-10-14', 'done', 2, 4),
      entry('stretch', '2026-10-15', 'done', 3, 4),
      entry('walk', '2026-10-19', 'done', 2, 3),
      entry('stretch', '2026-10-20', 'done', 4, 5),
      entry('call', '2026-10-18', 'skip', null, null),
    ];
    const view = projectTherapistView(
      makeInput({ sharing: { ...ALL_ON }, log, safetyEntries: [['Not sleeping'], ['Call Sam']] }),
      today
    );
    expect(section(view, 'weekSummary').patterns.length).toBeGreaterThan(0);
    const keys = collectKeys(view);
    expect(keys.length).toBeGreaterThan(0);
    const scoreLike = /average|mean|trend|band|score|level|severity|delta|change/i;
    expect(keys.filter((k) => scoreLike.test(k))).toEqual([]);
  });
});

// ─── weekSummary ─────────────────────────────────────────────────────────────

describe('projectTherapistView — weekSummary', () => {
  const sharing = only('weekSummary');

  it('reports activeDays and sorted valueIds for a hand-built week', () => {
    const log = [
      entry('call', '2026-10-15'),
      entry('walk', '2026-10-15'),
      entry('walk', '2026-10-17'),
      entry('stretch', '2026-10-18', 'skip', null, null),
    ];
    const week = section(projectTherapistView(makeInput({ sharing, log }), today), 'weekSummary');
    expect(week.activeDays).toBe(2);
    expect(week.valueIds).toEqual(['v-connect', 'v-health']);
  });

  it('returns no patterns for sparse data', () => {
    const log = [entry('walk', '2026-10-15'), entry('call', '2026-10-19')];
    const week = section(projectTherapistView(makeInput({ sharing, log }), today), 'weekSummary');
    expect(week.patterns).toEqual([]);
  });

  it('yields a movement pattern when two movement activities are done across the Monday boundary', () => {
    // Weeks of 2026-10-12 and 2026-10-19; 4 completions, 2 activities, share 1.
    const log = [
      entry('walk', '2026-10-14'),
      entry('stretch', '2026-10-15'),
      entry('walk', '2026-10-19'),
      entry('stretch', '2026-10-20'),
    ];
    const week = section(projectTherapistView(makeInput({ sharing, log }), today), 'weekSummary');
    expect(week.patterns).toEqual([{ categoryKey: 'movement', rank: 0 }]);
  });

  it('does not widen the log: rows inside the 28-day cutoff but outside the week yield no patterns', () => {
    // Qualifies for categoryPatterns over 28 days (weeks of 10-05 and 10-12),
    // but none of it lies in 2026-10-14..2026-10-20.
    const log = [
      entry('walk', '2026-10-05'),
      entry('stretch', '2026-10-06'),
      entry('walk', '2026-10-12'),
    ];
    const input = makeInput({ sharing, log });
    const week = section(projectTherapistView(input, today), 'weekSummary');
    expect(week.patterns).toEqual([]);
    expect(categoryPatterns(log, input.activities, today).length).toBeGreaterThan(0);
  });
});

// ─── safetyPlan ──────────────────────────────────────────────────────────────

describe('projectTherapistView — safetyPlan', () => {
  const sharing = only('safetyPlan');

  it('reports an empty plan when there are no entries', () => {
    const view = projectTherapistView(makeInput({ sharing, safetyEntries: [] }), today);
    expect(section(view, 'safetyPlan')).toEqual({ type: 'safetyPlan', empty: true, steps: [] });
  });

  it('reports an empty plan when every entry is whitespace only', () => {
    const view = projectTherapistView(
      makeInput({ sharing, safetyEntries: [['   '], ['\t', '']] }),
      today
    );
    expect(section(view, 'safetyPlan')).toEqual({ type: 'safetyPlan', empty: true, steps: [] });
  });

  it('shows only the step the user wrote in, titled from the seed, with no placeholder lines', () => {
    const view = projectTherapistView(
      makeInput({ sharing, safetyEntries: [[], ['Call Sam']] }),
      today
    );
    expect(section(view, 'safetyPlan')).toEqual({
      type: 'safetyPlan',
      empty: false,
      steps: [{ title: 'People to call', entries: ['Call Sam'] }],
    });
    const json = JSON.stringify(view);
    expect(json).not.toContain(PLACEHOLDER_WARNING);
    expect(json).not.toContain(PLACEHOLDER_CRISIS);
  });
});
