import fs from "fs/promises";
import path from "path";
import type { Plugin, NormalizedOutputOptions, PluginContext } from "rollup";

const ENTRY_FILE_NAME = "ssr.js";

/**
 * Generate a custom element SSR entry file for a Svelte component.
 * default serverImportPath: '../server/index.js'
 * default clientImportPath: '../client/index.js'
 */
interface GenerateSsrEntryPluginOptions {
  tagName: string;
  serverImportPath?: string;
  clientImportPath?: string;
}

export function generateSsrEntryPlugin(
  options: GenerateSsrEntryPluginOptions,
): Plugin {
  const {
    tagName,
    serverImportPath = "./index.js",
    clientImportPath = "../client/index.js",
  } = options;

  if (!tagName) {
    throw new Error("generateSsrEntryPlugin requires a tagName option");
  }

  return {
    name: "generate-ssr-entry",

    // Since writeBundle runs after all output files have been written, we can generate the SSR entry file here
    async writeBundle(
      this: PluginContext,
      outputOptions: NormalizedOutputOptions,
    ): Promise<void> {
      if (!outputOptions.dir) {
        this.error(
          "generateSsrEntryPlugin requires an output directory (outputOptions.dir)",
        );
      }

      const ssrFilePath = path.resolve(outputOptions.dir, ENTRY_FILE_NAME);

      const content = `import { SvelteCustomElementRenderer, ElementRendererRegistry } from '@svebcomponents/ssr';
import SvelteComponent from '${serverImportPath}';
import '${clientImportPath}';

const ctor = customElements.get('${tagName}');
if (!ctor) {
  throw new Error('Could not find custom element constructor for ${tagName}');
}
class ComponentSpecificSvelteCustomElementRenderer extends SvelteCustomElementRenderer {
  constructor() {
    super(SvelteComponent, ctor, '${tagName}');
  }
}

ElementRendererRegistry.set(ctor, ComponentSpecificSvelteCustomElementRenderer);
`;

      try {
        await fs.writeFile(ssrFilePath, content.trim());
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        // let rollup know that something went wrong
        this.error(`Failed to generate SSR entry file: ${message}`);
      }
    },
  };
}
