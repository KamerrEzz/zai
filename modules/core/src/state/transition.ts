import { AuditBlockersPresentError, InvalidTransitionError } from "./errors.js"
import { readState, writeStateAtomic } from "./io.js"
import { isValidTransition, type PhaseState, type ZaiState } from "./schema.js"

// The ONLY function that writes .zai/state.json outside of genesis
// (createInitialState in io.ts). Nothing else in the codebase should open
// that file for writing - if a future module needs to mutate state, it
// goes through here.
//
// Validates that the requested transition is the exact next step of the
// FSM (see PHASE_STATE_ORDER in schema.ts). No skips, no going back: this
// is a known limitation for v0.1, documented in docs/HANDOFF.md, because
// handling a failed audit (which would need an audited->green rollback)
// is the session-2 auditor agent's responsibility, not this module's.
export async function transitionPhaseState(projectDir: string, toState: PhaseState): Promise<ZaiState> {
  const current = await readState(projectDir)

  if (!isValidTransition(current.phase_state, toState)) {
    throw new InvalidTransitionError(current.phase_state, toState)
  }

  const phaseIndex = current.phases.findIndex((p) => p.n === current.current_phase)
  // readState already validated (via ZaiStateSchema.superRefine) that
  // current_phase exists in phases[], so not finding it here is an
  // internal bug, not a user-facing case.
  if (phaseIndex === -1) {
    throw new Error(`broken invariant: current_phase=${current.current_phase} missing from phases[] after validation`)
  }

  // "audited" means the audit found zero blockers - enforced here, not just
  // by convention in whatever command calls this, so a future caller can't
  // accidentally mark a phase audited while blockers[] is still non-empty.
  if (toState === "audited") {
    const blockerCount = current.phases[phaseIndex]!.blockers.length
    if (blockerCount > 0) {
      throw new AuditBlockersPresentError(blockerCount)
    }
  }

  const nextState: ZaiState = {
    ...current,
    phase_state: toState,
    phases: current.phases.map((phase, index) => (index === phaseIndex ? { ...phase, state: toState } : phase)),
  }

  await writeStateAtomic(projectDir, nextState)
  return nextState
}
