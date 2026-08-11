import { describe, expect, it } from "vitest";

import { createBrowserBundlingRule } from "./browserDeps.js";

describe("createBrowserBundlingRule", () => {
  const inlines = createBrowserBundlingRule();

  it("inlines every bare specifier", () => {
    for (const id of [
      "svelte",
      "svelte/internal/client",
      "@svebcomponents/ssr/hydration",
      "@svebcomponents/ssr/hydration-host",
      "@scope/package",
      "@scope/package/deep/path",
      "some-package",
    ]) {
      expect(inlines(id), id).toBe(true);
    }
  });

  it("leaves node builtins external", () => {
    // a browser bundle importing one is broken either way, and inlining turns
    // a dependency's dead branch into a build error
    for (const id of ["fs", "node:fs", "node:path", "path"]) {
      expect(inlines(id), id).toBe(false);
    }
  });

  it("ignores anything that is not a dependency", () => {
    for (const id of [
      "./sibling.js",
      "../parent.js",
      "/absolute/path.js",
      "\0virtual:module",
      "data:text/javascript,export default 1",
      "https://esm.sh/package",
    ]) {
      expect(inlines(id), id).toBe(false);
    }
  });

  it("honours an opt-out, by exact name or pattern", () => {
    const rule = createBrowserBundlingRule(["stays-external", /^@host\//]);

    expect(rule("stays-external")).toBe(false);
    expect(rule("@host/provided")).toBe(false);
    expect(rule("everything-else")).toBe(true);
    // an exact-name opt-out does not silently cover subpaths
    expect(rule("stays-external/subpath")).toBe(true);
  });
});
