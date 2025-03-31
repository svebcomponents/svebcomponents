import type { RollupOptions } from "rollup";
import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

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
      resolve({
        browser: true,
        exportConditions: ["svelte"],
        extensions: [".svelte"],
      }),
      svelte({
        compilerOptions: {
          customElement: false,
          generate: "server",
          css: "injected",
        },
      }),
      typescript({
        outDir: options.outDir,
      }),
      pluginGenerateSsrEntry({}),
    ],
  }) satisfies RollupOptions;

export default rollupConfigSvebcomponentsSsr;
