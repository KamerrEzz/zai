import { describe, expect, it } from "vitest"

import { isValidTransition, type PhaseState, type ZaiState, ZaiStateSchema } from "../schema.js"

function baseState(): ZaiState {
  return {
    project: "demo",
    schema_version: "0.1.0",
    current_phase: 1,
    phase_state: "planning" satisfies PhaseState,
    phases: [
      {
        n: 1,
        name: "auth",
        spec: "docs/phases/01-auth.md",
        state: "planning" satisfies PhaseState,
        test_globs: ["packages/api/**/*.spec.ts"],
        audit: null,
        blockers: [],
      },
    ],
  }
}

describe("isValidTransition", () => {
  it("allows the exact next FSM step", () => {
    expect(isValidTransition("planning", "red")).toBe(true)
    expect(isValidTransition("red", "green")).toBe(true)
    expect(isValidTransition("green", "audited")).toBe(true)
    expect(isValidTransition("audited", "documented")).toBe(true)
  })

  it("rejects skipped steps", () => {
    expect(isValidTransition("planning", "green")).toBe(false)
    expect(isValidTransition("planning", "audited")).toBe(false)
    expect(isValidTransition("red", "documented")).toBe(false)
  })

  it("rejects going backwards", () => {
    expect(isValidTransition("green", "red")).toBe(false)
    expect(isValidTransition("documented", "audited")).toBe(false)
  })

  it("rejects staying in the same state", () => {
    expect(isValidTransition("green", "green")).toBe(false)
  })
})

describe("ZaiStateSchema", () => {
  it("accepts a valid state", () => {
    const result = ZaiStateSchema.safeParse(baseState())
    expect(result.success).toBe(true)
  })

  it("rejects current_phase that does not exist in phases[]", () => {
    const state = baseState()
    state.current_phase = 99
    const result = ZaiStateSchema.safeParse(state)
    expect(result.success).toBe(false)
  })

  it("rejects phase_state out of sync with phases[].state", () => {
    const state = baseState()
    state.phase_state = "red"
    const result = ZaiStateSchema.safeParse(state)
    expect(result.success).toBe(false)
  })

  it("rejects duplicate phase numbers", () => {
    const state = baseState()
    state.phases.push({ ...state.phases[0]! })
    const result = ZaiStateSchema.safeParse(state)
    expect(result.success).toBe(false)
  })
})
