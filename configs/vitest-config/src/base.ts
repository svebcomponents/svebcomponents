import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export const baseConfig = {
  test: {
    projects: [
      {
        test: {
          setupFiles: ["test/client/setup.ts"],
          include: ["test/client/*.test.ts"],
          browser: {
            screenshotFailures: false,
            enabled: true,
            instances: [
              {
                browser: "chromium" as const,
              },
            ],
            headless: true,
            provider: playwright(),
          },
        },
      },
    ],
  },
};

export default defineConfig(baseConfig);
