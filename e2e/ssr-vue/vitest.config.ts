import vue from "@vitejs/plugin-vue";
import { playwright } from "@vitest/browser-playwright";
import svebcomponentsVue from "@svebcomponents/ssr-vue/vite";
import { defineConfig } from "vitest/config";

/**
 * The app-author configuration this suite exercises: the svebcomponents Vite
 * plugin ahead of `@vitejs/plugin-vue`. Each project builds its own instance —
 * vitest projects do not inherit root-level plugins.
 */
const plugins = () => [svebcomponentsVue(), vue()];

export default defineConfig({
  // the root config loads globalSetup, which imports the .vue apps too
  plugins: plugins(),
  test: {
    // renders real Vue SSR output for the browser-side hydration test
    globalSetup: ["test/hydrationFixture.globalSetup.ts"],
    projects: [
      {
        plugins: plugins(),
        test: {
          name: "server",
          include: ["test/server/*.test.ts"],
          exclude: ["test/client"],
        },
      },
      {
        plugins: plugins(),
        test: {
          name: "client",
          setupFiles: ["test/client/setup.ts"],
          include: ["test/client/*.test.ts"],
          browser: {
            screenshotFailures: false,
            enabled: true,
            instances: [{ browser: "chromium" as const }],
            headless: true,
            provider: playwright(),
          },
        },
      },
    ],
  },
});
