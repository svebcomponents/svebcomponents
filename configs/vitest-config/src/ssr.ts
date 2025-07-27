import { defineConfig } from "vitest/config";

import { baseConfig } from "./base.js";

export default defineConfig({
  test: {
    projects: [
      ...baseConfig.test.projects,
      {
        extends: true,
        test: {
          include: ["test/server/*.test.ts"],
          exclude: ["test/client"],
        },
      },
    ],
  },
});
