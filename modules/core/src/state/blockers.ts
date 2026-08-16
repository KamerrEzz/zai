import { PhaseAdvanceError } from "./errors.js"
import { readState, writeStateAtomic } from "./io.js"
import type { ZaiState } from "./schema.js"

// Second writer alongside transitionPhaseState (genesis in io.ts is the
// third). Kept separate because it mutates a different field
// (phases[].blockers) without touching phase_state - /zai-fase-audit calls
// this on every run (even with an empty list, to clear stale blockers),
// then separately calls transitionPhaseState(dir, "audited") only when the
// list came back empty. transitionPhaseState refuses that second call
// itself if blockers are still present (see transition.ts) - this function
// does not duplicate that check, it only records.
export async function recordBlockers(projectDir: string, blockers: string[]): Promise<ZaiState> {
  const current = await readState(projectDir)

  if (current.phase_state !== "green") {
    throw new PhaseAdvanceError(
      `cannot record audit blockers: current phase is "${current.phase_state}", audits only run in "green"`,
    )
  }

  const phaseIndex = current.phases.findIndex((p) => p.n === current.current_phase)
  if (phaseIndex === -1) {
    throw new Error(`broken invariant: current_phase=${current.current_phase} missing from phases[] after validation`)
  }

  const nextState: ZaiState = {
    ...current,
    phases: current.phases.map((phase, index) => (index === phaseIndex ? { ...phase, blockers } : phase)),
  }

  await writeStateAtomic(projectDir, nextState)
  return nextState
}
