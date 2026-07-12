import { fileURLToPath } from "node:url";

import type { Options } from "tsdown";
import svelte from "rollup-plugin-svelte";

import { pluginGenerateSsrEntry } from "../rollup/pluginGenerateSsrEntry.js";
import { pluginOverrideSvelteSsrSlotImplementation } from "../rollup/pluginOverrideSvelteSsrSlotImplementation.js";
import { pluginStripCustomElementOptions } from "../rollup/pluginStripCustomElementOptions.js";
import {
  mergeCompilerOptions,
  type SvelteBuildConfig,
} from "./svelteConfig.js";

/**
 * Resolved relative to this module so it works from the built package
 * (dist/tsdown/ → dist/hydration/) without export-map resolution, which node
 * couldn't apply to a .svelte file anyway.
 */
const HYDRATION_HOST_SVELTE_PATH = fileURLToPath(
  new URL("../hydration/HydrationHost.svelte", import.meta.url),
);

interface SvebcomponentsSsrOptions {
  /**
   * The entrypoint for the svelte component that is being transformed.
   */
  entry: string;
  /**
   * The file rollup should write the output to.
   */
  outDir: string;
  /**
   * Whether Svelte runtime imports should be left for Svelte-aware tooling to resolve.
   */
  externalSvelte?: boolean;
  /**
   * Import path from the generated SSR renderer entrypoint to the server component module.
   */
  serverImportPath?: string;
  /**
   * Import path from the generated SSR renderer entrypoint to the client component module.
   */
  clientImportPath?: string;
  /**
   * The basename (without extension) of the generated SSR renderer entry file.
   * Defaults to "ssr". Must be unique per component when several SSR components
   * share an output directory (e.g. "button-ssr").
   */
  ssrEntryFileName?: string;
  /**
   * Import path (relative to the generated SSR entry) of the server-compiled
   * HydrationHost, built via `createHydrationHostTsdownConfig`. When set, the
   * generated renderer renders through it so its markup can be hydrated by
   * the client-side `hydratable` wrapper.
   */
  hydrationHostImportPath?: string;
  svelteConfig?: SvelteBuildConfig | undefined;
}

const createSsrTsdownConfig = ({
  entry,
  outDir,
  externalSvelte = false,
  serverImportPath,
  clientImportPath,
  ssrEntryFileName,
  hydrationHostImportPath,
  svelteConfig,
}: SvebcomponentsSsrOptions) =>
  ({
    entry,
    outDir,
    dts: true,
    // Several component configs may share an output directory and are built
    // in parallel by the svebcomponents CLI; tsdown's per-build clean would
    // race and delete other builds' output. The CLI cleans once up front.
    clean: false,
    ...(externalSvelte ? { external: [/^svelte(\/.*)?$/] } : {}),
    plugins: [
      pluginStripCustomElementOptions(),
      pluginOverrideSvelteSsrSlotImplementation(),
      svelte({
        emitCss: false,
        ...(svelteConfig?.extensions
          ? { extensions: svelteConfig.extensions }
          : {}),
        ...(svelteConfig?.preprocess
          ? { preprocess: svelteConfig.preprocess }
          : {}),
        compilerOptions: mergeCompilerOptions(svelteConfig?.compilerOptions, {
          customElement: false,
          generate: "server",
          css: "injected",
        }),
      }),
      pluginGenerateSsrEntry({
        ...(serverImportPath !== undefined ? { serverImportPath } : {}),
        ...(clientImportPath !== undefined ? { clientImportPath } : {}),
        ...(ssrEntryFileName !== undefined
          ? { entryFileName: ssrEntryFileName }
          : {}),
        ...(hydrationHostImportPath !== undefined
          ? { hydrationHostImportPath }
          : {}),
      }),
    ],
  }) satisfies Options;

interface HydrationHostTsdownOptions {
  /**
   * Output directory — should match the component's SSR outDir so the
   * generated SSR entry can import the compiled host relatively.
   */
  outDir: string;
  /** Output basename (without extension), e.g. "ssr-hydration-host". */
  entryName: string;
  /**
   * Whether Svelte runtime imports should be left for Svelte-aware tooling to resolve.
   */
  externalSvelte?: boolean;
  svelteConfig?: SvelteBuildConfig | undefined;
}

/**
 * Builds the server-compiled HydrationHost component into the component's
 * SSR output directory, so the generated SSR entry can render through it and
 * produce markup the client-side `hydratable` wrapper can hydrate. This is a
 * separate tsdown config because dts generation must be disabled for a
 * .svelte entry.
 */
export const createHydrationHostTsdownConfig = ({
  outDir,
  entryName,
  externalSvelte = false,
  svelteConfig,
}: HydrationHostTsdownOptions) =>
  ({
    entry: { [entryName]: HYDRATION_HOST_SVELTE_PATH },
    outDir,
    dts: false,
    // shared output directories are cleaned once by the svebcomponents CLI
    clean: false,
    ...(externalSvelte ? { external: [/^svelte(\/.*)?$/] } : {}),
    plugins: [
      svelte({
        emitCss: false,
        ...(svelteConfig?.extensions
          ? { extensions: svelteConfig.extensions }
          : {}),
        ...(svelteConfig?.preprocess
          ? { preprocess: svelteConfig.preprocess }
          : {}),
        compilerOptions: mergeCompilerOptions(svelteConfig?.compilerOptions, {
          customElement: false,
          generate: "server",
          css: "injected",
        }),
      }),
    ],
  }) satisfies Options;

export default createSsrTsdownConfig;
