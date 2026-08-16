import { describe, expect, it } from "vitest"

import { bumpSemver, parseSemver } from "../zai-bump-version.js"

describe("parseSemver", () => {
  it("parses a plain version", () => {
    expect(parseSemver("1.2.3")).toEqual([1, 2, 3])
  })

  it("parses a version with a pre-release/build suffix, ignoring it", () => {
    expect(parseSemver("1.2.3-rc.1")).toEqual([1, 2, 3])
  })

  it("throws on a non-semver string", () => {
    expect(() => parseSemver("not-a-version")).toThrow()
  })
})

describe("bumpSemver", () => {
  it("the very first minor bump from 0.0.0 lands on 0.1.0", () => {
    expect(bumpSemver("0.0.0", "minor")).toBe("0.1.0")
  })

  it("bumps minor and resets patch", () => {
    expect(bumpSemver("0.1.4", "minor")).toBe("0.2.0")
  })

  it("bumps patch", () => {
    expect(bumpSemver("0.2.0", "patch")).toBe("0.2.1")
  })

  it("bumps major and resets minor and patch", () => {
    expect(bumpSemver("0.9.3", "major")).toBe("1.0.0")
  })
})
