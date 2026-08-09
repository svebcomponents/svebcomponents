import path from "node:path";
import { defineConfig, DefineConfigOptions } from "./index.js";
import { existsSync } from "node:fs";
import { type UserConfig } from "tsdown";
import type { SvelteBuildConfig } from "@svebcomponents/ssr/svelte-config";
import { createModuleConfig } from "./moduleConfig.js";

type ExportValue = {
  types?: string;
  svelte?: string;
  import?: string;
  default?: string;
};

type SourceEntry = {
  entry: string;
  kind: "component" | "module";
};

const resolveSourceEntry = (entryPath: string): SourceEntry => {
  // `entryPath` originates from package.json `exports`, which are always posix
  // ("./dist/client/index.js"). We therefore treat every path here as posix.
  // The `existsSync` filesystem checks are safe with posix separators because
  // Node's fs APIs accept forward slashes on Windows as well.
  const outputExtension = path.posix.extname(entryPath);
  const mappedPath = entryPath.replace("dist/client", "src");
  // An export may legally point at an extensionless file. `slice(0, -0)` would
  // return the empty string rather than the whole path, so guard it — otherwise
  // every candidate below collapses to a bare extension ("./.svelte").
  const sourceBase = outputExtension
    ? mappedPath.slice(0, -outputExtension.length)
    : mappedPath;
  const candidates = [
    { entry: `${sourceBase}.svelte`, kind: "component" as const },
    { entry: `${sourceBase}.ts`, kind: "module" as const },
    { entry: `${sourceBase}.js`, kind: "module" as const },
  ].filter(({ entry }) => existsSync(entry));

  if (candidates.length === 0) {
    throw new Error(
      `[svebcomponents]: could not find a source for ${entryPath}. Expected exactly one of ${sourceBase}.svelte, ${sourceBase}.ts, or ${sourceBase}.js.`,
    );
  }
  if (candidates.length > 1) {
    throw new Error(
      `[svebcomponents]: multiple sources match ${entryPath}: ${candidates.map(({ entry }) => entry).join(", ")}. Keep exactly one matching source or use an explicit svebcomponents config.`,
    );
  }
  return candidates[0]!;
};

export const inferComponents = (
  packageJson: unknown,
  svelteConfig?: SvelteBuildConfig,
): UserConfig[] => {
  if (!(
    typeof packageJson === "object" &&
    packageJson !== null &&
    "exports" in packageJson &&
    typeof packageJson.exports === "object" &&
    packageJson.exports !== null
  )) {
    return [];
  }
  const exports = packageJson.exports as Record<string, ExportValue>;
  return Object.entries(packageJson.exports).flatMap(([key, value]) => {
    if (typeof value !== "object" || value === null) return [];
    const esmPath = value["default"] ?? value["import"];
    // we skip all entries that do not point to dist/client
    if (typeof esmPath !== "string" || !esmPath.startsWith("./dist/client/")) {
      return [];
    }
    // All values below are derived from posix `exports` paths and flow into
    // generated import specifiers, so we must keep them posix (forward slashes)
    // on every platform, including Windows.
    const outDir = path.posix.normalize(path.posix.dirname(esmPath));
    const source = resolveSourceEntry(esmPath);
    const entry = path.posix.normalize(source.entry);
    const sveltePath = value["svelte"];

    if (source.kind === "module") {
      return [
        createModuleConfig({ entry, outDir }),
        ...(typeof sveltePath === "string"
          ? [
              createModuleConfig({
                entry,
                outDir: path.posix.normalize(path.posix.dirname(sveltePath)),
                externalSvelte: true,
              }),
            ]
          : []),
      ];
    }

    const config: DefineConfigOptions = {
      entry,
      outDir,
      svelteConfig,
    };
    if (typeof sveltePath === "string") {
      config.svelteOutDir = path.posix.normalize(
        path.posix.dirname(sveltePath),
      );
    }
    const ssrExportDeclaration = `${key}/ssr`;
    const ssr = ssrExportDeclaration in exports;
    config.ssr = ssr;
    if (ssr) {
      const ssrExport = exports[ssrExportDeclaration];
      const ssrPath = ssrExport?.["default"] ?? ssrExport?.["import"];
      if (typeof ssrPath !== "string") {
        throw new Error(
          "[svebcomponents]: could not find expected ESM ssr export.",
        );
      }
      const ssrOutDir = path.posix.dirname(ssrPath);
      config.ssrOutDir = path.posix.normalize(ssrOutDir);
      // The declared ssr export (e.g. "./dist/server/button-ssr.js") dictates the
      // basename of the generated renderer entry file ("button-ssr"). Threading it
      // through keeps the generated file matching the exported path and avoids
      // collisions when several SSR components share one ssrOutDir.
      config.ssrEntryFileName = path.posix.basename(
        ssrPath,
        path.posix.extname(ssrPath),
      );

      const ssrSveltePath = ssrExport?.["svelte"];
      if (typeof ssrSveltePath === "string") {
        config.ssrSvelteOutDir = path.posix.normalize(
          path.posix.dirname(ssrSveltePath),
        );
      }
    }
    return defineConfig(config);
  });
};
