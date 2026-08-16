// Gate A (tests untouchable in green) and Gate B (post-write typecheck/lint
// feedback) for the phases loop.
//
// Same design constraints as modules/core/plugins/zai.core.ts, and for the
// same reason: this file gets COPIED (not necessarily symlinked - Windows
// usually can't symlink, see docs/MODULES.md) verbatim into plugins/ at the
// repo root by scripts/install.ts. A relative import to a sibling file
// under modules/phases/src/ would resolve correctly from the SOURCE
// location but incorrectly from the INSTALLED location (they are different
// directories) - or vice versa, depending on how it's written. Rather than
// write an import path that is only valid post-install, this file has zero
// imports beyond node: builtins, and its pure helper functions are
// exported so modules/phases/plugins/__tests__/zai.phases.test.ts can test
// them directly from source.
//
// Every mechanism this file relies on is verified against the real
// v1.18.18 source in docs/RESEARCH.md section 9:
// - tool.execute.before / tool.execute.after: confirmed hook names and
//   invocation sites.
// - Throwing inside tool.execute.before prevents the tool's actual
//   execute() from running (Gate A).
// - Tool ids and arg shapes for edit/write/apply_patch, and apply_patch's
//   "*** Update File: <path>" style markers for path extraction.
// - "permission.ask" is declared in the type but not wired up in this
//   version - Gate A does NOT use it, on purpose.

import { execFile } from "node:child_process"
import { access, readFile } from "node:fs/promises"
import { dirname, isAbsolute, join, relative } from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

const DISABLE_ALL_GATES_ENV_VAR = "ZAI_DISABLE_GATES"
const DISABLE_GATE_A_ENV_VAR = "ZAI_PHASES_DISABLE_GATE_A"
const DISABLE_GATE_B_ENV_VAR = "ZAI_PHASES_DISABLE_GATE_B"
const ALLOW_COMMIT_ENV_VAR = "ZAI_ALLOW_COMMIT"

const WRITE_TOOL_IDS = new Set(["edit", "write", "apply_patch"])

type PluginContext = {
  directory: string
  worktree: string
}

type ToolExecuteBeforeInput = { tool: string; sessionID: string; callID: string }
type ToolExecuteBeforeOutput = { args: any }

type ToolExecuteAfterInput = { tool: string; sessionID: string; callID: string; args: any }
type ToolExecuteAfterOutput = { title: string; output: string; metadata: any }

type Hooks = {
  "tool.execute.before"?: (input: ToolExecuteBeforeInput, output: ToolExecuteBeforeOutput) => Promise<void>
  "tool.execute.after"?: (input: ToolExecuteAfterInput, output: ToolExecuteAfterOutput) => Promise<void>
}

type Plugin = (input: PluginContext) => Promise<Hooks>

// --- pure helpers, exported for tests ---

// Minimal glob -> RegExp for the two wildcard forms test_globs actually
// uses ("**" = any depth, "*" = anything but "/"). Not a general-purpose
// glob library - deliberately small, see the file header for why this file
// has no dependencies.
export function globToRegExp(pattern: string): RegExp {
  let out = "^"
  let i = 0
  while (i < pattern.length) {
    const c = pattern[i]
    if (c === "*" && pattern[i + 1] === "*") {
      out += ".*"
      i += 2
      if (pattern[i] === "/") i += 1
      continue
    }
    if (c === "*") {
      out += "[^/]*"
      i += 1
      continue
    }
    if (c === "?") {
      out += "[^/]"
      i += 1
      continue
    }
    if (".+^${}()|[]\\".includes(c!)) {
      out += `\\${c}`
      i += 1
      continue
    }
    out += c
    i += 1
  }
  out += "$"
  return new RegExp(out)
}

export function matchesAnyGlob(relativePath: string, globs: string[]): boolean {
  const normalized = relativePath.split("\\").join("/")
  return globs.some((glob) => globToRegExp(glob).test(normalized))
}

// Parses the subset of the "*** Begin Patch" format needed to know which
// files an apply_patch call touches, without reimplementing the full
// parser in packages/opencode/src/patch/index.ts (see docs/RESEARCH.md
// section 9 for the exact marker lines this mirrors).
export function extractPatchPaths(patchText: string): string[] {
  const paths: string[] = []
  const lines = patchText.split(/\r?\n/)
  const markers = ["*** Add File: ", "*** Delete File: ", "*** Update File: ", "*** Move to: "]
  for (const line of lines) {
    for (const marker of markers) {
      if (line.startsWith(marker)) {
        paths.push(line.slice(marker.length).trim())
      }
    }
  }
  return paths
}

function toRelativePath(directory: string, filePath: string): string {
  const absolute = isAbsolute(filePath) ? filePath : join(directory, filePath)
  return relative(directory, absolute)
}

function touchedPaths(directory: string, tool: string, args: any): string[] {
  if (tool === "edit" || tool === "write") {
    if (typeof args?.filePath !== "string") return []
    return [toRelativePath(directory, args.filePath)]
  }
  if (tool === "apply_patch") {
    if (typeof args?.patchText !== "string") return []
    return extractPatchPaths(args.patchText).map((p) => toRelativePath(directory, p))
  }
  return []
}

// --- loose .zai/state.json read, deliberately not zod-validated here ---
// Same reasoning as modules/core/plugins/zai.core.ts: no dependency on the
// real schema module, to avoid depending on whether OpenCode's runtime can
// resolve this repo's pnpm-installed packages from a plugin file (unverified,
// see docs/DECISIONS.md).

type LiteState = { phaseState: string; testGlobs: string[] }

async function readPhaseGateState(directory: string): Promise<LiteState | null> {
  try {
    const raw = await readFile(join(directory, ".zai", "state.json"), "utf8")
    const parsed = JSON.parse(raw)
    const { current_phase, phase_state, phases } = parsed ?? {}
    if (typeof phase_state !== "string" || !Array.isArray(phases)) return null
    const current = phases.find((p: any) => p && p.n === current_phase)
    if (!current || !Array.isArray(current.test_globs)) return null
    return { phaseState: phase_state, testGlobs: current.test_globs }
  } catch {
    return null
  }
}

// --- Gate A: tests untouchable in green ---

export async function gateA(
  directory: string,
  input: ToolExecuteBeforeInput,
  output: ToolExecuteBeforeOutput,
): Promise<void> {
  if (process.env[DISABLE_ALL_GATES_ENV_VAR] || process.env[DISABLE_GATE_A_ENV_VAR]) return
  if (!WRITE_TOOL_IDS.has(input.tool)) return

  const state = await readPhaseGateState(directory)
  if (!state || state.phaseState !== "green") return
  if (state.testGlobs.length === 0) return

  const paths = touchedPaths(directory, input.tool, output.args)
  const blocked = paths.filter((p) => matchesAnyGlob(p, state.testGlobs))
  if (blocked.length === 0) return

  throw new Error(
    `zai gate A: tests are locked while phase_state is "green". Refusing to write to: ${blocked.join(", ")}. ` +
      `If the test itself is genuinely wrong, say so explicitly and ask the user before touching it - don't edit around this gate.`,
  )
}

// --- Gate B: post-write typecheck/lint feedback ---

async function findUp(startDir: string, targetName: string, stopAt: string): Promise<string | null> {
  let dir = startDir
  for (;;) {
    const candidate = join(dir, targetName)
    try {
      await access(candidate)
      return candidate
    } catch {
      // keep walking up
    }
    if (dir === stopAt || dir === dirname(dir)) return null
    dir = dirname(dir)
  }
}

async function binaryPath(directory: string, name: string): Promise<string | null> {
  const candidates = process.platform === "win32" ? [`${name}.cmd`, `${name}.CMD`, `${name}.exe`] : [name]
  for (const candidate of candidates) {
    const full = join(directory, "node_modules", ".bin", candidate)
    try {
      await access(full)
      return full
    } catch {
      // try next candidate
    }
  }
  return null
}

async function runTypecheck(directory: string, filePath: string): Promise<string | null> {
  const tsconfigPath = await findUp(dirname(join(directory, filePath)), "tsconfig.json", directory)
  if (!tsconfigPath) return null
  const tsc = await binaryPath(directory, "tsc")
  if (!tsc) return null

  try {
    // shell: true is required on Windows - execFile cannot spawn a .cmd
    // shim (the node_modules/.bin/tsc.cmd wrapper) without it and fails
    // with a bare "spawn EINVAL" that carries no stdout/stderr at all, so
    // the catch block below would otherwise see an empty string and
    // wrongly conclude there were no typecheck issues. Found by actually
    // running this gate against a real Windows project with a real type
    // error - see docs/HANDOFF.md. Scoped to win32 only: POSIX binaries
    // don't need shell wrapping, and Node warns that shell:true with an
    // args array is unescaped - accepted here because both arguments are
    // paths this same gate already confirmed exist on disk (tsconfigPath
    // via findUp's own access() check), not arbitrary untrusted input.
    await execFileAsync(tsc, ["--noEmit", "-p", tsconfigPath], {
      cwd: directory,
      shell: process.platform === "win32",
    })
    return null
  } catch (err: any) {
    const stdout: string = err?.stdout ?? ""
    const relevant = stdout
      .split(/\r?\n/)
      .filter((line) => line.includes(filePath.split("\\").join("/")))
      .join("\n")
    return relevant || null
  }
}

async function runLint(directory: string, filePath: string): Promise<string | null> {
  const eslint = await binaryPath(directory, "eslint")
  if (!eslint) return null

  try {
    await execFileAsync(eslint, [filePath], { cwd: directory, shell: process.platform === "win32" })
    return null
  } catch (err: any) {
    const stdout: string = err?.stdout ?? ""
    return stdout.trim() || null
  }
}

export async function gateB(
  directory: string,
  input: ToolExecuteAfterInput,
  output: ToolExecuteAfterOutput,
): Promise<void> {
  if (process.env[DISABLE_ALL_GATES_ENV_VAR] || process.env[DISABLE_GATE_B_ENV_VAR]) return
  if (!WRITE_TOOL_IDS.has(input.tool)) return

  const paths = touchedPaths(directory, input.tool, input.args).filter((p) => /\.tsx?$/.test(p))
  if (paths.length === 0) return

  const reports: string[] = []
  for (const filePath of paths) {
    try {
      const typecheckIssues = await runTypecheck(directory, filePath)
      if (typecheckIssues) reports.push(`tsc --noEmit (${filePath}):\n${typecheckIssues}`)
    } catch (err) {
      console.warn(`[zai.phases] gate B typecheck step failed unexpectedly for ${filePath}: ${String(err)}`)
    }
    try {
      const lintIssues = await runLint(directory, filePath)
      if (lintIssues) reports.push(`eslint (${filePath}):\n${lintIssues}`)
    } catch (err) {
      console.warn(`[zai.phases] gate B lint step failed unexpectedly for ${filePath}: ${String(err)}`)
    }
  }

  if (reports.length === 0) return
  output.output = `${output.output}\n\n--- zai gate B ---\n${reports.join("\n\n")}`
}

// --- Gate D: commit gate, off by default ---
//
// Blocks `git commit` when phase_state != "documented" or CHANGELOG.md has
// no changes in the working tree. Unlike Gate A/B, this one is opt-in: it
// only activates when the project's .zai/config.json has
// { "commitGate": true } - the brief for this gate explicitly asked for it
// off by default, since it is the most disruptive gate in the toolkit and
// should only turn on once the rest is trusted. Even when on, it has its
// own escape hatch (ZAI_ALLOW_COMMIT=1) separate from ZAI_DISABLE_GATES,
// so turning it off for one command doesn't also disable Gate A/B.

const GIT_COMMIT_PATTERN = /\bgit\s+commit(\s|$)/

type ZaiConfig = { commitGate?: boolean }

async function readZaiConfig(directory: string): Promise<ZaiConfig> {
  try {
    const raw = await readFile(join(directory, ".zai", "config.json"), "utf8")
    const parsed = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) return {}
    return { commitGate: (parsed as Record<string, unknown>).commitGate === true }
  } catch {
    return {}
  }
}

async function readPhaseStateOnly(directory: string): Promise<string | null> {
  try {
    const raw = await readFile(join(directory, ".zai", "state.json"), "utf8")
    const parsed = JSON.parse(raw)
    const phaseState = (parsed as Record<string, unknown> | null)?.phase_state
    return typeof phaseState === "string" ? phaseState : null
  } catch {
    return null
  }
}

async function changelogChangedInWorkingTree(directory: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("git", ["status", "--porcelain", "--", "CHANGELOG.md"], {
      cwd: directory,
    })
    return stdout.trim().length > 0
  } catch {
    // Not a git repo, git missing, etc - fail open. This gate has no
    // business blocking a commit over an infrastructure problem it can't
    // even confirm exists.
    return true
  }
}

export async function gateD(
  directory: string,
  input: ToolExecuteBeforeInput,
  output: ToolExecuteBeforeOutput,
): Promise<void> {
  if (process.env[DISABLE_ALL_GATES_ENV_VAR] || process.env[ALLOW_COMMIT_ENV_VAR]) return
  if (input.tool !== "bash") return

  const command = typeof output.args?.command === "string" ? output.args.command : ""
  if (!GIT_COMMIT_PATTERN.test(command)) return

  const config = await readZaiConfig(directory)
  if (config.commitGate !== true) return

  const phaseState = await readPhaseStateOnly(directory)
  if (phaseState !== null && phaseState !== "documented") {
    throw new Error(
      `zai gate D: commit blocked - phase_state is "${phaseState}", not "documented". ` +
        `Escape hatch: set ${ALLOW_COMMIT_ENV_VAR}=1 if you need to commit anyway.`,
    )
  }

  const changelogChanged = await changelogChangedInWorkingTree(directory)
  if (!changelogChanged) {
    throw new Error(
      `zai gate D: commit blocked - CHANGELOG.md has no changes in the working tree. ` +
        `Escape hatch: set ${ALLOW_COMMIT_ENV_VAR}=1 if you need to commit anyway.`,
    )
  }
}

export const ZaiPhasesPlugin: Plugin = async ({ directory }) => {
  return {
    "tool.execute.before": async (input, output) => {
      try {
        await gateA(directory, input, output)
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("zai gate A:")) throw err
        console.warn(`[zai.phases] gate A failed unexpectedly, continuing without it: ${String(err)}`)
      }
      try {
        await gateD(directory, input, output)
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("zai gate D:")) throw err
        console.warn(`[zai.phases] gate D failed unexpectedly, continuing without it: ${String(err)}`)
      }
    },
    "tool.execute.after": async (input, output) => {
      try {
        await gateB(directory, input, output)
      } catch (err) {
        console.warn(`[zai.phases] gate B failed unexpectedly, continuing without it: ${String(err)}`)
      }
    },
  }
}

export default ZaiPhasesPlugin
