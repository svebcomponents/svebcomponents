import svebcomponentsSsr from "@svebcomponents/ssr/tsdown";

import { createTsdownConfig } from "./svebcomponentConfig.js";
import { Options } from "tsdown";
import path from "node:path";

export interface DefineConfigOptions {
  /**
   * The entrypoint for the svelte component that is being transformed.
   */
  entry?: string;
  /**
   * Whether to generate an SSR entry file for the web component.
   */
  ssr?: boolean;
  /**
   * The output directory for the build files.
   */
  outDir?: string;
  /**
   * The output directory for the Svelte-aware browser custom element build.
   */
  svelteOutDir?: string;
  /**
   * The output directory for the SSR build files.
   */
  ssrOutDir?: string;
  /**
   * The output directory for the Svelte-aware SSR build files.
   */
  ssrSvelteOutDir?: string;
}

const toImportPath = (fromDirectory: string, toFile: string) => {
  const relative = path.posix.relative(
    path.posix.normalize(fromDirectory),
    path.posix.normalize(toFile),
  );
  return relative.startsWith(".") ? relative : `./${relative}`;
};

const entryOutputFile = (outDir: string, entry: string) =>
  path.posix.join(
    path.posix.normalize(outDir),
    `${path.posix.basename(entry, path.posix.extname(entry))}.js`,
  );

export const defineConfig = (options: DefineConfigOptions = {}) => {
  const { ssr = true, entry = "src/index.ts" } = options;
  const outDir = options.outDir ?? "dist/client";
  const svelteOutDir = options.svelteOutDir;
  const ssrOutDir = options.ssrOutDir ?? "dist/server";
  const ssrSvelteOutDir = options.ssrSvelteOutDir;

  const tsdownOptions: Options[] = [
    createTsdownConfig({
      entry,
      outDir,
    }),
  ];

  if (svelteOutDir) {
    tsdownOptions.push(
      createTsdownConfig({
        entry,
        outDir: svelteOutDir,
        externalSvelte: true,
      }),
    );
  }

  if (ssr) {
    tsdownOptions.push(
      svebcomponentsSsr({
        entry,
        outDir: ssrOutDir,
        serverImportPath: `./${path.posix.basename(entryOutputFile(ssrOutDir, entry))}`,
        clientImportPath: toImportPath(
          ssrOutDir,
          entryOutputFile(outDir, entry),
        ),
      }),
    );

    if (ssrSvelteOutDir) {
      tsdownOptions.push(
        svebcomponentsSsr({
          entry,
          outDir: ssrSvelteOutDir,
          externalSvelte: true,
          serverImportPath: `./${path.posix.basename(
            entryOutputFile(ssrSvelteOutDir, entry),
          )}`,
          clientImportPath: toImportPath(
            ssrSvelteOutDir,
            entryOutputFile(svelteOutDir ?? outDir, entry),
          ),
        }),
      );
    }
  }

  return tsdownOptions;
};
