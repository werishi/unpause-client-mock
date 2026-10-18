import { describe, it, expect } from 'vitest';
import { withOverride } from '../lib/domain/override';
import type { Activity } from '../lib/domain/types';

// ─── Fixture ─────────────────────────────────────────────────────────────────

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    title: 'Walk outside',
    cue: 'After lunch, I …',
    twoMinuteVersion: 'Step outside the front door',
    energyRequired: 'low',
    category: 'movement',
    strenuous: false,
    minutes: 20,
    valueIds: ['health'],
    sourceIds: [],
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('withOverride', () => {
  it('returns a structurally equal object when patch is undefined', () => {
    const activity = makeActivity();
    const result = withOverride(activity, undefined);
    expect(result).toEqual(activity);
  });

  it('does not mutate the original activity', () => {
    const activity = makeActivity();
    const original = { ...activity };
    withOverride(activity, { cue: 'New cue' });
    expect(activity).toEqual(original);
  });

  it('ignores whitespace-only cue and keeps the catalogue value', () => {
    const activity = makeActivity();
    const result = withOverride(activity, { cue: '   ' });
    expect(result.cue).toBe(activity.cue);
  });

  it('replaces cue with a non-empty trimmed string', () => {
    const activity = makeActivity();
    const result = withOverride(activity, { cue: 'My cue' });
    expect(result.cue).toBe('My cue');
  });

  it('replaces twoMinuteVersion with a non-empty trimmed string', () => {
    const activity = makeActivity();
    const result = withOverride(activity, { twoMinuteVersion: 'Two min' });
    expect(result.twoMinuteVersion).toBe('Two min');
  });

  it('ignores whitespace-only twoMinuteVersion and keeps the catalogue value', () => {
    const activity = makeActivity();
    const result = withOverride(activity, { twoMinuteVersion: '\t\n' });
    expect(result.twoMinuteVersion).toBe(activity.twoMinuteVersion);
  });

  it('sets valueIds to [valueTag] when valueTag is a non-empty string', () => {
    const activity = makeActivity();
    const result = withOverride(activity, { valueTag: 'calm' });
    expect(result.valueIds).toEqual(['calm']);
  });

  it('sets valueIds to [] when valueTag is empty string (None case)', () => {
    const activity = makeActivity();
    const result = withOverride(activity, { valueTag: '' });
    expect(result.valueIds).toEqual([]);
  });

  it('leaves valueIds unchanged when valueTag is undefined', () => {
    const activity = makeActivity({ valueIds: ['health', 'connection'] });
    const result = withOverride(activity, { valueTag: undefined });
    expect(result.valueIds).toEqual(['health', 'connection']);
  });

  it('applies multiple patch fields in a single call', () => {
    const activity = makeActivity({ valueIds: [] });
    const result = withOverride(activity, {
      cue: 'Evening walk',
      twoMinuteVersion: 'Step outside',
      valueTag: 'wellbeing',
    });
    expect(result.cue).toBe('Evening walk');
    expect(result.twoMinuteVersion).toBe('Step outside');
    expect(result.valueIds).toEqual(['wellbeing']);
  });
});
