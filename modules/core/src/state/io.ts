import { randomBytes } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

import { StateCorruptError, StateNotFoundError } from "./errors.js"
import { type Phase, type ZaiState, ZaiStateSchema } from "./schema.js"

export function stateFilePath(projectDir: string): string {
  return join(projectDir, ".zai", "state.json")
}

export async function readState(projectDir: string): Promise<ZaiState> {
  const filePath = stateFilePath(projectDir)
  let raw: string
  try {
    raw = await readFile(filePath, "utf8")
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new StateNotFoundError(filePath)
    }
    throw err
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    throw new StateCorruptError(filePath, `invalid JSON (${(err as Error).message})`)
  }

  const result = ZaiStateSchema.safeParse(parsed)
  if (!result.success) {
    const detail = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
    throw new StateCorruptError(filePath, detail)
  }
  return result.data
}

// Atomic write: write to a temp file in the same directory (so the rename
// is atomic at the filesystem level, no cross-device move) then rename it
// over the final destination. If the process dies midway, state.json is
// never left half-written.
export async function writeStateAtomic(projectDir: string, state: ZaiState): Promise<void> {
  const filePath = stateFilePath(projectDir)
  await mkdir(dirname(filePath), { recursive: true })

  const tmpPath = join(dirname(filePath), `.state.json.tmp-${randomBytes(6).toString("hex")}`)
  const serialized = `${JSON.stringify(state, null, 2)}\n`

  await writeFile(tmpPath, serialized, "utf8")
  await rename(tmpPath, filePath)
}

export type CreateInitialStateInput = {
  project: string
  firstPhase: {
    n: number
    name: string
    spec: string
    test_globs: string[]
  }
}

// Genesis of the file. Not a transition (there is no "previous" state to
// validate against), which is why it lives separate from
// transitionPhaseState in transition.ts: forcing it through the FSM
// validator would mean inventing a "no state -> planning" edge that isn't
// in the brief's enum.
export function createInitialState(input: CreateInitialStateInput): ZaiState {
  const phase: Phase = {
    n: input.firstPhase.n,
    name: input.firstPhase.name,
    spec: input.firstPhase.spec,
    state: "planning",
    test_globs: input.firstPhase.test_globs,
    audit: null,
    blockers: [],
  }

  const state: ZaiState = {
    project: input.project,
    schema_version: "0.1.0",
    current_phase: phase.n,
    phase_state: "planning",
    phases: [phase],
  }

  // Validate with the same schema used on read, so it's impossible to
  // write an initial state that would later fail to load.
  return ZaiStateSchema.parse(state)
}
