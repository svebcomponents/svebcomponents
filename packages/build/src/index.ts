import svebcomponentsSsr, {
  createHydrationHostTsdownConfig,
} from "@svebcomponents/ssr/tsdown";

import { createTsdownConfig } from "./svebcomponentConfig.js";
import { Options } from "tsdown";
import path from "node:path";
import type { SvelteBuildConfig } from "@svebcomponents/ssr/svelte-config";

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
   * Whether the compiled custom element hydrates server-rendered declarative
   * shadow DOM instead of wiping and re-rendering it. Requires `ssr` (the
   * hydration-aware SSR entry and the client wrapper are two halves of the
   * same feature). Defaults to true.
   */
  hydratable?: boolean;
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
  /**
   * The basename (without extension) of the generated SSR renderer entry file.
   * Defaults to "ssr", producing `<ssrOutDir>/ssr.js`. When several SSR
   * components share an SSR output directory this must be unique per component
   * (e.g. "button-ssr") so the generated entries do not overwrite each other.
   */
  ssrEntryFileName?: string;
  svelteConfig?: SvelteBuildConfig | undefined;
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
  const { ssr = true, entry = "src/index.ts", svelteConfig } = options;
  const outDir = options.outDir ?? "dist/client";
  const svelteOutDir = options.svelteOutDir;
  const ssrOutDir = options.ssrOutDir ?? "dist/server";
  const ssrSvelteOutDir = options.ssrSvelteOutDir;
  const ssrEntryFileName = options.ssrEntryFileName ?? "ssr";
  // hydration only makes sense when there is server-rendered output to hydrate
  const hydratable = ssr && (options.hydratable ?? true);
  const hydrationHostEntryName = `${ssrEntryFileName}-hydration-host`;

  const tsdownOptions: Options[] = [
    createTsdownConfig({
      entry,
      outDir,
      hydratable,
      svelteConfig,
    }),
  ];

  if (svelteOutDir) {
    tsdownOptions.push(
      createTsdownConfig({
        entry,
        outDir: svelteOutDir,
        externalSvelte: true,
        hydratable,
        svelteConfig,
      }),
    );
  }

  if (ssr) {
    tsdownOptions.push(
      svebcomponentsSsr({
        entry,
        outDir: ssrOutDir,
        ssrEntryFileName,
        svelteConfig,
        serverImportPath: `./${path.posix.basename(entryOutputFile(ssrOutDir, entry))}`,
        clientImportPath: toImportPath(
          ssrOutDir,
          entryOutputFile(outDir, entry),
        ),
        ...(hydratable
          ? { hydrationHostImportPath: `./${hydrationHostEntryName}.js` }
          : {}),
      }),
    );

    if (hydratable) {
      tsdownOptions.push(
        createHydrationHostTsdownConfig({
          outDir: ssrOutDir,
          entryName: hydrationHostEntryName,
          svelteConfig,
        }),
      );
    }

    if (ssrSvelteOutDir) {
      tsdownOptions.push(
        svebcomponentsSsr({
          entry,
          outDir: ssrSvelteOutDir,
          externalSvelte: true,
          ssrEntryFileName,
          svelteConfig,
          serverImportPath: `./${path.posix.basename(
            entryOutputFile(ssrSvelteOutDir, entry),
          )}`,
          clientImportPath: toImportPath(
            ssrSvelteOutDir,
            entryOutputFile(svelteOutDir ?? outDir, entry),
          ),
          ...(hydratable
            ? { hydrationHostImportPath: `./${hydrationHostEntryName}.js` }
            : {}),
        }),
      );

      if (hydratable) {
        tsdownOptions.push(
          createHydrationHostTsdownConfig({
            outDir: ssrSvelteOutDir,
            entryName: hydrationHostEntryName,
            externalSvelte: true,
            svelteConfig,
          }),
        );
      }
    }
  }

  return tsdownOptions;
};
