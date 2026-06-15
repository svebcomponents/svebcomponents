import { describe, expect, it, type MockedFunction, vi } from "vitest";
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
  it("returns null if no exports are found", () => {
    const inferredComponents = inferComponents({ exports: {} });
    expect(inferredComponents).toStrictEqual([]);
  });
});
