import path from "node:path";
import { defineConfig, DefineConfigOptions } from "./index.js";
import type { BuildOptions } from "rolldown";
import { existsSync } from "node:fs";

const resolveSvebcomponentEntryPoint = (
  entryPath: string,
  type: "client" | "server",
) => {
  const entry = entryPath.replace(`dist/${type}`, "src");
  if (existsSync(entry)) {
    return entry;
  }
  const tsEntry = entry.replace(path.extname(entry), ".ts");
  if (!existsSync(tsEntry)) {
    throw new Error(
      `[svebcomponents]: could not find entry file for component at ${entry} or ${tsEntry}. Please ensure that the entry file exists.`,
    );
  }
  return tsEntry;
};

export const inferComponents = (packageJson: unknown): BuildOptions[] | [] => {
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
  const exports = packageJson.exports as Record<
    string,
    Record<"import", string>
  >;
  const components: (DefineConfigOptions | undefined)[] = Object.entries(
    packageJson.exports,
  ).map(([key, value]) => {
    const esmPath = value["import"];
    // we skip all entries that do not point to dist/client
    if (typeof esmPath !== "string" || !esmPath.includes("dist/client")) {
      return undefined;
    }
    const outDir = path.normalize(path.dirname(esmPath));
    const entry = path.normalize(
      resolveSvebcomponentEntryPoint(esmPath, "client"),
    );
    const config: DefineConfigOptions = {
      entry,
      outDir,
    };
    const ssrExportDeclaration = `${key}/ssr`;
    const ssr = ssrExportDeclaration in exports;
    config.ssr = ssr;
    if (ssr) {
      const ssrPath = exports[ssrExportDeclaration]?.["import"];
      if (typeof ssrPath !== "string") {
        throw new Error(
          "[svebcomponents]: could not find expected ESM ssr export.",
        );
      }
      const ssrOutDir = path.dirname(ssrPath);
      config.ssrOutDir = path.normalize(ssrOutDir);
    }
    return config;
  });
  // and call defineConfig with each of them
  return components.filter((el) => el !== undefined).flatMap(defineConfig);
};
