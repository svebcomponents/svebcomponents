import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
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
      },
    ],
  },
});
