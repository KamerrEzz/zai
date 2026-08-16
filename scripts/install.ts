// Installs ZAI from this repo (wherever it lives - see REPO_ROOT below)
// into OpenCode's real global config directory (CONFIG_ROOT).
//
// These two used to be the same directory (sessions 1-2): the repo WAS
// ~/.config/opencode. That caused OpenCode itself to see this repo's
// package.json/pnpm-lock.yaml sitting at its own config root and attempt
// a background dependency install against it on every run (the
// "background dependency install failed" warning tracked since session 1,
// docs/DECISIONS.md point 8) - suspected (not fully confirmed) of also
// interfering with the interactive TUI on this machine. Session 3 (post
// v0.3.0) split them: the repo now lives wherever you cloned it, and this
// script only ever writes generated, disposable output into CONFIG_ROOT.
//
// Source of truth: modules/<name>/{agents,commands,plugins,skill}/*, plus
// AGENTS.md at the repo root. OpenCode reads a flat agents/commands/
// plugins/skill/AGENTS.md at its config root (confirmed in
// docs/RESEARCH.md sections 3-5, 7, and 11), so this script links each
// module's contribution - and the repo's own AGENTS.md - into that flat
// layout. It re-syncs on every run: it removes everything it previously
// tracked, then relinks whatever the currently enabled modules provide.
// That's what makes disabling a module (flipping "enabled": false in its
// module.json) actually take effect on the next install, and it's what
// makes repeated runs idempotent.
//
// Three shapes of contribution:
// - agents/commands/plugins: flat files under a module, one file = one
//   installed item.
// - skill: a directory per skill (modules/<name>/skill/<skill-name>/),
//   since a SKILL.md can have sibling reference files/scripts alongside
//   it (docs/RESEARCH.md section 11) - the whole directory installs as
//   one unit.
// - root: a single fixed file at the repo root (today, only AGENTS.md)
//   that OpenCode expects directly at its config root, not inside any
//   subdirectory - not module-scoped, since AGENTS.md belongs to the
//   toolkit as a whole.
//
// Windows often can't create symlinks without admin rights or Developer
// Mode. We try a symlink first and fall back to a plain copy, recording
// which strategy was used per item so uninstall can reverse it exactly.
// Copies do not pick up source edits automatically - rerun install after
// editing a module's files.

import { cp, mkdir, readdir, readFile, rm, stat, symlink, unlink, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
// Same env var OpenCode itself respects for a custom config directory
// (packages/opencode/src/config/paths.ts, Flag.OPENCODE_CONFIG_DIR,
// docs/RESEARCH.md section 2) - honoring it here keeps the installer
// correct if that's ever set, instead of only working for the default path.
const CONFIG_ROOT = process.env.OPENCODE_CONFIG_DIR || join(homedir(), ".config", "opencode")
const MANIFEST_PATH = join(CONFIG_ROOT, ".zai-install-manifest.json")
// Commands need to invoke scripts/zai-*.ts via a shell command
// ("pnpm --dir <repo> exec tsx scripts/..."), but the repo no longer
// lives at a fixed, guessable path (session 3, post v0.3.0 - see
// docs/DECISIONS.md). This file is how a command prompt discovers where
// to run those scripts from, instead of a hardcoded path baked into every
// command's markdown: `cat` (or equivalent) this file to get REPO_ROOT.
const REPO_PATH_FILE = join(CONFIG_ROOT, ".zai-repo-path")

const FILE_KINDS = ["agents", "commands", "plugins"] as const
const DIR_KINDS = ["skill"] as const
const MODULE_KINDS = [...FILE_KINDS, ...DIR_KINDS] as const
type ModuleKind = (typeof MODULE_KINDS)[number]
type Kind = ModuleKind | "root"

function isDirKind(kind: Kind): boolean {
  return (DIR_KINDS as readonly string[]).includes(kind)
}

// Repo-root files that install directly at CONFIG_ROOT, not module-scoped.
const ROOT_FILES = ["AGENTS.md"]

type ManifestEntry = {
  module: string
  kind: Kind
  file: string
  strategy: "symlink" | "copy"
}

type Manifest = { entries: ManifestEntry[] }

type ModuleManifest = {
  name: string
  description?: string
  enabled?: boolean
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function readManifest(): Promise<Manifest> {
  if (!(await pathExists(MANIFEST_PATH))) return { entries: [] }
  const raw = await readFile(MANIFEST_PATH, "utf8")
  try {
    return JSON.parse(raw) as Manifest
  } catch {
    // A corrupt manifest must not block install/uninstall - treat it as
    // empty and let this run rebuild it from scratch.
    console.warn(`warning: ${MANIFEST_PATH} is not valid JSON, ignoring it`)
    return { entries: [] }
  }
}

async function writeManifest(manifest: Manifest): Promise<void> {
  await mkdir(CONFIG_ROOT, { recursive: true })
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")
}

function targetPathFor(entry: Pick<ManifestEntry, "kind" | "file">): string {
  if (entry.kind === "root") return join(CONFIG_ROOT, entry.file)
  return join(CONFIG_ROOT, entry.kind, entry.file)
}

async function removeTrackedEntry(entry: ManifestEntry): Promise<void> {
  const target = targetPathFor(entry)
  if (isDirKind(entry.kind)) {
    await rm(target, { recursive: true, force: true })
    return
  }
  await unlink(target).catch((err) => {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err
  })
}

async function discoverModules(): Promise<{ dir: string; manifest: ModuleManifest }[]> {
  const modulesRoot = join(REPO_ROOT, "modules")
  const entries = await readdir(modulesRoot, { withFileTypes: true })
  const modules: { dir: string; manifest: ModuleManifest }[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const moduleDir = join(modulesRoot, entry.name)
    const manifestPath = join(moduleDir, "module.json")
    if (!(await pathExists(manifestPath))) {
      console.warn(`warning: modules/${entry.name}/ has no module.json, skipping`)
      continue
    }
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as ModuleManifest
    modules.push({ dir: moduleDir, manifest })
  }
  return modules
}

async function linkFile(source: string, target: string): Promise<"symlink" | "copy"> {
  await mkdir(dirname(target), { recursive: true })
  try {
    await symlink(source, target, "file")
    return "symlink"
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code !== "EPERM" && code !== "ENOSYS") throw err
    await cp(source, target)
    return "copy"
  }
}

async function linkDir(source: string, target: string): Promise<"symlink" | "copy"> {
  await mkdir(dirname(target), { recursive: true })
  try {
    await symlink(source, target, "dir")
    return "symlink"
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code !== "EPERM" && code !== "ENOSYS") throw err
    await cp(source, target, { recursive: true })
    return "copy"
  }
}

async function itemsForKind(dir: string, kind: ModuleKind): Promise<{ name: string; source: string }[]> {
  const kindDir = join(dir, kind)
  if (!(await pathExists(kindDir))) return []

  const entries = await readdir(kindDir, { withFileTypes: true })
  const wantDir = isDirKind(kind)
  return entries
    .filter((entry) => (wantDir ? entry.isDirectory() : entry.isFile()))
    .map((entry) => ({ name: entry.name, source: join(kindDir, entry.name) }))
}

async function installOne(
  module: string,
  kind: Kind,
  name: string,
  source: string,
  nextEntries: ManifestEntry[],
): Promise<void> {
  const target = targetPathFor({ kind, file: name })

  if (await pathExists(target)) {
    const trackedElsewhere = nextEntries.some((e) => e.kind === kind && e.file === name)
    if (!trackedElsewhere) {
      throw new Error(
        `refusing to overwrite ${kind === "root" ? name : `${kind}/${name}`}: it exists and was not installed by ` +
          `ZAI. Remove it manually if it's safe to replace.`,
      )
    }
  }

  const strategy = isDirKind(kind) ? await linkDir(source, target) : await linkFile(source, target)
  nextEntries.push({ module, kind, file: name, strategy })
}

async function install(): Promise<void> {
  const previous = await readManifest()
  for (const entry of previous.entries) {
    await removeTrackedEntry(entry)
  }

  await mkdir(CONFIG_ROOT, { recursive: true })
  await writeFile(REPO_PATH_FILE, `${REPO_ROOT}\n`, "utf8")

  const nextEntries: ManifestEntry[] = []

  for (const fileName of ROOT_FILES) {
    const source = join(REPO_ROOT, fileName)
    if (!(await pathExists(source))) continue
    await installOne("zai", "root", fileName, source, nextEntries)
  }
  console.log(`- zai: ${nextEntries.length} root file(s) installed`)

  const modules = await discoverModules()

  for (const { dir, manifest } of modules) {
    if (manifest.enabled === false) {
      console.log(`- ${manifest.name}: disabled, skipping`)
      continue
    }

    let installedForModule = 0
    for (const kind of MODULE_KINDS) {
      const items = await itemsForKind(dir, kind)
      for (const item of items) {
        await installOne(manifest.name, kind, item.name, item.source, nextEntries)
        installedForModule++
      }
    }
    console.log(`- ${manifest.name}: ${installedForModule} item(s) installed`)
  }

  await writeManifest({ entries: nextEntries })
  console.log(`\ndone. ${nextEntries.length} item(s) tracked in ${MANIFEST_PATH}`)
}

async function uninstall(): Promise<void> {
  const manifest = await readManifest()
  for (const entry of manifest.entries) {
    await removeTrackedEntry(entry)
  }
  await rm(MANIFEST_PATH, { force: true })
  await rm(REPO_PATH_FILE, { force: true })

  for (const kind of MODULE_KINDS) {
    const kindDir = join(CONFIG_ROOT, kind)
    if (!(await pathExists(kindDir))) continue
    const remaining = await readdir(kindDir)
    if (remaining.length === 0) await rm(kindDir, { recursive: true, force: true })
  }

  console.log(`done. removed ${manifest.entries.length} item(s).`)
}

const mode = process.argv.includes("--uninstall") ? "uninstall" : "install"
if (mode === "uninstall") {
  await uninstall()
} else {
  await install()
}
