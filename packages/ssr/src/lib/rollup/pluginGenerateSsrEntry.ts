import fs from "fs/promises";
import path from "path";
import type { Plugin, NormalizedOutputOptions, PluginContext } from "rollup";

const ENTRY_FILE_NAME = "ssr";

interface GenerateSsrEntryPluginOptions {
  serverImportPath?: string;
  clientImportPath?: string;
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
        `${ENTRY_FILE_NAME}.js`,
      );
      const ssrTypesFilePath = path.resolve(
        outputOptions.dir,
        `${ENTRY_FILE_NAME}.d.ts`,
      );

      const content = `import { SvelteCustomElementRenderer } from '@svebcomponents/ssr';
import ServerSvelteComponent from '${serverImportPath}';
import ClientSvelteComponent from '${clientImportPath}';

const ctor = ClientSvelteComponent.element;
if (!ctor) {
  throw new Error('Could not access custom element constructor');
}
class ComponentSpecificSvelteCustomElementRenderer extends SvelteCustomElementRenderer {
  constructor() {
    super(ServerSvelteComponent, ctor);
  }
}

export default ComponentSpecificSvelteCustomElementRenderer;
`;

      const typesContent = `import { SvelteCustomElementRenderer } from '@svebcomponents/ssr';
import ServerSvelteComponent from '${serverImportPath}';
declare class ComponentSpecificSvelteCustomElementRenderer extends SvelteCustomElementRenderer {
  constructor();
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
