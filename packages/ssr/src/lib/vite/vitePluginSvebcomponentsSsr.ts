import type { Plugin, ResolvedConfig } from "vite";
import { parse, type AST } from "svelte/compiler";
import { walk } from "zimmerframe";
import MagicString from "magic-string";

import {
  mayBeCustomElementTagName,
  isValidCustomElementTagName,
} from "../shared/customElementName.js";

const WRAPPER_COMPONENT_NAME = "CustomElementWrapper";
const WRAPPER_SOURCE_PACKAGE = "@svebcomponents/ssr/wrapper-component";
const ASYNC_WRAPPER_SOURCE_PACKAGE =
  "@svebcomponents/ssr/async-wrapper-component";
const WRAPPER_TAG_NAME_PROP = "_tagName";

interface VitePluginSvebcomponentsSsrOptions {
  /**
   * Use the async SSR wrapper. When omitted, this is auto-detected from the
   * host app's vite-plugin-svelte options: an app compiled with
   * `compilerOptions.experimental.async` needs the async wrapper (the sync
   * wrapper's render path rejects async component output), and an app
   * without it cannot compile the async wrapper. Set explicitly only to
   * override the detection.
   *
   * Svelte 6 TODO: revisit once async rendering is no longer configured
   * through `compilerOptions.experimental.async`.
   */
  async?: boolean;
}

/**
 * Reads whether the host app compiles with `experimental.async` from
 * vite-plugin-svelte's plugin api (populated in its `configResolved`, so it
 * must only be called from later hooks such as `transform`).
 */
const detectExperimentalAsync = (
  config: ResolvedConfig | undefined,
): boolean => {
  for (const plugin of config?.plugins ?? []) {
    if (!plugin.name.startsWith("vite-plugin-svelte")) continue;
    const api = (
      plugin as {
        api?: {
          options?: {
            compilerOptions?: { experimental?: { async?: boolean } };
          };
        };
      }
    ).api;
    const experimentalAsync =
      api?.options?.compilerOptions?.experimental?.async;
    if (experimentalAsync !== undefined) return experimentalAsync === true;
  }
  return false;
};

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
      ? JSON.stringify(slotValue.data)
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

function vitePluginSvebcomponentsSsr(
  options: VitePluginSvebcomponentsSsrOptions = {},
): Plugin {
  let resolvedConfig: ResolvedConfig | undefined;
  // resolved lazily on first use: an explicit option wins; otherwise detect
  // from vite-plugin-svelte, whose api is populated during configResolved
  let useAsyncWrapper: boolean | undefined = options.async;
  const importStatement = () => {
    useAsyncWrapper ??= detectExperimentalAsync(resolvedConfig);
    const wrapperSourcePackage = useAsyncWrapper
      ? ASYNC_WRAPPER_SOURCE_PACKAGE
      : WRAPPER_SOURCE_PACKAGE;
    return `import ${WRAPPER_COMPONENT_NAME} from '${wrapperSourcePackage}';\n`;
  };

  return {
    name: "vite-plugin-svelte-webcomponent-wrapper",
    enforce: "pre",

    configResolved(config) {
      resolvedConfig = config;
    },

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
              // Cheap fast path first (avoids the regex for the vast
              // majority of elements), then fully validate against the HTML
              // spec's PotentialCustomElementName grammar so reserved
              // SVG/MathML names like `font-face` or `annotation-xml` aren't
              // mistaken for custom elements.
              if (
                mayBeCustomElementTagName(node.name) &&
                isValidCustomElementTagName(node.name)
              ) {
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

                // Find the ce's closing tag, searching backwards from the
                // node's last character (`node.end` is exclusive, so we use
                // `node.end - 1` — otherwise a same-tag parent's closing tag,
                // which starts exactly at a nested child's `node.end`, would be
                // matched for the child and corrupt the mapping).
                const closingTagStart = code.lastIndexOf(
                  `</${originalTagName}>`,
                  node.end - 1,
                );
                // If no closing tag exists within this element's range, it is
                // self-closing (`<my-widget />`). `lastIndexOf` returns -1 in
                // that case, or an index before this node's start when the only
                // match belongs to an earlier same-tag sibling. Either way, skip
                // the closing-tag overwrite: a self-closing
                // `<CustomElementWrapper _tagName="..." ... />` is valid Svelte.
                if (closingTagStart >= node.start) {
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
                }

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
          magicString.appendLeft(scriptTagEnd + 1, importStatement());
        } else {
          magicString.prepend(`<script>\n${importStatement()}</script>\n`);
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
