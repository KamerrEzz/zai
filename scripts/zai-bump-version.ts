// CLI used by zai-scribe (via /zai-fase-close) to bump the consuming
// project's version by real semver arithmetic instead of an agent editing
// a version string by hand. Mirrors the pattern of the other scripts/zai-*
// CLIs (session 1/2): a thin, testable wrapper around a pure function.
//
// Usage: tsx scripts/zai-bump-version.ts <target-project-dir> <major|minor|patch>
//
// Reads the "version" field of <project-dir>/package.json if it exists
// (missing file or missing field is treated as "0.0.0" - this is what
// makes the first phase close land exactly on 0.1.0 via a "minor" bump,
// with no separate "first release" special case). If there is no
// package.json at all, falls back to a plain VERSION file at the project
// root, since ZAI itself is not Node-exclusive even though this session's
// stack tree happens to be.

import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

export type BumpType = "major" | "minor" | "patch"

export function parseSemver(version: string): [number, number, number] {
  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!match) throw new Error(`not a valid semver version: "${version}"`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

export function bumpSemver(version: string, bump: BumpType): string {
  const [major, minor, patch] = parseSemver(version)
  if (bump === "major") return `${major + 1}.0.0`
  if (bump === "minor") return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

async function readCurrentVersion(projectDir: string): Promise<{ source: "package.json" | "VERSION"; version: string }> {
  const packageJsonPath = join(projectDir, "package.json")
  try {
    const raw = await readFile(packageJsonPath, "utf8")
    const parsed = JSON.parse(raw)
    return { source: "package.json", version: typeof parsed.version === "string" ? parsed.version : "0.0.0" }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err
  }

  try {
    const raw = await readFile(join(projectDir, "VERSION"), "utf8")
    return { source: "VERSION", version: raw.trim() || "0.0.0" }
  } catch {
    return { source: "VERSION", version: "0.0.0" }
  }
}

async function writeVersion(projectDir: string, source: "package.json" | "VERSION", version: string): Promise<void> {
  if (source === "package.json") {
    const packageJsonPath = join(projectDir, "package.json")
    const raw = await readFile(packageJsonPath, "utf8")
    const parsed = JSON.parse(raw)
    parsed.version = version
    await writeFile(packageJsonPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8")
    return
  }
  await writeFile(join(projectDir, "VERSION"), `${version}\n`, "utf8")
}

async function main() {
  const [targetProjectDir, bumpArg] = process.argv.slice(2)
  if (!targetProjectDir || (bumpArg !== "major" && bumpArg !== "minor" && bumpArg !== "patch")) {
    console.error("usage: tsx scripts/zai-bump-version.ts <target-project-dir> <major|minor|patch>")
    process.exit(1)
  }

  const current = await readCurrentVersion(targetProjectDir)
  const next = bumpSemver(current.version, bumpArg)
  await writeVersion(targetProjectDir, current.source, next)

  console.log(`${current.version} -> ${next} (${current.source})`)
}

// Guarded so importing this module for its pure functions (see
// scripts/__tests__/zai-bump-version.test.ts) does not also run the CLI.
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`zai-bump-version failed: ${(err as Error).message}`)
    process.exit(1)
  })
}
