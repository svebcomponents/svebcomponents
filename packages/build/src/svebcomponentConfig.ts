import svelte from "rollup-plugin-svelte";
import autoOptions from "@svebcomponents/auto-options";
import { Options } from "tsdown";
import {
  mergeCompilerOptions,
  type SvelteBuildConfig,
} from "@svebcomponents/ssr/svelte-config";

interface SvebcomponentsOptions {
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
   * Whether to make the compiled custom element hydrate server-rendered
   * declarative shadow DOM (injects `extend: hydratable` via auto-options).
   */
  hydratable?: boolean;
  svelteConfig?: SvelteBuildConfig | undefined;
}

export const createTsdownConfig = (options: SvebcomponentsOptions) => {
  const {
    entry,
    outDir,
    externalSvelte = false,
    hydratable = false,
    svelteConfig,
  } = options;
  return {
    entry,
    outDir,
    dts: true,
    // this is a browser bundle: resolve browser export conditions (svelte's
    // root export otherwise resolves to its server entry, whose `hydrate`
    // and `mount` are unavailable-on-the-server stubs)
    platform: "browser",
    // Several component configs may share an output directory and are built
    // in parallel by the svebcomponents CLI; tsdown's per-build clean would
    // race and delete other builds' output. The CLI cleans once up front.
    clean: false,
    ...(externalSvelte ? { external: [/^svelte(\/.*)?$/] } : {}),
    plugins: [
      autoOptions({ hydratable }),
      svelte({
        emitCss: false,
        ...(svelteConfig?.extensions
          ? { extensions: svelteConfig.extensions }
          : {}),
        ...(svelteConfig?.preprocess
          ? { preprocess: svelteConfig.preprocess }
          : {}),
        compilerOptions: mergeCompilerOptions(svelteConfig?.compilerOptions, {
          customElement: true,
        }),
      }),
    ],
  } satisfies Options;
};
