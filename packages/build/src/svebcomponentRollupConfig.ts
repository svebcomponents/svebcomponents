import type { RolldownOptions } from "rolldown";
import svelte from "rollup-plugin-svelte";
import autoOptions from "@svebcomponents/auto-options";

interface RollupConfigSvebcomponentsOptions {
  /**
   * The entrypoint for the svelte component that is being transformed.
   */
  input: string;
  /**
   * The file rollup should write the output to.
   */
  outDir: string;
}

export const svebcomponentRollupConfig = (
  options: RollupConfigSvebcomponentsOptions,
) => {
  const { input, outDir } = options;
  return {
    input,
    output: {
      dir: outDir,
      format: "esm",
      sourcemap: true,
    },
    plugins: [
      autoOptions(),
      svelte({
        emitCss: false,
        compilerOptions: {
          customElement: true,
        },
      }),
    ],
  } satisfies RolldownOptions;
};
