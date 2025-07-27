import { svelte } from "@sveltejs/vite-plugin-svelte";
import svebcomponents from "@svebcomponents/ssr/vite";
import { defineConfig } from "vitest/config";

import vitestConfig from "@svebcomponents/vitest-config/ssr";

export default defineConfig({
  ...vitestConfig,
  plugins: [...(vitestConfig?.plugins ?? []), svebcomponents(), svelte({})],
});
