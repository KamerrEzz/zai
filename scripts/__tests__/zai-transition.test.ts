import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { detectPackageManager, hasTestScript, verifyTestsCurrentlyFail } from "../zai-transition.js"

let projectDir: string

async function writePackageJson(scripts: Record<string, string> = {}) {
  await writeFile(join(projectDir, "package.json"), JSON.stringify({ name: "demo", scripts }), "utf8")
}

beforeEach(async () => {
  projectDir = await mkdtemp(join(tmpdir(), "zai-transition-"))
})

afterEach(async () => {
  await rm(projectDir, { recursive: true, force: true })
})

describe("detectPackageManager", () => {
  it("defaults to npm when no lockfile is present", async () => {
    expect(await detectPackageManager(projectDir)).toBe("npm")
  })

  it("detects pnpm from pnpm-lock.yaml", async () => {
    await writeFile(join(projectDir, "pnpm-lock.yaml"), "", "utf8")
    expect(await detectPackageManager(projectDir)).toBe("pnpm")
  })

  it("detects yarn from yarn.lock", async () => {
    await writeFile(join(projectDir, "yarn.lock"), "", "utf8")
    expect(await detectPackageManager(projectDir)).toBe("yarn")
  })
})

describe("hasTestScript", () => {
  it("returns false when there is no package.json", async () => {
    expect(await hasTestScript(projectDir)).toBe(false)
  })

  it("returns false when scripts.test is missing", async () => {
    await writePackageJson({ build: "tsc" })
    expect(await hasTestScript(projectDir)).toBe(false)
  })

  it("returns true when scripts.test exists", async () => {
    await writePackageJson({ test: "vitest run" })
    expect(await hasTestScript(projectDir)).toBe(true)
  })
})

describe("verifyTestsCurrentlyFail", () => {
  it("reports failed:true when the test command exits non-zero", async () => {
    await writePackageJson({ test: 'node -e "process.exit(1)"' })
    const result = await verifyTestsCurrentlyFail(projectDir)
    expect(result.failed).toBe(true)
  })

  it("reports failed:false when the test command exits zero", async () => {
    await writePackageJson({ test: 'node -e "process.exit(0)"' })
    const result = await verifyTestsCurrentlyFail(projectDir)
    expect(result.failed).toBe(false)
  })

  it("includes stdout/stderr in the output for a failing run", async () => {
    await writePackageJson({ test: 'node -e "console.error(\'boom\'); process.exit(1)"' })
    const result = await verifyTestsCurrentlyFail(projectDir)
    expect(result.output).toContain("boom")
  })
})
