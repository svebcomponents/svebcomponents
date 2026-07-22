#!/usr/bin/env node
// stable entry point for CLI (so pnpm can symlink it even before build)
import path from "path";
import fs from "fs";
import { pathToFileURL } from "node:url";

const distPath = path.resolve(import.meta.dirname, "dist/cli.js");

if (fs.existsSync(distPath)) {
  await import(pathToFileURL(distPath).href);
} else {
  console.error("[svebcomponents]: cli tool not yet built.");
  process.exit(1);
}
