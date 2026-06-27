import type { Plugin } from "vite";

const packageName = "@svebcomponents/e2e.conditional-export-host";
const resolvedExportModuleId = "virtual:resolved-conditional-export";

export const conditionalExportResolutionTest = (): Plugin => ({
  name: "conditional-export-resolution-test",
  resolveId(id) {
    if (id === resolvedExportModuleId) {
      return `\0${resolvedExportModuleId}`;
    }
  },
  async load(id) {
    if (id !== `\0${resolvedExportModuleId}`) {
      return;
    }

    /*
     * Rendering alone could pass through the bundled default export. Ask Vite
     * which package entry it resolves in the Svelte host so the browser test can
     * prove the `svelte` condition is actually selected.
     */
    const resolvedPackage = await this.resolve(packageName, undefined, {
      skipSelf: true,
    });

    return `export default ${JSON.stringify(resolvedPackage?.id ?? null)};`;
  },
});
