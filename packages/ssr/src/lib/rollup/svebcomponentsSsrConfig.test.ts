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

  test("includes all required plugins", () => {
    const config = svebcomponentsSsrConfig({
      input: "src/index.ts",
      outDir: "dist/server",
    });

    expect(config.plugins).toHaveLength(5);
    expect(Array.isArray(config.plugins)).toBe(true);
  });

  test("handles different input paths", () => {
    const inputs = [
      "src/component.ts",
      "lib/index.ts",
      "components/Button.ts",
    ];

    inputs.forEach(input => {
      const config = svebcomponentsSsrConfig({
        input,
        outDir: "dist/server",
      });

      expect(config.input).toBe(input);
    });
  });

  test("handles different output directories", () => {
    const outDirs = [
      "dist/server",
      "build/ssr",
      "public/server",
    ];

    outDirs.forEach(outDir => {
      const config = svebcomponentsSsrConfig({
        input: "src/index.ts",
        outDir,
      });

      expect(config.output.dir).toBe(outDir);
    });
  });
});