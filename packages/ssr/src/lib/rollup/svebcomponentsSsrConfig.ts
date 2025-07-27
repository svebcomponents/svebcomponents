import type { RolldownOptions } from "rolldown";
import svelte from "rollup-plugin-svelte";

import { pluginGenerateSsrEntry } from "./pluginGenerateSsrEntry.js";
import { pluginOverrideSvelteSsrSlotImplementation } from "./pluginOverrideSvelteSsrSlotImplementation.js";

interface RollupConfigSvebcomponentsSsrOptions {
  /**
   * The entrypoint for the svelte component that is being transformed.
   */
  input: string;
  /**
   * The file rollup should write the output to.
   */
  outDir: string;
}

const rollupConfigSvebcomponentsSsr = (
  options: RollupConfigSvebcomponentsSsrOptions,
) =>
  ({
    input: options.input,
    output: {
      dir: options.outDir,
      format: "esm",
      sourcemap: true,
    },
    plugins: [
      pluginOverrideSvelteSsrSlotImplementation(),
      svelte({
        emitCss: false,
        compilerOptions: {
          customElement: false,
          generate: "server",
          css: "injected",
        },
      }),
      pluginGenerateSsrEntry({}),
    ],
  }) satisfies RolldownOptions;

export default rollupConfigSvebcomponentsSsr;
