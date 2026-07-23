import fs from "fs/promises";
import path from "path";
import type { Plugin, NormalizedOutputOptions, PluginContext } from "rolldown";

const DEFAULT_ENTRY_FILE_NAME = "ssr";

interface GenerateSsrEntryPluginOptions {
  serverImportPath?: string;
  clientImportPath?: string;
  /**
   * The basename (without extension) of the generated SSR renderer entry file.
   * Defaults to "ssr", producing 'ssr.js' / 'ssr.d.ts'. When multiple SSR
   * components share an output directory this must be unique per component
   * (e.g. "button-ssr") so the generated entries do not overwrite each other.
   */
  entryFileName?: string;
  /**
   * Import path (relative to the generated entry) of the server-compiled
   * HydrationHost component. When set, the generated renderer passes it to
   * `SvelteCustomElementRenderer`, so the SSR output structurally matches
   * what the client-side `hydratable` wrapper hydrates.
   */
  hydrationHostImportPath?: string;
  /**
   * Import path (relative to the generated entry) of an optional server-only
   * SSR preparation function.
   */
  prepareImportPath?: string;
  /**
   * The component's custom element tag name, when it could be determined at
   * build time (see `resolveComponentTag`). When set, the generated entry
   * self-registers with `ElementRendererRegistry` on load, so consuming apps
   * only need a bare `import "pkg/ssr"` instead of also calling
   * `ElementRendererRegistry.set()` by hand. Omitted when the tag couldn't be
   * determined — the generated renderer still works, but must be registered
   * manually.
   */
  tagName?: string;
}

/**
 * Generate a custom element SSR entry file for a Svelte component.
 * Since the generated file will live at 'dist/server/ssr.js',
 * the default import paths are set to './index.js' and '../client/index.js' respectively.
 */
export function pluginGenerateSsrEntry(
  options: GenerateSsrEntryPluginOptions,
): Plugin {
  const {
    serverImportPath = "./index.js",
    clientImportPath = "../client/index.js",
    entryFileName = DEFAULT_ENTRY_FILE_NAME,
    hydrationHostImportPath,
    prepareImportPath,
    tagName,
  } = options;

  return {
    name: "svebcomponents:generate-ssr-entry",

    // Since writeBundle runs after all output files have been written, we can generate the SSR entry file here
    async writeBundle(
      this: PluginContext,
      outputOptions: NormalizedOutputOptions,
    ): Promise<void> {
      if (outputOptions.dir === undefined) {
        this.error(
          "generateSsrEntryPlugin requires an output directory (outputOptions.dir)",
        );
      }

      const ssrFilePath = path.resolve(
        outputOptions.dir,
        `${entryFileName}.js`,
      );
      const ssrTypesFilePath = path.resolve(
        outputOptions.dir,
        `${entryFileName}.d.ts`,
      );

      const content = `// The DOM shim must be installed before the client custom-element bundle
// evaluates: the compiled custom element (and svelte's client runtime it
// bundles) captures \`HTMLElement\` at module-evaluation time.
import '@svebcomponents/ssr/shim';
import { SvelteCustomElementRenderer${tagName ? ", ElementRendererRegistry" : ""} } from '@svebcomponents/ssr';
import ServerSvelteComponent from '${serverImportPath}';
${
  hydrationHostImportPath
    ? `import HydrationHostComponent from '${hydrationHostImportPath}';\n`
    : ""
}${prepareImportPath ? `import prepare from '${prepareImportPath}';\n` : ""}
// Import the client bundle dynamically instead of statically: bundlers that
// code-split (e.g. rollup in a SvelteKit server build) may hoist a statically
// imported module into a shared chunk that executes before this module's own
// imports, evaluating the custom-element code before the shim above has
// installed. Evaluation of a dynamic import can never be hoisted above the
// importing module's body, so this is ordering-safe under any chunking.
const ClientSvelteComponent = (await import('${clientImportPath}')).default;

const ctor = ClientSvelteComponent.element;
if (!ctor) {
  throw new Error('Could not access custom element constructor');
}
class ComponentSpecificSvelteCustomElementRenderer extends SvelteCustomElementRenderer {
  constructor(tagName) {
    super(ServerSvelteComponent, ctor, tagName${
      hydrationHostImportPath ? ", HydrationHostComponent" : ""
    }${prepareImportPath ? `${hydrationHostImportPath ? "" : ", undefined"}, prepare` : ""});
  }
}
${
  tagName
    ? `
// The tag name was determined at build time from this component's own
// <svelte:options customElement> declaration, so this entry can
// self-register: importing it is then enough to make SSR work, with no
// manual ElementRendererRegistry.set() call required. By this point \`ctor\`
// above confirms the custom element is already defined, so the registry's
// customElements.get() lookup succeeds.
ElementRendererRegistry.set(${JSON.stringify(tagName)}, ComponentSpecificSvelteCustomElementRenderer);
`
    : ""
}
export default ComponentSpecificSvelteCustomElementRenderer;
`;

      const typesContent = `import { SvelteCustomElementRenderer } from '@svebcomponents/ssr';
declare class ComponentSpecificSvelteCustomElementRenderer extends SvelteCustomElementRenderer {
  constructor(tagName?: string);
}
export default ComponentSpecificSvelteCustomElementRenderer;
`;

      try {
        await Promise.all([
          fs.writeFile(ssrFilePath, content.trim()),
          fs.writeFile(ssrTypesFilePath, typesContent.trim()),
        ]);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        // let rollup know that something went wrong
        this.error(`Failed to generate SSR entry file: ${message}`);
      }
    },
  };
}
