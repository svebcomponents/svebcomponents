import type { Plugin } from "vite";
import { parse, AST } from "svelte/compiler";
import { walk } from "zimmerframe";
import MagicString from "magic-string";

const WRAPPER_COMPONENT_NAME = "CustomElementWrapper";
const WRAPPER_SOURCE_PACKAGE = "@svebcomponents/ssr/wrapper-component";
const WRAPPER_TAG_NAME_PROP = "_tagName";
const IMPORT_STATEMENT = `import ${WRAPPER_COMPONENT_NAME} from '${WRAPPER_SOURCE_PACKAGE}';\n`;

// TODO: `slot` attribute is processed by svelte compiler when an element is nested inside a component,
// so we need to rewrite it as <el {...{slot: 'slotName'}}></el> to prevent svelte from processing it
function vitePluginSvebcomponentsSsr(): Plugin {
  return {
    name: "vite-plugin-svelte-webcomponent-wrapper",
    enforce: "pre",

    async transform(code, id) {
      if (!id.endsWith(".svelte")) {
        return null;
      }

      let { instance, fragment } = parse(code, { filename: id, modern: true });

      const magicString = new MagicString(code);
      let shouldAddImport = false;

      if (fragment) {
        walk(fragment as AST.SvelteNode, null, {
          RegularElement(node, { next }) {
            if (node.name.includes("-")) {
              const originalTagName = node.name;

              // replace ce opening name with wrapper component opening tag
              const openingTagNameStart = node.start + 1;
              const openingTagNameEnd =
                openingTagNameStart + originalTagName.length;
              magicString.overwrite(
                openingTagNameStart,
                openingTagNameEnd,
                WRAPPER_COMPONENT_NAME,
                {
                  storeName: true,
                },
              );

              // pass the original tag name as a prop to the wrapper component
              magicString.appendLeft(
                openingTagNameEnd,
                ` ${WRAPPER_TAG_NAME_PROP}="${originalTagName}"`,
              );

              // Find the ce's closing tag, searching backwards from the node's end (to avoid nested elements)
              const closingTagStart = code.lastIndexOf(
                `</${originalTagName}>`,
                node.end,
              );
              const closingTagNameStart = closingTagStart + 2; // Index after '</'
              const closingTagNameEnd =
                closingTagNameStart + originalTagName.length;
              // replace ce closing tag with wrapper component closing tag
              magicString.overwrite(
                closingTagNameStart,
                closingTagNameEnd,
                WRAPPER_COMPONENT_NAME,
                { storeName: true },
              );

              shouldAddImport = true;
            }
            next();
          },
        });
      }

      if (shouldAddImport) {
        const scriptNode = instance;
        if (scriptNode) {
          const scriptTagEnd = code.indexOf(">", scriptNode.start);
          magicString.appendLeft(scriptTagEnd + 1, IMPORT_STATEMENT);
        } else {
          magicString.prepend(`<script>\n${IMPORT_STATEMENT}</script>\n`);
        }
      }

      if (!magicString.hasChanged()) {
        return null;
      }

      return {
        code: magicString.toString(),
        map: magicString.generateMap({
          source: id,
          file: id,
          includeContent: true,
        }),
      };
    },
  };
}

export default vitePluginSvebcomponentsSsr;
