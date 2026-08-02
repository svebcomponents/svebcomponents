import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/**
 * The app-author configuration this suite exercises: React's automatic JSX
 * transform pointed at `@svebcomponents/ssr-react` (via `jsxImportSource` in
 * tsconfig.json, which vite's transform picks up), so every dashed tag is
 * routed through the custom element wrapper with no bundler plugin involved.
 */
export default defineConfig({
  test: {
    // renders real React SSR output for the browser-side hydration test
    globalSetup: [
      "test/hydrationFixture.globalSetup.tsx",
      "test/experiments/streamingFixture.globalSetup.tsx",
    ],
    projects: [
      {
        test: {
          name: "server",
          include: ["test/server/*.test.tsx"],
          exclude: ["test/client"],
        },
      },
      {
        test: {
          name: "client",
          setupFiles: ["test/client/setup.ts"],
          include: ["test/client/*.test.tsx", "test/experiments/*.test.tsx"],
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
