import { expect, test, describe } from "vitest";
import { svebcomponentRollupConfig } from "./svebcomponentRollupConfig";

describe("svebcomponentRollupConfig", () => {
  test("returns valid rollup config with required properties", () => {
    const config = svebcomponentRollupConfig({
      input: "src/test.ts",
      outDir: "dist/test",
    });

    expect(config).toHaveProperty("input", "src/test.ts");
    expect(config).toHaveProperty("output");
    expect(config).toHaveProperty("plugins");
    expect(Array.isArray(config.plugins)).toBe(true);
  });

  test("configures output correctly", () => {
    const outDir = "dist/custom";
    const config = svebcomponentRollupConfig({
      input: "src/index.ts",
      outDir,
    });

    expect(config.output).toEqual({
      dir: outDir,
      format: "esm",
      sourcemap: true,
    });
  });

  test("includes required plugins", () => {
    const config = svebcomponentRollupConfig({
      input: "src/index.ts",
      outDir: "dist",
    });

    expect(config.plugins).toHaveLength(4);

    // Check that plugins are configured (we can't easily test the exact plugin instances)
    expect(config.plugins).toBeDefined();
    expect(Array.isArray(config.plugins)).toBe(true);
  });

  test("handles different input paths", () => {
    const inputs = ["src/component.ts", "lib/index.ts", "components/Button.ts"];

    inputs.forEach((input) => {
      const config = svebcomponentRollupConfig({
        input,
        outDir: "dist",
      });

      expect(config.input).toBe(input);
    });
  });

  test("handles different output directories", () => {
    const outDirs = ["dist/client", "build/output", "public/components"];

    outDirs.forEach((outDir) => {
      const config = svebcomponentRollupConfig({
        input: "src/index.ts",
        outDir,
      });

      expect(config.output.dir).toBe(outDir);
    });
  });
});

