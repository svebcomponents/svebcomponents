import { expect, test, describe, assert } from "vitest";
import { defineConfig } from "./index";
import type { RollupOptions } from "rollup";

describe("defineConfig", () => {
  test("returns default config with client build only when ssr is false", () => {
    const config = defineConfig({ ssr: false });

    expect(config).toHaveLength(1);
    expect(config[0]).toHaveProperty("input", "src/index.ts");
    assert(config[0]?.output, "client config should have output property");
    expect(config[0].output).toHaveProperty("dir", "dist/client");
  });

  test("returns both client and ssr configs when ssr is true", () => {
    const config = defineConfig({ ssr: true });

    expect(config).toHaveLength(2);

    // Client config
    expect(config[0]).toHaveProperty("input", "src/index.ts");
    assert(config[0]?.output, "client config should have output property");
    expect(config[0].output).toHaveProperty("dir", "dist/client");

    // SSR config
    expect(config[1]).toHaveProperty("input", "src/index.ts");
    assert(config[1]?.output, "ssr config should have output property");
    expect(config[1].output).toHaveProperty("dir", "dist/server");
  });

  test("returns both configs by default (ssr defaults to true)", () => {
    const config = defineConfig();

    expect(config).toHaveLength(2);

    // Client config
    expect(config[0]).toHaveProperty("input", "src/index.ts");
    assert(config[0]?.output, "client config should have output property");
    expect(config[0].output).toHaveProperty("dir", "dist/client");

    // SSR config
    expect(config[1]).toHaveProperty("input", "src/index.ts");
    assert(config[1]?.output, "ssr config should have output property");
    expect(config[1].output).toHaveProperty("dir", "dist/server");
  });

  test("uses custom entry point when provided", () => {
    const customEntry = "src/custom.ts";
    const config = defineConfig({ entry: customEntry });

    expect(config[0]).toHaveProperty("input", customEntry);
    expect(config[1]).toHaveProperty("input", customEntry);
  });

  test("handles empty options object", () => {
    const config = defineConfig({});

    expect(config).toHaveLength(2);
    expect(config[0]).toHaveProperty("input", "src/index.ts");
    expect(config[1]).toHaveProperty("input", "src/index.ts");
  });

  test("returns valid RollupOptions", () => {
    const config = defineConfig();

    config.forEach((rollupConfig: RollupOptions) => {
      expect(rollupConfig).toHaveProperty("input");
      expect(rollupConfig).toHaveProperty("output");
      expect(rollupConfig).toHaveProperty("plugins");
      expect(Array.isArray(rollupConfig.plugins)).toBe(true);
    });
  });
});
