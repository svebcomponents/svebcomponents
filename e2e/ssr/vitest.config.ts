import { svelte } from "@sveltejs/vite-plugin-svelte";
import svebcomponents from "@svebcomponents/ssr/vite";
import { defineConfig } from "vitest/config";

import vitestConfig from "@svebcomponents/vitest-config/ssr";

export default defineConfig({
  ...vitestConfig,
  plugins: [
    ...(vitestConfig?.plugins ?? []),
    svebcomponents({ async: true }),
    svelte({
      compilerOptions: {
        experimental: {
          async: true,
        },
      },
    }),
  ],
  test: {
    ...vitestConfig?.test,
    // renders the DSD fixture the browser-side hydration test consumes
    globalSetup: ["test/hydrationFixture.globalSetup.ts"],
    projects: [
      ...(vitestConfig?.test?.projects ?? []),
      // The default consumer configuration: sync wrapper, no async option,
      // no `experimental.async`. Deliberately does NOT extend the root
      // config so the async plugins above don't leak in.
      {
        plugins: [svebcomponents(), svelte()],
        test: {
          name: "server-sync",
          include: ["test/sync/*.test.ts"],
        },
      },
    ],
  },
});
