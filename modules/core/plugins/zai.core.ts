// State-injection gate: the highest-return mechanism in ZAI. When a project
// has .zai/state.json, its state and the current phase's spec path get
// pushed into `instructions` automatically, on every session, no matter
// how it was started.
//
// Also owns the write-protection gate for .zai/state.json (see
// gateStateWriteProtection below) - state.json is core's file
// (modules/core/src/state/ is "the only real writer", docs/MODULES.md),
// so the gate that protects it lives here regardless of whether the
// `phases` module is installed.
//
// Uses OpenCode's v1 plugin API confirmed in docs/RESEARCH.md section 5
// (source: packages/plugin/src/index.ts, tag v1.18.18) - a plugin is
// `(input) => Promise<Hooks>`, and `config` is the one non-experimental
// hook that receives the mutable Config object (with `instructions`) before
// a session starts.
//
// Deliberately dependency-free: no zod import here. The authoritative,
// zod-validated schema lives in modules/core/src/state/ and is used by the
// ZAI commands/scripts that run under our own pnpm-managed Node. This file
// runs inside OpenCode's own bundled runtime, whose module resolution
// against a pnpm-installed node_modules is unverified (see
// docs/DECISIONS.md) - so it does its own light, tolerant structural check
// instead of importing that module. If the empirical smoke test in
// docs/HANDOFF.md later shows cross-imports work fine, this can be
// unified in session 2.
//
// Minimal local types instead of a dependency on @opencode-ai/plugin -
// same reasoning: keep this file's only requirement being "OpenCode can
// load a plain .ts file with no external imports". Shapes below mirror
// exactly what docs/RESEARCH.md section 5 confirmed from source.
//
// This file exports EXACTLY ONE thing (ZaiCorePlugin, named and default):
// OpenCode's plugin loader treats every top-level export as a candidate
// Plugin factory and invokes it - this was the one plugin in this repo
// that never had that bug, precisely because it never exported anything
// else (see docs/DECISIONS.md point 16, the v0.9.0 fix on the other two
// plugins). gateStateWriteProtection stays a private function; tests reach
// it via `ZaiCorePlugin.testHelpers`, not a new export.

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, isAbsolute, join, relative } from "node:path"

const DISABLE_ENV_VAR = "ZAI_DISABLE_GATES"
const DISABLE_STATE_PROTECTION_ENV_VAR = "ZAI_CORE_DISABLE_STATE_PROTECTION"
const GENERATED_CONTEXT_FILE = ".generated-context.md"
const STATE_FILE_RELATIVE_PATH = join(".zai", "state.json")
const WRITE_TOOL_IDS = new Set(["edit", "write", "apply_patch"])

type PluginContext = {
  directory: string
  worktree: string
}

type ConfigHookInput = {
  instructions?: string[]
  [key: string]: unknown
}

type ToolExecuteBeforeInput = { tool: string; sessionID: string; callID: string }
type ToolExecuteBeforeOutput = { args: any }

type Hooks = {
  config?: (input: ConfigHookInput) => Promise<void>
  "tool.execute.before"?: (input: ToolExecuteBeforeInput, output: ToolExecuteBeforeOutput) => Promise<void>
}

type Plugin = (input: PluginContext) => Promise<Hooks>

type LitePhase = {
  name: string
  spec: string
}

type LiteState = {
  project: string
  currentPhaseNumber: number
  phaseState: string
  currentPhase: LitePhase
}

type ReadResult = { kind: "absent" } | { kind: "corrupt"; detail: string } | { kind: "ok"; state: LiteState }

async function readZaiStateLoosely(projectDir: string): Promise<ReadResult> {
  const filePath = join(projectDir, ".zai", "state.json")

  let raw: string
  try {
    raw = await readFile(filePath, "utf8")
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return { kind: "absent" }
    return { kind: "corrupt", detail: `cannot read ${filePath}: ${String(err)}` }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    return { kind: "corrupt", detail: `invalid JSON in ${filePath}: ${(err as Error).message}` }
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { kind: "corrupt", detail: `${filePath}: root is not an object` }
  }

  const state = parsed as Record<string, unknown>
  const { project, current_phase, phase_state, phases } = state

  if (
    typeof project !== "string" ||
    typeof current_phase !== "number" ||
    typeof phase_state !== "string" ||
    !Array.isArray(phases)
  ) {
    return { kind: "corrupt", detail: `${filePath}: missing or malformed top-level fields` }
  }

  const currentPhase = phases.find(
    (phase): phase is Record<string, unknown> =>
      typeof phase === "object" && phase !== null && (phase as Record<string, unknown>).n === current_phase,
  )

  if (!currentPhase || typeof currentPhase.name !== "string" || typeof currentPhase.spec !== "string") {
    return { kind: "corrupt", detail: `${filePath}: current_phase=${current_phase} missing or malformed in phases[]` }
  }

  return {
    kind: "ok",
    state: {
      project,
      currentPhaseNumber: current_phase,
      phaseState: phase_state,
      currentPhase: { name: currentPhase.name, spec: currentPhase.spec },
    },
  }
}

function renderGeneratedContext(state: LiteState): string {
  return [
    "# ZAI - estado actual del proyecto",
    "",
    "(generado automaticamente por el plugin zai.core en cada sesion, no editar a mano)",
    "",
    `- Proyecto: ${state.project}`,
    `- Fase actual: ${state.currentPhaseNumber} (${state.currentPhase.name})`,
    `- Estado de la fase: ${state.phaseState}`,
    `- Spec de la fase: ${state.currentPhase.spec}`,
    "",
  ].join("\n")
}

async function writeGeneratedContext(projectDir: string, state: LiteState): Promise<string> {
  const targetPath = join(projectDir, ".zai", GENERATED_CONTEXT_FILE)
  await mkdir(dirname(targetPath), { recursive: true })
  await writeFile(targetPath, renderGeneratedContext(state), "utf8")
  return targetPath
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await readFile(path)
    return true
  } catch {
    return false
  }
}

// --- write protection for .zai/state.json ---
//
// modules/core/src/state/transition.ts says it plainly: "The ONLY function
// that writes .zai/state.json outside of genesis" - every legitimate
// mutation goes through scripts/zai-*.ts (zai-init-state.ts,
// zai-transition.ts, zai-record-blockers.ts, zai-start-next-phase.ts),
// which run as separate `tsx` processes, never through the agent's own
// edit/write/apply_patch tools. This gate makes that the only *possible*
// path, not just the intended one - found necessary after a real session
// (with a weaker model that doesn't reliably follow prompt instructions)
// hand-wrote a fake "red" state directly with the write tool instead of
// calling the validated script. See docs/DECISIONS.md point 17.

function touchedStateFile(directory: string, tool: string, args: any): boolean {
  if (!WRITE_TOOL_IDS.has(tool)) return false

  const candidatePath: unknown = tool === "apply_patch" ? args?.patchText : args?.filePath
  if (tool === "apply_patch") {
    // apply_patch's args carry the whole patch text, not a single path -
    // a cheap substring check is enough here (false positives just mean
    // an unrelated patch mentioning ".zai/state.json" in a comment gets
    // blocked too, which is an acceptable, rare, override-able cost for
    // never missing a real one).
    return typeof candidatePath === "string" && candidatePath.includes(STATE_FILE_RELATIVE_PATH.split("\\").join("/"))
  }

  if (typeof candidatePath !== "string") return false
  const absolute = isAbsolute(candidatePath) ? candidatePath : join(directory, candidatePath)
  const rel = relative(directory, absolute).split("\\").join("/")
  return rel === STATE_FILE_RELATIVE_PATH.split("\\").join("/")
}

async function gateStateWriteProtection(
  directory: string,
  input: ToolExecuteBeforeInput,
  output: ToolExecuteBeforeOutput,
): Promise<void> {
  if (process.env[DISABLE_ENV_VAR] || process.env[DISABLE_STATE_PROTECTION_ENV_VAR]) return
  if (!touchedStateFile(directory, input.tool, output.args)) return

  throw new Error(
    `zai gate: .zai/state.json no se edita directamente. Usa el script correspondiente segun lo que estes ` +
      `haciendo (zai-init-state.ts, zai-transition.ts, zai-record-blockers.ts, zai-start-next-phase.ts) - ` +
      `todos corren via "pnpm --dir \\"$(cat ~/.config/opencode/.zai-repo-path)\\" exec tsx scripts/<script>.ts". ` +
      `No busques la vuelta escribiendo el archivo a mano.`,
  )
}

export const ZaiCorePlugin: Plugin = async ({ directory }) => {
  return {
    config: async (input) => {
      if (process.env[DISABLE_ENV_VAR]) return

      try {
        const result = await readZaiStateLoosely(directory)

        if (result.kind === "absent") return

        if (result.kind === "corrupt") {
          console.warn(`[zai.core] .zai/state.json looks invalid, skipping context injection: ${result.detail}`)
          return
        }

        const contextPath = await writeGeneratedContext(directory, result.state)
        input.instructions = input.instructions ?? []
        input.instructions.push(contextPath)

        const specPath = join(directory, result.state.currentPhase.spec)
        if (await pathExists(specPath)) {
          input.instructions.push(specPath)
        }
      } catch (err) {
        // This gate must never take a session down with it - see
        // docs/RESEARCH.md section 8.
        console.warn(`[zai.core] state-injection gate failed unexpectedly, continuing without it: ${String(err)}`)
      }
    },
    "tool.execute.before": async (input, output) => {
      try {
        await gateStateWriteProtection(directory, input, output)
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("zai gate:")) throw err
        console.warn(`[zai.core] state write protection failed unexpectedly, continuing without it: ${String(err)}`)
      }
    },
  }
}

export default ZaiCorePlugin

// Test-only surface. Not a module export - see the file header for why.
const testHelpers = { readZaiStateLoosely, touchedStateFile, gateStateWriteProtection }
;(ZaiCorePlugin as unknown as { testHelpers: typeof testHelpers }).testHelpers = testHelpers
