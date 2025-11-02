import svebcomponentsSsr from "../../ssr/dist/tsdown/svebcomponentsSsrConfig.js";

import { createTsdownConfig } from "./svebcomponentConfig.js";
import { Options } from "tsdown";

export interface DefineConfigOptions {
  /**
   * The entrypoint for the svelte component that is being transformed.
   */
  entry?: string;
  /**
   * Whether to generate an SSR entry file for the web component.
   */
  ssr?: boolean;
  /**
   * The output directory for the build files.
   */
  outDir?: string;
  /**
   * The output directory for the SSR build files.
   */
  ssrOutDir?: string;
}

export const defineConfig = (options: DefineConfigOptions = {}) => {
  const { ssr = true, entry = "src/index.ts" } = options;

  const rollupConfig: Options[] = [
    createTsdownConfig({
      entry,
      outDir: options.outDir ?? "dist/client",
    }),
  ];

  if (ssr) {
    rollupConfig.push(
      svebcomponentsSsr({
        entry,
        outDir: options.ssrOutDir ?? "dist/server",
      }),
    );
  }

  return rollupConfig;
};
