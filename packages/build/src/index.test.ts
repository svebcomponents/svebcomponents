import { expect, test, describe } from "vitest";
import { defineConfig } from "./index";
import type { Options } from "tsdown";

describe("defineConfig", () => {
  test("returns default config with client build only when ssr is false", () => {
    const config = defineConfig({ ssr: false });

    expect(config).toHaveLength(1);
    expect(config[0]).toHaveProperty("entry", "src/index.ts");
    expect(config[0]).toHaveProperty("outDir", "dist/client");
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
    expect(config[1]).toHaveProperty("external", [/^svelte(\/.*)?$/]);
    expect(config[4]).toHaveProperty("outDir", "dist/server-svelte");
    expect(config[4]).toHaveProperty("external", [/^svelte(\/.*)?$/]);
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
    expect(config[0]).toHaveProperty("entry", "src/index.ts");
    expect(config[0]).toHaveProperty("outDir", "dist/client");

    // SSR config
    expect(config[1]).toHaveProperty("entry", "src/index.ts");
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

  test("returns all configs by default (ssr and hydratable default to true)", () => {
    const config = defineConfig();

    expect(config).toHaveLength(3);

    // Client config
    expect(config[0]).toHaveProperty("entry", "src/index.ts");
    expect(config[0]).toHaveProperty("outDir", "dist/client");

    // SSR config
    expect(config[1]).toHaveProperty("entry", "src/index.ts");
    expect(config[1]).toHaveProperty("outDir", "dist/server");
  });

  test("uses custom entry point when provided", () => {
    const customEntry = "src/custom.ts";
    const config = defineConfig({ entry: customEntry });

    expect(config[0]).toHaveProperty("entry", customEntry);
    expect(config[1]).toHaveProperty("entry", customEntry);
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
    expect(config[0]).toHaveProperty("entry", "src/index.ts");
    expect(config[1]).toHaveProperty("entry", "src/index.ts");
  });

  test("returns valid tsdownOptions", () => {
    const config = defineConfig();

    config.forEach((tsdownConfig: Options) => {
      expect(tsdownConfig).toHaveProperty("entry");
      expect(tsdownConfig).toHaveProperty("outDir");
      expect(tsdownConfig).toHaveProperty("plugins");
    });
  });
});
