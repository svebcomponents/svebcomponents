import { expect, test, describe } from "vitest";
import svebcomponentsSsrConfig from "./svebcomponentsSsrConfig";

describe("svebcomponentsSsrConfig", () => {
  test("returns valid rollup config with required properties", () => {
    const config = svebcomponentsSsrConfig({
      input: "src/test.ts",
      outDir: "dist/test",
    });

    expect(config).toHaveProperty("input", "src/test.ts");
    expect(config).toHaveProperty("output");
    expect(config).toHaveProperty("plugins");
    expect(Array.isArray(config.plugins)).toBe(true);
  });

  test("configures output for SSR", () => {
    const outDir = "dist/server";
    const config = svebcomponentsSsrConfig({
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
