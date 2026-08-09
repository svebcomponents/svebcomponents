import {
  beforeEach,
  expect,
  test,
  describe,
  vi,
  type MockedFunction,
} from "vitest";
import { defineConfig } from "./index";
import type { UserConfig } from "tsdown";
import fs from "node:fs";

vi.mock("node:fs");
const mockExistsSync = fs.existsSync as MockedFunction<typeof fs.existsSync>;

describe("defineConfig", () => {
  beforeEach(() => {
    mockExistsSync.mockReset();
    mockExistsSync.mockReturnValue(false);
  });
  test("returns default config with client build only when ssr is false", () => {
    const config = defineConfig({ ssr: false });

    expect(config).toHaveLength(1);
    expect(config[0]).toHaveProperty("entry", "src/index.svelte");
    expect(config[0]).toHaveProperty("outDir", "dist/client");
  });

  test("omits the SSR shim-guard banner from a browser-only (ssr: false) client build", () => {
    const config = defineConfig({ ssr: false });

    expect(config[0]).not.toHaveProperty("banner");
  });

  test("adds the SSR shim-guard banner to the client build when ssr is true", () => {
    const config = defineConfig({ ssr: true });

    expect(config[0]?.banner).toEqual({
      js: expect.stringContaining("@svebcomponents/ssr/shim"),
    });
  });

  test("returns Svelte-aware configs when Svelte output directories are provided", () => {
    const config = defineConfig({
      svelteOutDir: "dist/client-svelte",
      ssrSvelteOutDir: "dist/server-svelte",
    });

    // client, client-svelte, ssr, ssr hydration host,
    // ssr-svelte, ssr-svelte hydration host
    expect(config).toHaveLength(6);
    expect(config[1]).toHaveProperty("outDir", "dist/client-svelte");
    expect(config[1]).toHaveProperty("deps.neverBundle", [/^svelte(\/.*)?$/]);
    expect(config[4]).toHaveProperty("outDir", "dist/server-svelte");
    expect(config[4]).toHaveProperty("deps.neverBundle", [/^svelte(\/.*)?$/]);
    expect(config[5]).toHaveProperty("outDir", "dist/server-svelte");
    expect(config[5]).toHaveProperty("entry", {
      "ssr-hydration-host": expect.stringContaining("HydrationHost.svelte"),
    });
  });

  test("returns both client and ssr configs when ssr is true", () => {
    const config = defineConfig({ ssr: true });

    // client, ssr, ssr hydration host (hydratable defaults to true)
    expect(config).toHaveLength(3);

    // Client config
    expect(config[0]).toHaveProperty("entry", "src/index.svelte");
    expect(config[0]).toHaveProperty("outDir", "dist/client");

    // SSR config
    expect(config[1]).toHaveProperty("entry", "src/index.svelte");
    expect(config[1]).toHaveProperty("outDir", "dist/server");

    // Hydration host config
    expect(config[2]).toHaveProperty("outDir", "dist/server");
    expect(config[2]).toHaveProperty("entry", {
      "ssr-hydration-host": expect.stringContaining("HydrationHost.svelte"),
    });
    expect(config[2]).toHaveProperty("dts", false);
  });

  test("omits the hydration host config when hydratable is false", () => {
    const config = defineConfig({ hydratable: false });

    expect(config).toHaveLength(2);
    expect(config[0]).toHaveProperty("outDir", "dist/client");
    expect(config[1]).toHaveProperty("outDir", "dist/server");
  });

  test("bundles both ssr hydration imports into the client build when hydratable", () => {
    // The HydrationHost otherwise stays external and resolves to raw .svelte
    // at runtime, forcing every consuming app to add the component to
    // ssr.noExternal; `hydratable` otherwise leaks out as a bare specifier a
    // browser cannot resolve, because a component declaring
    // @svebcomponents/ssr as the optional peer dependency it is meant to be
    // gets peer dependencies externalized by default.
    const config = defineConfig({ hydratable: true });
    const [alwaysBundle] = config[0]?.deps?.alwaysBundle as [RegExp];

    expect(config[0]).toHaveProperty("outDir", "dist/client");
    for (const injected of [
      "@svebcomponents/ssr/hydration",
      "@svebcomponents/ssr/hydration-host",
    ]) {
      expect(alwaysBundle.test(injected)).toBe(true);
    }
  });

  test("does not force-bundle the hydration imports for a non-hydratable client build", () => {
    const config = defineConfig({ hydratable: false });

    expect(config[0]).not.toHaveProperty("deps.alwaysBundle");
  });

  test("returns all configs by default (ssr and hydratable default to true)", () => {
    const config = defineConfig();

    expect(config).toHaveLength(3);

    // Client config
    expect(config[0]).toHaveProperty("entry", "src/index.svelte");
    expect(config[0]).toHaveProperty("outDir", "dist/client");

    // SSR config
    expect(config[1]).toHaveProperty("entry", "src/index.svelte");
    expect(config[1]).toHaveProperty("outDir", "dist/server");
  });

  test("uses custom entry point when provided", () => {
    const customEntry = "src/custom.ts";
    const config = defineConfig({ entry: customEntry });

    expect(config[0]).toHaveProperty("entry", customEntry);
    expect(config[1]).toHaveProperty("entry", customEntry);
  });

  test("automatically includes an adjacent SSR preparation module", () => {
    mockExistsSync.mockImplementation(
      (candidate) => String(candidate) === "src/index.ssr.ts",
    );

    const config = defineConfig();

    expect(config[0]).toHaveProperty("entry", "src/index.svelte");
    expect(config[1]).toHaveProperty("entry", {
      index: "src/index.svelte",
      "index.ssr": "src/index.ssr.ts",
    });
  });

  test("uses an adjacent TypeScript preparation module for a direct Svelte entry", () => {
    mockExistsSync.mockImplementation(
      (candidate) => String(candidate) === "src/Widget.ssr.ts",
    );

    const config = defineConfig({ entry: "src/Widget.svelte" });

    expect(config[0]).toHaveProperty("dts", false);
    expect(config[1]).toHaveProperty("dts", false);
    expect(config[1]).toHaveProperty("entry", {
      Widget: "src/Widget.svelte",
      "Widget.ssr": "src/Widget.ssr.ts",
    });
  });

  test("derives the hydration host output name from the ssr entry filename", () => {
    const config = defineConfig({ ssrEntryFileName: "button-ssr" });

    expect(config[2]).toHaveProperty("entry", {
      "button-ssr-hydration-host": expect.stringContaining(
        "HydrationHost.svelte",
      ),
    });
  });

  test("handles empty options object", () => {
    const config = defineConfig({});

    expect(config).toHaveLength(3);
    expect(config[0]).toHaveProperty("entry", "src/index.svelte");
    expect(config[1]).toHaveProperty("entry", "src/index.svelte");
  });

  test("builds the browser bundles against the production export condition", () => {
    // `esm-env` otherwise resolves DEV to a runtime `process.env.NODE_ENV`
    // check, and every `if (DEV)` branch in Svelte's runtime — including the
    // full error and warning message texts — survives into the browser bundle
    const config = defineConfig({ svelteOutDir: "dist/client-svelte" });

    for (const clientConfig of [config[0], config[1]]) {
      expect(clientConfig?.inputOptions).toMatchObject({
        resolve: { conditionNames: ["production"] },
        // without inlining, DEV lands as a module-level `var` the minifier
        // will not fold, and the dead branches stay regardless
        optimization: { inlineConst: { mode: "smart" } },
      });
    }
  });

  test("returns valid tsdownOptions", () => {
    const config = defineConfig();

    config.forEach((tsdownConfig: UserConfig) => {
      expect(tsdownConfig).toHaveProperty("entry");
      expect(tsdownConfig).toHaveProperty("outDir");
      expect(tsdownConfig).toHaveProperty("plugins");
    });
  });
});
