import svebcomponentsSsr from "@svebcomponents/ssr/rollup";
import type { RolldownOptions } from "rolldown";

import { svebcomponentRollupConfig } from "./svebcomponentRollupConfig.js";

interface DefineConfigOptions {
  /**
   * The entrypoint for the svelte component that is being transformed.
   */
  entry?: string;
  /**
   * Whether to generate an SSR entry file for the web component.
   */
  ssr?: boolean;
}

export const defineConfig = (options: DefineConfigOptions = {}) => {
  const { ssr = true, entry = "src/index.ts" } = options;

  const rollupConfig: Array<RolldownOptions> = [
    svebcomponentRollupConfig({
      input: entry,
      outDir: "dist/client",
    }),
  ];

  if (ssr) {
    rollupConfig.push(
      svebcomponentsSsr({
        input: entry,
        outDir: "dist/server",
      }),
    );
  }

  return rollupConfig;
};
