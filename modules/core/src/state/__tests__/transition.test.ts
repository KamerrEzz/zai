import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { InvalidTransitionError } from "../errors.js"
import { createInitialState, readState, writeStateAtomic } from "../io.js"
import type { PhaseState } from "../schema.js"
import { transitionPhaseState } from "../transition.js"

let projectDir: string

beforeEach(async () => {
  projectDir = await mkdtemp(join(tmpdir(), "zai-state-transition-"))
  const initial = createInitialState({
    project: "demo",
    firstPhase: { n: 1, name: "auth", spec: "docs/phases/01-auth.md", test_globs: ["**/*.spec.ts"] },
  })
  await writeStateAtomic(projectDir, initial)
})

afterEach(async () => {
  await rm(projectDir, { recursive: true, force: true })
})

const FULL_PATH: PhaseState[] = ["red", "green", "audited", "documented"]

describe("transitionPhaseState - happy path", () => {
  it("advances planning -> red -> green -> audited -> documented", async () => {
    for (const next of FULL_PATH) {
      const result = await transitionPhaseState(projectDir, next)
      expect(result.phase_state).toBe(next)
      expect(result.phases[0]?.state).toBe(next)
    }
  })

  it("persists the transition to disk, not just in memory", async () => {
    await transitionPhaseState(projectDir, "red")
    const reread = await readState(projectDir)
    expect(reread.phase_state).toBe("red")
  })
})

describe("transitionPhaseState - illegal jumps", () => {
  it("rejects planning -> green (skipping red)", async () => {
    await expect(transitionPhaseState(projectDir, "green")).rejects.toBeInstanceOf(InvalidTransitionError)
  })

  it("rejects planning -> audited", async () => {
    await expect(transitionPhaseState(projectDir, "audited")).rejects.toBeInstanceOf(InvalidTransitionError)
  })

  it("rejects planning -> documented", async () => {
    await expect(transitionPhaseState(projectDir, "documented")).rejects.toBeInstanceOf(InvalidTransitionError)
  })

  it("the error message names both the current and requested state", async () => {
    await expect(transitionPhaseState(projectDir, "audited")).rejects.toThrow(/planning.*audited/s)
  })

  it("does not mutate the file on disk when the transition is illegal", async () => {
    await expect(transitionPhaseState(projectDir, "documented")).rejects.toThrow()
    const stillThere = await readState(projectDir)
    expect(stillThere.phase_state).toBe("planning")
  })
})

describe("transitionPhaseState - going backwards", () => {
  it("rejects going back from green to red", async () => {
    await transitionPhaseState(projectDir, "red")
    await transitionPhaseState(projectDir, "green")
    await expect(transitionPhaseState(projectDir, "red")).rejects.toBeInstanceOf(InvalidTransitionError)
  })

  it("rejects staying in the same state (planning -> planning)", async () => {
    await expect(transitionPhaseState(projectDir, "planning")).rejects.toBeInstanceOf(InvalidTransitionError)
  })

  it("rejects advancing past documented", async () => {
    for (const next of FULL_PATH) {
      await transitionPhaseState(projectDir, next)
    }
    await expect(transitionPhaseState(projectDir, "planning")).rejects.toBeInstanceOf(InvalidTransitionError)
  })
})
