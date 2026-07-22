import { expect, test, describe } from "vitest";
import svebcomponentsSsrConfig from "./svebcomponentsSsrConfig";

describe("svebcomponentsSsrConfig", () => {
  test("returns valid rollup config with required properties", () => {
    const config = svebcomponentsSsrConfig({
      entry: "src/test.ts",
      outDir: "dist/test",
    });

    expect(config).toHaveProperty("entry", "src/test.ts");
    expect(config).toHaveProperty("outDir", "dist/test");
    expect(config).toHaveProperty("plugins");
    expect(Array.isArray(config.plugins)).toBe(true);
  });

  test("configures output for SSR", () => {
    const outDir = "dist/server";
    const config = svebcomponentsSsrConfig({
      entry: "src/index.ts",
      outDir,
    });

    expect(config.outDir).toEqual(outDir);
  });

  test("compiles a server preparation module as an additional entry", () => {
    const config = svebcomponentsSsrConfig({
      entry: "src/index.ts",
      prepareEntry: "src/index.ssr.ts",
      prepareImportPath: "./index.ssr.js",
      outDir: "dist/server",
    });

    expect(config.entry).toEqual({
      index: "src/index.ts",
      "index.ssr": "src/index.ssr.ts",
    });
  });
});
