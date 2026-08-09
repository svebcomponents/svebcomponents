import { defaultExclude, defineConfig } from "vitest/config";

/**
 * Directories holding compiled output. Every package compiles its tests
 * alongside its sources — `files` keeps them out of the published tarball,
 * but they still land in the build directory — and vitest's defaults do not
 * exclude build output. Without this, a package that has been built runs each
 * suite twice: once from `src`, once from the compiled copy.
 *
 * That is not merely wasteful. The compiled copy is whatever the last build
 * produced, so it can pass while the source it was built from is failing.
 */
const BUILD_OUTPUT = ["**/dist/**", "**/.svelte-kit/**"];

/**
 * Config for packages whose tests run in node against their sources.
 *
 * Packages that drive a browser use the `.` (base) or `./ssr` configs
 * instead; those declare their own `include`, which already scopes them to
 * `test/`.
 */
export const nodeConfig = {
  test: {
    exclude: [...defaultExclude, ...BUILD_OUTPUT],
  },
};

export default defineConfig(nodeConfig);
