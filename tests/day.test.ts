import { describe, it, expect } from "vitest";
import {
  daysBetween,
  isWelcomeBackDue,
  localDateString,
  latestDate,
  isMonday,
  isFirstOfMonth,
} from "../lib/domain/day";

describe("daysBetween", () => {
  it("crosses a month boundary", () => {
    expect(daysBetween("2025-01-28", "2025-02-03")).toBe(6);
  });

  it("crosses a year boundary", () => {
    expect(daysBetween("2024-12-30", "2025-01-02")).toBe(3);
  });

  it("same date returns 0", () => {
    expect(daysBetween("2025-06-01", "2025-06-01")).toBe(0);
  });

  it("is order-independent", () => {
    // reversed argument order must return the same non-negative value
    expect(daysBetween("2025-02-03", "2025-01-28")).toBe(6);
  });
});

describe("isWelcomeBackDue", () => {
  it("returns false when the gap has not been reached (3 days, threshold 4)", () => {
    // daysBetween("2025-06-01", "2025-06-04") === 3, which is < 4
    expect(isWelcomeBackDue("2025-06-01", "2025-06-04", 4)).toBe(false);
  });

  it("returns true when the gap is exactly met (4 days, threshold 4)", () => {
    // daysBetween("2025-06-01", "2025-06-05") === 4, which is >= 4
    expect(isWelcomeBackDue("2025-06-01", "2025-06-05", 4)).toBe(true);
  });

  it("returns false when lastOpened is null", () => {
    expect(isWelcomeBackDue(null, "2025-06-10", 4)).toBe(false);
  });
});

describe("localDateString", () => {
  it("returns the local calendar date for a time just after local midnight", () => {
    // new Date(2025, 5, 15, 0, 1) is 2025-06-15 at 00:01 local time.
    // toISOString() would return the previous UTC date (2025-06-14) in any
    // timezone east of UTC+00:01 — the bug this helper exists to prevent.
    // In the node test environment the timezone is UTC, so toISOString() and
    // localDateString happen to agree here; the test still documents the
    // contract and guards against regressions if the runner timezone is set.
    const d = new Date(2025, 5, 15, 0, 1); // month is 0-indexed
    expect(localDateString(d)).toBe("2025-06-15");
  });
});

describe("latestDate", () => {
  it("returns null for an empty array", () => {
    expect(latestDate([])).toBeNull();
  });

  it("returns the single element for a one-element array", () => {
    expect(latestDate(["2025-04-20"])).toBe("2025-04-20");
  });

  it("returns the latest date from a multi-element array", () => {
    expect(
      latestDate(["2025-01-10", "2025-03-01", "2025-02-15"])
    ).toBe("2025-03-01");
  });
});

describe("isMonday", () => {
  it("returns true for 2026-10-19 (Monday — the look-back test anchor date)", () => {
    expect(isMonday("2026-10-19")).toBe(true);
  });

  it("returns false for 2026-10-20 (Tuesday)", () => {
    expect(isMonday("2026-10-20")).toBe(false);
  });

  it("returns false for 2026-10-18 (Sunday)", () => {
    expect(isMonday("2026-10-18")).toBe(false);
  });
});

describe("isFirstOfMonth", () => {
  it("returns true for 2026-10-01", () => {
    expect(isFirstOfMonth("2026-10-01")).toBe(true);
  });

  it("returns false for 2026-10-02", () => {
    expect(isFirstOfMonth("2026-10-02")).toBe(false);
  });

  it("returns false for 2026-09-30 (last day of previous month)", () => {
    expect(isFirstOfMonth("2026-09-30")).toBe(false);
  });
});
