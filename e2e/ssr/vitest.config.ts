import { svelte } from "@sveltejs/vite-plugin-svelte";
import svebcomponents from "@svebcomponents/ssr/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [svebcomponents(), svelte({})],
  test: {
    projects: [
      // {
      //   test: {
      //     setupFiles: ["test/client/setup.ts"],
      //     include: ["test/client/component.test.ts"],
      //     browser: {
      //       screenshotFailures: false,
      //       enabled: true,
      //       instances: [
      //         {
      //           browser: "chromium",
      //         },
      //       ],
      //       headless: true,
      //       provider: "playwright",
      //     },
      //   },
      // },
      {
        extends: true,
        test: {
          include: ["test/server/*.test.ts"],
          exclude: ["test/client"],
        },
        plugins: [],
      },
    ],
  },
});
