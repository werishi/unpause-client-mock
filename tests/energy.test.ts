import { describe, it, expect } from "vitest";
import { suggestTaskForEnergy, Task } from "../lib/domain/energy";

function makeTask(id: string, energyRequired: Task["energyRequired"]): Task {
  return {
    id,
    title: `Task ${id}`,
    cue: `Cue ${id}`,
    twoMinuteVersion: `Two-minute version ${id}`,
    energyRequired,
    minutes: 5,
  };
}

describe("suggestTaskForEnergy", () => {
  it("low energy returns a task with energyRequired === low", () => {
    const tasks = [makeTask("a", "low"), makeTask("b", "medium")];
    const result = suggestTaskForEnergy("low", tasks);
    expect(result.energyRequired).toBe("low");
  });

  it("medium energy returns a task with energyRequired low or medium", () => {
    const tasks = [makeTask("a", "high"), makeTask("b", "medium")];
    const result = suggestTaskForEnergy("medium", tasks);
    expect(["low", "medium"]).toContain(result.energyRequired);
  });

  it("high energy returns any task", () => {
    const tasks = [makeTask("a", "high"), makeTask("b", "low")];
    const result = suggestTaskForEnergy("high", tasks);
    expect(result).toBeDefined();
  });

  it("returns the first matching task when multiple low tasks exist", () => {
    const first = makeTask("first", "low");
    const second = makeTask("second", "low");
    const result = suggestTaskForEnergy("low", [first, second]);
    expect(result.id).toBe("first");
  });

  it("returns the task with lowest energyRequired when no low task exists", () => {
    const tasks = [makeTask("a", "high"), makeTask("b", "medium")];
    const result = suggestTaskForEnergy("low", tasks);
    expect(result.energyRequired).toBe("medium");
  });

  it("throws Error when the task list is empty", () => {
    expect(() => suggestTaskForEnergy("low", [])).toThrow(Error);
  });
});
