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
});
