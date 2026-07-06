import type { Options } from "tsdown";
import svelte from "rollup-plugin-svelte";

import { pluginGenerateSsrEntry } from "../rollup/pluginGenerateSsrEntry.js";
import { pluginOverrideSvelteSsrSlotImplementation } from "../rollup/pluginOverrideSvelteSsrSlotImplementation.js";
import {
  mergeCompilerOptions,
  type SvelteBuildConfig,
} from "./svelteConfig.js";

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
  svelteConfig?: SvelteBuildConfig | undefined;
}

const createSsrTsdownConfig = ({
  entry,
  outDir,
  externalSvelte = false,
  serverImportPath,
  clientImportPath,
  ssrEntryFileName,
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
      }),
    ],
  }) satisfies Options;

export default createSsrTsdownConfig;
