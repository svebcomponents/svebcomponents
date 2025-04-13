import { config as baseConfig } from "./base.js";

export const config = {
  ...baseConfig,
  plugins: [
    ...baseConfig.plugins,
    import.meta.resolve("prettier-plugin-svelte"),
  ],
  overrides: [{ files: "*.svelte", options: { parser: "svelte" } }],
};
