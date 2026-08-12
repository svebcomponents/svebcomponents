import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

import vitestConfig from "@svebcomponents/vitest-config";

export default defineConfig({
  ...vitestConfig,
  test: {
    ...vitestConfig?.test,
    projects: [
      ...(vitestConfig?.test?.projects ?? []).map((project: object | string) =>
        typeof project === "object" && project !== null
          ? { ...project, plugins: [svelte()] }
          : project,
      ),
      // Asserts on the built files themselves, so it runs in node rather than
      // in the browser project the shared config sets up.
      {
        test: {
          name: "bundle",
          include: ["test/*.test.ts"],
        },
      },
    ],
  },
});
