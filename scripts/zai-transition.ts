// CLI used by the /zai-fase-* commands so phase_state transitions go
// through the real, zod-backed transitionPhaseState instead of an agent
// hand-editing .zai/state.json. Mirrors scripts/zai-init-state.ts from
// session 1.
//
// Usage: tsx scripts/zai-transition.ts <target-project-dir> <toState>

import { PhaseStateSchema, transitionPhaseState } from "../modules/core/src/state/index.js"

async function main() {
  const [targetProjectDir, toStateRaw] = process.argv.slice(2)
  if (!targetProjectDir || !toStateRaw) {
    console.error("usage: tsx scripts/zai-transition.ts <target-project-dir> <toState>")
    process.exit(1)
  }

  const toState = PhaseStateSchema.parse(toStateRaw)
  const state = await transitionPhaseState(targetProjectDir, toState)
  console.log(`phase ${state.current_phase} is now "${state.phase_state}"`)
}

main().catch((err) => {
  console.error(`zai-transition failed: ${(err as Error).message}`)
  process.exit(1)
})
