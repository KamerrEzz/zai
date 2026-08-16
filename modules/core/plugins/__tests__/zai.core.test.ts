import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { ZaiCorePlugin } from "../zai.core.js"

const { gateStateWriteProtection } = (ZaiCorePlugin as any).testHelpers

let projectDir: string

beforeEach(async () => {
  projectDir = await mkdtemp(join(tmpdir(), "zai-core-gate-"))
  delete process.env.ZAI_DISABLE_GATES
  delete process.env.ZAI_CORE_DISABLE_STATE_PROTECTION
})

afterEach(async () => {
  await rm(projectDir, { recursive: true, force: true })
})

// OpenCode's plugin loader treats every top-level named/default export as
// a candidate Plugin factory and invokes it - a stray helper export here
// crashes config bootstrap for the whole session (see docs/DECISIONS.md
// point 16). This guards against silently reintroducing that.
it("exports exactly the plugin - default and named ZaiCorePlugin, nothing else", async () => {
  const mod = await import("../zai.core.js")
  expect(Object.keys(mod).sort()).toEqual(["ZaiCorePlugin", "default"])
})

describe("gateStateWriteProtection", () => {
  it("blocks a write to .zai/state.json", async () => {
    await expect(
      gateStateWriteProtection(
        projectDir,
        { tool: "write", sessionID: "s1", callID: "c1" },
        { args: { filePath: join(projectDir, ".zai", "state.json") } },
      ),
    ).rejects.toThrow(/zai gate/)
  })

  it("blocks an edit to .zai/state.json via a relative path", async () => {
    await expect(
      gateStateWriteProtection(
        projectDir,
        { tool: "edit", sessionID: "s1", callID: "c1" },
        { args: { filePath: ".zai/state.json" } },
      ),
    ).rejects.toThrow(/zai gate/)
  })

  it("blocks an apply_patch that touches .zai/state.json", async () => {
    const patchText = ["*** Begin Patch", "*** Update File: .zai/state.json", "@@", "*** End Patch"].join("\n")
    await expect(
      gateStateWriteProtection(projectDir, { tool: "apply_patch", sessionID: "s1", callID: "c1" }, { args: { patchText } }),
    ).rejects.toThrow(/zai gate/)
  })

  it("allows writing to other files", async () => {
    await expect(
      gateStateWriteProtection(
        projectDir,
        { tool: "write", sessionID: "s1", callID: "c1" },
        { args: { filePath: join(projectDir, "src", "index.ts") } },
      ),
    ).resolves.toBeUndefined()
  })

  it("ignores tools other than edit/write/apply_patch", async () => {
    await expect(
      gateStateWriteProtection(
        projectDir,
        { tool: "read", sessionID: "s1", callID: "c1" },
        { args: { filePath: join(projectDir, ".zai", "state.json") } },
      ),
    ).resolves.toBeUndefined()
  })

  it("respects ZAI_DISABLE_GATES", async () => {
    process.env.ZAI_DISABLE_GATES = "1"
    await expect(
      gateStateWriteProtection(
        projectDir,
        { tool: "write", sessionID: "s1", callID: "c1" },
        { args: { filePath: join(projectDir, ".zai", "state.json") } },
      ),
    ).resolves.toBeUndefined()
  })

  it("respects ZAI_CORE_DISABLE_STATE_PROTECTION", async () => {
    process.env.ZAI_CORE_DISABLE_STATE_PROTECTION = "1"
    await expect(
      gateStateWriteProtection(
        projectDir,
        { tool: "write", sessionID: "s1", callID: "c1" },
        { args: { filePath: join(projectDir, ".zai", "state.json") } },
      ),
    ).resolves.toBeUndefined()
  })
})
