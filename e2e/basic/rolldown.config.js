import { defineConfig } from "@svebcomponents/build";

export default defineConfig({
  input: "src/index.ts",
  outDir: "dist",
  ssr: false,
});
