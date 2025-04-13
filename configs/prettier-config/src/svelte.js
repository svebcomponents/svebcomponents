import { config as baseConfig } from "./base.js";
export const config = {
  ...baseConfig,
  plugins: [...baseConfig.plugins, "prettier-plugin-svelte"],
  overrides: [
    {
      files: "*.svelte",
      options: {
        parser: "svelte",
      },
    },
  ],
};
