import { describe, expect, it, type MockedFunction, vi } from "vitest";
import type { UserConfig } from "tsdown";
import { inferComponents } from "./inferComponents";
import { defineConfig } from "./index.js";
import fs from "node:fs";
import path from "node:path";
import fsPromises from "fs/promises";
import { createModuleConfig } from "./moduleConfig.js";

vi.mock("node:fs");
const mockFs = fs as unknown as {
  existsSync: MockedFunction<typeof fs.existsSync>;
};

const mockComponentEntriesOnly = () => {
  mockFs.existsSync.mockImplementation((candidate) =>
    String(candidate).endsWith(".svelte"),
  );
};

const mockSources = (...sources: string[]) => {
  const available = new Set(sources);
  mockFs.existsSync.mockImplementation((candidate) =>
    available.has(String(candidate)),
  );
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
  configs: UserConfig[],
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

const alternateRuntimeTargetPackageJson = {
  exports: {
    ".": {
      types: "./dist/client/index.d.ts",
      alternate: "./dist/alternate/index.js",
      default: "./dist/client/index.js",
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

const mixedPackageJson = {
  exports: {
    ".": { import: "./dist/client/index.js" },
    "./helpers": {
      types: "./dist/client/helpers.d.ts",
      default: "./dist/client/helpers.js",
    },
  },
};

const typeOnlySvelteSubpathPackageJson = {
  exports: {
    ".": {
      types: "./dist/client/index.d.ts",
      default: "./dist/client/index.js",
    },
    "./svelte": {
      types: "./dist/svelte-types/index.d.ts",
    },
  },
};

const manualConfig = defineConfig({
  entry: "src/index.svelte",
  outDir: "dist/client",
  ssr: false,
});

const manualSSRConfig = defineConfig({
  entry: "src/index.svelte",
  outDir: "dist/client",
  ssr: true,
});

const manualMultipleComponentsConfig = [
  ...defineConfig({
    entry: "src/index.svelte",
    outDir: "dist/client",
    ssr: false,
  }),
  ...defineConfig({
    entry: "src/componentA.svelte",
    outDir: "dist/client",
    ssr: true,
    ssrEntryFileName: "componentA-ssr",
  }),
];

/**
 * Extracts the ordered plugin names of a tsdown `UserConfig` entry.
 * `JSON.stringify` drops the plugin objects (their hooks are functions), so
 * plugin pipelines have to be asserted explicitly via their names.
 */
const expectSameModuleConfig = (
  actual: UserConfig | undefined,
  expected: UserConfig,
) => {
  // `deps.alwaysBundle` is a freshly built closure on both sides, so compare
  // the serializable shape (JSON drops functions) and the rule's behaviour.
  expect(JSON.stringify(actual)).toEqual(JSON.stringify(expected));
  const rule = (actual?.deps as { alwaysBundle?: unknown } | undefined)
    ?.alwaysBundle as ((id: string) => boolean) | undefined;
  expect(typeof rule).toBe("function");
  expect(rule!("some-package")).toBe(true);
  expect(rule!("node:fs")).toBe(false);
};

const pluginNames = (options: UserConfig): string[] => {
  const plugins = options.plugins;
  expect(Array.isArray(plugins)).toBe(true);
  return (plugins as { name: string }[]).map((plugin) => plugin.name);
};

const clientPipeline = [
  "svebcomponents:dedupe",
  "svebcomponents:auto-options",
  "svelte",
  "svebcomponents:guard-custom-element-define",
];
const ssrPipeline = [
  "svebcomponents:strip-custom-element-options",
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
  inferred: UserConfig[],
  expected: UserConfig[],
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
    mockComponentEntriesOnly();
    const inferredComponents = inferComponents(packageJson);
    expectConfigsToMatch(inferredComponents, manualConfig, [clientPipeline]);
  });
  it("parses SSR components from package.json", () => {
    mockComponentEntriesOnly();
    const inferredComponents = inferComponents(ssrPackageJson);
    expectConfigsToMatch(inferredComponents, manualSSRConfig, [
      clientPipeline,
      ssrPipeline,
      hydrationHostPipeline,
    ]);
  });
  it("rejects alternate runtime build targets", () => {
    mockComponentEntriesOnly();
    expect(() => inferComponents(alternateRuntimeTargetPackageJson)).toThrow(
      /export "\." declares the unsupported runtime condition "alternate"/,
    );
  });
  it("keeps the type-only ./svelte subpath out of the build graph", () => {
    mockComponentEntriesOnly();
    const inferredComponents = inferComponents(
      typeOnlySvelteSubpathPackageJson,
    );
    expectConfigsToMatch(inferredComponents, manualConfig, [clientPipeline]);
  });
  it("parses multiple components from package.json", () => {
    mockComponentEntriesOnly();
    const inferredComponents = inferComponents(multipleComponentsPackageJson);
    expectConfigsToMatch(inferredComponents, manualMultipleComponentsConfig, [
      clientPipeline,
      clientPipeline,
      ssrPipeline,
      hydrationHostPipeline,
    ]);
  });
  it("builds non-component exports with the ordinary module pipeline", () => {
    mockSources("./src/index.svelte", "./src/helpers.ts");
    const inferred = inferComponents(mixedPackageJson);
    expect(inferred).toHaveLength(2);
    expect(pluginNames(inferred[0]!)).toEqual(clientPipeline);
    expectSameModuleConfig(
      inferred[1],
      createModuleConfig({
        entry: "src/helpers.ts",
        outDir: "dist/client",
      }),
    );
    expect(inferred[1]?.plugins).toBeUndefined();
  });
  it("classifies a same-basename JavaScript source as an ordinary module", () => {
    mockSources("./src/index.js");
    const [config] = inferComponents(packageJson);
    expectSameModuleConfig(
      config,
      createModuleConfig({ entry: "src/index.js", outDir: "dist/client" }),
    );
    expect(config?.dts).toBe(false);
  });
  it("rejects ambiguous same-basename sources", () => {
    mockSources("./src/index.svelte", "./src/index.ts");
    expect(() => inferComponents(packageJson)).toThrow(
      /multiple sources match.*index\.svelte.*index\.ts/,
    );
  });
  it("reports every expected source when no source exists", () => {
    mockSources();
    expect(() => inferComponents(packageJson)).toThrow(
      /index\.svelte.*index\.ts.*index\.js/,
    );
  });
  it("does not treat a paired SSR export as component configuration for an ordinary module", () => {
    mockSources("./src/index.ts");
    const inferred = inferComponents(ssrPackageJson);
    expect(inferred).toHaveLength(1);
    expectSameModuleConfig(
      inferred[0],
      createModuleConfig({ entry: "src/index.ts", outDir: "dist/client" }),
    );
  });
  it("generates the SSR entry filename from the declared ssr export", async () => {
    mockComponentEntriesOnly();
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
    mockComponentEntriesOnly();
    const inferredComponents = inferComponents(ssrPackageJson);
    const generated = await collectGeneratedSsrFiles(inferredComponents);
    expect(generated).toContain(path.resolve("dist/server", "ssr.js"));
    expect(generated).toContain(path.resolve("dist/server", "ssr.d.ts"));
  });
  it("returns null if no exports are found", () => {
    const inferredComponents = inferComponents({ exports: {} });
    expect(inferredComponents).toStrictEqual([]);
  });
  it("reads svebcomponents.neverBundle from package.json into the browser builds", () => {
    mockComponentEntriesOnly();
    const inferred = inferComponents({
      ...ssrPackageJson,
      svebcomponents: { neverBundle: ["host-provided"] },
    });

    const browserBuilds = inferred.filter((config) =>
      String(config.outDir).startsWith("dist/client"),
    );
    expect(browserBuilds.length).toBeGreaterThan(0);
    for (const build of browserBuilds) {
      const rule = (build.deps as { alwaysBundle?: unknown } | undefined)
        ?.alwaysBundle as (id: string) => boolean;
      expect(rule("host-provided")).toBe(false);
      expect(rule("everything-else")).toBe(true);
    }
  });

  it("warns about and ignores a malformed svebcomponents.neverBundle", () => {
    mockComponentEntriesOnly();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    for (const svebcomponents of [
      null,
      "host-provided",
      { neverBundle: "host-provided" },
      { neverBundle: [1, "host-provided"] },
    ]) {
      const inferred = inferComponents({
        ...packageJson,
        svebcomponents,
      });
      const client = inferred.find((config) => config.outDir === "dist/client");
      const rule = (client?.deps as { alwaysBundle?: unknown } | undefined)
        ?.alwaysBundle as (id: string) => boolean;
      // only the well-formed string entry is honoured; the rest are ignored
      const optedOut = Array.isArray(
        (svebcomponents as { neverBundle?: unknown })?.neverBundle,
      );
      expect(rule("host-provided")).toBe(!optedOut);
    }
    expect(warn).toHaveBeenCalledTimes(4);
    for (const [message] of warn.mock.calls) {
      expect(message).toContain("[svebcomponents]:");
      expect(message).toContain("ignoring");
    }
    warn.mockRestore();
  });

  it("emits posix (forward slash) paths for outDir and entry", () => {
    // `exports` paths are always posix and the inferred values flow into
    // generated import specifiers, so they must never contain backslashes,
    // even when this code runs on Windows (guards against a regression where
    // `path.normalize` re-introduces platform-native separators).
    mockComponentEntriesOnly();
    const inferredComponents = inferComponents(ssrPackageJson);
    // stringify the whole config graph so every path-bearing field is checked
    const serialized = JSON.stringify(inferredComponents);
    expect(serialized).not.toContain("\\");
    expect(serialized).toContain("dist/client");
    expect(serialized).toContain("dist/server");
  });
});
