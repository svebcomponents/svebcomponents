import { config as baseConfig } from "./base.js";
import prettierSveltePlugin from "prettier-plugin-svelte";

export const config = {
  ...baseConfig,
  plugins: [...(baseConfig.plugins ?? []), prettierSveltePlugin],
  overrides: [{ files: "*.svelte", options: { parser: "svelte" } }],
};
