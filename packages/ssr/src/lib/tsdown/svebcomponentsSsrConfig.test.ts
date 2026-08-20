import { beforeEach, expect, test, describe, vi } from "vitest";
import { pluginGenerateSsrEntry } from "../rollup/pluginGenerateSsrEntry.js";
import svebcomponentsSsrConfig from "./svebcomponentsSsrConfig";

vi.mock("../rollup/pluginGenerateSsrEntry.js", () => ({
  pluginGenerateSsrEntry: vi.fn(() => ({
    name: "svebcomponents:generate-ssr-entry",
  })),
}));

const mockGenerateSsrEntry = vi.mocked(pluginGenerateSsrEntry);

describe("svebcomponentsSsrConfig", () => {
  beforeEach(() => {
    mockGenerateSsrEntry.mockClear();
  });

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

  test("disables tsdown declarations for a direct Svelte entry", () => {
    const config = svebcomponentsSsrConfig({
      entry: "src/Element.svelte",
      outDir: "dist/server",
    });

    expect(config.dts).toBe(false);
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

  test("enables async mode in the generated entry when the compiler does", () => {
    svebcomponentsSsrConfig({
      entry: "src/index.ts",
      outDir: "dist/server",
      svelteConfig: {
        compilerOptions: { experimental: { async: true } },
      },
    });

    expect(mockGenerateSsrEntry).toHaveBeenCalledWith(
      expect.objectContaining({ enableAsyncMode: true }),
    );
  });

  test("keeps async mode out of generated entries by default", () => {
    svebcomponentsSsrConfig({
      entry: "src/index.ts",
      outDir: "dist/server",
    });

    expect(mockGenerateSsrEntry).toHaveBeenCalledWith(
      expect.objectContaining({ enableAsyncMode: false }),
    );
  });
});
