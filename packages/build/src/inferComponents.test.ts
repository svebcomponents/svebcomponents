import { describe, expect, it, type MockedFunction, vi } from "vitest";
import type { Options } from "tsdown";
import { inferComponents } from "./inferComponents";
import { defineConfig } from "./index.js";
import fs from "node:fs";
import path from "node:path";
import fsPromises from "fs/promises";

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

/**
 * Extracts the ordered plugin names of a tsdown `Options` entry.
 * `JSON.stringify` drops the plugin objects (their hooks are functions), so
 * plugin pipelines have to be asserted explicitly via their names.
 */
const pluginNames = (options: Options): string[] => {
  const plugins = options.plugins;
  expect(Array.isArray(plugins)).toBe(true);
  return (plugins as { name: string }[]).map((plugin) => plugin.name);
};

const clientPipeline = ["svebcomponents:auto-options", "svelte"];
const ssrPipeline = [
  "svebcomponents:override-svelte-ssr-slot-implementation",
  "svelte",
  "svebcomponents:generate-ssr-entry",
];
// the server-compiled HydrationHost build accompanying each SSR config
const hydrationHostPipeline = ["svelte"];

/**
 * Asserts that `inferred` matches `expected` both in its serializable fields
 * (via JSON, which silently drops functions like plugin hooks) and in its
 * plugin pipelines (via plugin names, which the JSON comparison cannot see).
 */
const expectConfigsToMatch = (
  inferred: Options[],
  expected: Options[],
  expectedPipelines: string[][],
) => {
  // use `JSON.stringify` to compare the plain fields without comparing
  // method references
  expect(JSON.stringify(inferred)).toEqual(JSON.stringify(expected));
  // additionally assert each config's plugin pipeline explicitly
  expect(inferred).toHaveLength(expectedPipelines.length);
  for (const [index, pipeline] of expectedPipelines.entries()) {
    expect(pluginNames(inferred[index]!)).toEqual(pipeline);
    expect(pluginNames(expected[index]!)).toEqual(pipeline);
  }
};

describe("infer components", () => {
  it("parses components from package.json", () => {
    mockFs.existsSync.mockReturnValue(true);
    const inferredComponents = inferComponents(packageJson);
    expectConfigsToMatch(inferredComponents, manualConfig, [clientPipeline]);
  });
  it("parses SSR components from package.json", () => {
    mockFs.existsSync.mockReturnValue(true);
    const inferredComponents = inferComponents(ssrPackageJson);
    expectConfigsToMatch(inferredComponents, manualSSRConfig, [
      clientPipeline,
      ssrPipeline,
      hydrationHostPipeline,
    ]);
  });
  it("parses Svelte conditional exports from package.json", () => {
    mockFs.existsSync.mockReturnValue(true);
    const inferredComponents = inferComponents(svelteConditionPackageJson);
    expectConfigsToMatch(inferredComponents, manualSvelteConditionConfig, [
      clientPipeline,
      clientPipeline,
      ssrPipeline,
      hydrationHostPipeline,
      ssrPipeline,
      hydrationHostPipeline,
    ]);
  });
  it("parses multiple components from package.json", () => {
    mockFs.existsSync.mockReturnValue(true);
    const inferredComponents = inferComponents(multipleComponentsPackageJson);
    expectConfigsToMatch(inferredComponents, manualMultipleComponentsConfig, [
      clientPipeline,
      clientPipeline,
      ssrPipeline,
      hydrationHostPipeline,
    ]);
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
  it("emits posix (forward slash) paths for outDir and entry", () => {
    // `exports` paths are always posix and the inferred values flow into
    // generated import specifiers, so they must never contain backslashes,
    // even when this code runs on Windows (guards against a regression where
    // `path.normalize` re-introduces platform-native separators).
    mockFs.existsSync.mockReturnValue(true);
    const inferredComponents = inferComponents(svelteConditionPackageJson);
    // stringify the whole config graph so every path-bearing field is checked
    const serialized = JSON.stringify(inferredComponents);
    expect(serialized).not.toContain("\\");
    expect(serialized).toContain("dist/client");
    expect(serialized).toContain("dist/server");
    expect(serialized).toContain("dist/client-svelte");
    expect(serialized).toContain("dist/server-svelte");
  });
});
