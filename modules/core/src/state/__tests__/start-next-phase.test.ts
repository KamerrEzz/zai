import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { PhaseAdvanceError } from "../errors.js"
import { createInitialState, readState, writeStateAtomic } from "../io.js"
import { startNextPhase } from "../start-next-phase.js"
import type { PhaseState } from "../schema.js"
import { transitionPhaseState } from "../transition.js"

let projectDir: string

beforeEach(async () => {
  projectDir = await mkdtemp(join(tmpdir(), "zai-state-start-next-phase-"))
  const initial = createInitialState({
    project: "demo",
    firstPhase: { n: 1, name: "auth", spec: "docs/phases/01-auth.md", test_globs: [] },
  })
  await writeStateAtomic(projectDir, initial)
})

afterEach(async () => {
  await rm(projectDir, { recursive: true, force: true })
})

const FULL_PATH: PhaseState[] = ["red", "green", "audited", "documented"]

describe("startNextPhase", () => {
  it("refuses to start a new phase while the current one isn't documented", async () => {
    await expect(
      startNextPhase(projectDir, { name: "billing", spec: "docs/phases/02-billing.md", test_globs: [] }),
    ).rejects.toBeInstanceOf(PhaseAdvanceError)
  })

  it("appends a new phase in planning and advances current_phase once documented", async () => {
    for (const next of FULL_PATH) {
      await transitionPhaseState(projectDir, next)
    }

    const result = await startNextPhase(projectDir, {
      name: "billing",
      spec: "docs/phases/02-billing.md",
      test_globs: ["packages/billing/**/*.spec.ts"],
    })

    expect(result.current_phase).toBe(2)
    expect(result.phase_state).toBe("planning")
    expect(result.phases).toHaveLength(2)
    expect(result.phases[1]).toMatchObject({
      n: 2,
      name: "billing",
      state: "planning",
      spec: "docs/phases/02-billing.md",
    })
  })

  it("leaves the closed phase's own state untouched", async () => {
    for (const next of FULL_PATH) {
      await transitionPhaseState(projectDir, next)
    }
    const result = await startNextPhase(projectDir, { name: "billing", spec: "docs/phases/02-billing.md", test_globs: [] })
    expect(result.phases[0]?.state).toBe("documented")
  })

  it("persists to disk", async () => {
    for (const next of FULL_PATH) {
      await transitionPhaseState(projectDir, next)
    }
    await startNextPhase(projectDir, { name: "billing", spec: "docs/phases/02-billing.md", test_globs: [] })
    const reread = await readState(projectDir)
    expect(reread.current_phase).toBe(2)
  })
})
