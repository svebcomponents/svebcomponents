import path from "node:path";

import type { Plugin } from "rolldown";

/**
 * Resolves the given packages from the component package's own root instead
 * of from each importer (the same strategy as vite's `resolve.dedupe`).
 *
 * A single svelte copy in the client bundle is load-bearing: the compiled
 * component and @svebcomponents/ssr's hydration wrapper must share svelte's
 * module state (component context, effect tracking). With linked or
 * duplicated installs their imports can otherwise resolve to two physical
 * svelte copies, and hydration dies with `effect_orphan`.
 */
export const pluginDedupe = (packages: string[]): Plugin => {
  const projectRoot = path.resolve("package.json");
  return {
    name: "svebcomponents:dedupe",
    resolveId: {
      order: "pre",
      async handler(source, importer, options) {
        if (importer === undefined || source.startsWith("\0")) {
          return null;
        }
        const isDeduped = packages.some(
          (name) => source === name || source.startsWith(`${name}/`),
        );
        if (!isDeduped) {
          return null;
        }
        return this.resolve(source, projectRoot, {
          ...options,
          skipSelf: true,
        });
      },
    },
  };
};
