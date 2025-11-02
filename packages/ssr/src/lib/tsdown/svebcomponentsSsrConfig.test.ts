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
});
