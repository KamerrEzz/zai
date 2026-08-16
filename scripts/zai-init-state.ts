// Thin CLI used by the /zai-init command so the very first .zai/state.json
// a project gets is zod-validated by the real schema (modules/core/src/state),
// instead of an agent hand-writing JSON that merely looks right.
//
// Usage: echo '<CreateInitialStateInput JSON>' | tsx scripts/zai-init-state.ts <target-project-dir>
//
// Kept separate from modules/core/src/state/index.ts (which is a library,
// not a CLI) so that library stays free of process.argv/stdin concerns.

import { createInitialState } from "../modules/core/src/state/index.js"
import { writeStateAtomic } from "../modules/core/src/state/io.js"

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString("utf8")
}

async function main() {
  const targetProjectDir = process.argv[2]
  if (!targetProjectDir) {
    console.error("usage: tsx scripts/zai-init-state.ts <target-project-dir> < payload.json")
    process.exit(1)
  }

  const raw = await readStdin()
  const input = JSON.parse(raw)
  const state = createInitialState(input)
  await writeStateAtomic(targetProjectDir, state)

  console.log(`wrote ${targetProjectDir}/.zai/state.json (phase ${state.current_phase}, state "${state.phase_state}")`)
}

main().catch((err) => {
  console.error(`zai-init-state failed: ${(err as Error).message}`)
  process.exit(1)
})
