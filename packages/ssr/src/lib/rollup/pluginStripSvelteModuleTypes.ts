import type { Plugin } from "rolldown";
import { transform } from "rolldown/utils";

const SVELTE_TYPESCRIPT_MODULE = /\.svelte(?:\.[^./\\]+)*\.ts$/;

/**
 * Strips TypeScript syntax from Svelte rune modules before
 * `rollup-plugin-svelte` passes them to `svelte.compileModule()`.
 *
 * `compileModule()` accepts JavaScript containing runes. Vite runs its Svelte
 * module compiler after its TypeScript transform, but a raw Rolldown/tsdown
 * plugin pipeline invokes `rollup-plugin-svelte` before Rolldown's built-in
 * lowering. Running Oxc explicitly here gives `.svelte.ts` modules the same
 * ordering: TypeScript first, Svelte second.
 */
export function pluginStripSvelteModuleTypes(): Plugin {
  return {
    name: "svebcomponents:strip-svelte-module-types",

    transform: {
      order: "pre",
      async handler(code, id) {
        if (!SVELTE_TYPESCRIPT_MODULE.test(id)) return null;

        const result = await transform(id, code, {
          lang: "ts",
          sourceType: "module",
          sourcemap: true,
          // Match the repository's recommended `verbatimModuleSyntax` setup:
          // explicitly type-only imports disappear while ordinary imports are
          // preserved for the bundler to resolve as runtime values.
          typescript: { onlyRemoveTypeImports: true },
        });

        if (result.errors.length > 0) {
          throw result.errors[0];
        }
        for (const warning of result.warnings) {
          this.warn(warning);
        }

        return {
          code: result.code,
          map: result.map ?? null,
        };
      },
    },
  };
}
