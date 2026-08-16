import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ZaiStackPlugin } from "../zai.stack.js"

// OpenCode's plugin loader treats every top-level named/default export as
// a candidate Plugin factory and invokes it - a stray helper export here
// crashes config bootstrap for the whole session (see docs/DECISIONS.md
// point 16). This guards against silently reintroducing that.
it("exports exactly the plugin - default and named ZaiStackPlugin, nothing else", async () => {
  const mod = await import("../zai.stack.js")
  expect(Object.keys(mod).sort()).toEqual(["ZaiStackPlugin", "default"])
})

const { checkPackageAge, extractAddedPackages, gateContext7, isContext7Tool, stripVersionSpec } = (
  ZaiStackPlugin as any
).testHelpers

describe("isContext7Tool", () => {
  it("matches typical MCP-prefixed context7 tool ids", () => {
    expect(isContext7Tool("mcp__context7__resolve-library-id")).toBe(true)
    expect(isContext7Tool("mcp__context7__query-docs")).toBe(true)
  })

  it("is case-insensitive", () => {
    expect(isContext7Tool("Context7QueryDocs")).toBe(true)
  })

  it("does not match unrelated tools", () => {
    expect(isContext7Tool("bash")).toBe(false)
    expect(isContext7Tool("edit")).toBe(false)
    expect(isContext7Tool("webfetch")).toBe(false)
  })
})

describe("stripVersionSpec", () => {
  it("strips a version from an unscoped package", () => {
    expect(stripVersionSpec("zod@3.23.0")).toBe("zod")
  })

  it("leaves an unscoped package without a version untouched", () => {
    expect(stripVersionSpec("zod")).toBe("zod")
  })

  it("strips a version from a scoped package without breaking the scope", () => {
    expect(stripVersionSpec("@types/node@22.0.0")).toBe("@types/node")
  })

  it("leaves a scoped package without a version untouched", () => {
    expect(stripVersionSpec("@types/node")).toBe("@types/node")
  })
})

describe("extractAddedPackages", () => {
  it("extracts packages from pnpm add", () => {
    expect(extractAddedPackages("pnpm add zod")).toEqual(["zod"])
  })

  it("extracts multiple packages", () => {
    expect(extractAddedPackages("pnpm add zod better-auth")).toEqual(["zod", "better-auth"])
  })

  it("extracts packages from npm install", () => {
    expect(extractAddedPackages("npm install zod")).toEqual(["zod"])
  })

  it("extracts packages from npm i", () => {
    expect(extractAddedPackages("npm i zod")).toEqual(["zod"])
  })

  it("extracts packages from yarn add", () => {
    expect(extractAddedPackages("yarn add zod")).toEqual(["zod"])
  })

  it("ignores flags", () => {
    expect(extractAddedPackages("pnpm add -D zod --save-exact")).toEqual(["zod"])
  })

  it("strips versions from extracted packages", () => {
    expect(extractAddedPackages("pnpm add zod@3.23.0")).toEqual(["zod"])
  })

  it("returns an empty list for unrelated commands", () => {
    expect(extractAddedPackages("pnpm install")).toEqual([])
    expect(extractAddedPackages("pnpm test")).toEqual([])
    expect(extractAddedPackages("git commit -m done")).toEqual([])
  })
})

describe("checkPackageAge", () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("flags a package created less than 2 years ago", async () => {
    const recent = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        time: { created: recent, modified: recent, "1.0.0": recent },
        "dist-tags": { latest: "1.0.0" },
      }),
    }) as unknown as typeof fetch

    const result = await checkPackageAge("some-new-lib")
    expect(result?.young).toBe(true)
  })

  it("does not flag an old package with an old major version", async () => {
    const old = new Date(Date.now() - 6 * 365 * 24 * 60 * 60 * 1000).toISOString()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        time: { created: old, modified: old, "1.0.0": old },
        "dist-tags": { latest: "1.0.0" },
      }),
    }) as unknown as typeof fetch

    const result = await checkPackageAge("some-old-lib")
    expect(result?.young).toBe(false)
  })

  it("flags an old package whose current major version is recent", async () => {
    const created = new Date(Date.now() - 6 * 365 * 24 * 60 * 60 * 1000).toISOString()
    const majorBump = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        time: { created, modified: majorBump, "1.0.0": created, "2.0.0": majorBump },
        "dist-tags": { latest: "2.0.0" },
      }),
    }) as unknown as typeof fetch

    const result = await checkPackageAge("some-lib-with-recent-major")
    expect(result?.young).toBe(true)
    expect(result?.reason).toMatch(/major version 2/)
  })

  it("returns null (fail open) when the registry is unreachable", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch
    const result = await checkPackageAge("whatever")
    expect(result).toBeNull()
  })

  it("returns null (fail open) when the registry responds with a non-ok status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch
    const result = await checkPackageAge("nonexistent-package")
    expect(result).toBeNull()
  })
})

describe("gateContext7", () => {
  const originalFetch = globalThis.fetch
  const sessionId = () => `s-${Math.random()}`

  afterEach(() => {
    globalThis.fetch = originalFetch
    delete process.env.ZAI_DISABLE_GATES
    delete process.env.ZAI_STACK_DISABLE_GATE_CONTEXT7
  })

  it("blocks adding a young package without a prior context7 call", async () => {
    const recent = new Date().toISOString()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ time: { created: recent, modified: recent }, "dist-tags": { latest: "1.0.0" } }),
    }) as unknown as typeof fetch

    await expect(
      gateContext7({ tool: "bash", sessionID: sessionId(), callID: "c1" }, { args: { command: "pnpm add some-new-lib" } }),
    ).rejects.toThrow(/zai gate context7/)
  })

  it("allows adding a young package after context7 was consulted this session", async () => {
    const recent = new Date().toISOString()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ time: { created: recent, modified: recent }, "dist-tags": { latest: "1.0.0" } }),
    }) as unknown as typeof fetch

    const session = sessionId()
    await gateContext7(
      { tool: "mcp__context7__resolve-library-id", sessionID: session, callID: "c0" },
      { args: { libraryName: "some-new-lib" } },
    )
    await expect(
      gateContext7({ tool: "bash", sessionID: session, callID: "c1" }, { args: { command: "pnpm add some-new-lib" } }),
    ).resolves.toBeUndefined()
  })

  it("allows adding an old, stable package without consulting context7", async () => {
    const old = new Date(Date.now() - 6 * 365 * 24 * 60 * 60 * 1000).toISOString()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ time: { created: old, modified: old }, "dist-tags": { latest: "1.0.0" } }),
    }) as unknown as typeof fetch

    await expect(
      gateContext7({ tool: "bash", sessionID: sessionId(), callID: "c1" }, { args: { command: "pnpm add lodash" } }),
    ).resolves.toBeUndefined()
  })

  it("ignores non-bash tools and bash commands that are not package installs", async () => {
    await expect(
      gateContext7({ tool: "edit", sessionID: sessionId(), callID: "c1" }, { args: { filePath: "src/x.ts" } }),
    ).resolves.toBeUndefined()
    await expect(
      gateContext7({ tool: "bash", sessionID: sessionId(), callID: "c1" }, { args: { command: "pnpm test" } }),
    ).resolves.toBeUndefined()
  })

  it("respects ZAI_DISABLE_GATES", async () => {
    process.env.ZAI_DISABLE_GATES = "1"
    await expect(
      gateContext7({ tool: "bash", sessionID: sessionId(), callID: "c1" }, { args: { command: "pnpm add some-new-lib" } }),
    ).resolves.toBeUndefined()
  })

  it("respects ZAI_STACK_DISABLE_GATE_CONTEXT7", async () => {
    process.env.ZAI_STACK_DISABLE_GATE_CONTEXT7 = "1"
    await expect(
      gateContext7({ tool: "bash", sessionID: sessionId(), callID: "c1" }, { args: { command: "pnpm add some-new-lib" } }),
    ).resolves.toBeUndefined()
  })

  it("fails open when the registry check errors out", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch
    await expect(
      gateContext7({ tool: "bash", sessionID: sessionId(), callID: "c1" }, { args: { command: "pnpm add some-new-lib" } }),
    ).resolves.toBeUndefined()
  })
})
