import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { gateB } from "../zai.phases.js"

let projectDir: string

beforeEach(async () => {
  projectDir = await mkdtemp(join(tmpdir(), "zai-gate-b-"))
  delete process.env.ZAI_DISABLE_GATES
  delete process.env.ZAI_PHASES_DISABLE_GATE_B
})

afterEach(async () => {
  await rm(projectDir, { recursive: true, force: true })
})

describe("gateB", () => {
  it("does not touch output when tsc/eslint are not installed in the project", async () => {
    const output = { title: "edited", output: "original output", metadata: {} }
    await gateB(
      projectDir,
      { tool: "edit", sessionID: "s1", callID: "c1", args: { filePath: "src/user.ts" } },
      output,
    )
    expect(output.output).toBe("original output")
  })

  it("ignores non-TypeScript files", async () => {
    const output = { title: "edited", output: "original output", metadata: {} }
    await gateB(
      projectDir,
      { tool: "edit", sessionID: "s1", callID: "c1", args: { filePath: "README.md" } },
      output,
    )
    expect(output.output).toBe("original output")
  })

  it("ignores tools other than edit/write/apply_patch", async () => {
    const output = { title: "read", output: "original output", metadata: {} }
    await gateB(projectDir, { tool: "read", sessionID: "s1", callID: "c1", args: { filePath: "src/user.ts" } }, output)
    expect(output.output).toBe("original output")
  })

  it("respects ZAI_DISABLE_GATES", async () => {
    process.env.ZAI_DISABLE_GATES = "1"
    const output = { title: "edited", output: "original output", metadata: {} }
    await gateB(
      projectDir,
      { tool: "edit", sessionID: "s1", callID: "c1", args: { filePath: "src/user.ts" } },
      output,
    )
    expect(output.output).toBe("original output")
  })

  it("respects ZAI_PHASES_DISABLE_GATE_B", async () => {
    process.env.ZAI_PHASES_DISABLE_GATE_B = "1"
    const output = { title: "edited", output: "original output", metadata: {} }
    await gateB(
      projectDir,
      { tool: "edit", sessionID: "s1", callID: "c1", args: { filePath: "src/user.ts" } },
      output,
    )
    expect(output.output).toBe("original output")
  })
})
