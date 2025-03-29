import type { RollupOptions } from "rollup";
import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

import { generateSsrEntryPlugin } from "./pluginGenerateSsrEntry.js";

const rollupConfigSvebcomponentsSsr = () =>
  ({
    input: "src/index.ts",
    output: {
      dir: `dist/server`,
      assetFileNames: "assets/[name]-[hash][extname]",
      sourcemap: true,
    },
    plugins: [
      resolve({
        browser: true,
        exportConditions: ["svelte"],
        extensions: [".svelte"],
      }),
      svelte({
        compilerOptions: {
          customElement: false,
          generate: "server",
          css: "injected",
        },
      }),
      typescript({
        outDir: "dist/server",
      }),
      generateSsrEntryPlugin({}),
    ],
  }) satisfies RollupOptions;

export default rollupConfigSvebcomponentsSsr;
