#!/usr/bin/env node
import { build } from "rolldown";
import { loadConfig } from "unconfig";

import { defineConfig } from "./index.js";

async function main() {
  const { config } = await loadConfig({
    sources: [
      {
        files: "svebcomponents.config",
        extensions: ["ts", "js"],
      },
    ],
  });

  const rolldownOptions = config ?? defineConfig({});

  await build(rolldownOptions);
}

try {
  main();
} catch (error) {
  console.error("[svebcomponents]: encountered error during build.", error);
  process.exit(1);
}
