#!/usr/bin/env node
import { build, type Options } from "tsdown";
import { loadConfig } from "unconfig";

import { defineConfig } from "./index.js";
import { inferComponents } from "./inferComponents.js";

async function main() {
  const { config } = await loadConfig<Options[] | null>({
    sources: [
      {
        files: "svebcomponents.config",
        extensions: ["ts", "js"],
      },
      {
        files: "package.json",
        rewrite: (json) => {
          return inferComponents(json);
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

  const tsdownOptions = hasConfig ? config : defineConfig({});

  await Promise.all(tsdownOptions.map(build));
}

main().catch((error) => {
  console.error("[svebcomponents]: encountered error during build.", error);
  process.exit(1);
});
