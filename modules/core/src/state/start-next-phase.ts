import { PhaseAdvanceError } from "./errors.js"
import { readState, writeStateAtomic } from "./io.js"
import type { Phase, ZaiState } from "./schema.js"

export type StartNextPhaseInput = {
  name: string
  spec: string
  test_globs: string[]
}

// Third writer. Session 1 deliberately only built the FSM for phase_state
// *within* an existing phase (see docs/HANDOFF.md) - this is the missing
// piece: appending a new phases[] entry and moving current_phase to it.
// Lives in core, not modules/phases/, for the same reason transition.ts
// does: it is the one place allowed to touch .zai/state.json, and that
// invariant does not become module-specific just because the caller
// (/zai-fase-start) is.
//
// Only legal when the current phase is "documented" - starting phase N+1
// while phase N isn't closed would let you skip auditing/documenting it,
// which is exactly what this whole tool exists to prevent.
export async function startNextPhase(projectDir: string, input: StartNextPhaseInput): Promise<ZaiState> {
  const current = await readState(projectDir)

  if (current.phase_state !== "documented") {
    throw new PhaseAdvanceError(
      `cannot start a new phase: current phase (n=${current.current_phase}) is "${current.phase_state}", not "documented"`,
    )
  }

  const nextN = Math.max(...current.phases.map((p) => p.n)) + 1

  const phase: Phase = {
    n: nextN,
    name: input.name,
    spec: input.spec,
    state: "planning",
    test_globs: input.test_globs,
    audit: null,
    blockers: [],
  }

  const nextState: ZaiState = {
    ...current,
    current_phase: nextN,
    phase_state: "planning",
    phases: [...current.phases, phase],
  }

  await writeStateAtomic(projectDir, nextState)
  return nextState
}
