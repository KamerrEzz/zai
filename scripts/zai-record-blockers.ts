// CLI used by /zai-fase-audit. Mirrors scripts/zai-init-state.ts.
//
// Usage: echo '["blocker one", "blocker two"]' | tsx scripts/zai-record-blockers.ts <target-project-dir>
// An empty JSON array clears previously recorded blockers.

import { recordBlockers } from "../modules/core/src/state/index.js"

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString("utf8")
}

async function main() {
  const targetProjectDir = process.argv[2]
  if (!targetProjectDir) {
    console.error("usage: tsx scripts/zai-record-blockers.ts <target-project-dir> < blockers.json")
    process.exit(1)
  }

  const raw = await readStdin()
  const blockers = JSON.parse(raw)
  const state = await recordBlockers(targetProjectDir, blockers)
  console.log(`recorded ${blockers.length} blocker(s) on phase ${state.current_phase}, still "green"`)
}

main().catch((err) => {
  console.error(`zai-record-blockers failed: ${(err as Error).message}`)
  process.exit(1)
})
