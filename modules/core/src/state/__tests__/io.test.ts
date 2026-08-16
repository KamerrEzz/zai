import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { StateCorruptError, StateNotFoundError } from "../errors.js"
import { createInitialState, readState, stateFilePath, writeStateAtomic } from "../io.js"

let projectDir: string

beforeEach(async () => {
  projectDir = await mkdtemp(join(tmpdir(), "zai-state-io-"))
})

afterEach(async () => {
  await rm(projectDir, { recursive: true, force: true })
})

describe("readState", () => {
  it("throws StateNotFoundError when .zai/state.json does not exist", async () => {
    await expect(readState(projectDir)).rejects.toBeInstanceOf(StateNotFoundError)
  })

  it("throws StateCorruptError when the JSON is invalid", async () => {
    await mkdir(join(projectDir, ".zai"), { recursive: true })
    await writeFile(stateFilePath(projectDir), "{ this is not json", "utf8")

    await expect(readState(projectDir)).rejects.toBeInstanceOf(StateCorruptError)
  })

  it("throws StateCorruptError when the JSON is valid but fails the schema", async () => {
    await mkdir(join(projectDir, ".zai"), { recursive: true })
    await writeFile(stateFilePath(projectDir), JSON.stringify({ project: "demo" }), "utf8")

    await expect(readState(projectDir)).rejects.toBeInstanceOf(StateCorruptError)
  })

  it("reads back exactly what writeStateAtomic wrote", async () => {
    const state = createInitialState({
      project: "demo",
      firstPhase: { n: 1, name: "auth", spec: "docs/phases/01-auth.md", test_globs: [] },
    })
    await writeStateAtomic(projectDir, state)

    const read = await readState(projectDir)
    expect(read).toEqual(state)
  })
})

describe("writeStateAtomic", () => {
  it("leaves no temp files behind after writing", async () => {
    const state = createInitialState({
      project: "demo",
      firstPhase: { n: 1, name: "auth", spec: "docs/phases/01-auth.md", test_globs: [] },
    })
    await writeStateAtomic(projectDir, state)

    const files = await readdir(join(projectDir, ".zai"))
    expect(files).toEqual(["state.json"])
  })

  it("writes parseable JSON ending in a newline", async () => {
    const state = createInitialState({
      project: "demo",
      firstPhase: { n: 1, name: "auth", spec: "docs/phases/01-auth.md", test_globs: [] },
    })
    await writeStateAtomic(projectDir, state)

    const raw = await readFile(stateFilePath(projectDir), "utf8")
    expect(raw.endsWith("\n")).toBe(true)
    expect(() => JSON.parse(raw)).not.toThrow()
  })
})

describe("createInitialState", () => {
  it("always starts in planning", () => {
    const state = createInitialState({
      project: "demo",
      firstPhase: { n: 1, name: "auth", spec: "docs/phases/01-auth.md", test_globs: [] },
    })
    expect(state.phase_state).toBe("planning")
    expect(state.phases[0]?.state).toBe("planning")
    expect(state.current_phase).toBe(1)
  })
})
