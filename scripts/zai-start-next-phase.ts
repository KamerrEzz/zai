// CLI used by /zai-fase-start. Mirrors scripts/zai-init-state.ts.
//
// Usage: echo '<StartNextPhaseInput JSON>' | tsx scripts/zai-start-next-phase.ts <target-project-dir>

import { startNextPhase } from "../modules/core/src/state/index.js"

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString("utf8")
}

async function main() {
  const targetProjectDir = process.argv[2]
  if (!targetProjectDir) {
    console.error("usage: tsx scripts/zai-start-next-phase.ts <target-project-dir> < payload.json")
    process.exit(1)
  }

  const raw = await readStdin()
  const input = JSON.parse(raw)
  const state = await startNextPhase(targetProjectDir, input)
  console.log(`started phase ${state.current_phase} ("${state.phases[state.phases.length - 1]?.name}") in "planning"`)
}

main().catch((err) => {
  console.error(`zai-start-next-phase failed: ${(err as Error).message}`)
  process.exit(1)
})
