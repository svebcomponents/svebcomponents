#!/usr/bin/env node
import { build, type BuildOptions } from "rolldown";
import { loadConfig } from "unconfig";

import { defineConfig } from "./index.js";
import { inferComponents } from "./inferComponents.js";

async function main() {
  const { config } = await loadConfig<BuildOptions[] | null>({
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

  if (config === null) {
    console.warn(
      "[svebcomponents]: no valid configuration found. Please ensure to either provide valid `exports` in package.json or a dedicated `svebcomponents.config.js` file.",
    );
  }

  const rolldownOptions = config ?? defineConfig({});

  await build(rolldownOptions);
}

try {
  main();
} catch (error) {
  console.error("[svebcomponents]: encountered error during build.", error);
  process.exit(1);
}
