import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { execFile } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { ZaiPhasesPlugin } from "../zai.phases.js"

const { gateD } = (ZaiPhasesPlugin as any).testHelpers

const execFileAsync = promisify(execFile)

let projectDir: string

async function writeConfig(commitGate: boolean) {
  await mkdir(join(projectDir, ".zai"), { recursive: true })
  await writeFile(join(projectDir, ".zai", "config.json"), JSON.stringify({ commitGate }), "utf8")
}

async function writeState(phaseState: string) {
  await mkdir(join(projectDir, ".zai"), { recursive: true })
  await writeFile(
    join(projectDir, ".zai", "state.json"),
    JSON.stringify({
      project: "demo",
      schema_version: "0.1.0",
      current_phase: 1,
      phase_state: phaseState,
      phases: [{ n: 1, name: "auth", spec: "docs/phases/01-auth.md", state: phaseState, test_globs: [], audit: null, blockers: [] }],
    }),
    "utf8",
  )
}

async function initGitRepo() {
  await execFileAsync("git", ["init", "--quiet"], { cwd: projectDir })
  await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: projectDir })
  await execFileAsync("git", ["config", "user.name", "test"], { cwd: projectDir })
  await writeFile(join(projectDir, "CHANGELOG.md"), "# Changelog\n", "utf8")
  await execFileAsync("git", ["add", "."], { cwd: projectDir })
  await execFileAsync("git", ["commit", "-m", "initial", "--quiet"], { cwd: projectDir })
}

const call = (command: string) => ({
  input: { tool: "bash", sessionID: "s1", callID: "c1" },
  output: { args: { command } },
})

beforeEach(async () => {
  projectDir = await mkdtemp(join(tmpdir(), "zai-gate-d-"))
  delete process.env.ZAI_DISABLE_GATES
  delete process.env.ZAI_ALLOW_COMMIT
})

afterEach(async () => {
  await rm(projectDir, { recursive: true, force: true })
})

describe("gateD", () => {
  it("does nothing when commitGate is not enabled in .zai/config.json", async () => {
    await writeState("green")
    const { input, output } = call("git commit -m wip")
    await expect(gateD(projectDir, input, output)).resolves.toBeUndefined()
  })

  it("does nothing when there is no .zai/config.json at all", async () => {
    const { input, output } = call("git commit -m wip")
    await expect(gateD(projectDir, input, output)).resolves.toBeUndefined()
  })

  it("ignores non-bash tools and non-commit bash commands", async () => {
    await writeConfig(true)
    await writeState("green")
    await expect(gateD(projectDir, { tool: "edit", sessionID: "s1", callID: "c1" }, { args: {} })).resolves.toBeUndefined()
    const { input, output } = call("git status")
    await expect(gateD(projectDir, input, output)).resolves.toBeUndefined()
  })

  it("does not false-positive on commands that merely contain the word commit", async () => {
    await writeConfig(true)
    await writeState("green")
    const { input, output } = call("git commit-graph write")
    await expect(gateD(projectDir, input, output)).resolves.toBeUndefined()
  })

  it("blocks commit when enabled and phase_state is not documented", async () => {
    await writeConfig(true)
    await writeState("green")
    const { input, output } = call("git commit -m wip")
    await expect(gateD(projectDir, input, output)).rejects.toThrow(/zai gate D/)
  })

  it("blocks commit when documented but CHANGELOG.md has no working-tree changes", async () => {
    await initGitRepo()
    await writeConfig(true)
    await writeState("documented")
    const { input, output } = call("git commit -m wip")
    await expect(gateD(projectDir, input, output)).rejects.toThrow(/CHANGELOG\.md/)
  })

  it("allows commit when documented and CHANGELOG.md changed in the working tree", async () => {
    await initGitRepo()
    await writeConfig(true)
    await writeState("documented")
    await writeFile(join(projectDir, "CHANGELOG.md"), "# Changelog\n\n## 0.2.0\n", "utf8")
    const { input, output } = call("git commit -m wip")
    await expect(gateD(projectDir, input, output)).resolves.toBeUndefined()
  })

  it("respects ZAI_DISABLE_GATES", async () => {
    await writeConfig(true)
    await writeState("green")
    process.env.ZAI_DISABLE_GATES = "1"
    const { input, output } = call("git commit -m wip")
    await expect(gateD(projectDir, input, output)).resolves.toBeUndefined()
  })

  it("respects ZAI_ALLOW_COMMIT", async () => {
    await writeConfig(true)
    await writeState("green")
    process.env.ZAI_ALLOW_COMMIT = "1"
    const { input, output } = call("git commit -m wip")
    await expect(gateD(projectDir, input, output)).resolves.toBeUndefined()
  })
})
