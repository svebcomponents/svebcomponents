import type { RollupOptions } from "rollup";
import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export const svebcomponentRollupConfig = {
  input: "src/index.ts",
  output: {
    dir: `dist/client`,
    assetFileNames: "assets/[name]-[hash][extname]",
    sourcemap: true,
  },
  plugins: [
    resolve({
      browser: true,
      exportConditions: ["svelte"],
      extensions: [".svelte"],
    }),
    svelte(),
    typescript({
      outDir: `dist/client`,
    }),
  ],
} satisfies RollupOptions;
