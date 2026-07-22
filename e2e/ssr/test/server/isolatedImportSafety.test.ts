import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { test, expect } from "vitest";

/**
 * These tests run each assertion in a brand-new `node` subprocess (not just a
 * fresh vitest module graph) so nothing from an earlier test — in
 * particular, no prior import of `@svebcomponents/ssr` that would install the
 * DOM shim as a side effect — can leak in via shared process globals
 * (`ElementRendererRegistry`/the shim install both key off `globalThis`).
 * That's the exact scenario a real consuming app can hit: its own compiled
 * client bundle, or its generated SSR entry, ending up as the *first* thing
 * evaluated on the server, with no other module having installed the shim
 * first.
 */
const dir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(dir, "../..");

const runInFreshProcess = (script: string): string =>
  execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: packageRoot,
    encoding: "utf8",
  });

test("importing the compiled client bundle alone never throws 'HTMLElement is not defined'", () => {
  // No prior import installs the shim here — the client bundle's own
  // build-injected banner must install it before its own module code
  // (including the compiled `class extends HTMLElement`) runs.
  expect(() =>
    runInFreshProcess(`await import('./dist/client/index.js');`),
  ).not.toThrow();
});

test("importing the generated SSR entry alone self-registers the renderer", () => {
  const output = runInFreshProcess(`
    const { ElementRendererRegistry } = await import('@svebcomponents/ssr');
    const Renderer = (await import('./dist/server/ssr.js')).default;
    const ctor = globalThis.customElements.get('simple-component');
    const registered = ElementRendererRegistry.get(ctor);
    console.log(registered === Renderer);
  `);
  expect(output.trim()).toBe("true");
});
