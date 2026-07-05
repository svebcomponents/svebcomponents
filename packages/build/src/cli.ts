#!/usr/bin/env node
import { build, type Options } from "tsdown";
import { loadConfig as loadSvelteConfig } from "@sveltejs/load-config";
import { loadConfig as loadSvebcomponentsConfig } from "unconfig";

import { defineConfig } from "./index.js";
import { inferComponents } from "./inferComponents.js";
import type { SvelteBuildConfig } from "@svebcomponents/ssr/svelte-config";

const getSvelteConfig = async (): Promise<SvelteBuildConfig | undefined> => {
  const result = await loadSvelteConfig(process.cwd());
  if (!result) {
    return undefined;
  }
  if ("error" in result) {
    throw result.error;
  }
  return result.config;
};

async function main() {
  const svelteConfig = await getSvelteConfig();
  const { config } = await loadSvebcomponentsConfig<Options[] | null>({
    sources: [
      {
        files: "svebcomponents.config",
        extensions: ["ts", "js"],
      },
      {
        files: "package.json",
        rewrite: (json) => {
          return inferComponents(json, svelteConfig);
        },
      },
    ],
  });

  const hasConfig = config != null && config.length > 0;

  if (!hasConfig) {
    console.warn(
      "[svebcomponents]: no valid configuration found. Please ensure to either provide valid `exports` in package.json or a dedicated `svebcomponents.config.js` file.",
    );
  }

  const tsdownOptions = hasConfig ? config : defineConfig({ svelteConfig });

  await Promise.all(tsdownOptions.map(build));
}

main().catch((error) => {
  console.error("[svebcomponents]: encountered error during build.", error);
  process.exit(1);
});
