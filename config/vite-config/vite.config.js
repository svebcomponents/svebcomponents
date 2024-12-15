import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vite.dev/config/
export const config = defineConfig({
  build: {
    lib: {
      fileName: "index",
      formats: ["es"],
      entry: "src/index.ts",
    },
  },
  plugins: [svelte()],
});
