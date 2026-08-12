import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

import type { UserConfig } from "tsdown";
import svelte from "rollup-plugin-svelte";

import { pluginGenerateSsrEntry } from "../rollup/pluginGenerateSsrEntry.js";
import { pluginOverrideSvelteSsrSlotImplementation } from "../rollup/pluginOverrideSvelteSsrSlotImplementation.js";
import { pluginStripCustomElementOptions } from "../rollup/pluginStripCustomElementOptions.js";
import { extractComponentTag } from "../shared/resolveComponentTag.js";
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

/**
 * Best-effort: reads the direct `.svelte` entry's declared custom element tag,
 * so the generated SSR
 * renderer can self-register with `ElementRendererRegistry` instead of
 * requiring the consuming app to do it by hand. Missing/unreadable files
 * (e.g. a synthetic path in a unit test, or a component with no declared
 * tag) simply fall back to no self-registration rather than failing the
 * build.
 */
const readEntryTagName = (entry: string): string | undefined => {
  try {
    if (!entry.endsWith(".svelte")) return undefined;
    return extractComponentTag(fs.readFileSync(entry, "utf8"));
  } catch {
    return undefined;
  }
};

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
  /** Server-only preparation module compiled alongside the component. */
  prepareEntry?: string;
  /** Import path from the generated renderer entry to the preparation module. */
  prepareImportPath?: string;
  svelteConfig?: SvelteBuildConfig | undefined;
}

const entryName = (entry: string) =>
  path.posix.basename(entry, path.posix.extname(entry));

const createSsrTsdownConfig = (
  options: SvebcomponentsSsrOptions,
): UserConfig => {
  const {
    entry,
    outDir,
    serverImportPath,
    clientImportPath,
    ssrEntryFileName,
    hydrationHostImportPath,
    prepareEntry,
    prepareImportPath,
    svelteConfig,
  } = options;
  const tagName = readEntryTagName(entry);
  return {
    entry: prepareEntry
      ? {
          [entryName(entry)]: entry,
          [entryName(prepareEntry)]: prepareEntry,
        }
      : entry,
    outDir,
    dts: !entry.endsWith(".svelte"),
    // Keep the public output paths stable as .js/.d.ts. tsdown 0.22 defaults
    // Node-platform builds to fixed .mjs/.d.mts extensions.
    fixedExtension: false,
    // Several component configs may share an output directory and are built
    // in parallel by the svebcomponents CLI; tsdown's per-build clean would
    // race and delete other builds' output. The CLI cleans once up front.
    clean: false,
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
        ...(prepareImportPath !== undefined ? { prepareImportPath } : {}),
        ...(tagName !== undefined ? { tagName } : {}),
      }),
    ],
  } satisfies UserConfig;
};

interface HydrationHostTsdownOptions {
  /**
   * Output directory — should match the component's SSR outDir so the
   * generated SSR entry can import the compiled host relatively.
   */
  outDir: string;
  /** Output basename (without extension), e.g. "ssr-hydration-host". */
  entryName: string;
  svelteConfig?: SvelteBuildConfig | undefined;
}

/**
 * Builds the server-compiled HydrationHost component into the component's
 * SSR output directory, so the generated SSR entry can render through it and
 * produce markup the client-side `hydratable` wrapper can hydrate. This is a
 * separate tsdown config because dts generation must be disabled for a
 * .svelte entry.
 */
export const createHydrationHostTsdownConfig = (
  options: HydrationHostTsdownOptions,
): UserConfig => {
  const { outDir, entryName, svelteConfig } = options;
  return {
    entry: { [entryName]: HYDRATION_HOST_SVELTE_PATH },
    outDir,
    dts: false,
    fixedExtension: false,
    // shared output directories are cleaned once by the svebcomponents CLI
    clean: false,
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
  } satisfies UserConfig;
};

export default createSsrTsdownConfig;
