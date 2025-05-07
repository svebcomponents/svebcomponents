import type { Plugin } from "vite";
import { parse, type AST } from "svelte/compiler";
import { walk } from "zimmerframe";
import MagicString from "magic-string";

const WRAPPER_COMPONENT_NAME = "CustomElementWrapper";
const WRAPPER_SOURCE_PACKAGE = "@svebcomponents/ssr/wrapper-component";
const WRAPPER_TAG_NAME_PROP = "_tagName";
const IMPORT_STATEMENT = `import ${WRAPPER_COMPONENT_NAME} from '${WRAPPER_SOURCE_PACKAGE}';\n`;

/**
 * Svelte 6 TODO: remove this helper once svelte no longer applies special transforms on slot attributes
 * since svelte transforms plain slot attributes on elements if they are children of components to allow for svelte 4
 * use of slots, slot attributes set for use with custom elements are sometimes erroneously removed by svelte.
 * This utility transforms plain slot attributes set on elements into objects containing a slot property,
 * that are thenbeing spread onto the element.
 * While this might break some svelte 4 legacy codebases, this is a non issue going forward,
 * since slot's are no longer supposed to be used for composition & snippets should can (& should) be used instead.
 * Example:
 * In: <WebComponentWrapper><p slot="test">hi</p></WebComponentWrapper>
 * Out: <WebComponentWrapper><p {...{slot: 'test'}}>hi</p></WebComponentWrapper>
 * While the compiler would normally do to sth like: <WebComponentWrapper test={() => `<p>hi</p>`}>,
 * it no longer does this when slot is set via the spread operator
 */
const transformSlotAttribute = (
  node: AST.RegularElement,
  magicString: MagicString,
): void => {
  const slotAttr = node.attributes.find((attr): attr is AST.Attribute => {
    if (attr.type !== "Attribute") {
      return false;
    }
    if (attr.name !== "slot") {
      return false;
    }
    return true;
  });
  // if no string slot attribute is found, return
  if (!slotAttr || slotAttr.value === true) return;

  // there should never be more than one value for an attribute
  const slotValue = Array.isArray(slotAttr.value)
    ? slotAttr.value[0]
    : slotAttr.value;

  if (!slotValue) return;

  const slotValueAssignment =
    slotValue.type === "Text"
      ? `'${slotValue.data}'`
      : `${slotValue.expression}`;
  // replace the plain attribute with a spread
  magicString.overwrite(
    slotAttr.start,
    slotAttr.end,
    `{...{slot: ${slotValueAssignment}}}`,
    {
      storeName: true,
    },
  );
};

function vitePluginSvebcomponentsSsr(): Plugin {
  return {
    name: "vite-plugin-svelte-webcomponent-wrapper",
    enforce: "pre",

    async transform(code, id) {
      if (!id.endsWith(".svelte")) {
        return null;
      }

      const { instance, fragment } = parse(code, {
        filename: id,
        modern: true,
      });

      const magicString = new MagicString(code);
      let shouldAddImport = false;

      if (fragment) {
        walk(
          fragment as AST.SvelteNode,
          {
            webComponents: [],
          } as {
            // keep track of the web components we're descending into
            webComponents: string[];
          },
          {
            RegularElement(node, { next, state }) {
              /**
               * AST Node Enter
               */
              // Svelte 6 TODO: remove this if block & the array keeping track of ancestor WCs once slots are no longer transformed
              if (state.webComponents.length > 0) {
                transformSlotAttribute(node, magicString);
              }
              let originalTagName: string | undefined;
              if (node.name.includes("-")) {
                originalTagName = node.name;
                state.webComponents.push(originalTagName);

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
              /**
               * Descend to children AST Nodes
               */
              next(state);
              /**
               * AST Node Leave
               */
              // TODO: `slot` attribute is processed by svelte compiler when an element is nested inside a component,
              if (originalTagName) {
                state.webComponents.pop();
              }
            },
          },
        );
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
