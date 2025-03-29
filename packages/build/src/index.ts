import svebcomponentsSsr from "@svebcomponents/ssr/rollup";
import type { RollupOptions } from "rollup";

import { svebcomponentRollupConfig } from "./svebcomponentRollupConfig.js";

interface DefineConfigOptions {
  ssr?: boolean;
}

export const defineConfig = (options: DefineConfigOptions) => {
  const { ssr = true } = options;

  const rollupConfig: Array<RollupOptions> = [svebcomponentRollupConfig];

  if (ssr) {
    rollupConfig.push(svebcomponentsSsr());
  }

  return rollupConfig;
};
