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

    expect(config).toHaveLength(4);
    expect(config[1]).toHaveProperty("outDir", "dist/client-svelte");
    expect(config[1]).toHaveProperty("external", [/^svelte(\/.*)?$/]);
    expect(config[3]).toHaveProperty("outDir", "dist/server-svelte");
    expect(config[3]).toHaveProperty("external", [/^svelte(\/.*)?$/]);
  });

  test("returns both client and ssr configs when ssr is true", () => {
    const config = defineConfig({ ssr: true });

    expect(config).toHaveLength(2);

    // Client config
    expect(config[0]).toHaveProperty("entry", "src/index.ts");
    expect(config[0]).toHaveProperty("outDir", "dist/client");

    // SSR config
    expect(config[1]).toHaveProperty("entry", "src/index.ts");
    expect(config[1]).toHaveProperty("outDir", "dist/server");
  });

  test("returns both configs by default (ssr defaults to true)", () => {
    const config = defineConfig();

    expect(config).toHaveLength(2);

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

  test("handles empty options object", () => {
    const config = defineConfig({});

    expect(config).toHaveLength(2);
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
