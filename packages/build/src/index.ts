import svebcomponentsSsr from "@svebcomponents/ssr/rollup";
import type { RollupOptions } from "rollup";

import { svebcomponentRollupConfig } from "./svebcomponentRollupConfig.js";

interface DefineConfigOptions {
  tagName: string;
  ssr?: boolean;
}

export const defineConfig = (options: DefineConfigOptions) => {
  const { tagName, ssr = true } = options;

  const rollupConfig: Array<RollupOptions> = [svebcomponentRollupConfig];

  if (ssr) {
    rollupConfig.push(svebcomponentsSsr(tagName));
  }

  return rollupConfig;
};
