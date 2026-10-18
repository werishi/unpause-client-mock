/** Tone-enforcement word list shared by data-integrity.test.ts and copy.test.ts.
 *  Any word here may not appear (case-insensitively) in user-facing copy or seed data.
 *  Add a word here to enforce it in both test files simultaneously. */
export const BANNED_WORDS = [
  'depression', 'depressed', 'disorder', 'addict', 'addiction',
  'lazy', 'fail', 'behind', 'streak',
] as const;
