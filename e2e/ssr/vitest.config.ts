import { svelte } from "@sveltejs/vite-plugin-svelte";
import { playwright } from "@vitest/browser-playwright";
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
    globalSetup: [
      "test/hydrationFixture.globalSetup.ts",
      // server-renders the svelte host the client-wrapper test hydrates over
      "test/clientHostFixture.globalSetup.ts",
    ],
    projects: [
      ...(vitestConfig?.test?.projects ?? []),
      // The default consumer configuration: sync wrapper, no async option,
      // no `experimental.async`. Deliberately does NOT extend the root
      // config so the async plugins above don't leak in — and ignores this
      // repo's svelte.config.js (`configFile: false`), whose
      // `experimental.async` exists for the async projects above and would
      // otherwise make the svebcomponents plugin auto-detect the async
      // wrapper here.
      {
        plugins: [svebcomponents(), svelte({ configFile: false })],
        test: {
          name: "server-sync",
          include: ["test/sync/*.test.ts"],
        },
      },
      // The client half of the wrapper, in a real browser: a svelte host
      // rendering a custom element, rewritten by the plugin to Client.svelte.
      // Needs its own project because the shared browser project (from
      // @svebcomponents/vitest-config) carries no plugins, so it cannot
      // compile a `.svelte` host component.
      {
        plugins: [svebcomponents(), svelte({ configFile: false })],
        test: {
          name: "client-host",
          include: ["test/client-host/*.test.ts"],
          browser: {
            screenshotFailures: false,
            enabled: true,
            instances: [{ browser: "chromium" }],
            headless: true,
            provider: playwright(),
          },
        },
      },
    ],
  },
});
