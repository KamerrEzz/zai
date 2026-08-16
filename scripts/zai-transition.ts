// CLI used by the /zai-fase-* commands so phase_state transitions go
// through the real, zod-backed transitionPhaseState instead of an agent
// hand-editing .zai/state.json. Mirrors scripts/zai-init-state.ts from
// session 1.
//
// Usage: tsx scripts/zai-transition.ts <target-project-dir> <toState>
//
// For toState === "red" specifically, this script mechanically runs the
// target project's own test command and refuses the transition unless it
// actually exits non-zero - found necessary after a real session (running
// on a weaker model that doesn't reliably follow prompt instructions)
// claimed "tests fail as expected" for the red transition without ever
// running them. No other transition gets this treatment: "green" is
// already protected by Gate A, "audited" by the auditor's own clean-context
// review, and "documented" by the full-suite run in /zai-fase-close - "red"
// was the one step with zero mechanical backstop. See docs/DECISIONS.md
// point 17.

import { execFile } from "node:child_process"
import { access } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import { PhaseStateSchema, readState, transitionPhaseState } from "../modules/core/src/state/index.js"

const execFileAsync = promisify(execFile)
const SKIP_RED_VERIFICATION_ENV_VAR = "ZAI_PHASES_SKIP_RED_VERIFICATION"

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export async function detectPackageManager(targetProjectDir: string): Promise<"pnpm" | "yarn" | "npm"> {
  if (await pathExists(join(targetProjectDir, "pnpm-lock.yaml"))) return "pnpm"
  if (await pathExists(join(targetProjectDir, "yarn.lock"))) return "yarn"
  return "npm"
}

export async function hasTestScript(targetProjectDir: string): Promise<boolean> {
  try {
    const { readFile } = await import("node:fs/promises")
    const raw = await readFile(join(targetProjectDir, "package.json"), "utf8")
    const pkg = JSON.parse(raw) as { scripts?: Record<string, unknown> }
    return typeof pkg.scripts?.test === "string"
  } catch {
    return false
  }
}

// Runs the whole test command (not filtered by test_globs - runners differ
// too much in filter syntax to do this reliably here). This is a coarse
// backstop, not a replacement for the agent's own more precise judgement
// of whether a given failure is a real assertion or a broken import -
// it only answers "did you actually run this, and did it fail".
export async function verifyTestsCurrentlyFail(targetProjectDir: string): Promise<{ failed: boolean; output: string }> {
  const pm = await detectPackageManager(targetProjectDir)
  try {
    const { stdout, stderr } = await execFileAsync(pm, ["test"], {
      cwd: targetProjectDir,
      // execFile can't invoke a .cmd shim (pnpm.cmd/npm.cmd/yarn.cmd) on
      // Windows without shell:true - same lesson as Gate B, see
      // modules/phases/plugins/zai.phases.ts and docs/HANDOFF.md.
      shell: process.platform === "win32",
    })
    return { failed: false, output: `${stdout}\n${stderr}` }
  } catch (err: any) {
    // execFile rejects on non-zero exit - that IS the proof of failure.
    const stdout: string = err?.stdout ?? ""
    const stderr: string = err?.stderr ?? ""
    return { failed: true, output: `${stdout}\n${stderr}` }
  }
}

async function main() {
  const [targetProjectDir, toStateRaw] = process.argv.slice(2)
  if (!targetProjectDir || !toStateRaw) {
    console.error("usage: tsx scripts/zai-transition.ts <target-project-dir> <toState>")
    process.exit(1)
  }

  const toState = PhaseStateSchema.parse(toStateRaw)

  if (toState === "red" && !process.env[SKIP_RED_VERIFICATION_ENV_VAR]) {
    // readState here only to fail with the same clear error the real
    // transition would give if state.json is missing/corrupt, before
    // spending time running a test command that's about to be rejected
    // anyway.
    await readState(targetProjectDir)

    if (!(await hasTestScript(targetProjectDir))) {
      console.error(
        `zai-transition: no se encontro "scripts.test" en package.json de ${targetProjectDir} - no hay forma de ` +
          `verificar que los tests realmente fallan antes de aceptar "red". Si esto es un bootstrap legitimo sin ` +
          `test runner configurado todavia, corre de nuevo con ${SKIP_RED_VERIFICATION_ENV_VAR}=1.`,
      )
      process.exit(1)
    }

    const result = await verifyTestsCurrentlyFail(targetProjectDir)
    if (!result.failed) {
      console.error(
        `zai-transition: la suite de tests paso (exit 0) - eso no es "red". Los tests tienen que fallar de ` +
          `verdad antes de aceptar esta transicion. Salida relevante:\n${result.output.slice(-2000)}`,
      )
      process.exit(1)
    }
  }

  const state = await transitionPhaseState(targetProjectDir, toState)
  console.log(`phase ${state.current_phase} is now "${state.phase_state}"`)
}

// Guarded so importing this module for its pure functions (see
// scripts/__tests__/zai-transition.test.ts) does not also run the CLI.
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`zai-transition failed: ${(err as Error).message}`)
    process.exit(1)
  })
}
