import { describe, expect, it, type MockedFunction, vi } from "vitest";
import type { Options } from "tsdown";
import { inferComponents } from "./inferComponents";
import { defineConfig } from "./index.js";
import fs from "node:fs";

vi.mock("node:fs");
const mockFs = fs as unknown as {
  existsSync: MockedFunction<typeof fs.existsSync>;
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
    ]);
  });
  it("parses Svelte conditional exports from package.json", () => {
    mockFs.existsSync.mockReturnValue(true);
    const inferredComponents = inferComponents(svelteConditionPackageJson);
    expectConfigsToMatch(inferredComponents, manualSvelteConditionConfig, [
      clientPipeline,
      clientPipeline,
      ssrPipeline,
      ssrPipeline,
    ]);
  });
  it("parses multiple components from package.json", () => {
    mockFs.existsSync.mockReturnValue(true);
    const inferredComponents = inferComponents(multipleComponentsPackageJson);
    expectConfigsToMatch(inferredComponents, manualMultipleComponentsConfig, [
      clientPipeline,
      clientPipeline,
      ssrPipeline,
    ]);
  });
  it("returns null if no exports are found", () => {
    const inferredComponents = inferComponents({ exports: {} });
    expect(inferredComponents).toStrictEqual([]);
  });
});
