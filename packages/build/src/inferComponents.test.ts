import { describe, expect, it, type MockedFunction, vi } from "vitest";
import { inferComponents } from "./inferComponents";
import { defineConfig } from "./index.js";
import fs from "node:fs";
import path from "node:path";
import fsPromises from "fs/promises";
import type { Options } from "tsdown";

vi.mock("node:fs");
const mockFs = fs as unknown as {
  existsSync: MockedFunction<typeof fs.existsSync>;
};

vi.mock("fs/promises", () => ({
  default: { writeFile: vi.fn() },
}));
const mockWriteFile = fsPromises.writeFile as unknown as MockedFunction<
  typeof fsPromises.writeFile
>;

/**
 * Drive every generated SSR-entry plugin found in the given tsdown configs and
 * collect the file paths it writes. This exercises the actual `writeBundle`
 * side effect (which `JSON.stringify` comparisons cannot observe, since the
 * entry filename is captured inside the plugin closure).
 */
const collectGeneratedSsrFiles = async (
  configs: Options[],
): Promise<string[]> => {
  mockWriteFile.mockClear();
  for (const config of configs) {
    const plugins = (config.plugins ?? []) as Array<{
      name?: string;
      writeBundle?: (
        this: { error: (msg: string) => never },
        outputOptions: { dir?: string | undefined },
      ) => unknown;
    }>;
    for (const plugin of plugins) {
      if (
        plugin?.name === "svebcomponents:generate-ssr-entry" &&
        typeof plugin.writeBundle === "function"
      ) {
        await plugin.writeBundle.call(
          {
            error: (msg: string) => {
              throw new Error(msg);
            },
          },
          { dir: config.outDir },
        );
      }
    }
  }
  return mockWriteFile.mock.calls.map((call) => String(call[0]));
};

const packageJson = {
  exports: {
    ".": {
      import: "./dist/client/index.js",
    },
  },
};

const ssrPackageJson = {
  exports: {
    ".": {
      import: "./dist/client/index.js",
    },
    "./ssr": {
      import: "./dist/server/ssr.js",
    },
  },
};

const svelteConditionPackageJson = {
  exports: {
    ".": {
      types: "./dist/client/index.d.ts",
      svelte: "./dist/client-svelte/index.js",
      default: "./dist/client/index.js",
    },
    "./ssr": {
      types: "./dist/server/ssr.d.ts",
      svelte: "./dist/server-svelte/ssr.js",
      default: "./dist/server/ssr.js",
    },
  },
};

const multipleComponentsPackageJson = {
  exports: {
    ".": {
      import: "./dist/client/index.js",
    },
    "./componentA": {
      import: "./dist/client/componentA.js",
    },
    "./componentA/ssr": {
      import: "./dist/server/componentA-ssr.js",
    },
  },
};

const manualConfig = defineConfig({
  entry: "src/index.js",
  outDir: "dist/client",
  ssr: false,
});

const manualSSRConfig = defineConfig({
  entry: "src/index.js",
  outDir: "dist/client",
  ssr: true,
});

const manualSvelteConditionConfig = defineConfig({
  entry: "src/index.js",
  outDir: "dist/client",
  svelteOutDir: "dist/client-svelte",
  ssr: true,
  ssrOutDir: "dist/server",
  ssrSvelteOutDir: "dist/server-svelte",
});

const manualMultipleComponentsConfig = [
  ...defineConfig({
    entry: "src/index.js",
    outDir: "dist/client",
    ssr: false,
  }),
  ...defineConfig({
    entry: "src/componentA.js",
    outDir: "dist/client",
    ssr: true,
    ssrEntryFileName: "componentA-ssr",
  }),
];

describe("infer components", () => {
  it("parses components from package.json", () => {
    mockFs.existsSync.mockReturnValue(true);
    const inferredComponents = inferComponents(packageJson);
    // use `JSON.stringify` to avoid comparing method references
    expect(JSON.stringify(inferredComponents)).toEqual(
      JSON.stringify(manualConfig),
    );
  });
  it("parses SSR components from package.json", () => {
    mockFs.existsSync.mockReturnValue(true);
    const inferredComponents = inferComponents(ssrPackageJson);
    // use `JSON.stringify` to avoid comparing method references
    expect(JSON.stringify(inferredComponents)).toEqual(
      JSON.stringify(manualSSRConfig),
    );
  });
  it("parses Svelte conditional exports from package.json", () => {
    mockFs.existsSync.mockReturnValue(true);
    const inferredComponents = inferComponents(svelteConditionPackageJson);
    // use `JSON.stringify` to avoid comparing method references
    expect(JSON.stringify(inferredComponents)).toEqual(
      JSON.stringify(manualSvelteConditionConfig),
    );
  });
  it("parses multiple components from package.json", () => {
    mockFs.existsSync.mockReturnValue(true);
    const inferredComponents = inferComponents(multipleComponentsPackageJson);
    // use `JSON.stringify` to avoid comparing method references
    expect(JSON.stringify(inferredComponents)).toEqual(
      JSON.stringify(manualMultipleComponentsConfig),
    );
  });
  it("generates the SSR entry filename from the declared ssr export", async () => {
    mockFs.existsSync.mockReturnValue(true);
    const inferredComponents = inferComponents(multipleComponentsPackageJson);
    const generated = await collectGeneratedSsrFiles(inferredComponents);
    // The `./componentA/ssr` export declares `./dist/server/componentA-ssr.js`,
    // so the generated renderer entry (and its types) must use that basename.
    expect(generated).toContain(
      path.resolve("dist/server", "componentA-ssr.js"),
    );
    expect(generated).toContain(
      path.resolve("dist/server", "componentA-ssr.d.ts"),
    );
    // and must NOT fall back to the hardcoded default that would collide.
    expect(generated).not.toContain(path.resolve("dist/server", "ssr.js"));
  });
  it("keeps the default 'ssr' entry filename for single components", async () => {
    mockFs.existsSync.mockReturnValue(true);
    const inferredComponents = inferComponents(ssrPackageJson);
    const generated = await collectGeneratedSsrFiles(inferredComponents);
    expect(generated).toContain(path.resolve("dist/server", "ssr.js"));
    expect(generated).toContain(path.resolve("dist/server", "ssr.d.ts"));
  });
  it("returns null if no exports are found", () => {
    const inferredComponents = inferComponents({ exports: {} });
    expect(inferredComponents).toStrictEqual([]);
  });
});
