import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { test, expect } from "vitest";

/**
 * The Svelte-bundled client build (`dist/client`) is the CDN / bare-`import`
 * drop-in: a browser loads it straight from a URL, with no bundler and no
 * import map. Every specifier it *statically* imports must therefore be
 * relative — a bare specifier that survives into this build cannot be
 * resolved by the browser at all, and the element never registers.
 *
 * This package declares `@svebcomponents/ssr` as the optional peer dependency
 * a real published component is meant to declare, which is what makes the
 * check meaningful: tsdown externalizes peer dependencies by default, so the
 * `hydratable`/HydrationHost imports auto-options injects would otherwise
 * leak out as bare specifiers here.
 */
const dir = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(dir, "../../dist/client");

// static `import ... from "x"` / `export ... from "x"` only. Dynamic
// `import("x")` is excluded on purpose: the build's SSR shim guard is a
// dynamic import behind `typeof window === "undefined"`, so a browser never
// evaluates it.
const STATIC_SPECIFIER = /\bfrom\s*["']([^"']+)["']/g;

const isRelative = (specifier: string) =>
  specifier.startsWith("./") || specifier.startsWith("../");

test.each(readdirSync(clientDist).filter((file) => file.endsWith(".js")))(
  "dist/client/%s statically imports nothing a browser cannot resolve",
  (file) => {
    const code = readFileSync(path.join(clientDist, file), "utf8");
    const bare = [...code.matchAll(STATIC_SPECIFIER)]
      .map(([, specifier]) => specifier)
      .filter((specifier) => specifier !== undefined && !isRelative(specifier));

    expect(bare).toEqual([]);
  },
);
