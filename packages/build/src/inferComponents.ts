import path from "node:path";
import { defineConfig, DefineConfigOptions } from "./index.js";
import { existsSync } from "node:fs";
import { type Options } from "tsdown";
import type { SvelteBuildConfig } from "./svelteConfig.js";

type ExportValue = {
  types?: string;
  svelte?: string;
  import?: string;
  default?: string;
};

const resolveSvebcomponentEntryPoint = (
  entryPath: string,
  type: "client" | "server",
) => {
  // `entryPath` originates from package.json `exports`, which are always posix
  // ("./dist/client/index.js"). We therefore treat every path here as posix.
  // The `existsSync` filesystem checks are safe with posix separators because
  // Node's fs APIs accept forward slashes on Windows as well.
  const entry = entryPath.replace(`dist/${type}`, "src");
  if (existsSync(entry)) {
    return entry;
  }
  const tsEntry = entry.replace(path.posix.extname(entry), ".ts");
  if (!existsSync(tsEntry)) {
    throw new Error(
      `[svebcomponents]: could not find entry file for component at ${entry} or ${tsEntry}. Please ensure that the entry file exists.`,
    );
  }
  return tsEntry;
};

export const inferComponents = (
  packageJson: unknown,
  svelteConfig?: SvelteBuildConfig,
): Options[] => {
  if (
    !(
      typeof packageJson === "object" &&
      packageJson !== null &&
      "exports" in packageJson &&
      typeof packageJson.exports === "object" &&
      packageJson.exports !== null
    )
  ) {
    return [];
  }
  const exports = packageJson.exports as Record<string, ExportValue>;
  const components: (DefineConfigOptions | undefined)[] = Object.entries(
    packageJson.exports,
  ).map(([key, value]) => {
    const esmPath = value["default"] ?? value["import"];
    // we skip all entries that do not point to dist/client
    if (typeof esmPath !== "string" || !esmPath.includes("dist/client")) {
      return undefined;
    }
    // All values below are derived from posix `exports` paths and flow into
    // generated import specifiers, so we must keep them posix (forward slashes)
    // on every platform, including Windows.
    const outDir = path.posix.normalize(path.posix.dirname(esmPath));
    const entry = path.posix.normalize(
      resolveSvebcomponentEntryPoint(esmPath, "client"),
    );
    const config: DefineConfigOptions = {
      entry,
      outDir,
      svelteConfig,
    };
    const sveltePath = value["svelte"];
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
    return config;
  });
  // and call defineConfig with each of them
  return components.filter((el) => el !== undefined).flatMap(defineConfig);
};
