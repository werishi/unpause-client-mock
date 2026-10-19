/**
 * Data-access layer for digest item seed data.
 *
 * The only permitted importer of `@/data/digest-items.json`; pages and feature
 * modules must use this module rather than importing the JSON file directly
 * (profile Dependency rule: pages → lib/repo/ → data/).
 *
 * No business logic lives here — filtering by interest, ordering by slot, and
 * checking the seen state are all responsibilities of `lib/domain/digest.ts`.
 */

import digestItemsJson from "@/data/digest-items.json";

/**
 * One seed item in the interest digest.
 *
 * `tags` contains kebab-case slug strings (e.g. `"indie-game-releases"`).
 * The domain layer (`lib/domain/digest.ts`) is responsible for matching these
 * against user interests — callers must not compare raw interest strings to
 * these tags directly, because the domain normalises them to the same slug
 * format before comparison.
 */
export interface DigestItem {
  id: string;
  title: string;
  source: string;
  tags: string[];
  minutesToRead: number;
}

/**
 * Returns every item in `data/digest-items.json` as a typed array.
 *
 * No filtering or sorting is applied — the domain layer receives the raw
 * corpus and decides which items to surface for a given set of interests.
 */
export function getDigestItems(): DigestItem[] {
  return digestItemsJson as DigestItem[];
}
