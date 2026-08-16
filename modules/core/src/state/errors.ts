export class StateNotFoundError extends Error {
  constructor(public readonly path: string) {
    super(`no .zai/state.json found at ${path}`)
    this.name = "StateNotFoundError"
  }
}

export class StateCorruptError extends Error {
  constructor(
    public readonly path: string,
    public readonly cause_detail: string,
  ) {
    super(`invalid .zai/state.json at ${path}: ${cause_detail}`)
    this.name = "StateCorruptError"
  }
}

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`invalid transition: current state is "${from}", requested "${to}"`)
    this.name = "InvalidTransitionError"
  }
}

export class AuditBlockersPresentError extends Error {
  constructor(public readonly blockerCount: number) {
    super(`cannot transition to "audited": current phase still has ${blockerCount} blocker(s) recorded`)
    this.name = "AuditBlockersPresentError"
  }
}

export class PhaseAdvanceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PhaseAdvanceError"
  }
}
