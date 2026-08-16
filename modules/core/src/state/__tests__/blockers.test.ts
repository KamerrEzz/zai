import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { recordBlockers } from "../blockers.js"
import { AuditBlockersPresentError, PhaseAdvanceError } from "../errors.js"
import { createInitialState, readState, writeStateAtomic } from "../io.js"
import { transitionPhaseState } from "../transition.js"

let projectDir: string

beforeEach(async () => {
  projectDir = await mkdtemp(join(tmpdir(), "zai-state-blockers-"))
  const initial = createInitialState({
    project: "demo",
    firstPhase: { n: 1, name: "auth", spec: "docs/phases/01-auth.md", test_globs: [] },
  })
  await writeStateAtomic(projectDir, initial)
  await transitionPhaseState(projectDir, "red")
  await transitionPhaseState(projectDir, "green")
})

afterEach(async () => {
  await rm(projectDir, { recursive: true, force: true })
})

describe("recordBlockers", () => {
  it("records blockers on the current phase without changing phase_state", async () => {
    const result = await recordBlockers(projectDir, ["missing error handling in login()"])
    expect(result.phase_state).toBe("green")
    expect(result.phases[0]?.blockers).toEqual(["missing error handling in login()"])
  })

  it("persists to disk", async () => {
    await recordBlockers(projectDir, ["blocker A"])
    const reread = await readState(projectDir)
    expect(reread.phases[0]?.blockers).toEqual(["blocker A"])
  })

  it("an empty list clears previously recorded blockers", async () => {
    await recordBlockers(projectDir, ["blocker A"])
    await recordBlockers(projectDir, [])
    const reread = await readState(projectDir)
    expect(reread.phases[0]?.blockers).toEqual([])
  })

  it("rejects recording blockers outside of green", async () => {
    await recordBlockers(projectDir, [])
    await transitionPhaseState(projectDir, "audited")
    await expect(recordBlockers(projectDir, ["too late"])).rejects.toBeInstanceOf(PhaseAdvanceError)
  })
})

describe("transitionPhaseState - audited requires zero blockers", () => {
  it("refuses to transition to audited while blockers are present", async () => {
    await recordBlockers(projectDir, ["blocker A"])
    await expect(transitionPhaseState(projectDir, "audited")).rejects.toBeInstanceOf(AuditBlockersPresentError)
  })

  it("allows transitioning to audited once blockers are cleared", async () => {
    await recordBlockers(projectDir, ["blocker A"])
    await recordBlockers(projectDir, [])
    const result = await transitionPhaseState(projectDir, "audited")
    expect(result.phase_state).toBe("audited")
  })

  it("allows transitioning to audited when blockers were never recorded", async () => {
    const result = await transitionPhaseState(projectDir, "audited")
    expect(result.phase_state).toBe("audited")
  })
})
