import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

import { conditionalExportResolutionTest } from "./test/conditionalExportResolutionTest.js";

export default defineConfig({
  plugins: [conditionalExportResolutionTest(), svelte()],
  test: {
    setupFiles: ["test/client/setup.ts"],
    include: ["test/client/component.test.ts"],
    browser: {
      screenshotFailures: false,
      enabled: true,
      instances: [
        {
          browser: "chromium",
        },
      ],
      headless: true,
      provider: "playwright",
    },
  },
});
