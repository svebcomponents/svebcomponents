import fs from "node:fs/promises";

import { parse } from "@astrojs/compiler";
import type { Plugin } from "vite";
import MagicString from "magic-string";

import {
  WRAPPER_COMPONENT_NAME,
  TAG_NAME_PROP,
} from "../shared/wrapperName.js";

const WRAPPER_SOURCE_PACKAGE = "@svebcomponents/ssr-astro/component";

/**
 * The subset of `@astrojs/compiler`'s AST this plugin walks.
 *
 * Astro's parser classifies a dashed tag as its own `custom-element` node
 * type, so unlike the Svelte and Vue integrations this needs no tag-name
 * heuristic and no reserved SVG/MathML exclusion list — the compiler has
 * already made the distinction.
 */
interface AstroNode {
  type: string;
  name?: string;
  children?: AstroNode[];
  position?: {
    start: { offset: number };
    end?: { offset: number };
  };
}

export interface VitePluginSvebcomponentsSsrAstroOptions {
  /**
   * Restricts the rewrite to these tag names. By default every custom element
   * in an `.astro` template is routed through the wrapper. Pass an explicit
   * list to leave other custom elements — a third-party web component with no
   * registered `ElementRenderer` — rendering as plain tags.
   */
  tags?: string[];
}

/**
 * Rewrites custom element tags in `.astro` templates so they render through
 * the wrapper component, which emits declarative shadow DOM for them.
 *
 * ```ts
 * import svebcomponents from "@svebcomponents/ssr-astro";
 *
 * export default defineConfig({
 *   integrations: [svebcomponents()],
 * });
 * ```
 *
 * The integration wires this plugin up; it is exported separately for apps
 * that would rather manage their Vite config directly.
 */
export const vitePluginSvebcomponentsSsrAstro = (
  options: VitePluginSvebcomponentsSsrAstroOptions = {},
): Plugin => {
  const allowedTags = options.tags ? new Set(options.tags) : undefined;

  return {
    name: "vite-plugin-svebcomponents-ssr-astro",
    enforce: "pre",

    /**
     * The rewrite happens in `load`, not `transform`, and that is load-bearing.
     *
     * Astro compiles `.astro` to JavaScript in its own `transform` hook, and
     * its plugin is also `enforce: "pre"` — registered ahead of any plugin an
     * integration contributes. A `transform` here would therefore receive
     * already-compiled JavaScript, with no custom element tags left to rewrite.
     *
     * Astro's `load` hook, by contrast, only serves its virtual `?astro=…`
     * sub-requests and returns null for the component file itself. Supplying
     * that file's contents here means Astro's compiler transforms the
     * rewritten source, whatever the plugin order happens to be.
     */
    async load(id) {
      // Astro re-requests parts of a component with a query suffix
      // (`?astro&type=script&…`), which it serves from its own compile cache.
      const [filename, query] = id.split("?");
      if (!filename?.endsWith(".astro")) return null;
      if (query !== undefined && /(^|&)astro(&|=|$)/.test(query)) return null;

      const code = await fs.readFile(filename, "utf8");
      const { ast } = await parse(code, { position: true });

      const magicString = new MagicString(code);
      let changed = false;

      const visit = (node: AstroNode) => {
        if (
          node.type === "custom-element" &&
          node.name !== undefined &&
          (!allowedTags || allowedTags.has(node.name))
        ) {
          if (rewriteElement(node, code, magicString)) changed = true;
        }
        for (const child of node.children ?? []) visit(child);
      };
      visit(ast as AstroNode);

      // Returning the untouched source rather than null keeps this hook the
      // single loader for `.astro` files, so behavior does not differ between
      // components that contain custom elements and ones that do not.
      if (!changed) return code;

      injectWrapperImport(ast as AstroNode, code, magicString);

      return magicString.toString();
    },
  };
};

/**
 * Replaces an element's opening (and, when present, closing) tag name with the
 * wrapper component's, passing the original tag name along as a prop.
 */
const rewriteElement = (
  node: AstroNode,
  code: string,
  magicString: MagicString,
): boolean => {
  const tag = node.name;
  const start = node.position?.start.offset;
  const end = node.position?.end?.offset;
  if (tag === undefined || start === undefined || end === undefined) {
    return false;
  }

  // opening tag: `<` + name
  const openingNameStart = start + 1;
  magicString.overwrite(
    openingNameStart,
    openingNameStart + tag.length,
    WRAPPER_COMPONENT_NAME,
    { storeName: true },
  );
  magicString.appendLeft(
    openingNameStart + tag.length,
    ` ${TAG_NAME_PROP}="${tag}"`,
  );

  // Astro's AST does not flag self-closing elements, so the closing tag is
  // detected from the source: `end` is the exclusive end of the whole element,
  // so a closing tag occupies exactly the characters before it.
  const closingTag = `</${tag}>`;
  if (code.slice(end - closingTag.length, end) === closingTag) {
    const closingNameStart = end - closingTag.length + 2;
    magicString.overwrite(
      closingNameStart,
      closingNameStart + tag.length,
      WRAPPER_COMPONENT_NAME,
      { storeName: true },
    );
  }

  return true;
};

/**
 * Imports the wrapper component into the file's frontmatter, creating a
 * frontmatter block when the component has none.
 */
const injectWrapperImport = (
  ast: AstroNode,
  code: string,
  magicString: MagicString,
) => {
  const importStatement = `import ${WRAPPER_COMPONENT_NAME} from "${WRAPPER_SOURCE_PACKAGE}";`;

  const frontmatter = ast.children?.find(
    (child) => child.type === "frontmatter",
  );
  const start = frontmatter?.position?.start.offset;

  if (frontmatter && start !== undefined) {
    // insert just after the opening `---`
    const fenceEnd = code.indexOf("---", start) + 3;
    magicString.appendLeft(fenceEnd, `\n${importStatement}`);
    return;
  }

  magicString.prepend(`---\n${importStatement}\n---\n`);
};

export default vitePluginSvebcomponentsSsrAstro;
