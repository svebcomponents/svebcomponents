import { getViteConfig } from "astro/config";
import { playwright } from "@vitest/browser-playwright";

/**
 * `getViteConfig` builds the same Vite config Astro itself uses, integrations
 * included — so these tests run against the real compilation pipeline rather
 * than a hand-assembled approximation of it. That is what makes them a valid
 * check that the integration's plugin actually runs before Astro's compiler.
 */
export default getViteConfig({
  test: {
    globalSetup: ["test/hydrationFixture.globalSetup.ts"],
    projects: [
      {
        extends: true,
        test: {
          name: "server",
          include: ["test/*.test.ts"],
        },
      },
      {
        extends: true,
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
