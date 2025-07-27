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

main();
