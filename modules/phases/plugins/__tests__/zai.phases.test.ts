import { describe, expect, it } from "vitest"

import { ZaiPhasesPlugin } from "../zai.phases.js"

// OpenCode's plugin loader treats every top-level named/default export as
// a candidate Plugin factory and invokes it - a stray helper export here
// crashes config bootstrap for the whole session (see docs/DECISIONS.md
// point 16). This guards against silently reintroducing that.
it("exports exactly the plugin - default and named ZaiPhasesPlugin, nothing else", async () => {
  const mod = await import("../zai.phases.js")
  expect(Object.keys(mod).sort()).toEqual(["ZaiPhasesPlugin", "default"])
})

const { extractPatchPaths, globToRegExp, matchesAnyGlob } = (ZaiPhasesPlugin as any).testHelpers

describe("globToRegExp / matchesAnyGlob", () => {
  it("matches a simple double-star glob", () => {
    expect(matchesAnyGlob("packages/api/user.spec.ts", ["packages/api/**/*.spec.ts"])).toBe(true)
  })

  it("matches nested paths under a double-star", () => {
    expect(matchesAnyGlob("packages/api/deep/nested/user.spec.ts", ["packages/api/**/*.spec.ts"])).toBe(true)
  })

  it("does not match a file outside the glob", () => {
    expect(matchesAnyGlob("packages/api/user.ts", ["packages/api/**/*.spec.ts"])).toBe(false)
  })

  it("does not match a completely different directory", () => {
    expect(matchesAnyGlob("packages/web/user.spec.ts", ["packages/api/**/*.spec.ts"])).toBe(false)
  })

  it("single star does not cross directory boundaries", () => {
    expect(matchesAnyGlob("a/b/c.spec.ts", ["a/*.spec.ts"])).toBe(false)
    expect(matchesAnyGlob("a/c.spec.ts", ["a/*.spec.ts"])).toBe(true)
  })

  it("matches against any of several globs", () => {
    const globs = ["packages/api/**/*.spec.ts", "packages/web/**/*.test.ts"]
    expect(matchesAnyGlob("packages/web/foo.test.ts", globs)).toBe(true)
  })

  it("escapes regex-special characters in literal segments", () => {
    expect(matchesAnyGlob("a+b.spec.ts", ["a+b.spec.ts"])).toBe(true)
    expect(matchesAnyGlob("axb.spec.ts", ["a+b.spec.ts"])).toBe(false)
  })

  it("normalizes backslashes before matching", () => {
    expect(matchesAnyGlob("packages\\api\\user.spec.ts", ["packages/api/**/*.spec.ts"])).toBe(true)
  })

  it("globToRegExp anchors the whole string", () => {
    const re = globToRegExp("*.spec.ts")
    expect(re.test("user.spec.ts")).toBe(true)
    expect(re.test("user.spec.ts.bak")).toBe(false)
    expect(re.test("nested/user.spec.ts")).toBe(false)
  })
})

describe("extractPatchPaths", () => {
  it("extracts an added file", () => {
    const patch = ["*** Begin Patch", "*** Add File: src/new.ts", "+content", "*** End Patch"].join("\n")
    expect(extractPatchPaths(patch)).toEqual(["src/new.ts"])
  })

  it("extracts an updated file", () => {
    const patch = ["*** Begin Patch", "*** Update File: src/existing.ts", "@@", "*** End Patch"].join("\n")
    expect(extractPatchPaths(patch)).toEqual(["src/existing.ts"])
  })

  it("extracts a deleted file", () => {
    const patch = ["*** Begin Patch", "*** Delete File: src/old.ts", "*** End Patch"].join("\n")
    expect(extractPatchPaths(patch)).toEqual(["src/old.ts"])
  })

  it("extracts both the update and the move-to path", () => {
    const patch = [
      "*** Begin Patch",
      "*** Update File: src/old-name.ts",
      "*** Move to: src/new-name.ts",
      "@@",
      "*** End Patch",
    ].join("\n")
    expect(extractPatchPaths(patch)).toEqual(["src/old-name.ts", "src/new-name.ts"])
  })

  it("extracts multiple files from one patch", () => {
    const patch = [
      "*** Begin Patch",
      "*** Update File: src/a.ts",
      "@@",
      "*** Add File: src/b.ts",
      "+content",
      "*** End Patch",
    ].join("\n")
    expect(extractPatchPaths(patch)).toEqual(["src/a.ts", "src/b.ts"])
  })

  it("returns an empty list for a patch with no file markers", () => {
    expect(extractPatchPaths("*** Begin Patch\n*** End Patch")).toEqual([])
  })
})
