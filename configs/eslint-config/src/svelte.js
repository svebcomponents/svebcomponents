import svelte from "eslint-plugin-svelte";
import ts from "typescript-eslint";

import base from "./base.js";

/**
 * A shared ESLint configuration for svelte packages in the repository.
 *
 * @type {import("eslint").Linter.Config}
 * */
export default ts.config(
  base,
  ...svelte.configs.recommended,
  ...svelte.configs.prettier,
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    ignores: ["eslint.config.js", "svelte.config.js"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: [".svelte"],
        parser: ts.parser,
      },
    },
  },
);
