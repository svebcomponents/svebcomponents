import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vite.dev/config/
export const config = defineConfig({
  build: {
    lib: {
      formats: ["es"],
      entry: {
        index: "src/index.ts",
        "index.server": "src/index.server.ts",
      },
    },
  },
  plugins: [svelte()],
});
