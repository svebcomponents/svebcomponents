import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const dist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist/client",
);

/**
 * Static bare specifiers left in a browser bundle — the ones a browser has to
 * resolve itself, and cannot without an import map.
 *
 * Dynamic imports are deliberately not counted: the SSR shim guard is a
 * `typeof window === "undefined"` branch that never runs in a browser.
 */
const staticBareImports = (code: string): string[] => [
  ...new Set(
    [
      ...code.matchAll(
        /(?:^|[^.\w])(?:import|export)[^;]*?from\s*["']([^"'./][^"']*)["']/g,
      ),
    ].map((match) => match[1]!),
  ),
];

describe("browser output is self-contained", () => {
  // `@svebcomponents/utils` is declared in this package's `dependencies`, which
  // is exactly what tsdown externalizes by default. Both entries below import
  // it, so if the build ever goes back to inferring what to inline from
  // dependency classification, these fail.
  //
  // This is the coverage whose absence let three separate releases ship a
  // `dist/client` no browser could load: every fixture declared a dependency,
  // none imported one, so nothing observed the difference.
  it.each(["index.js", "helpers.js"])(
    "leaves no bare specifier in dist/client/%s",
    async (file) => {
      const code = await readFile(path.join(dist, file), "utf8");

      expect(code).not.toBe("");
      expect(staticBareImports(code)).toEqual([]);
    },
  );

  it("actually inlined the declared dependency rather than dropping it", async () => {
    // guards against the assertion above passing because the import was
    // tree-shaken away instead of bundled
    const code = await readFile(path.join(dist, "helpers.js"), "utf8");

    expect(code).toMatch(/toLowerCase/);
  });
});
