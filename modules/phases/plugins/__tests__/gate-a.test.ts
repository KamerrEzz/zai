import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { ZaiPhasesPlugin } from "../zai.phases.js"

const { gateA } = (ZaiPhasesPlugin as any).testHelpers

let projectDir: string

async function writeState(phaseState: string, testGlobs: string[]) {
  await mkdir(join(projectDir, ".zai"), { recursive: true })
  await writeFile(
    join(projectDir, ".zai", "state.json"),
    JSON.stringify({
      project: "demo",
      schema_version: "0.1.0",
      current_phase: 1,
      phase_state: phaseState,
      phases: [
        {
          n: 1,
          name: "auth",
          spec: "docs/phases/01-auth.md",
          state: phaseState,
          test_globs: testGlobs,
          audit: null,
          blockers: [],
        },
      ],
    }),
    "utf8",
  )
}

beforeEach(async () => {
  projectDir = await mkdtemp(join(tmpdir(), "zai-gate-a-"))
  delete process.env.ZAI_DISABLE_GATES
  delete process.env.ZAI_PHASES_DISABLE_GATE_A
})

afterEach(async () => {
  await rm(projectDir, { recursive: true, force: true })
})

describe("gateA", () => {
  it("blocks an edit to a test file while phase_state is green", async () => {
    await writeState("green", ["packages/api/**/*.spec.ts"])
    await expect(
      gateA(
        projectDir,
        { tool: "edit", sessionID: "s1", callID: "c1" },
        { args: { filePath: "packages/api/user.spec.ts" } },
      ),
    ).rejects.toThrow(/zai gate A/)
  })

  it("blocks a write to a test file while phase_state is green", async () => {
    await writeState("green", ["packages/api/**/*.spec.ts"])
    await expect(
      gateA(
        projectDir,
        { tool: "write", sessionID: "s1", callID: "c1" },
        { args: { filePath: "packages/api/user.spec.ts" } },
      ),
    ).rejects.toThrow(/zai gate A/)
  })

  it("blocks an apply_patch that touches a test file", async () => {
    await writeState("green", ["packages/api/**/*.spec.ts"])
    const patchText = ["*** Begin Patch", "*** Update File: packages/api/user.spec.ts", "@@", "*** End Patch"].join(
      "\n",
    )
    await expect(
      gateA(projectDir, { tool: "apply_patch", sessionID: "s1", callID: "c1" }, { args: { patchText } }),
    ).rejects.toThrow(/zai gate A/)
  })

  it("allows writing to a non-test file while green", async () => {
    await writeState("green", ["packages/api/**/*.spec.ts"])
    await expect(
      gateA(projectDir, { tool: "write", sessionID: "s1", callID: "c1" }, { args: { filePath: "packages/api/user.ts" } }),
    ).resolves.toBeUndefined()
  })

  it("allows writing to a test file outside of green", async () => {
    await writeState("red", ["packages/api/**/*.spec.ts"])
    await expect(
      gateA(
        projectDir,
        { tool: "edit", sessionID: "s1", callID: "c1" },
        { args: { filePath: "packages/api/user.spec.ts" } },
      ),
    ).resolves.toBeUndefined()
  })

  it("ignores tools other than edit/write/apply_patch", async () => {
    await writeState("green", ["packages/api/**/*.spec.ts"])
    await expect(
      gateA(projectDir, { tool: "read", sessionID: "s1", callID: "c1" }, { args: { filePath: "packages/api/user.spec.ts" } }),
    ).resolves.toBeUndefined()
  })

  it("no-ops when there is no .zai/state.json", async () => {
    await expect(
      gateA(
        projectDir,
        { tool: "edit", sessionID: "s1", callID: "c1" },
        { args: { filePath: "packages/api/user.spec.ts" } },
      ),
    ).resolves.toBeUndefined()
  })

  it("respects ZAI_DISABLE_GATES", async () => {
    await writeState("green", ["packages/api/**/*.spec.ts"])
    process.env.ZAI_DISABLE_GATES = "1"
    await expect(
      gateA(
        projectDir,
        { tool: "edit", sessionID: "s1", callID: "c1" },
        { args: { filePath: "packages/api/user.spec.ts" } },
      ),
    ).resolves.toBeUndefined()
  })

  it("respects ZAI_PHASES_DISABLE_GATE_A", async () => {
    await writeState("green", ["packages/api/**/*.spec.ts"])
    process.env.ZAI_PHASES_DISABLE_GATE_A = "1"
    await expect(
      gateA(
        projectDir,
        { tool: "edit", sessionID: "s1", callID: "c1" },
        { args: { filePath: "packages/api/user.spec.ts" } },
      ),
    ).resolves.toBeUndefined()
  })
})
