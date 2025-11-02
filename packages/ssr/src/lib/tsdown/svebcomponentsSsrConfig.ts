import type { Options } from "tsdown";
import svelte from "rollup-plugin-svelte";

import { pluginGenerateSsrEntry } from "../rollup/pluginGenerateSsrEntry.js";
import { pluginOverrideSvelteSsrSlotImplementation } from "../rollup/pluginOverrideSvelteSsrSlotImplementation.js";

interface SvebcomponentsSsrOptions {
  /**
   * The entrypoint for the svelte component that is being transformed.
   */
  entry: string;
  /**
   * The file rollup should write the output to.
   */
  outDir: string;
}

const createSsrTsdownConfig = ({ entry, outDir }: SvebcomponentsSsrOptions) =>
  ({
    entry,
    outDir,
    dts: true,
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
  }) satisfies Options;

export default createSsrTsdownConfig;
