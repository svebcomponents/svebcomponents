import type { UserConfig } from "tsdown";

import { createBrowserBundlingRule } from "./browserDeps.js";

interface ModuleConfigOptions {
  entry: string;
  outDir: string;
  externalSvelte?: boolean;
  /**
   * Dependency patterns to leave external. See
   * `DefineConfigOptions["neverBundle"]`.
   */
  neverBundle?: (string | RegExp)[];
}

/** Build an ordinary JavaScript/TypeScript package export. */
export const createModuleConfig = ({
  entry,
  outDir,
  externalSvelte = false,
  neverBundle = [],
}: ModuleConfigOptions): UserConfig => ({
  entry,
  outDir,
  dts: entry.endsWith(".ts"),
  fixedExtension: false,
  clean: false,
  // These modules sit beside the compiled components in the browser output
  // directory and are loaded by browsers, so they must resolve the same export
  // conditions the component build does. tsdown defaults to `platform: "node"`,
  // which would pick a dependency's node build for a bundle served to the
  // browser.
  platform: "browser",
  inputOptions: {
    resolve: {
      // matches the component build: without `production`, `esm-env` resolves
      // to a runtime `process.env.NODE_ENV` check instead of a literal, so
      // dev-only branches cannot be eliminated
      conditionNames: ["production"],
    },
    optimization: {
      // the resolved condition alone is not enough — rolldown emits it as a
      // module-level `var` the minifier will not fold into its use sites
      inlineConst: { mode: "smart", pass: 3 },
    },
  },
  // These sit in the browser output directory beside the components and are
  // subject to the same contract: no resolver at load time.
  deps: {
    ...(externalSvelte ? { neverBundle: [/^svelte(\/.*)?$/] } : {}),
    alwaysBundle: createBrowserBundlingRule(
      externalSvelte ? [/^svelte(\/.*)?$/, ...neverBundle] : neverBundle,
    ),
  },
});
