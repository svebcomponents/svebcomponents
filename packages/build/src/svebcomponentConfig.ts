import svelte from "rollup-plugin-svelte";
import autoOptions from "@svebcomponents/auto-options";
import { Options } from "tsdown";

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
}

export const createTsdownConfig = (options: SvebcomponentsOptions) => {
  const { entry, outDir, externalSvelte = false } = options;
  return {
    entry,
    outDir,
    dts: true,
    ...(externalSvelte ? { external: [/^svelte(\/.*)?$/] } : {}),
    plugins: [
      autoOptions(),
      svelte({
        emitCss: false,
        compilerOptions: {
          customElement: true,
        },
      }),
    ],
  } satisfies Options;
};
