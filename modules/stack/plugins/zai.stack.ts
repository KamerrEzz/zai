// Gate E: enforces the zai-stack-fresh-docs rule (docs/RESEARCH.md section
// 11, modules/stack/skill/zai-stack-fresh-docs/SKILL.md) - context7 must
// be consulted this session before adding a dependency that is young
// (< 2 years old) or had a recent major bump (< 12 months).
//
// Independent of modules/phases: this gate does not read .zai/state.json
// and does not care whether the phases module is installed (see
// docs/MODULES.md, "que NO debe hacer un modulo"). It only cares about
// dependencies being added, which can happen in any project regardless of
// whether it uses the phase loop.
//
// Same constraints as the other ZAI plugins: zero imports beyond node:
// builtins (this file gets copied verbatim into plugins/ at install time,
// see modules/core/plugins/zai.core.ts for the full reasoning), and every
// external failure mode (network, missing tool) degrades instead of
// crashing the session.
//
// Deliberate scope limit: this gate only watches dependencies added via
// bash (pnpm add / npm install / yarn add). It does not try to detect a
// dependency added by hand-editing package.json's "dependencies" object
// through the edit/write/apply_patch tools - diffing arbitrary edits
// against the previous file content to spot a newly-added key is exactly
// the kind of fragile, easy-to-get-wrong logic this project avoids
// building without being asked. In practice, adding a dependency without
// running the package manager is rare and leaves the lockfile out of sync
// regardless of this gate.

const DISABLE_ALL_GATES_ENV_VAR = "ZAI_DISABLE_GATES"
const DISABLE_CONTEXT7_GATE_ENV_VAR = "ZAI_STACK_DISABLE_GATE_CONTEXT7"

const YOUNG_AGE_YEARS = 2
const RECENT_MAJOR_MONTHS = 12
const REGISTRY_TIMEOUT_MS = 5000

type ToolExecuteBeforeInput = { tool: string; sessionID: string; callID: string }
type ToolExecuteBeforeOutput = { args: any }

type Hooks = {
  "tool.execute.before"?: (input: ToolExecuteBeforeInput, output: ToolExecuteBeforeOutput) => Promise<void>
}

type Plugin = () => Promise<Hooks>

// Module-level, not per-plugin-instance: a single opencode server process
// can serve many sessions over its lifetime, and this needs to persist
// for as long as the session does, not just for one hook call.
const context7ConsultedSessions = new Set<string>()

export function isContext7Tool(toolId: string): boolean {
  return toolId.toLowerCase().includes("context7")
}

export function stripVersionSpec(spec: string): string {
  if (spec.startsWith("@")) {
    const secondAt = spec.indexOf("@", 1)
    return secondAt === -1 ? spec : spec.slice(0, secondAt)
  }
  const at = spec.indexOf("@")
  return at === -1 ? spec : spec.slice(0, at)
}

const ADD_COMMAND_PATTERN = /\b(?:pnpm\s+add|npm\s+(?:install|i)|yarn\s+add)\b(.*)/

export function extractAddedPackages(command: string): string[] {
  const match = command.match(ADD_COMMAND_PATTERN)
  if (!match) return []
  const rest = match[1] ?? ""
  return rest
    .split(/\s+/)
    .filter(Boolean)
    .filter((tok) => !tok.startsWith("-"))
    .map(stripVersionSpec)
}

export type AgeCheckResult = { young: boolean; reason: string }

export async function checkPackageAge(pkgName: string): Promise<AgeCheckResult | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkgName)}`, {
      signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const data = (await res.json()) as any
    const time = data?.time
    if (!time || typeof time !== "object") return null

    const now = Date.now()

    if (typeof time.created === "string") {
      const createdMs = Date.parse(time.created)
      const ageYears = (now - createdMs) / (1000 * 60 * 60 * 24 * 365)
      if (ageYears < YOUNG_AGE_YEARS) {
        return {
          young: true,
          reason: `first published ${time.created.slice(0, 10)}, under ${YOUNG_AGE_YEARS} years old`,
        }
      }
    }

    const latest = data?.["dist-tags"]?.latest
    if (typeof latest === "string") {
      const latestMajor = latest.split(".")[0]
      const sameMajorVersions = Object.keys(time)
        .filter((v) => v !== "created" && v !== "modified" && v.split(".")[0] === latestMajor)
        .sort((a, b) => Date.parse(time[a]) - Date.parse(time[b]))

      const firstOfMajor = sameMajorVersions[0]
      if (firstOfMajor) {
        const majorDateMs = Date.parse(time[firstOfMajor])
        const monthsAgo = (now - majorDateMs) / (1000 * 60 * 60 * 24 * 30)
        if (monthsAgo < RECENT_MAJOR_MONTHS) {
          return {
            young: true,
            reason: `major version ${latestMajor} first published ${time[firstOfMajor].slice(0, 10)}, under ${RECENT_MAJOR_MONTHS} months ago`,
          }
        }
      }
    }

    return { young: false, reason: "" }
  } catch {
    // Network unreachable, timeout, package not found, unexpected shape -
    // all fail open. This gate must never block a write because the npm
    // registry was slow or unreachable.
    return null
  }
}

export async function gateContext7(input: ToolExecuteBeforeInput, output: ToolExecuteBeforeOutput): Promise<void> {
  if (process.env[DISABLE_ALL_GATES_ENV_VAR] || process.env[DISABLE_CONTEXT7_GATE_ENV_VAR]) return

  if (isContext7Tool(input.tool)) {
    context7ConsultedSessions.add(input.sessionID)
    return
  }

  if (input.tool !== "bash") return
  if (context7ConsultedSessions.has(input.sessionID)) return

  const command = typeof output.args?.command === "string" ? output.args.command : ""
  const packages = extractAddedPackages(command)
  if (packages.length === 0) return

  const youngPackages: string[] = []
  for (const pkg of packages) {
    const result = await checkPackageAge(pkg)
    if (result?.young) youngPackages.push(`${pkg} (${result.reason})`)
  }

  if (youngPackages.length === 0) return

  throw new Error(
    `zai gate context7: about to add ${youngPackages.join(", ")} without consulting context7 in this session. ` +
      `See the zai-stack-fresh-docs skill: call context7 (resolve-library-id + query-docs) for ` +
      `${youngPackages.length === 1 ? "this library" : "these libraries"} first, then retry.`,
  )
}

export const ZaiStackPlugin: Plugin = async () => {
  return {
    "tool.execute.before": async (input, output) => {
      try {
        await gateContext7(input, output)
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("zai gate context7:")) throw err
        console.warn(`[zai.stack] gate context7 failed unexpectedly, continuing without it: ${String(err)}`)
      }
    },
  }
}

export default ZaiStackPlugin
