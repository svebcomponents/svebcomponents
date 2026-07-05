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

      const content = `import { SvelteCustomElementRenderer } from '@svebcomponents/ssr';
import ServerSvelteComponent from '${serverImportPath}';
import ClientSvelteComponent from '${clientImportPath}';

const ctor = ClientSvelteComponent.element;
if (!ctor) {
  throw new Error('Could not access custom element constructor');
}
class ComponentSpecificSvelteCustomElementRenderer extends SvelteCustomElementRenderer {
  constructor(tagName) {
    super(ServerSvelteComponent, ctor, tagName);
  }
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
