"use client";

/**
 * FlowProvider and useFlow — transient one-pass flow state for the core loop.
 *
 * Holds all flow data (energy level, selected task, mood ratings, outcome) for
 * a single run through the check-in → task → mood → done flow. State lives in
 * React context and is intentionally not persisted to localStorage: static-export
 * prerendering causes hydration mismatches when storage is read during render
 * (the same problem silo needed StoreGate to solve). A hard reload empties the
 * state; that is correct for a one-pass demo.
 *
 * FlowProvider must be mounted once in app/layout.tsx, outside AppShell, so that
 * the entire tree including the shell itself can read context if needed.
 */

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { EnergyLevel } from "@/lib/domain/energy";

/** All transient state accumulated during one run through the core loop. */
export interface FlowState {
  energy: EnergyLevel | null;
  taskId: string | null;
  /** templateId from the planner result; null when no plan was produced. */
  templateId: string | null;
  moodBefore: 1 | 2 | 3 | 4 | 5 | null;
  moodAfter: 1 | 2 | 3 | 4 | 5 | null;
  /** "skip" is exact — downstream route pages depend on this literal. */
  outcome: "done" | "skip" | null;
  /**
   * Set when the loop was started from a shared (buddy) card; `undefined` on all
   * non-shared runs. Cleared by `reset()` because `INITIAL_STATE` sets it to
   * `undefined`. It does not decide the log row's origin: `/mood-after` and the
   * skip path write `templateId: state.templateId ?? ""`, and the shared plan
   * item's `templateId` (set through `setTemplateId`) carries `SHARED_TEMPLATE_ID`.
   */
  sharedId: string | undefined;
  /**
   * Set when the loop was started from a homework card; `undefined` on all other
   * runs. Cleared by `reset()` because `INITIAL_STATE` sets it to `undefined`.
   * Lets a later page in the loop tell which standing homework item the run came
   * from. It does not decide the log row's origin: that is `templateId`, which
   * the planner stamps as `HOMEWORK_TEMPLATE_ID` on homework plan items.
   */
  homeworkId: string | undefined;
}

/** Setters and reset exposed through context. */
export interface FlowContextValue {
  state: FlowState;
  setEnergy: (energy: EnergyLevel) => void;
  setTaskId: (taskId: string) => void;
  setTemplateId: (templateId: string | null) => void;
  setMoodBefore: (mood: 1 | 2 | 3 | 4 | 5) => void;
  setMoodAfter: (mood: 1 | 2 | 3 | 4 | 5) => void;
  setOutcome: (outcome: "done" | "skip") => void;
  /** Restores all fields to null. Correct for demo reset or returning to start. */
  reset: () => void;
  /**
   * Sets `sharedId` when starting the loop from a shared (buddy) card, or
   * clears it to `undefined` when starting from a regular card. The log row's
   * origin comes from `templateId`, not from this field.
   */
  setSharedId: (sharedId: string | undefined) => void;
  /**
   * Sets `homeworkId` when starting the loop from a homework card, or clears it
   * to `undefined`. The log row's origin comes from `templateId`
   * (`HOMEWORK_TEMPLATE_ID`), not from this field.
   */
  setHomeworkId: (homeworkId: string | undefined) => void;
}

const INITIAL_STATE: FlowState = {
  energy: null,
  taskId: null,
  templateId: null,
  moodBefore: null,
  moodAfter: null,
  outcome: null,
  sharedId: undefined,
  homeworkId: undefined,
};

const FlowContext = createContext<FlowContextValue | null>(null);

/**
 * Provides flow state to the entire app tree. Mount once in app/layout.tsx.
 * Accepts children only; no other props. All setters create a new state object
 * via spread — state is never mutated in place.
 */
export function FlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FlowState>(INITIAL_STATE);

  const setEnergy = (energy: EnergyLevel) =>
    setState((prev) => ({ ...prev, energy }));
  const setTaskId = (taskId: string) =>
    setState((prev) => ({ ...prev, taskId }));
  const setTemplateId = (templateId: string | null) =>
    setState((prev) => ({ ...prev, templateId }));
  const setMoodBefore = (moodBefore: 1 | 2 | 3 | 4 | 5) =>
    setState((prev) => ({ ...prev, moodBefore }));
  const setMoodAfter = (moodAfter: 1 | 2 | 3 | 4 | 5) =>
    setState((prev) => ({ ...prev, moodAfter }));
  const setOutcome = (outcome: "done" | "skip") =>
    setState((prev) => ({ ...prev, outcome }));
  const setSharedId = (sharedId: string | undefined) =>
    setState((prev) => ({ ...prev, sharedId }));
  const setHomeworkId = (homeworkId: string | undefined) =>
    setState((prev) => ({ ...prev, homeworkId }));
  const reset = () => setState(INITIAL_STATE);

  return (
    <FlowContext.Provider
      value={{ state, setEnergy, setTaskId, setTemplateId, setMoodBefore, setMoodAfter, setOutcome, reset, setSharedId, setHomeworkId }}
    >
      {children}
    </FlowContext.Provider>
  );
}

/**
 * Returns the current FlowContextValue. Throws if called outside FlowProvider —
 * this guards page components that forget to mount the provider in the layout and
 * would otherwise get silent undefined accesses.
 */
export function useFlow(): FlowContextValue {
  const value = useContext(FlowContext);
  if (value === null) {
    throw new Error("useFlow must be used inside FlowProvider");
  }
  return value;
}
