// State-injection gate: the highest-return mechanism in ZAI. When a project
// has .zai/state.json, its state and the current phase's spec path get
// pushed into `instructions` automatically, on every session, no matter
// how it was started.
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

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

const DISABLE_ENV_VAR = "ZAI_DISABLE_GATES"
const GENERATED_CONTEXT_FILE = ".generated-context.md"

type PluginContext = {
  directory: string
  worktree: string
}

type ConfigHookInput = {
  instructions?: string[]
  [key: string]: unknown
}

type Hooks = {
  config?: (input: ConfigHookInput) => Promise<void>
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
  }
}

export default ZaiCorePlugin
