import { z } from "zod"

// Strict FSM order. The index in this array IS the single source of truth
// for which transitions are legal (see isValidTransition).
export const PHASE_STATE_ORDER = ["planning", "red", "green", "audited", "documented"] as const

export const PhaseStateSchema = z.enum(PHASE_STATE_ORDER)
export type PhaseState = z.infer<typeof PhaseStateSchema>

export const PhaseSchema = z.object({
  n: z.number().int().positive(),
  name: z.string().min(1),
  spec: z.string().min(1),
  state: PhaseStateSchema,
  test_globs: z.array(z.string()),
  // Reference to the audit doc (docs/audits/NN-name.md), not the audit
  // content itself - that lives outside .zai/.
  audit: z.string().nullable(),
  blockers: z.array(z.string()),
})
export type Phase = z.infer<typeof PhaseSchema>

export const ZaiStateSchema = z
  .object({
    project: z.string().min(1),
    // Version of the .zai/state.json FORMAT, not the consuming project's
    // own version (that lives in its package.json/etc). Renamed from
    // "version" to "schema_version" relative to the brief's starting point
    // so there is no ambiguity about which number this is - see
    // docs/DECISIONS.md.
    schema_version: z.string().min(1),
    current_phase: z.number().int().positive(),
    // Duplicates phases[].state for the current phase. Kept in sync by
    // transition.ts (the sole writer). Cross-validated below so a
    // manually-corrupted edit is caught on read, not only when something
    // tries to use it.
    phase_state: PhaseStateSchema,
    phases: z.array(PhaseSchema).min(1),
  })
  .superRefine((state, ctx) => {
    const current = state.phases.find((p) => p.n === state.current_phase)
    if (!current) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `current_phase=${state.current_phase} does not exist in phases[]`,
        path: ["current_phase"],
      })
      return
    }
    if (current.state !== state.phase_state) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `phase_state="${state.phase_state}" does not match phases[n=${state.current_phase}].state="${current.state}"`,
        path: ["phase_state"],
      })
    }
    const seen = new Set<number>()
    for (const phase of state.phases) {
      if (seen.has(phase.n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `phases[] has more than one entry with n=${phase.n}`,
          path: ["phases"],
        })
      }
      seen.add(phase.n)
    }
  })

export type ZaiState = z.infer<typeof ZaiStateSchema>

export function isValidTransition(from: PhaseState, to: PhaseState): boolean {
  const fromIndex = PHASE_STATE_ORDER.indexOf(from)
  const toIndex = PHASE_STATE_ORDER.indexOf(to)
  return toIndex === fromIndex + 1
}
