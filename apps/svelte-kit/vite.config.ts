import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import svebcomponents from "@svebcomponents/ssr/vite";

export default defineConfig({
  plugins: [svebcomponents(), sveltekit()],
});
