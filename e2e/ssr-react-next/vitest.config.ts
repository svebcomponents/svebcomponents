import { defineConfig } from "vitest/config";

/**
 * The app-author configuration this suite exercises: a stock Next App Router
 * app with `jsxImportSource` pointed at `@svebcomponents/ssr-react` in
 * tsconfig.json, and no bundler plugin of ours anywhere.
 *
 * Both projects run against one real `next start` process (see
 * test/globalSetup.ts) rather than a simulated pipeline, because the failure
 * modes this suite is here to catch — what lands in the Flight payload, what
 * the HTML parser adopts, what React hydrates against — only exist end to end.
 */
export default defineConfig({
  test: {
    globalSetup: ["test/globalSetup.ts"],
    projects: [
      {
        test: {
          name: "server",
          include: ["test/server/*.test.ts"],
        },
      },
      {
        test: {
          name: "client",
          include: ["test/client/*.test.ts"],
          // playwright drives a real browser against the running server, so
          // these need room beyond vitest's default
          testTimeout: 30_000,
        },
      },
    ],
  },
});
