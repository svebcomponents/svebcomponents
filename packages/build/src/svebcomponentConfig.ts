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
}

export const createTsdownConfig = (options: SvebcomponentsOptions) => {
  const { entry, outDir } = options;
  return {
    entry,
    outDir,
    dts: true,
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
